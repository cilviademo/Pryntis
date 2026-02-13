'use strict';
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

const auditController = {
  async list(req, res, next) {
    try {
      if (!['admin', 'owner'].includes(req.user.role)) {
        throw new AppError('Only admins can view audit logs', 403, 'FORBIDDEN');
      }
      const { page = 1, limit = 50, action, entity_type, user_id } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = [];
      const params = [];
      let idx = 1;

      if (action) { conditions.push(`al.action = $${idx++}`); params.push(action); }
      if (entity_type) { conditions.push(`al.entity_type = $${idx++}`); params.push(entity_type); }
      if (user_id) { conditions.push(`al.user_id = $${idx++}`); params.push(user_id); }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM audit_log al ${where}`, params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT al.*, u.first_name, u.last_name, u.email AS user_email
         FROM audit_log al
         LEFT JOIN users u ON al.user_id = u.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parsedLimit, offset]
      );

      success(res, rows.map(r => ({
        id: r.id,
        user_id: r.user_id,
        user_name: r.first_name ? `${r.first_name} ${r.last_name}` : null,
        action: r.action,
        entity_type: r.entity_type,
        entity_id: r.entity_id,
        details: r.details,
        created_at: r.created_at,
      })), 'Audit log retrieved', 200, {
        page: parsedPage, limit: parsedLimit, total,
        totalPages: Math.ceil(total / parsedLimit),
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = auditController;
