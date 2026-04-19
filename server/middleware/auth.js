const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');
const { AppError } = require('./errorHandler');

/**
 * Enhanced authentication middleware.
 *
 * 1. Extracts and verifies the JWT from the Authorization header.
 * 2. Ensures the token contains a `token_version` claim.
 * 3. Looks up the user in the database and verifies:
 *    - The account is active (is_active === true).
 *    - The token_version in the JWT matches the stored token_version
 *      (allows instant invalidation of all outstanding tokens).
 * 4. Attaches the full user object { id, email, role, token_version }
 *    to req.user for downstream middleware / route handlers.
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwtSecret);
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }

  // Ensure the JWT includes a token_version claim
  if (decoded.token_version === undefined || decoded.token_version === null) {
    return next(new AppError('Invalid token: missing token version', 401, 'INVALID_TOKEN'));
  }

  // Look up the user in the database
  try {
    const { rows } = await db.query(
      'SELECT id, email, role, is_active, token_version FROM users WHERE id = $1',
      [decoded.sub || decoded.id]
    );

    if (rows.length === 0) {
      return next(new AppError('User not found', 401, 'INVALID_TOKEN'));
    }

    const user = rows[0];

    // Verify the account is still active
    if (!user.is_active) {
      return next(new AppError('Account has been deactivated', 401, 'ACCOUNT_DISABLED'));
    }

    // Verify token version matches (allows token revocation)
    if (user.token_version !== decoded.token_version) {
      return next(new AppError('Token has been revoked', 401, 'TOKEN_REVOKED'));
    }

    // Attach verified user info to the request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
      // Impersonation context — passed through from JWT claims
      is_impersonation: !!decoded.is_impersonation,
      impersonator_id: decoded.impersonator_id || null,
    };

    next();
  } catch (err) {
    return next(new AppError('Authentication failed', 500, 'INTERNAL_ERROR'));
  }
}

module.exports = authenticate;
