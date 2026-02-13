const express = require('express');
const activityController = require('../controllers/activityController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// Reactions — all authenticated users can add/remove/list
router.get('/:activityId/reactions', activityController.listReactions);
router.post('/:activityId/reactions', activityController.addReaction);
router.delete('/:activityId/reactions/:reaction', activityController.removeReaction);

// Comments — manager/admin can create; admin can delete; all can read
router.get('/:activityId/comments', activityController.listComments);
router.post('/:activityId/comments', authorize('admin', 'manager'), activityController.addComment);
router.delete('/:activityId/comments/:commentId', authorize('admin'), activityController.deleteComment);

module.exports = router;
