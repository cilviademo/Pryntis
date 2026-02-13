const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const VALID_REACTIONS = ['thumbs_up', 'eyes', 'check', 'alert'];

const activityController = {
  // POST /api/v1/activity/:activityId/reactions
  async addReaction(req, res, next) {
    try {
      const { activityId } = req.params;
      const { reaction } = req.body;

      if (!VALID_REACTIONS.includes(reaction)) {
        throw new AppError(`Reaction must be one of: ${VALID_REACTIONS.join(', ')}`, 400, 'VALIDATION_ERROR');
      }

      const { rows: actCheck } = await db.query('SELECT id FROM activity_feed WHERE id = $1', [activityId]);
      if (!actCheck[0]) throw new AppError('Activity not found', 404, 'NOT_FOUND');

      const { rows } = await db.query(
        `INSERT INTO activity_reactions (activity_id, user_id, reaction)
         VALUES ($1, $2, $3)
         ON CONFLICT (activity_id, user_id, reaction) DO NOTHING
         RETURNING *`,
        [activityId, req.user.id, reaction]
      );

      if (rows.length === 0) {
        return success(res, null, 'Reaction already exists');
      }
      created(res, rows[0], 'Reaction added');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/activity/:activityId/reactions/:reaction
  async removeReaction(req, res, next) {
    try {
      const { activityId, reaction } = req.params;

      await db.query(
        'DELETE FROM activity_reactions WHERE activity_id = $1 AND user_id = $2 AND reaction = $3',
        [activityId, req.user.id, reaction]
      );

      success(res, null, 'Reaction removed');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/activity/:activityId/reactions
  async listReactions(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT ar.*, u.first_name, u.last_name
         FROM activity_reactions ar
         JOIN users u ON u.id = ar.user_id
         WHERE ar.activity_id = $1
         ORDER BY ar.created_at ASC`,
        [req.params.activityId]
      );
      success(res, rows, 'Reactions retrieved');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/activity/:activityId/comments — manager/admin only
  async addComment(req, res, next) {
    try {
      const { activityId } = req.params;
      const { body } = req.body;

      if (!body || !body.trim()) {
        throw new AppError('Comment body is required', 400, 'VALIDATION_ERROR');
      }

      const { rows: actCheck } = await db.query('SELECT id FROM activity_feed WHERE id = $1', [activityId]);
      if (!actCheck[0]) throw new AppError('Activity not found', 404, 'NOT_FOUND');

      const { rows } = await db.query(
        `INSERT INTO activity_comments (activity_id, user_id, body)
         VALUES ($1, $2, $3) RETURNING *`,
        [activityId, req.user.id, body.trim()]
      );

      created(res, rows[0], 'Comment added');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/activity/:activityId/comments
  async listComments(req, res, next) {
    try {
      const { rows } = await db.query(
        `SELECT ac.*, u.first_name, u.last_name, u.role AS user_role
         FROM activity_comments ac
         JOIN users u ON u.id = ac.user_id
         WHERE ac.activity_id = $1
         ORDER BY ac.created_at ASC`,
        [req.params.activityId]
      );
      success(res, rows, 'Comments retrieved');
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/v1/activity/:activityId/comments/:commentId — admin only
  async deleteComment(req, res, next) {
    try {
      const { rows } = await db.query(
        'DELETE FROM activity_comments WHERE id = $1 AND activity_id = $2 RETURNING *',
        [req.params.commentId, req.params.activityId]
      );
      if (!rows[0]) throw new AppError('Comment not found', 404, 'NOT_FOUND');
      success(res, null, 'Comment deleted');
    } catch (err) {
      next(err);
    }
  },
};

module.exports = activityController;
