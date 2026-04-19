'use strict';

const { z } = require('zod');
const { AppError } = require('./errorHandler');

/**
 * Generic validation middleware factory using Zod.
 * Accepts a Zod schema and the request property to validate ('body', 'query', 'params').
 */
function zodValidate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', details));
    }
    req[source] = result.data;
    next();
  };
}

// Reusable schema fragments

const uuidParam = z.object({
  id: z.string().uuid('Invalid ID format'),
});

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).passthrough();

// Auth schemas

const loginSchema = z.object({
  email: z.string().email('Invalid email').max(255),
  password: z.string().min(1, 'Password is required').max(200),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  role: z.enum(['owner', 'admin', 'manager', 'audio_engineer', 'contributor', 'viewer']).optional(),
});

// Media upload schemas

const uploadMediaSchema = z.object({
  owner_type: z.enum(['artist', 'project', 'asset', 'template']),
  owner_id: z.string().uuid('Invalid owner_id format'),
});

module.exports = {
  zodValidate,
  uuidParam,
  paginationQuery,
  loginSchema,
  registerSchema,
  uploadMediaSchema,
};
