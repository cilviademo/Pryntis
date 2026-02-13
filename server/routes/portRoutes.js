const express = require('express');
const { body, param, query } = require('express-validator');
const portController = require('../controllers/portController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');
const { requireTier } = require('../middleware/tierGate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Assets
router.get('/assets', portController.listAssets);

router.get('/assets/:id', portController.getAsset);

router.post(
  '/assets',
  authorize('owner', 'admin', 'manager'),
  requireTier(1),
  portController.createAsset
);

router.put(
  '/assets/:id',
  authorize('owner', 'admin', 'manager'),
  portController.updateAsset
);

router.delete('/assets/:id', authorize('owner', 'admin'), portController.softDeleteAsset);

router.post('/assets/:id/restore', authorize('owner', 'admin'), portController.restoreAsset);

router.post(
  '/assets/:id/tags',
  authorize('owner', 'admin', 'manager'),
  portController.addTags
);

router.delete(
  '/assets/:id/tags/:tag',
  authorize('owner', 'admin', 'manager'),
  portController.removeTag
);

// Placements — require at least Basic tier (level 2)
router.get('/placements', portController.listPlacements);

router.post(
  '/placements',
  authorize('owner', 'admin', 'manager'),
  requireTier(2),
  portController.createPlacement
);

router.put(
  '/placements/:id',
  authorize('owner', 'admin', 'manager'),
  portController.updatePlacement
);

// Ownership
router.get('/ownership', portController.listOwnership);

router.post(
  '/ownership',
  authorize('owner', 'admin', 'manager'),
  portController.createOwnership
);

router.put(
  '/ownership/:id',
  authorize('owner', 'admin', 'manager'),
  portController.updateOwnership
);

// Usage
router.get('/usage', portController.listUsage);

router.post(
  '/usage',
  authorize('owner', 'admin', 'manager'),
  portController.createUsage
);

module.exports = router;
