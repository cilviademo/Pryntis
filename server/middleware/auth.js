const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('./errorHandler');

// Verify JWT token from Authorization header
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
}

module.exports = authenticate;
