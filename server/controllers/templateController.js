const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const templateController = {
  // GET /api/v1/templates
  async list(req, res, next) {
    try {
      const { q, category, page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (q && q.trim()) {
        conditions.push(`(title ILIKE $${paramIdx} OR body ILIKE $${paramIdx})`);
        params.push(`%${q.trim()}%`);
        paramIdx++;
      }

      if (category) {
        conditions.push(`category = $${paramIdx++}`);
        params.push(category);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM templates ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT t.*, u.first_name || ' ' || u.last_name AS created_by_name
         FROM templates t
         LEFT JOIN users u ON u.id = t.created_by
         ${whereClause}
         ORDER BY t.category ASC, t.title ASC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = { page: parsedPage, limit: parsedLimit, total, totalPages: Math.ceil(total / parsedLimit) };
      success(res, rows, 'Templates retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/templates/:id
  async get(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT t.*, u.first_name || ' ' || u.last_name AS created_by_name
         FROM templates t LEFT JOIN users u ON u.id = t.created_by
         WHERE t.id = $1`,
        [req.params.id]
      );
      if (!rows[0]) throw new AppError('Template not found', 404, 'NOT_FOUND');
      success(res, rows[0], 'Template retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/templates
  async create(req, res, next) {
    try {
      const { title, category, body, source_url } = req.body;
      if (!title || !category || !body) {
        throw new AppError('Title, category, and body are required', 400, 'VALIDATION_ERROR');
      }
      const { rows } = await db.query(
        `INSERT INTO templates (title, category, body, source_url, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [title, category, body, source_url || null, req.user.id]
      );
      created(res, rows[0], 'Template created');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/templates/:id
  async update(req, res, next) {
    try {
      const allowedFields = ['title', 'category', 'body', 'source_url'];
      const sets = [];
      const values = [];
      let idx = 1;

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sets.push(`${field} = $${idx++}`);
          values.push(req.body[field]);
        }
      }

      if (sets.length === 0) throw new AppError('No valid fields to update', 400, 'NO_FIELDS');

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE templates SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
        values
      );

      if (!rows[0]) throw new AppError('Template not found', 404, 'NOT_FOUND');
      success(res, rows[0], 'Template updated');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/templates/validate — mock auto-validation
  async validateTemplates(req, res, next) {
    try {
      const { rows } = await db.query(
        `UPDATE templates SET last_verified_at = NOW(), verification_status = 'verified', updated_at = NOW()
         RETURNING id, title, last_verified_at, verification_status`
      );
      success(res, { validated: rows.length, templates: rows }, `Validated ${rows.length} templates`);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/templates/:id
  async remove(req, res, next) {
    try {
      const { rows } = await db.query('DELETE FROM templates WHERE id = $1 RETURNING *', [req.params.id]);
      if (!rows[0]) throw new AppError('Template not found', 404, 'NOT_FOUND');
      success(res, null, 'Template deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = templateController;
