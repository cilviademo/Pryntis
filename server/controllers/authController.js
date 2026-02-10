const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const userModel = require('../models/userModel');
const { AppError } = require('../middleware/errorHandler');

const authController = {
  // POST /api/v1/auth/register — admin only
  async register(req, res, next) {
    try {
      const { email, password, first_name, last_name, role } = req.body;

      const existing = await userModel.findByEmail(email);
      if (existing) {
        throw new AppError('Email already registered', 409, 'DUPLICATE_EMAIL');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await userModel.create({
        email,
        passwordHash,
        firstName: first_name,
        lastName: last_name,
        role,
      });

      res.status(201).json({
        success: true,
        data: user,
        message: 'User created successfully',
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await userModel.findByEmail(email);
      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      if (!user.is_active) {
        throw new AppError('Account is deactivated', 403, 'ACCOUNT_INACTIVE');
      }

      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
          },
        },
        message: 'Login successful',
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/auth/me
  async getProfile(req, res, next) {
    try {
      const user = await userModel.findById(req.user.id);
      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: user,
        message: 'Profile retrieved',
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/auth/me
  async updateProfile(req, res, next) {
    try {
      const { first_name, last_name, email } = req.body;
      const user = await userModel.update(req.user.id, { first_name, last_name, email });
      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: user,
        message: 'Profile updated',
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = authController;
