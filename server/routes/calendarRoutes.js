const express = require('express');
const calendarController = require('../controllers/calendarController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// All calendar routes require authentication
router.use(authenticate);

router.get('/events', calendarController.listEvents);

router.post(
  '/events',
  authorize('admin', 'owner', 'manager', 'audio_engineer'),
  calendarController.createEvent
);

router.put(
  '/events/:id',
  authorize('admin', 'owner', 'manager', 'audio_engineer'),
  calendarController.updateEvent
);

router.delete(
  '/events/:id',
  authorize('admin', 'owner', 'manager'),
  calendarController.deleteEvent
);

module.exports = router;
