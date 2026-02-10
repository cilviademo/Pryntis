const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const artistController = {
  // GET /api/v1/artists
  async list(req, res, next) {
    try {
      const {
        q,
        status,
        genre,
        sortBy = 'created_at',
        sortDir = 'DESC',
        page = 1,
        limit = 25,
      } = req.query;

      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;
      const direction = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      const safeSortBy = /^[\w.]+$/.test(sortBy) ? sortBy : 'created_at';

      const conditions = ['is_deleted = false'];
      const params = [];
      let paramIdx = 1;
      let selectExtra = '';
      let orderClause = `ORDER BY ${safeSortBy} ${direction}`;

      // Full-text search
      if (q && q.trim()) {
        conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIdx})`);
        selectExtra = `, ts_rank(search_vector, plainto_tsquery('english', $${paramIdx})) AS rank`;
        params.push(q.trim());
        paramIdx++;
        orderClause = `ORDER BY rank DESC, ${safeSortBy} ${direction}`;
      }

      if (status) {
        conditions.push(`status = $${paramIdx}`);
        params.push(status);
        paramIdx++;
      }

      if (genre) {
        conditions.push(`genre = $${paramIdx}`);
        params.push(genre);
        paramIdx++;
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Count query
      const countSql = `SELECT COUNT(*) AS total FROM artists ${whereClause}`;
      const { rows: countRows } = await db.query(countSql, params);
      const total = parseInt(countRows[0].total, 10);

      // Data query
      const dataSql = `SELECT *${selectExtra} FROM artists ${whereClause} ${orderClause} LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
      const { rows } = await db.query(dataSql, [...params, parsedLimit, offset]);

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows, 'Artists retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/artists/:id
  async getById(req, res, next) {
    try {
      const { rows } = await db.query(
        'SELECT * FROM artists WHERE id = $1 AND is_deleted = false',
        [req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Artist not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Artist retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/artists
  async create(req, res, next) {
    try {
      const { name, stage_name, email, phone, bio, genre, status, notes } = req.body;

      const { rows } = await db.query(
        `INSERT INTO artists (name, stage_name, email, phone, bio, genre, status, notes, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [name, stage_name || null, email || null, phone || null, bio || null, genre || null, status || 'active', notes || null, req.user.id]
      );

      created(res, rows[0], 'Artist created successfully');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/artists/:id
  async update(req, res, next) {
    try {
      const allowedFields = ['name', 'stage_name', 'email', 'phone', 'bio', 'genre', 'status', 'notes'];
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

      // Always set updated_by
      sets.push(`updated_by = $${idx++}`);
      values.push(req.user.id);

      values.push(req.params.id);
      const { rows } = await db.query(
        `UPDATE artists SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx} AND is_deleted = false
         RETURNING *`,
        values
      );

      if (!rows[0]) {
        throw new AppError('Artist not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Artist updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/artists/:id — soft delete
  async softDelete(req, res, next) {
    try {
      const { rows } = await db.query(
        `UPDATE artists SET is_deleted = true, deleted_at = NOW(), updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND is_deleted = false
         RETURNING *`,
        [req.user.id, req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Artist not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Artist archived successfully');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/artists/:id/restore — admin only
  async restore(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        throw new AppError('Only admins can restore artists', 403, 'FORBIDDEN');
      }

      const { rows } = await db.query(
        `UPDATE artists SET is_deleted = false, deleted_at = NULL, updated_by = $1, updated_at = NOW()
         WHERE id = $2 AND is_deleted = true
         RETURNING *`,
        [req.user.id, req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('Deleted artist not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Artist restored successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = artistController;
