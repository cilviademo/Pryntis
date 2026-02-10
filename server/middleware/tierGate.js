const db = require('../config/db');
const { AppError } = require('./errorHandler');

/**
 * Middleware factory that enforces subscription-tier access.
 *
 * Checks whether the artist (identified from the request) has an
 * active subscription whose tier access_level is >= the required level.
 *
 * Artist ID resolution order:
 *   1. req.body.artist_id
 *   2. req.params.artistId
 *   3. req.params.artist_id
 *
 * @param {number} minLevel - Minimum access_level required (1-5)
 * @returns {Function} Express middleware
 */
function requireTier(minLevel) {
  return async (req, res, next) => {
    // Resolve artist_id from multiple possible sources
    const artistId =
      (req.body && req.body.artist_id) ||
      (req.params && (req.params.artistId || req.params.artist_id));

    if (!artistId) {
      return next(
        new AppError(
          'Artist identification required for tier check',
          400,
          'ARTIST_ID_REQUIRED'
        )
      );
    }

    try {
      const { rows } = await db.query(
        `SELECT st.access_level
         FROM artist_subscriptions AS sub
         JOIN subscription_tiers AS st ON st.id = sub.tier_id
         WHERE sub.artist_id = $1
           AND sub.status = 'active'
           AND st.access_level >= $2
         LIMIT 1`,
        [artistId, minLevel]
      );

      if (rows.length === 0) {
        return next(
          new AppError(
            `This action requires a subscription tier with access level ${minLevel} or higher`,
            403,
            'TIER_REQUIRED'
          )
        );
      }

      // Attach the resolved access level for downstream handlers
      req.tierAccessLevel = rows[0].access_level;
      next();
    } catch (err) {
      return next(
        new AppError('Failed to verify subscription tier', 500, 'INTERNAL_ERROR')
      );
    }
  };
}

module.exports = { requireTier };
