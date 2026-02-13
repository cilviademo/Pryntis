const express = require('express');
const pdfController = require('../controllers/pdfController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

// GET /templates/:id/export.pdf — any authenticated user can export a template
router.get(
  '/templates/:id/export.pdf',
  authenticate,
  pdfController.exportTemplatePdf
);

// GET /royalty/statements/:artistId.pdf — admin, owner, or manager only
router.get(
  '/royalty/statements/:artistId.pdf',
  authenticate,
  authorize('admin', 'owner', 'manager'),
  pdfController.exportRoyaltyStatement
);

module.exports = router;
