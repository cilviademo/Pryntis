const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const kpiController = {
  // GET /api/v1/kpi/artists/:artistId
  async getArtistKPIs(req, res, next) {
    try {
      const { artistId } = req.params;

      // Verify artist exists
      const { rows: artistCheck } = await db.query(
        'SELECT id, name FROM artists WHERE id = $1 AND is_deleted = false',
        [artistId]
      );
      if (!artistCheck[0]) {
        throw new AppError('Artist not found', 404, 'NOT_FOUND');
      }

      const [
        grossRevenueResult,
        recoupableExpensesResult,
        appliedRecoupmentResult,
        pipelineResult,
        atRiskResult,
      ] = await Promise.all([
        // Gross Revenue = SUM(revenue_events.amount) WHERE artist_id
        db.query(
          'SELECT COALESCE(SUM(amount), 0) AS gross_revenue FROM revenue_events WHERE artist_id = $1',
          [artistId]
        ),
        // Total recoupable expenses
        db.query(
          'SELECT COALESCE(SUM(amount), 0) AS total_expenses FROM recoupable_expenses WHERE artist_id = $1',
          [artistId]
        ),
        // Total amount applied to recoupment
        db.query(
          'SELECT COALESCE(SUM(amount_applied_to_recoupment), 0) AS total_applied FROM revenue_events WHERE artist_id = $1',
          [artistId]
        ),
        // Pipeline Value: weighted sum of placement expected values
        // Uses asset -> placements path scoped to this artist's assets
        db.query(
          `SELECT COALESCE(SUM(
            CASE pl.status::text
              WHEN 'pending' THEN pl.expected_value * 0.25
              WHEN 'confirmed' THEN pl.expected_value * 0.6
              WHEN 'completed' THEN pl.expected_value * 1.0
              ELSE 0
            END
          ), 0) AS pipeline_value
          FROM placements pl
          JOIN assets a ON a.id = pl.asset_id
          WHERE a.artist_id = $1
            AND pl.is_deleted = false
            AND pl.status IN ('pending', 'confirmed', 'completed')`,
          [artistId]
        ),
        // At-Risk Revenue: pending placements * 0.25
        db.query(
          `SELECT COALESCE(SUM(pl.expected_value * 0.25), 0) AS at_risk_revenue
           FROM placements pl
           JOIN assets a ON a.id = pl.asset_id
           WHERE a.artist_id = $1
             AND pl.is_deleted = false
             AND pl.status = 'pending'`,
          [artistId]
        ),
      ]);

      const grossRevenue = parseFloat(grossRevenueResult.rows[0].gross_revenue);
      const totalExpenses = parseFloat(recoupableExpensesResult.rows[0].total_expenses);
      const totalApplied = parseFloat(appliedRecoupmentResult.rows[0].total_applied);
      const recoupableBalance = totalExpenses - totalApplied;
      const recouped = recoupableBalance <= 0;
      const payableAmount = recouped ? Math.abs(recoupableBalance) : 0;
      const pipelineValue = parseFloat(pipelineResult.rows[0].pipeline_value);
      const atRiskRevenue = parseFloat(atRiskResult.rows[0].at_risk_revenue);

      success(res, {
        artist_id: artistId,
        artist_name: artistCheck[0].name,
        gross_revenue: grossRevenue,
        total_expenses: totalExpenses,
        total_applied_to_recoupment: totalApplied,
        recoupable_balance: recoupableBalance,
        recouped,
        payable: payableAmount,
        pipeline_value: pipelineValue,
        at_risk_revenue: atRiskRevenue,
      }, 'Artist KPIs retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ── Revenue Events ────────────────────────────────────────────────

  // GET /api/v1/kpi/artists/:artistId/revenue
  async listRevenueEvents(req, res, next) {
    try {
      const { artistId } = req.params;
      const { page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const { rows: countRows } = await db.query(
        'SELECT COUNT(*) AS total FROM revenue_events WHERE artist_id = $1',
        [artistId]
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT re.*,
                a.title AS asset_title,
                pl.placed_with AS placement_placed_with
         FROM revenue_events re
         LEFT JOIN assets a ON a.id = re.asset_id
         LEFT JOIN placements pl ON pl.id = re.placement_id
         WHERE re.artist_id = $1
         ORDER BY re.event_date DESC, re.created_at DESC
         LIMIT $2 OFFSET $3`,
        [artistId, parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Revenue events retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/kpi/artists/:artistId/revenue
  async createRevenueEvent(req, res, next) {
    try {
      const { artistId } = req.params;
      const { asset_id, placement_id, amount, amount_applied_to_recoupment, source, description, event_date } = req.body;

      const { rows } = await db.query(
        `INSERT INTO revenue_events
           (artist_id, asset_id, placement_id, amount, amount_applied_to_recoupment, source, description, event_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          artistId,
          asset_id || null,
          placement_id || null,
          amount,
          amount_applied_to_recoupment || 0,
          source || null,
          description || null,
          event_date || null,
        ]
      );

      created(res, rows[0], 'Revenue event created successfully');
    } catch (err) {
      next(err);
    }
  },

  // ── Recoupable Expenses ───────────────────────────────────────────

  // GET /api/v1/kpi/artists/:artistId/expenses
  async listExpenses(req, res, next) {
    try {
      const { artistId } = req.params;
      const { category, page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = ['artist_id = $1'];
      const params = [artistId];
      let paramIdx = 2;

      if (category) {
        conditions.push(`category = $${paramIdx++}`);
        params.push(category);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM recoupable_expenses ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT * FROM recoupable_expenses
         ${whereClause}
         ORDER BY expense_date DESC, created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Recoupable expenses retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/kpi/artists/:artistId/expenses
  async createExpense(req, res, next) {
    try {
      const { artistId } = req.params;
      const { category, amount, description, expense_date } = req.body;

      const { rows } = await db.query(
        `INSERT INTO recoupable_expenses (artist_id, category, amount, description, expense_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [artistId, category, amount, description || null, expense_date || null]
      );

      created(res, rows[0], 'Recoupable expense created successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = kpiController;
