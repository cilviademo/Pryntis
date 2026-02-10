const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const passController = {
  // ── Subscription Tiers ────────────────────────────────────────────

  // GET /api/v1/passes/tiers
  async listTiers(req, res, next) {
    try {
      const { page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const { rows: countRows } = await db.query('SELECT COUNT(*) AS total FROM subscription_tiers');
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT * FROM subscription_tiers
         ORDER BY access_level ASC
         LIMIT $1 OFFSET $2`,
        [parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Subscription tiers retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/passes/tiers
  async createTier(req, res, next) {
    try {
      const { name, description, access_level, features, price_monthly, is_active } = req.body;

      const { rows } = await db.query(
        `INSERT INTO subscription_tiers (name, description, access_level, features, price_monthly, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [name, description || null, access_level, features || null, price_monthly, is_active !== undefined ? is_active : true]
      );

      created(res, rows[0], 'Subscription tier created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/passes/tiers/:id
  async updateTier(req, res, next) {
    try {
      const allowedFields = ['name', 'description', 'access_level', 'features', 'price_monthly', 'is_active'];
      const sets = [];
      const values = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (sets.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
      }

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE subscription_tiers SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Subscription tier not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Subscription tier updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // ── Artist Subscriptions ──────────────────────────────────────────

  // GET /api/v1/passes/subscriptions
  async listSubscriptions(req, res, next) {
    try {
      const { artist_id, status, page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (artist_id) {
        conditions.push(`asub.artist_id = $${paramIdx++}`);
        params.push(artist_id);
      }

      if (status) {
        conditions.push(`asub.status = $${paramIdx++}`);
        params.push(status);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM artist_subscriptions asub ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT asub.*, a.name AS artist_name, a.stage_name,
                st.name AS tier_name, st.access_level, st.price_monthly
         FROM artist_subscriptions asub
         JOIN artists a ON a.id = asub.artist_id
         JOIN subscription_tiers st ON st.id = asub.tier_id
         ${whereClause}
         ORDER BY asub.created_at DESC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Subscriptions retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/passes/subscriptions
  async createSubscription(req, res, next) {
    try {
      const { artist_id, tier_id, status, start_date, end_date } = req.body;

      const { rows } = await db.query(
        `INSERT INTO artist_subscriptions (artist_id, tier_id, status, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [artist_id, tier_id, status || 'active', start_date || null, end_date || null]
      );

      created(res, rows[0], 'Subscription created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/passes/subscriptions/:id
  async updateSubscription(req, res, next) {
    try {
      const allowedFields = ['tier_id', 'status', 'start_date', 'end_date'];
      const sets = [];
      const values = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (sets.length === 0) {
        throw new AppError('No valid fields to update', 400, 'NO_FIELDS');
      }

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE artist_subscriptions SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Subscription not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Subscription updated successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = passController;
