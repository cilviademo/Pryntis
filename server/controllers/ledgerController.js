'use strict';
const db = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');

const ALLOWED_ROLES = ['owner', 'admin', 'manager'];
const TX_TYPES = ['revenue', 'recoupable_expense', 'non_recoupable_expense', 'adjustment'];

const ledgerController = {
  // GET /api/v1/ledger/accounts
  async listAccounts(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const { rows } = await db.query(
        `SELECT la.*,
                a.name AS artist_name, a.stage_name,
                COALESCE(SUM(CASE WHEN lt.type = 'revenue' THEN lt.amount ELSE 0 END), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN lt.type = 'recoupable_expense' THEN lt.amount ELSE 0 END), 0) AS total_recoupable,
                COALESCE(SUM(CASE WHEN lt.type = 'non_recoupable_expense' THEN lt.amount ELSE 0 END), 0) AS total_non_recoupable
         FROM ledger_accounts la
         LEFT JOIN artists a ON la.artist_id = a.id
         LEFT JOIN ledger_transactions lt ON lt.account_id = la.id
         GROUP BY la.id, a.name, a.stage_name
         ORDER BY la.created_at DESC`
      );
      success(res, rows, 'Ledger accounts retrieved');
    } catch (err) { next(err); }
  },

  // GET /api/v1/ledger/accounts/:id
  async getAccount(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const { rows } = await db.query(
        `SELECT la.*, a.name AS artist_name, a.stage_name
         FROM ledger_accounts la
         LEFT JOIN artists a ON la.artist_id = a.id
         WHERE la.id = $1`, [req.params.id]
      );
      if (!rows[0]) throw new AppError('Account not found', 404, 'NOT_FOUND');
      success(res, rows[0], 'Ledger account retrieved');
    } catch (err) { next(err); }
  },

  // POST /api/v1/ledger/accounts
  async createAccount(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const { artist_id, project_id, name, currency } = req.body;
      if (!artist_id || !name) throw new AppError('artist_id and name are required', 400, 'VALIDATION_ERROR');
      const { rows } = await db.query(
        `INSERT INTO ledger_accounts (artist_id, project_id, name, currency)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [artist_id, project_id || null, name, currency || 'USD']
      );
      created(res, rows[0], 'Ledger account created');
    } catch (err) { next(err); }
  },

  // GET /api/v1/ledger/accounts/:id/transactions
  async listTransactions(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const { page = 1, limit = 50, type } = req.query;
      const parsedPage = Math.max(1, parseInt(page, 10) || 1);
      const parsedLimit = Math.min(Math.max(1, parseInt(limit, 10) || 50), 100);
      const offset = (parsedPage - 1) * parsedLimit;

      const conditions = ['lt.account_id = $1'];
      const params = [req.params.id];
      let idx = 2;
      if (type && TX_TYPES.includes(type)) {
        conditions.push(`lt.type = $${idx++}`);
        params.push(type);
      }
      const where = `WHERE ${conditions.join(' AND ')}`;

      const { rows: countRows } = await db.query(
        `SELECT COUNT(*) AS total FROM ledger_transactions lt ${where}`, params
      );
      const total = parseInt(countRows[0].total, 10);

      const { rows } = await db.query(
        `SELECT lt.*, u.first_name || ' ' || u.last_name AS created_by_name
         FROM ledger_transactions lt
         LEFT JOIN users u ON lt.created_by = u.id
         ${where}
         ORDER BY lt.transaction_date DESC, lt.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, parsedLimit, offset]
      );
      success(res, rows, 'Transactions retrieved', 200, {
        page: parsedPage, limit: parsedLimit, total,
        totalPages: Math.ceil(total / parsedLimit),
      });
    } catch (err) { next(err); }
  },

  // POST /api/v1/ledger/accounts/:id/transactions
  async createTransaction(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const { type, amount, description, transaction_date, reference, metadata } = req.body;
      if (!type || !TX_TYPES.includes(type)) {
        throw new AppError(`type must be one of: ${TX_TYPES.join(', ')}`, 400, 'VALIDATION_ERROR');
      }
      if (amount === undefined || isNaN(parseFloat(amount))) {
        throw new AppError('amount is required and must be numeric', 400, 'VALIDATION_ERROR');
      }
      const { rows } = await db.query(
        `INSERT INTO ledger_transactions (account_id, type, amount, description, transaction_date, reference, metadata, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [req.params.id, type, parseFloat(amount), description || '', transaction_date || new Date().toISOString(), reference || null, metadata ? JSON.stringify(metadata) : '{}', req.user.id]
      );
      created(res, rows[0], 'Transaction recorded');
    } catch (err) { next(err); }
  },

  // GET /api/v1/ledger/accounts/:id/recoup
  async getRecoupState(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const id = req.params.id;
      const { rows } = await db.query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END), 0) AS total_revenue,
           COALESCE(SUM(CASE WHEN type = 'recoupable_expense' THEN amount ELSE 0 END), 0) AS total_recoupable_expenses,
           COALESCE(SUM(CASE WHEN type = 'non_recoupable_expense' THEN amount ELSE 0 END), 0) AS total_non_recoupable_expenses,
           COALESCE(SUM(CASE WHEN type = 'adjustment' THEN amount ELSE 0 END), 0) AS total_adjustments
         FROM ledger_transactions WHERE account_id = $1`, [id]
      );
      const r = rows[0];
      const grossRevenue = parseFloat(r.total_revenue);
      const recoupableExpenses = parseFloat(r.total_recoupable_expenses);
      const unrecouped = Math.max(recoupableExpenses - grossRevenue, 0);
      const recouped = Math.min(recoupableExpenses, grossRevenue);
      const netAfterRecoup = Math.max(grossRevenue - recoupableExpenses, 0);

      // Get splits
      const { rows: splits } = await db.query(
        'SELECT * FROM royalty_splits WHERE account_id = $1', [id]
      );
      const labelPct = splits.length > 0 ? parseFloat(splits[0].label_pct || 0) : 0;
      const artistPct = splits.length > 0 ? parseFloat(splits[0].artist_pct || 0) : 100;
      const payable = Math.max((netAfterRecoup * artistPct / 100), 0);

      success(res, {
        total_revenue: grossRevenue,
        total_recoupable_expenses: recoupableExpenses,
        total_non_recoupable_expenses: parseFloat(r.total_non_recoupable_expenses),
        total_adjustments: parseFloat(r.total_adjustments),
        recouped,
        unrecouped_balance: unrecouped,
        net_after_recoup: netAfterRecoup,
        artist_pct: artistPct,
        label_pct: labelPct,
        payable_to_artist: payable,
        is_recouped: unrecouped === 0,
        splits,
      }, 'Recoup state calculated');
    } catch (err) { next(err); }
  },

  // GET /api/v1/ledger/splits/:accountId
  async getSplits(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const { rows } = await db.query(
        'SELECT * FROM royalty_splits WHERE account_id = $1', [req.params.accountId]
      );
      success(res, rows, 'Royalty splits retrieved');
    } catch (err) { next(err); }
  },

  // POST /api/v1/ledger/splits
  async createSplit(req, res, next) {
    try {
      if (!ALLOWED_ROLES.includes(req.user.role)) {
        throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
      }
      const { account_id, role, party_name, artist_pct, label_pct, producer_points, engineer_points, producer_paid_record_one, producer_post_recoup_only } = req.body;
      if (!account_id || !role || !party_name) {
        throw new AppError('account_id, role, and party_name are required', 400, 'VALIDATION_ERROR');
      }
      const { rows } = await db.query(
        `INSERT INTO royalty_splits (account_id, role, party_name, artist_pct, label_pct, producer_points, engineer_points, producer_paid_record_one, producer_post_recoup_only)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [account_id, role, party_name, artist_pct || 0, label_pct || 0, producer_points || 0, engineer_points || 0, producer_paid_record_one || false, producer_post_recoup_only || false]
      );
      created(res, rows[0], 'Royalty split created');
    } catch (err) { next(err); }
  },
};

module.exports = ledgerController;
