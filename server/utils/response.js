/**
 * Standard JSON response helpers.
 *
 * Every successful response follows the shape:
 *   { success: true, data, message, pagination? }
 */

function success(res, data, message = 'OK', statusCode = 200, pagination = null) {
  const body = { success: true, data, message };
  if (pagination) body.pagination = pagination;
  return res.status(statusCode).json(body);
}

function created(res, data, message = 'Created') {
  return success(res, data, message, 201);
}

module.exports = { success, created };
