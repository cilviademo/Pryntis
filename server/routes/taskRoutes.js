const express = require('express');
const { body, param, query } = require('express-validator');
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');
const validate = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', taskController.list);

router.get('/:id', taskController.getById);

router.post(
  '/',
  authorize('admin', 'manager'),
  taskController.create
);

router.put(
  '/:id',
  authorize('admin', 'manager'),
  taskController.update
);

module.exports = router;
