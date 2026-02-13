const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const exportController = require('../controllers/exportController');

router.get('/audit-trail', authenticate, authorize('owner', 'admin', 'manager'), exportController.getAuditTrail);
router.get('/:entity', authenticate, authorize('owner', 'admin', 'manager'), exportController.exportData);

module.exports = router;
