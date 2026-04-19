const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');
const { safeUser } = require('../utils/serializers');

const userController = {
  // GET /api/v1/users — admin/owner only
  async list(req, res, next) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'owner') {
        throw new AppError('Only admins can list users', 403, 'FORBIDDEN');
      }

      const { page = 1, limit = 25 } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 25, 100));
      const offset = (parsedPage - 1) * parsedLimit;

      const { rows: countRows } = await db.query('SELECT COUNT(*) AS total FROM users');
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
         FROM users
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [parsedLimit, offset]
      );

      const pagination = {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages: Math.ceil(total / parsedLimit),
      };

      success(res, rows.map(safeUser), 'Users retrieved', 200, pagination);
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/users/:id
  async getById(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
         FROM users WHERE id = $1`,
        [req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      success(res, safeUser(rows[0]), 'User retrieved');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/users/:id — admin/owner can change role, is_active
  async update(req, res, next) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'owner') {
        throw new AppError('Only admins can update users', 403, 'FORBIDDEN');
      }

      const allowedFields = ['first_name', 'last_name', 'email', 'role', 'is_active'];
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
        `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
        values
      );

      if (!rows[0]) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      success(res, safeUser(rows[0]), 'User updated successfully');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/users/:id/deactivate — admin/owner only
  async deactivate(req, res, next) {
    try {
      if (req.user.role !== 'admin' && req.user.role !== 'owner') {
        throw new AppError('Only admins can deactivate users', 403, 'FORBIDDEN');
      }

      const { rows } = await db.query(
        `UPDATE users
         SET is_active = false, token_version = token_version + 1, updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
        [req.params.id]
      );

      if (!rows[0]) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      success(res, safeUser(rows[0]), 'User deactivated successfully');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = userController;
