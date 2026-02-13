const express = require('express');
const { body } = require('express-validator');
const projectController = require('../controllers/projectController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(authenticate);

router.get('/', projectController.list);

router.get('/:id', projectController.getById);

router.post(
  '/',
  authorize('owner', 'admin', 'manager'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('status')
      .optional()
      .isIn(['draft', 'in_progress', 'completed', 'archived'])
      .withMessage('Invalid status'),
    body('artist_id').optional({ values: 'null' }).isUUID().withMessage('Invalid artist ID'),
  ],
  validate,
  projectController.create
);

router.put(
  '/:id',
  authorize('owner', 'admin', 'manager'),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('status')
      .optional()
      .isIn(['draft', 'in_progress', 'completed', 'archived'])
      .withMessage('Invalid status'),
  ],
  validate,
  projectController.update
);

router.delete('/:id', authorize('owner', 'admin'), projectController.softDelete);

router.post('/:id/restore', authorize('owner', 'admin'), projectController.restore);

// Collaborators
router.post(
  '/:id/collaborators',
  authorize('owner', 'admin', 'manager'),
  [
    body('artist_id').isUUID().withMessage('Valid artist ID required'),
    body('role_description').optional().isString(),
  ],
  validate,
  projectController.addCollaborator
);

router.delete(
  '/:id/collaborators/:artistId',
  authorize('owner', 'admin', 'manager'),
  projectController.removeCollaborator
);

module.exports = router;
