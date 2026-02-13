const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');
const { logAudit } = require('../middleware/auditLog');

const authController = {
  // POST /api/v1/auth/register — admin only
  async register(req, res, next) {
    try {
      const { email, password, first_name, last_name, role } = req.body;

      const { rows: existing } = await db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      if (existing.length > 0) {
        throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');
      }

      const passwordHash = await bcrypt.hash(password, 12);

      const { rows } = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
        [email, passwordHash, first_name, last_name, role || 'viewer']
      );

      created(res, rows[0], 'User created successfully');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const { rows } = await db.query(
        'SELECT id, email, first_name, last_name, role, is_active, password_hash, token_version FROM users WHERE email = $1',
        [email]
      );
      const user = rows[0];

      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      if (!user.is_active) {
        throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          token_version: user.token_version,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      logAudit(user.id, 'auth.login', 'user', user.id);

      success(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
        },
      }, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/auth/me
  async getProfile(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
         FROM users WHERE id = $1`,
        [req.user.id]
      );
      const user = rows[0];

      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      success(res, user, 'Profile retrieved');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/auth/me
  async updateProfile(req, res, next) {
    try {
      const { first_name, last_name, email } = req.body;

      const sets = [];
      const values = [];
      let idx = 1;

      if (first_name !== undefined) {
        sets.push(`first_name = $${idx++}`);
        values.push(first_name);
      }
      if (last_name !== undefined) {
        sets.push(`last_name = $${idx++}`);
        values.push(last_name);
      }
      if (email !== undefined) {
        // Check for duplicate email
        const { rows: dup } = await db.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, req.user.id]
        );
        if (dup.length > 0) {
          throw new AppError('Email already in use', 409, 'DUPLICATE_EMAIL');
        }
        sets.push(`email = $${idx++}`);
        values.push(email);
      }

      if (sets.length === 0) {
        const { rows } = await db.query(
          `SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at
           FROM users WHERE id = $1`,
          [req.user.id]
        );
        if (!rows[0]) {
          throw new AppError('User not found', 404, 'NOT_FOUND');
        }
        return success(res, rows[0], 'Profile retrieved (no changes)');
      }

      values.push(req.user.id);
      const { rows } = await db.query(
        `UPDATE users SET ${sets.join(', ')}, updated_at = NOW()
         WHERE id = $${idx}
         RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
        values
      );

      if (!rows[0]) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Profile updated');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
