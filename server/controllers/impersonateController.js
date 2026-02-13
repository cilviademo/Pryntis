const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

/**
 * Admin Impersonation Controller for Pryntis.
 *
 * Allows admin/owner users to impersonate another user for support and
 * debugging purposes. Generates short-lived impersonation tokens and
 * logs all impersonation activity to the audit_log table.
 *
 * Security constraints:
 * - Only admin or owner roles may impersonate
 * - Cannot impersonate yourself
 * - Cannot impersonate another admin or owner
 * - Impersonation tokens are short-lived (1 hour)
 * - All impersonation events are audited
 */

const impersonateController = {
  /**
   * POST /admin/impersonate/:userId
   * Start impersonating a target user.
   */
  async impersonateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const impersonator = req.user;

      // Cannot impersonate yourself
      if (userId === impersonator.id) {
        throw new AppError(
          'You cannot impersonate yourself',
          400,
          'IMPERSONATE_SELF'
        );
      }

      // Fetch target user
      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, role, is_active, token_version
         FROM users WHERE id = $1`,
        [userId]
      );

      if (!rows.length) {
        throw new AppError('Target user not found', 404, 'NOT_FOUND');
      }

      const target = rows[0];

      // Cannot impersonate inactive users
      if (!target.is_active) {
        throw new AppError(
          'Cannot impersonate a deactivated user',
          400,
          'USER_INACTIVE'
        );
      }

      // Cannot impersonate another admin or owner (security escalation guard)
      if (target.role === 'admin' || target.role === 'owner') {
        throw new AppError(
          'Cannot impersonate admin or owner accounts',
          403,
          'IMPERSONATE_PRIVILEGED'
        );
      }

      // Generate short-lived impersonation JWT (1 hour)
      const token = jwt.sign(
        {
          sub: target.id,
          id: target.id,
          email: target.email,
          role: target.role,
          token_version: target.token_version,
          impersonator_id: impersonator.id,
          is_impersonation: true,
        },
        config.jwtSecret,
        { expiresIn: '1h' }
      );

      // Audit log
      await db.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          impersonator.id,
          'impersonate',
          'user',
          target.id,
          JSON.stringify({
            impersonator_id: impersonator.id,
            impersonator_email: impersonator.email,
            target_email: target.email,
            target_role: target.role,
          }),
        ]
      );

      success(res, {
        token,
        user: {
          id: target.id,
          email: target.email,
          first_name: target.first_name,
          last_name: target.last_name,
          role: target.role,
        },
        impersonator: {
          id: impersonator.id,
          email: impersonator.email,
        },
      }, 'Impersonation started');
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /admin/exit-impersonation
   * Exit impersonation and return to the original admin/owner session.
   *
   * The impersonator_id is read from the JWT claims (set during impersonation).
   * A fresh normal JWT is generated for the original user.
   */
  async exitImpersonation(req, res, next) {
    try {
      // Decode the current token to read impersonator_id
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
      }

      const rawToken = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(rawToken, config.jwtSecret);
      } catch (err) {
        throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
      }

      if (!decoded.is_impersonation || !decoded.impersonator_id) {
        throw new AppError(
          'Current session is not an impersonation session',
          400,
          'NOT_IMPERSONATING'
        );
      }

      const impersonatorId = decoded.impersonator_id;

      // Fetch the original user (impersonator)
      const { rows } = await db.query(
        `SELECT id, email, first_name, last_name, role, is_active, token_version
         FROM users WHERE id = $1`,
        [impersonatorId]
      );

      if (!rows.length) {
        throw new AppError('Original user not found', 404, 'NOT_FOUND');
      }

      const originalUser = rows[0];

      if (!originalUser.is_active) {
        throw new AppError(
          'Original account has been deactivated',
          403,
          'ACCOUNT_DISABLED'
        );
      }

      // Generate a normal (non-impersonation) JWT for the original user
      const token = jwt.sign(
        {
          sub: originalUser.id,
          id: originalUser.id,
          email: originalUser.email,
          role: originalUser.role,
          token_version: originalUser.token_version,
        },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      // Audit log
      await db.query(
        `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          impersonatorId,
          'exit_impersonate',
          'user',
          decoded.sub || decoded.id,
          JSON.stringify({
            impersonator_id: impersonatorId,
            impersonator_email: originalUser.email,
            impersonated_user_id: decoded.sub || decoded.id,
          }),
        ]
      );

      success(res, {
        token,
        user: {
          id: originalUser.id,
          email: originalUser.email,
          first_name: originalUser.first_name,
          last_name: originalUser.last_name,
          role: originalUser.role,
        },
      }, 'Impersonation ended');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = impersonateController;
