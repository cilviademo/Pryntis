const express = require('express');
const businessOpsController = require('../controllers/businessOpsController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

// Ledger — financial summary per artist (admin/owner/manager)
router.get('/ledger', authorize('owner', 'admin', 'manager'), businessOpsController.getLedger);

// Recoupment detail for a specific artist
router.get('/recoup/:artistId', authorize('owner', 'admin', 'manager'), businessOpsController.getRecoupDetail);

// Producer points — ownership aggregation
router.get('/producer-points', businessOpsController.getProducerPoints);

// Ownership conflicts — splits exceeding 100%
router.get('/ownership-conflicts', authorize('owner', 'admin', 'manager'), businessOpsController.getOwnershipConflicts);

// Pending approvals — urgent tasks, pending placements, expiring subs
router.get('/approvals', authorize('owner', 'admin', 'manager'), businessOpsController.getPendingApprovals);

module.exports = router;
