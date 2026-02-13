const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const contactController = {
  // GET /api/v1/contacts
  async list(req, res, next) {
    try {
      const { q, type, tag, page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = [];
      const params = [];
      let paramIdx = 1;

      if (q && q.trim()) {
        conditions.push(`(name ILIKE $${paramIdx} OR organization ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
        params.push(`%${q.trim()}%`);
        paramIdx++;
      }

      if (type) {
        conditions.push(`role = $${paramIdx++}`);
        params.push(type);
      }

      if (tag) {
        conditions.push(`$${paramIdx++} = ANY(tags)`);
        params.push(tag);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM contacts ${whereClause}`,
        params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT * FROM contacts ${whereClause}
         ORDER BY name ASC
         LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
        [...params, parsedLimit, offset]
      );

      const pagination = { page: parsedPage, limit: parsedLimit, total, totalPages: Math.ceil(total / parsedLimit) };
      success(res, rows, 'Contacts retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/contacts/:id
  async get(req, res, next) {
    try {
      const { rows } = await db.query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
      if (!rows[0]) throw new AppError('Contact not found', 404, 'NOT_FOUND');
      success(res, rows[0], 'Contact retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/contacts
  async create(req, res, next) {
    try {
      const { name, organization, role, email, phone, notes, tags, relationship_strength } = req.body;
      const { rows } = await db.query(
        `INSERT INTO contacts (name, organization, role, email, phone, notes, tags, relationship_strength)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [name, organization || null, role || null, email || null, phone || null, notes || null, tags || '{}', relationship_strength || null]
      );
      created(res, rows[0], 'Contact created');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/contacts/:id
  async update(req, res, next) {
    try {
      const allowedFields = ['name', 'organization', 'role', 'email', 'phone', 'notes', 'tags', 'relationship_strength'];
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
        `UPDATE contacts SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
        values
      );

      if (!rows[0]) throw new AppError('Contact not found', 404, 'NOT_FOUND');
      success(res, rows[0], 'Contact updated');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/contacts/:id
  async remove(req, res, next) {
    try {
      const { rows } = await db.query('DELETE FROM contacts WHERE id = $1 RETURNING *', [req.params.id]);
      if (!rows[0]) throw new AppError('Contact not found', 404, 'NOT_FOUND');
      success(res, null, 'Contact deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = contactController;
