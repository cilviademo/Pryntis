const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

const businessOpsController = {
  // ── Artist Ledger ──────────────────────────────────────────────────
  // GET /api/v1/business/ledger
  // Per-artist financial summary: revenue, expenses, net, recoupment status
  async getLedger(req, res, next) {
    try {
      const { artist_id, sort } = req.query;

      const conditions = ['a.is_deleted = false'];
      const params = [];
      let paramIdx = 1;

      if (artist_id) {
        conditions.push(`a.id = $${paramIdx++}`);
        params.push(artist_id);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const orderCol = sort === 'net' ? 'net' : sort === 'expenses' ? 'total_expenses' : 'total_revenue';

      const { rows } = await db.query(
        `SELECT
           a.id,
           a.name,
           a.stage_name,
           a.genre,
           COALESCE(rev.total_revenue, 0)   AS total_revenue,
           COALESCE(exp.total_expenses, 0)   AS total_expenses,
           COALESCE(rev.total_revenue, 0) - COALESCE(exp.total_expenses, 0) AS net,
           COALESCE(rev.total_recouped, 0)   AS total_recouped,
           COALESCE(exp.total_expenses, 0) - COALESCE(rev.total_recouped, 0) AS recoup_remaining,
           CASE
             WHEN COALESCE(exp.total_expenses, 0) = 0 THEN 'no_expenses'
             WHEN COALESCE(rev.total_recouped, 0) >= COALESCE(exp.total_expenses, 0) THEN 'recouped'
             ELSE 'unrecouped'
           END AS recoup_status,
           COALESCE(rev.event_count, 0)      AS revenue_events,
           COALESCE(exp.expense_count, 0)    AS expense_entries
         FROM artists a
         LEFT JOIN LATERAL (
           SELECT
             SUM(re.amount) AS total_revenue,
             SUM(re.amount_applied_to_recoupment) AS total_recouped,
             COUNT(*) AS event_count
           FROM revenue_events re
           WHERE re.artist_id = a.id
         ) rev ON true
         LEFT JOIN LATERAL (
           SELECT
             SUM(rx.amount) AS total_expenses,
             COUNT(*) AS expense_count
           FROM recoupable_expenses rx
           WHERE rx.artist_id = a.id
         ) exp ON true
         ${whereClause}
         ORDER BY ${orderCol} DESC NULLS LAST
         LIMIT 50`,
        params
      );

      const data = rows.map((r) => ({
        id: r.id,
        name: r.name,
        stage_name: r.stage_name,
        genre: r.genre,
        total_revenue: parseFloat(r.total_revenue),
        total_expenses: parseFloat(r.total_expenses),
        net: parseFloat(r.net),
        total_recouped: parseFloat(r.total_recouped),
        recoup_remaining: parseFloat(r.recoup_remaining),
        recoup_status: r.recoup_status,
        revenue_events: parseInt(r.revenue_events, 10),
        expense_entries: parseInt(r.expense_entries, 10),
      }));

      success(res, data, 'Artist ledger retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ── Recoupment Detail ──────────────────────────────────────────────
  // GET /api/v1/business/recoup/:artistId
  // Detailed recoupment breakdown for a single artist
  async getRecoupDetail(req, res, next) {
    try {
      const { artistId } = req.params;

      const [artistResult, revenueResult, expenseResult] = await Promise.all([
        db.query(
          `SELECT id, name, stage_name, genre FROM artists WHERE id = $1 AND is_deleted = false`,
          [artistId]
        ),
        db.query(
          `SELECT id, amount, amount_applied_to_recoupment, source, description, event_date
           FROM revenue_events
           WHERE artist_id = $1
           ORDER BY event_date DESC`,
          [artistId]
        ),
        db.query(
          `SELECT id, category, amount, description, expense_date
           FROM recoupable_expenses
           WHERE artist_id = $1
           ORDER BY expense_date DESC`,
          [artistId]
        ),
      ]);

      if (artistResult.rows.length === 0) {
        return next(new AppError('Artist not found', 404, 'NOT_FOUND'));
      }

      const artist = artistResult.rows[0];
      const revenue = revenueResult.rows.map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
        amount_applied_to_recoupment: parseFloat(r.amount_applied_to_recoupment),
      }));
      const expenses = expenseResult.rows.map((r) => ({
        ...r,
        amount: parseFloat(r.amount),
      }));

      const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
      const totalRecouped = revenue.reduce((s, r) => s + r.amount_applied_to_recoupment, 0);
      const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

      success(res, {
        artist,
        summary: {
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          total_recouped: totalRecouped,
          recoup_remaining: Math.max(0, totalExpenses - totalRecouped),
          recoup_percentage: totalExpenses > 0
            ? Math.min(100, Math.round((totalRecouped / totalExpenses) * 100))
            : 100,
          is_recouped: totalRecouped >= totalExpenses,
        },
        revenue,
        expenses,
      }, 'Recoupment detail retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ── Producer Points (Ownership Summary) ────────────────────────────
  // GET /api/v1/business/producer-points
  // Aggregated ownership percentages per owner across all assets
  async getProducerPoints(req, res, next) {
    try {
      const { ownership_type } = req.query;

      const conditions = ['a.is_deleted = false'];
      const params = [];
      let paramIdx = 1;

      if (ownership_type) {
        conditions.push(`o.ownership_type = $${paramIdx++}`);
        params.push(ownership_type);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const { rows } = await db.query(
        `SELECT
           o.owner_name,
           o.ownership_type,
           o.pro_affiliation,
           o.ipi_number,
           COUNT(DISTINCT o.asset_id) AS asset_count,
           ROUND(AVG(o.percentage), 2) AS avg_percentage,
           SUM(o.percentage) AS total_points,
           ARRAY_AGG(DISTINCT a.title ORDER BY a.title) FILTER (WHERE a.title IS NOT NULL) AS asset_titles
         FROM ownership_records o
         JOIN assets a ON a.id = o.asset_id
         ${whereClause}
         GROUP BY o.owner_name, o.ownership_type, o.pro_affiliation, o.ipi_number
         ORDER BY total_points DESC, o.owner_name ASC
         LIMIT 100`,
        params
      );

      const data = rows.map((r) => ({
        owner_name: r.owner_name,
        ownership_type: r.ownership_type,
        pro_affiliation: r.pro_affiliation,
        ipi_number: r.ipi_number,
        asset_count: parseInt(r.asset_count, 10),
        avg_percentage: parseFloat(r.avg_percentage),
        total_points: parseFloat(r.total_points),
        asset_titles: r.asset_titles || [],
      }));

      success(res, data, 'Producer points retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ── Ownership Conflicts ────────────────────────────────────────────
  // GET /api/v1/business/ownership-conflicts
  // Find assets where ownership splits exceed 100% for any type
  async getOwnershipConflicts(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT
           a.id AS asset_id,
           a.title,
           a.genre,
           art.name AS artist_name,
           art.stage_name,
           o.ownership_type,
           SUM(o.percentage) AS total_percentage,
           COUNT(*) AS owner_count,
           ARRAY_AGG(
             json_build_object('name', o.owner_name, 'percentage', o.percentage)
             ORDER BY o.percentage DESC
           ) AS owners
         FROM ownership_records o
         JOIN assets a ON a.id = o.asset_id AND a.is_deleted = false
         LEFT JOIN artists art ON art.id = a.artist_id
         GROUP BY a.id, a.title, a.genre, art.name, art.stage_name, o.ownership_type
         HAVING SUM(o.percentage) > 100
         ORDER BY SUM(o.percentage) DESC`
      );

      const data = rows.map((r) => ({
        asset_id: r.asset_id,
        title: r.title,
        genre: r.genre,
        artist_name: r.artist_name,
        stage_name: r.stage_name,
        ownership_type: r.ownership_type,
        total_percentage: parseFloat(r.total_percentage),
        owner_count: parseInt(r.owner_count, 10),
        owners: r.owners,
      }));

      success(res, data, 'Ownership conflicts retrieved');
    } catch (err) {
      next(err);
    }
  },

  // ── Pending Approvals ──────────────────────────────────────────────
  // GET /api/v1/business/approvals
  // Aggregates items needing attention: open urgent/high tasks,
  // pending placements, expiring subscriptions
  async getPendingApprovals(req, res, next) {
    try {
      const [urgentTasks, pendingPlacements, expiringSubs] = await Promise.all([
        db.query(
          `SELECT t.id, t.title, t.priority, t.due_date, t.status,
                  a.stage_name AS artist_name,
                  u.first_name || ' ' || u.last_name AS assigned_to_name
           FROM tasks t
           LEFT JOIN artists a ON a.id = t.artist_id
           LEFT JOIN users u ON u.id = t.assigned_to
           WHERE t.status IN ('open', 'in_progress')
             AND t.priority IN ('urgent', 'high')
           ORDER BY
             CASE t.priority WHEN 'urgent' THEN 1 ELSE 2 END,
             t.due_date ASC NULLS LAST
           LIMIT 20`
        ),
        db.query(
          `SELECT p.id, ast.title AS asset_title, p.placed_with, p.expected_value,
                  p.placement_date, p.placement_type,
                  art.stage_name AS artist_name
           FROM placements p
           JOIN assets ast ON ast.id = p.asset_id
           LEFT JOIN artists art ON art.id = ast.artist_id
           WHERE p.status = 'pending' AND p.is_deleted = false
           ORDER BY p.expected_value DESC NULLS LAST
           LIMIT 20`
        ),
        db.query(
          `SELECT asub.id, a.stage_name, st.name AS tier_name,
                  asub.end_date,
                  asub.end_date - CURRENT_DATE AS days_remaining
           FROM artist_subscriptions asub
           JOIN artists a ON a.id = asub.artist_id
           JOIN subscription_tiers st ON st.id = asub.tier_id
           WHERE asub.status = 'active'
             AND asub.end_date IS NOT NULL
             AND asub.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
           ORDER BY asub.end_date ASC
           LIMIT 20`
        ),
      ]);

      success(res, {
        urgent_tasks: urgentTasks.rows.map((r) => ({
          ...r,
          expected_value: r.expected_value ? parseFloat(r.expected_value) : undefined,
        })),
        pending_placements: pendingPlacements.rows.map((r) => ({
          ...r,
          expected_value: parseFloat(r.expected_value),
        })),
        expiring_subscriptions: expiringSubs.rows.map((r) => ({
          ...r,
          days_remaining: parseInt(r.days_remaining, 10),
        })),
      }, 'Pending approvals retrieved');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = businessOpsController;
