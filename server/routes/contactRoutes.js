const express = require('express');
const contactController = require('../controllers/contactController');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/rbac');

const router = express.Router();

router.use(authenticate);

router.get('/', contactController.list);
router.get('/:id', contactController.get);
router.post('/', authorize('owner', 'admin', 'manager'), contactController.create);
router.put('/:id', authorize('owner', 'admin', 'manager'), contactController.update);
router.delete('/:id', authorize('owner', 'admin'), contactController.remove);

module.exports = router;
