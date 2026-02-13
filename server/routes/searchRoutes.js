const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const searchController = require('../controllers/searchController');

router.get('/', authenticate, searchController.globalSearch);

module.exports = router;
