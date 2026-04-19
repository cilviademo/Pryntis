// Centralized error handling middleware

/**
 * Extract a human-readable field name from a Postgres unique-violation
 * detail string, e.g. "Key (email)=(foo@bar.com) already exists."
 */
function parseDuplicateDetail(detail) {
  if (!detail) return null;
  const match = detail.match(/Key \((.+?)\)=/);
  return match ? match[1] : null;
}

function errorHandler(err, req, res, _next) {
  // Handle Postgres duplicate-key errors (code 23505)
  if (err.code === '23505') {
    const field = parseDuplicateDetail(err.detail);
    const message = field
      ? `A record with that ${field} already exists`
      : 'A record with that value already exists';

    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_ENTRY',
        message,
        details: field ? [{ field, message }] : [],
      },
    });
  }

  // Handle AppError and generic errors
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log server-side only — redact sensitive data
  if (statusCode >= 500) {
    const safeUrl = (req.originalUrl || '').split('?')[0];
    console.error(`[ERROR] ${req.method} ${safeUrl} — ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  // Never expose internal details or stack traces to the client
  const clientMessage = statusCode >= 500
    ? 'An unexpected error occurred'
    : (err.message || 'An unexpected error occurred');

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: clientMessage,
      details: err.details || [],
    },
  });
}

// Custom application error class
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

module.exports = { errorHandler, AppError };
