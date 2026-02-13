'use strict';
const express = require('express');
const authenticate = require('../middleware/auth');
const auditController = require('../controllers/auditController');

const router = express.Router();
router.use(authenticate);
router.get('/', auditController.list);

module.exports = router;
