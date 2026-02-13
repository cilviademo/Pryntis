const express = require('express');
const healthController = require('../controllers/healthController');
const authenticate = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

// Artist health scores
router.get('/health', healthController.getHealthScores);

// Momentum trends (monthly aggregates)
router.get('/momentum', healthController.getMomentumTrends);

// Next actions (prioritized action items)
router.get('/actions', healthController.getNextActions);

module.exports = router;
