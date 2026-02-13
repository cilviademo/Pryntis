const express = require('express');
const notificationController = require('../controllers/notificationController');
const authenticate = require('../middleware/auth');

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

// PUT /read-all MUST come before /:id/read to avoid "read-all" being
// captured as a UUID param.
router.put('/read-all', notificationController.markAllRead);
router.put('/:id/read', notificationController.markRead);

router.get('/', notificationController.listNotifications);

module.exports = router;
