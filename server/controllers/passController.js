const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

// Tier-based asset limits
const TIER_LIMITS = {
  1: { assets: 5,   placements: 2,   label: 'Free' },
  2: { assets: 25,  placements: 10,  label: 'Basic' },
  3: { assets: -1,  placements: -1,  label: 'Pro' },       // -1 = unlimited
  5: { assets: -1,  placements: -1,  label: 'Enterprise' },
};

/**
 * Insert an audit_log entry (fire-and-forget, never throws).
 */
async function audit(userId, action, entityType, entityId, details = {}) {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId, JSON.stringify(details)]
    );
  } catch (_) { /* best-effort */ }
}

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

      // Enrich each tier with its limits
      const enriched = rows.map((tier) => ({
        ...tier,
        limits: TIER_LIMITS[tier.access_level] || TIER_LIMITS[1],
      }));

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, enriched, 'Subscription tiers retrieved', 200, pagination);
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

      await audit(req.user.id, 'tier_created', 'subscription_tier', rows[0].id, { name, access_level });
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

      await audit(req.user.id, 'tier_updated', 'subscription_tier', rows[0].id, req.body);
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

      await audit(req.user.id, 'subscription_created', 'artist_subscription', rows[0].id, { artist_id, tier_id, status: status || 'active' });
      created(res, rows[0], 'Subscription created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/passes/subscriptions/:id
  async updateSubscription(req, res, next) {
    try {
      // Fetch the old subscription for audit diff
      const { rows: oldRows } = await db.query(
        `SELECT asub.*, st.name AS tier_name FROM artist_subscriptions asub
         JOIN subscription_tiers st ON st.id = asub.tier_id
         WHERE asub.id = $1`,
        [req.params.id]
      );
      const oldSub = oldRows[0];

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

      // Audit with before/after
      const details = { changes: req.body };
      if (oldSub) {
        details.previous_tier = oldSub.tier_name;
        details.previous_status = oldSub.status;
      }
      await audit(req.user.id, 'subscription_updated', 'artist_subscription', rows[0].id, details);

      success(res, rows[0], 'Subscription updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // ── Tier Limits ───────────────────────────────────────────────────

  // GET /api/v1/passes/limits/:artistId — returns usage vs limits
  async getArtistLimits(req, res, next) {
    try {
      const { artistId } = req.params;

      // Get active subscription tier
      const { rows: subRows } = await db.query(
        `SELECT st.access_level, st.name AS tier_name
         FROM artist_subscriptions asub
         JOIN subscription_tiers st ON st.id = asub.tier_id
         WHERE asub.artist_id = $1 AND asub.status = 'active'
         ORDER BY st.access_level DESC LIMIT 1`,
        [artistId]
      );

      const accessLevel = subRows[0]?.access_level || 0;
      const tierName = subRows[0]?.tier_name || 'None';
      const limits = TIER_LIMITS[accessLevel] || { assets: 0, placements: 0, label: 'No Subscription' };

      // Count current usage
      const { rows: assetCount } = await db.query(
        `SELECT COUNT(*) AS count FROM assets WHERE artist_id = $1 AND deleted_at IS NULL`, [artistId]
      );
      const { rows: placementCount } = await db.query(
        `SELECT COUNT(*) AS count FROM placements WHERE artist_id = $1`, [artistId]
      );

      success(res, {
        artist_id: artistId,
        tier_name: tierName,
        access_level: accessLevel,
        limits: {
          assets: limits.assets,
          placements: limits.placements,
        },
        usage: {
          assets: parseInt(assetCount[0].count, 10),
          placements: parseInt(placementCount[0].count, 10),
        },
        at_limit: {
          assets: limits.assets > 0 && parseInt(assetCount[0].count, 10) >= limits.assets,
          placements: limits.placements > 0 && parseInt(placementCount[0].count, 10) >= limits.placements,
        },
      }, 'Tier limits retrieved');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/passes/feature-matrix — returns all tiers with limits
  async featureMatrix(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT id, name, description, access_level, features, price_monthly
         FROM subscription_tiers WHERE is_active = true ORDER BY access_level ASC`
      );

      const matrix = rows.map((tier) => ({
        ...tier,
        limits: TIER_LIMITS[tier.access_level] || TIER_LIMITS[1],
      }));

      success(res, matrix, 'Feature matrix retrieved');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/passes/audit — returns recent audit log entries
  async listAuditLog(req, res, next) {
    try {
      const { page = 1, limit = 50 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 50, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const { rows: countRows } = await db.query('SELECT COUNT(*) AS total FROM audit_log');
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT al.*, u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email
         FROM audit_log al
         LEFT JOIN users u ON u.id = al.user_id
         ORDER BY al.created_at DESC
         LIMIT $1 OFFSET $2`,
        [parsedLimit, offset]
      );

      const pagination = { page: parsedPage, limit: parsedLimit, total, totalPages: Math.ceil(total / parsedLimit) };
      success(res, rows, 'Audit log retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },
};

module.exports = passController;
