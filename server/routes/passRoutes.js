const express = require('express');
const { body, param, query } = require('express-validator');
const passController = require('../controllers/passController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Tiers
router.get('/tiers', passController.listTiers);

router.post(
  '/tiers',
  authorize('admin'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('access_level').notEmpty().withMessage('Access level is required'),
  ],
  validate,
  passController.createTier
);

router.put(
  '/tiers/:id',
  authorize('admin'),
  passController.updateTier
);

// Subscriptions
router.get('/subscriptions', passController.listSubscriptions);

router.post(
  '/subscriptions',
  authorize('admin', 'manager'),
  [
    body('artist_id').isUUID().withMessage('Valid artist ID required'),
    body('tier_id').isUUID().withMessage('Valid tier ID required'),
  ],
  validate,
  passController.createSubscription
);

router.put(
  '/subscriptions/:id',
  authorize('admin', 'manager'),
  passController.updateSubscription
);

module.exports = router;
