const express = require('express');
const { body, param, query } = require('express-validator');
const portController = require('../controllers/portController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Assets
router.get('/assets', portController.listAssets);

router.get('/assets/:id', portController.getAsset);

router.post(
  '/assets',
  authorize('admin', 'manager'),
  portController.createAsset
);

router.put(
  '/assets/:id',
  authorize('admin', 'manager'),
  portController.updateAsset
);

router.delete('/assets/:id', authorize('admin'), portController.softDeleteAsset);

router.post('/assets/:id/restore', authorize('admin'), portController.restoreAsset);

router.post(
  '/assets/:id/tags',
  authorize('admin', 'manager'),
  portController.addTags
);

router.delete(
  '/assets/:id/tags/:tag',
  authorize('admin', 'manager'),
  portController.removeTag
);

// Placements
router.get('/placements', portController.listPlacements);

router.post(
  '/placements',
  authorize('admin', 'manager'),
  portController.createPlacement
);

router.put(
  '/placements/:id',
  authorize('admin', 'manager'),
  portController.updatePlacement
);

// Ownership
router.get('/ownership', portController.listOwnership);

router.post(
  '/ownership',
  authorize('admin', 'manager'),
  portController.createOwnership
);

router.put(
  '/ownership/:id',
  authorize('admin', 'manager'),
  portController.updateOwnership
);

// Usage
router.get('/usage', portController.listUsage);

router.post(
  '/usage',
  authorize('admin', 'manager'),
  portController.createUsage
);

module.exports = router;
