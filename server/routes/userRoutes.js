const express = require('express');
const { body, param, query } = require('express-validator');
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', authorize('admin', 'manager'), userController.list);

router.get('/:id', authorize('admin', 'manager'), userController.getById);

router.put(
  '/:id',
  authorize('admin'),
  [
    body('role').optional().isIn(['admin', 'manager', 'viewer']).withMessage('Invalid role'),
    body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  ],
  validate,
  userController.update
);

router.post('/:id/deactivate', authorize('admin'), userController.deactivate);

module.exports = router;
