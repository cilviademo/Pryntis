const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Placement analytics
router.get('/placements', analyticsController.getPlacementAnalytics);

// Asset analytics
router.get('/assets', analyticsController.getAssetAnalytics);

// Revenue analytics
router.get('/revenue', analyticsController.getRevenueAnalytics);

// Delivery tracking
router.get('/deliveries', analyticsController.getDeliveryTracking);

module.exports = router;
