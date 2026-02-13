'use strict';

/**
 * Additional security headers beyond Helmet defaults.
 * Applied globally to all responses.
 */
function securityHeaders(_req, res, next) {
  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Restrict referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict browser features
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  // Prevent clickjacking — Superset embeds allowed via CSP frame-ancestors
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  next();
}

module.exports = { securityHeaders };
