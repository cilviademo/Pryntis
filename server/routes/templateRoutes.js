const express = require('express');
const templateController = require('../controllers/templateController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

router.get('/', templateController.list);
router.get('/:id', templateController.get);
router.post('/', authorize('admin', 'manager'), templateController.create);
router.put('/:id', authorize('admin', 'manager'), templateController.update);
router.post('/validate', authorize('admin'), templateController.validateTemplates);
router.delete('/:id', authorize('admin'), templateController.remove);

module.exports = router;
