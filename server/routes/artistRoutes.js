const express = require('express');
const { body } = require('express-validator');
const artistController = require('../controllers/artistController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', artistController.list);

router.get('/:id', artistController.getById);

router.post(
  '/',
  authorize('owner', 'admin', 'manager'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email required'),
  ],
  validate,
  artistController.create
);

router.put(
  '/:id',
  authorize('owner', 'admin', 'manager'),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('status').optional().isIn(['active', 'inactive', 'archived']).withMessage('Invalid status'),
    body('email').optional({ values: 'null' }).isEmail().withMessage('Valid email required'),
  ],
  validate,
  artistController.update
);

router.delete('/:id', authorize('owner', 'admin'), artistController.softDelete);

router.post('/:id/restore', authorize('owner', 'admin'), artistController.restore);

module.exports = router;
