'use strict';
const express = require('express');
const authenticate = require('../middleware/auth');
const ledgerController = require('../controllers/ledgerController');

const router = express.Router();
router.use(authenticate);

router.get('/accounts', ledgerController.listAccounts);
router.get('/accounts/:id', ledgerController.getAccount);
router.post('/accounts', ledgerController.createAccount);
router.get('/accounts/:id/transactions', ledgerController.listTransactions);
router.post('/accounts/:id/transactions', ledgerController.createTransaction);
router.get('/accounts/:id/recoup', ledgerController.getRecoupState);
router.get('/splits/:accountId', ledgerController.getSplits);
router.post('/splits', ledgerController.createSplit);

module.exports = router;
