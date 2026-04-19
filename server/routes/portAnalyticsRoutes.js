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

// Advanced analytics - Coverage matrix
router.get('/coverage', analyticsController.getCoverageMatrix);

// Advanced analytics - Cross-module insights
router.get('/insights', analyticsController.getCrossModuleInsights);

module.exports = router;
