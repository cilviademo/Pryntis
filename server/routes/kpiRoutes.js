const express = require('express');
const { body, param, query } = require('express-validator');
const kpiController = require('../controllers/kpiController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/artist/:artistId', kpiController.getArtistKPIs);

router.get('/artist/:artistId/revenue', kpiController.listRevenueEvents);

router.post(
  '/artist/:artistId/revenue',
  authorize('owner', 'admin', 'manager'),
  kpiController.createRevenueEvent
);

router.get('/artist/:artistId/expenses', kpiController.listExpenses);

router.post(
  '/artist/:artistId/expenses',
  authorize('owner', 'admin', 'manager'),
  kpiController.createExpense
);

module.exports = router;
