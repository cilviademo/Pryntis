/**
 * Shared utility for building standardised list queries with
 * pagination, full-text search, sorting and arbitrary filters.
 *
 * Usage:
 *   const { listQuery } = require('../utils/listQuery');
 *   const result = await listQuery(db, 'artists', { page: 1, limit: 25, search: 'drake' });
 */

// Tables that have a search_vector tsvector column
const SEARCHABLE_TABLES = new Set([
  'artists',
  'projects',
]);

// Tables that support soft-delete via is_deleted column
const SOFT_DELETE_TABLES = new Set([
  'artists',
  'projects',
  'assets',
  'placements',
]);

/**
 * Build and execute a paginated list query.
 *
 * @param {object} db           - Database client with db.query(text, params)
 * @param {string} tableName    - Table name (must be a known safe identifier)
 * @param {object} opts
 * @param {number}  [opts.page=1]       - Current page (1-based)
 * @param {number}  [opts.limit=25]     - Rows per page (clamped 1-100)
 * @param {string}  [opts.search]       - Full-text search term
 * @param {string}  [opts.sortBy='created_at'] - Column to sort by
 * @param {string}  [opts.sortDir='DESC']      - ASC or DESC
 * @param {Array}   [opts.filters]      - Array of { column, value, op } objects
 * @param {boolean} [opts.includeDeleted=false] - Skip the is_deleted filter
 * @param {string}  [opts.selectColumns='*']    - Columns to SELECT
 * @returns {{ rows: Array, total: number, pagination: object }}
 */
async function listQuery(db, tableName, opts = {}) {
  const {
    page = 1,
    limit: rawLimit = 25,
    search,
    sortBy = 'created_at',
    sortDir: rawSortDir = 'DESC',
    filters = [],
    includeDeleted = false,
    selectColumns = '*',
  } = opts;

  // Sanitise inputs
  const limit = Math.max(1, Math.min(Number(rawLimit) || 25, 100));
  const currentPage = Math.max(1, Number(page) || 1);
  const offset = (currentPage - 1) * limit;
  const sortDirection = rawSortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  // Whitelist sortBy to prevent injection — allow only word chars and dots
  const safeSortBy = /^[\w.]+$/.test(sortBy) ? sortBy : 'created_at';

  // Build WHERE clauses
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  // Soft-delete filter (default on for tables that support it)
  if (!includeDeleted && SOFT_DELETE_TABLES.has(tableName)) {
    conditions.push('is_deleted = false');
  }

  // Full-text search
  if (search && search.trim() && SEARCHABLE_TABLES.has(tableName)) {
    conditions.push(`search_vector @@ plainto_tsquery('english', $${paramIndex})`);
    params.push(search.trim());
    paramIndex++;
  }

  // Arbitrary filters: { column, value, op }
  for (const filter of filters) {
    const { column, value, op = '=' } = filter;

    // Whitelist column name characters
    if (!/^[\w.]+$/.test(column)) continue;

    // Support common operators
    const allowedOps = ['=', '!=', '<', '<=', '>', '>=', 'LIKE', 'ILIKE', 'IS', 'IS NOT'];
    const upperOp = (op || '=').toUpperCase();

    if (upperOp === 'IS' || upperOp === 'IS NOT') {
      // For IS NULL / IS NOT NULL style filters
      if (value === null || value === 'NULL') {
        conditions.push(`${column} ${upperOp} NULL`);
      }
      continue;
    }

    if (!allowedOps.includes(upperOp)) continue;

    conditions.push(`${column} ${upperOp} $${paramIndex}`);
    params.push(value);
    paramIndex++;
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Build SELECT for ts_rank when searching
  let selectClause = selectColumns;
  let orderClause = `ORDER BY ${safeSortBy} ${sortDirection}`;

  if (search && search.trim() && SEARCHABLE_TABLES.has(tableName)) {
    // Include relevance rank and sort by it first
    const searchParamIdx = params.indexOf(search.trim()) + 1;
    selectClause = `${selectColumns}, ts_rank(search_vector, plainto_tsquery('english', $${searchParamIdx})) AS search_rank`;
    orderClause = `ORDER BY search_rank DESC, ${safeSortBy} ${sortDirection}`;
  }

  // Count query
  const countSql = `SELECT COUNT(*) AS total FROM ${tableName} ${whereClause}`;
  const countResult = await db.query(countSql, params);
  const total = parseInt(countResult.rows[0].total, 10);

  // Data query
  const dataSql = [
    `SELECT ${selectClause} FROM ${tableName}`,
    whereClause,
    orderClause,
    `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
  ].join(' ');

  const dataParams = [...params, limit, offset];
  const dataResult = await db.query(dataSql, dataParams);

  // Return standardised result
  const totalPages = Math.ceil(total / limit);

  return {
    rows: dataResult.rows,
    total,
    pagination: {
      page: currentPage,
      limit,
      total,
      totalPages,
    },
  };
}

module.exports = { listQuery };
