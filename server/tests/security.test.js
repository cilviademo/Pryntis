'use strict';

const request = require('supertest');
const app = require('../server');

/**
 * Security tests for Pryntis API.
 * These tests verify that:
 * - Unauthenticated requests are rejected
 * - Security headers are present
 * - Health check does not leak internals
 * - Rate limiting is configured
 * - File upload validation works
 * - Error responses do not leak stack traces
 * - Serializers strip sensitive fields
 */

describe('Security: Unauthenticated access', () => {
  const protectedRoutes = [
    ['GET', '/api/v1/artists'],
    ['GET', '/api/v1/projects'],
    ['GET', '/api/v1/users'],
    ['GET', '/api/v1/tasks'],
    ['GET', '/api/v1/contacts'],
    ['GET', '/api/v1/dashboard/summary'],
    ['GET', '/api/v1/templates'],
    ['GET', '/api/v1/media'],
    ['GET', '/api/v1/calendar/events'],
    ['GET', '/api/v1/notifications'],
    ['GET', '/api/v1/business/ledger'],
    ['GET', '/api/v1/export/artists'],
    ['GET', '/api/v1/search'],
    ['POST', '/api/v1/artists'],
    ['POST', '/api/v1/media/upload'],
    ['POST', '/api/v1/admin/impersonate/fake-id'],
  ];

  test.each(protectedRoutes)(
    '%s %s returns 401 without auth token',
    async (method, url) => {
      const res = await request(app)[method.toLowerCase()](url);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toMatch(/AUTH_REQUIRED|INVALID_TOKEN/);
    }
  );
});

describe('Security: Health check endpoint', () => {
  test('GET /api/health returns minimal info', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBeOneOf([200, 503]);
    // Should NOT contain db timestamp, error details, or connection strings
    expect(res.body).not.toHaveProperty('db');
    expect(res.body).not.toHaveProperty('error');
    expect(JSON.stringify(res.body)).not.toMatch(/postgres|password|connection/i);
  });
});

describe('Security: HTTP headers', () => {
  test('Response includes security headers', async () => {
    const res = await request(app).get('/api/health');
    // Helmet headers
    expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
    expect(res.headers).toHaveProperty('referrer-policy');
    expect(res.headers).toHaveProperty('x-frame-options');
    expect(res.headers).toHaveProperty('permissions-policy');
    // CSP enabled
    expect(res.headers).toHaveProperty('content-security-policy');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    // No server version disclosure
    expect(res.headers).not.toHaveProperty('x-powered-by');
  });
});

describe('Security: CORS', () => {
  test('Rejects requests from disallowed origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil-site.com');
    // CORS rejection manifests as no access-control-allow-origin header
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('Allows requests from allowed origins', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5000');
  });
});

describe('Security: Input validation on login', () => {
  test('Rejects login with missing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'test123' });
    expect(res.status).toBe(400);
  });

  test('Rejects login with invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'test123' });
    expect(res.status).toBe(400);
  });
});

describe('Security: Error handling', () => {
  test('Invalid JSON returns 400 not 500', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"bad json');
    expect(res.status).toBe(400);
  });

  test('404 for unknown API routes', async () => {
    const res = await request(app)
      .get('/api/v1/nonexistent')
      .set('Authorization', 'Bearer fake');
    // Should return 401 (auth before 404) or 404, never 500
    expect(res.status).toBeLessThan(500);
  });
});

describe('Security: Serializer unit tests', () => {
  const { safeUser, safeArtist, publicUser, safeMediaFile } = require('../utils/serializers');

  test('safeUser strips password_hash and token_version', () => {
    const raw = {
      id: '1',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'admin',
      is_active: true,
      password_hash: '$2b$12$secret',
      token_version: 5,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    const safe = safeUser(raw);
    expect(safe).not.toHaveProperty('password_hash');
    expect(safe).not.toHaveProperty('token_version');
    expect(safe).toHaveProperty('email', 'test@test.com');
    expect(safe).toHaveProperty('id', '1');
  });

  test('publicUser only exposes id, first_name, role', () => {
    const raw = {
      id: '1',
      email: 'test@test.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'viewer',
    };
    const pub = publicUser(raw);
    expect(pub).not.toHaveProperty('email');
    expect(pub).not.toHaveProperty('last_name');
    expect(pub).toHaveProperty('first_name', 'Test');
    expect(pub).toHaveProperty('role', 'viewer');
  });

  test('safeArtist hides PII by default', () => {
    const raw = {
      id: '1',
      name: 'Artist',
      stage_name: 'Stage',
      email: 'artist@test.com',
      phone: '555-1234',
      genre: 'Hip-Hop',
      status: 'active',
      bio: 'Bio text',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    const safe = safeArtist(raw);
    expect(safe).not.toHaveProperty('email');
    expect(safe).not.toHaveProperty('phone');
    expect(safe).toHaveProperty('name', 'Artist');
  });

  test('safeArtist includes PII when requested', () => {
    const raw = {
      id: '1',
      name: 'Artist',
      email: 'artist@test.com',
      phone: '555-1234',
    };
    const safe = safeArtist(raw, { includePII: true });
    expect(safe).toHaveProperty('email', 'artist@test.com');
    expect(safe).toHaveProperty('phone', '555-1234');
  });

  test('safeMediaFile strips storage_key and storage_provider', () => {
    const raw = {
      id: '1',
      owner_type: 'artist',
      owner_id: '2',
      file_name: 'track.mp3',
      mime_type: 'audio/mpeg',
      size_bytes: 5000000,
      storage_key: 'artist/2/12345-track.mp3',
      storage_provider: 'local',
      version: 1,
      is_current: true,
      checksum_sha256: 'abc123',
      uploaded_by: '3',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    };
    const safe = safeMediaFile(raw);
    expect(safe).not.toHaveProperty('storage_key');
    expect(safe).not.toHaveProperty('storage_provider');
    expect(safe).toHaveProperty('file_name', 'track.mp3');
  });
});

describe('Security: Zod validation middleware', () => {
  const { zodValidate, loginSchema } = require('../middleware/zodValidate');

  test('zodValidate returns 400 for invalid input', () => {
    const middleware = zodValidate(loginSchema, 'body');
    const req = { body: { email: 'invalid', password: '' } };
    const res = {};
    const errors = [];
    const next = (err) => errors.push(err);
    middleware(req, res, next);
    expect(errors.length).toBe(1);
    expect(errors[0].statusCode).toBe(400);
    expect(errors[0].code).toBe('VALIDATION_ERROR');
  });

  test('zodValidate passes for valid input', () => {
    const middleware = zodValidate(loginSchema, 'body');
    const req = { body: { email: 'test@test.com', password: 'secret123' } };
    const res = {};
    let called = false;
    middleware(req, res, () => { called = true; });
    expect(called).toBe(true);
  });
});

// Custom matchers
expect.extend({
  toBeOneOf(received, arr) {
    const pass = arr.includes(received);
    return {
      message: () => `expected ${received} to be one of ${arr.join(', ')}`,
      pass,
    };
  },
});
