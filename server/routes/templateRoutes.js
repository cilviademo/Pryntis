const express = require('express');
const templateController = require('../controllers/templateController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

router.get('/', templateController.list);
router.get('/:id', templateController.get);
router.post('/', authorize('owner', 'admin', 'manager'), templateController.create);
router.put('/:id', authorize('owner', 'admin', 'manager'), templateController.update);
router.post('/validate', authorize('owner', 'admin'), templateController.validateTemplates);
router.delete('/:id', authorize('owner', 'admin'), templateController.remove);

module.exports = router;
