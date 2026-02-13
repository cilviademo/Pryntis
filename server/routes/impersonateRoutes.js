const express = require('express');
const impersonateController = require('../controllers/impersonateController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// POST /impersonate/:userId — admin or owner starts impersonating a user
router.post(
  '/impersonate/:userId',
  authenticate,
  authorize('admin', 'owner'),
  impersonateController.impersonateUser
);

// POST /exit-impersonation — exit impersonation and return to original session
router.post(
  '/exit-impersonation',
  authenticate,
  impersonateController.exitImpersonation
);

module.exports = router;
