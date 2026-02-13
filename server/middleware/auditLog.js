'use strict';
const db = require('../config/db');

/**
 * Log an action to the audit_log table.
 * Call from controllers after significant operations.
 */
async function logAudit(userId, action, entityType, entityId, details = {}) {
  try {
    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entityType, entityId || null, JSON.stringify(details)]
    );
  } catch (err) {
    // Never let audit logging break the main flow
    console.error('[audit] Failed to log:', err.message);
  }
}

/**
 * Express middleware factory that logs the request after it completes.
 * Usage: router.post('/login', auditMiddleware('auth.login', 'user'), controller.login)
 */
function auditMiddleware(action, entityType) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      // Log only on success responses
      if (res.statusCode < 400 && req.user) {
        const entityId = req.params.id || body?.data?.id || null;
        logAudit(req.user.id, action, entityType, entityId).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { logAudit, auditMiddleware };
