const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success } = require('../utils/response');

// Internal helper
// Exported so other controllers (e.g. calendarController) can create
// notifications without going through HTTP.

const VALID_NOTIFICATION_TYPES = ['info', 'warning', 'action', 'success'];

/**
 * Insert a notification row for a given user.
 *
 * @param {string}  userId  - UUID of the recipient user
 * @param {string}  type    - One of: info, warning, action, success
 * @param {string}  title   - Short headline (max 255 chars)
 * @param {string}  [body]  - Optional longer description
 * @param {string}  [linkUrl] - Optional deep-link URL
 * @returns {object} The newly created notification row
 */
async function createNotification(userId, type, title, body, linkUrl) {
  if (!userId || !title) {
    throw new Error('createNotification requires userId and title');
  }

  const safeType = VALID_NOTIFICATION_TYPES.includes(type) ? type : 'info';

  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, link_url)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, safeType, title, body || null, linkUrl || null]
  );

  return rows[0];
}

// Route handlers

const notificationController = {
  // GET /api/v1/notifications?unread_only=true
  async listNotifications(req, res, next) {
    try {
      const { unread_only } = req.query;

      const conditions = ['n.user_id = $1'];
      const params = [req.user.id];
      let paramIdx = 2;

      if (unread_only === 'true') {
        conditions.push('n.is_read = false');
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Fetch notifications (capped at 50)
      const { rows } = await db.query(
        `SELECT n.*
         FROM notifications n
         ${whereClause}
         ORDER BY n.created_at DESC
         LIMIT 50`,
        params
      );

      // Unread count (always useful for badge UI)
      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS unread_count
         FROM notifications
         WHERE user_id = $1 AND is_read = false`,
        [req.user.id]
      );
      const unreadCount = parseInt(countRows[0].unread_count, 10);

      success(res, { notifications: rows, unread_count: unreadCount }, 'Notifications retrieved');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/notifications/:id/read
  async markRead(req, res, next) {
    try {
      const { rows } = await db.query(
        `UPDATE notifications
         SET is_read = true
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [req.params.id, req.user.id]
      );

      if (!rows[0]) {
        throw new AppError('Notification not found', 404, 'NOT_FOUND');
      }

      success(res, rows[0], 'Notification marked as read');
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/notifications/read-all
  async markAllRead(req, res, next) {
    try {
      const { rowCount } = await db.query(
        `UPDATE notifications
         SET is_read = true
         WHERE user_id = $1 AND is_read = false`,
        [req.user.id]
      );

      success(res, { updated: rowCount }, 'All notifications marked as read');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = {
  ...notificationController,
  createNotification,
};
