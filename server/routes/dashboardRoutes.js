const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/summary', dashboardController.summary);
router.get('/recent-activity', dashboardController.recentActivity);

module.exports = router;
