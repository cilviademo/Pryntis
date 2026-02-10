/**
 * Pryntis Panel — Comprehensive API Test Suite (25+ tests)
 *
 * Covers: Auth, RBAC, Artists CRUD, Projects CRUD, Validation,
 *         Dashboard, Pass (subscription tiers), and Port (assets/placements).
 *
 * Runs against a real PostgreSQL database. Requires DATABASE_URL env var.
 */

require('dotenv').config();
const request = require('supertest');
const app = require('../server/server');
const db = require('../server/config/db');
const bcrypt = require('bcryptjs');

// ---------------------------------------------------------------------------
// Unique test identifiers (prevent collisions across parallel runs)
// ---------------------------------------------------------------------------
const SUFFIX = Math.random().toString(36).slice(2, 8);
const ADMIN_EMAIL = `test_admin_${SUFFIX}@pryntis.test`;
const MANAGER_EMAIL = `test_manager_${SUFFIX}@pryntis.test`;
const VIEWER_EMAIL = `test_viewer_${SUFFIX}@pryntis.test`;
const PASSWORD = 'TestPass123!';

// Tokens and user IDs populated in beforeAll
let adminToken, managerToken, viewerToken;
let adminId, managerId, viewerId;

// IDs of records created during tests — cleaned up in afterAll
const createdArtistIds = [];
const createdProjectIds = [];
const createdTierIds = [];
const createdAssetIds = [];

// ---------------------------------------------------------------------------
// Global setup & teardown
// ---------------------------------------------------------------------------
beforeAll(async () => {
  const hash = await bcrypt.hash(PASSWORD, 12);

  // Insert three test users directly into the database
  const insertUser = async (email, role) => {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [email, hash, 'Test', role.charAt(0).toUpperCase() + role.slice(1), role]
    );
    return rows[0].id;
  };

  adminId = await insertUser(ADMIN_EMAIL, 'admin');
  managerId = await insertUser(MANAGER_EMAIL, 'manager');
  viewerId = await insertUser(VIEWER_EMAIL, 'viewer');

  // Login each user and store tokens
  const login = async (email) => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password: PASSWORD });
    return res.body.data.token;
  };

  adminToken = await login(ADMIN_EMAIL);
  managerToken = await login(MANAGER_EMAIL);
  viewerToken = await login(VIEWER_EMAIL);
});

afterAll(async () => {
  // Clean up test data in reverse dependency order
  for (const id of createdAssetIds) {
    await db.query('DELETE FROM asset_tags WHERE asset_id = $1', [id]);
    await db.query('DELETE FROM placements WHERE asset_id = $1', [id]);
    await db.query('DELETE FROM ownership_records WHERE asset_id = $1', [id]);
    await db.query('DELETE FROM usage_records WHERE asset_id = $1', [id]);
    await db.query('DELETE FROM assets WHERE id = $1', [id]);
  }
  for (const id of createdProjectIds) {
    await db.query('DELETE FROM project_collaborators WHERE project_id = $1', [id]);
    await db.query('DELETE FROM projects WHERE id = $1', [id]);
  }
  for (const id of createdTierIds) {
    await db.query('DELETE FROM artist_subscriptions WHERE tier_id = $1', [id]);
    await db.query('DELETE FROM subscription_tiers WHERE id = $1', [id]);
  }
  for (const id of createdArtistIds) {
    await db.query('DELETE FROM artist_subscriptions WHERE artist_id = $1', [id]);
    await db.query('DELETE FROM project_collaborators WHERE artist_id = $1', [id]);
    await db.query('DELETE FROM revenue_events WHERE artist_id = $1', [id]);
    await db.query('DELETE FROM recoupable_expenses WHERE artist_id = $1', [id]);
    await db.query('DELETE FROM assets WHERE artist_id = $1', [id]);
    await db.query('DELETE FROM artists WHERE id = $1', [id]);
  }

  // Remove test users
  await db.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [
    [adminId, managerId, viewerId],
  ]);

  // Close the connection pool so Jest can exit cleanly
  await db.pool.end();
});

// ===========================================================================
// 1. AUTH TESTS (5 tests)
// ===========================================================================
describe('Auth — /api/v1/auth', () => {
  test('POST /login with valid credentials returns token and user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data).toHaveProperty('user');
    expect(res.body.data.user).toMatchObject({
      email: ADMIN_EMAIL,
      role: 'admin',
      first_name: 'Test',
      last_name: 'Admin',
    });
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.token.length).toBeGreaterThan(20);
  });

  test('POST /login with wrong password returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'WrongPassword999!' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toHaveProperty('code', 'INVALID_CREDENTIALS');
    expect(res.body.error).toHaveProperty('message');
  });

  test('POST /login with non-existent email returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: `nobody_${SUFFIX}@pryntis.test`, password: PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('GET /me with valid token returns user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id', adminId);
    expect(res.body.data).toHaveProperty('email', ADMIN_EMAIL);
    expect(res.body.data).toHaveProperty('role', 'admin');
    expect(res.body.data).toHaveProperty('first_name');
    expect(res.body.data).toHaveProperty('last_name');
    expect(res.body.data).toHaveProperty('created_at');
    // Password hash must never be returned
    expect(res.body.data).not.toHaveProperty('password_hash');
  });

  test('GET /me without token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });
});

// ===========================================================================
// 2. RBAC TESTS (5 tests)
// ===========================================================================
describe('RBAC — role-based access control', () => {
  let rbacArtistId;

  test('Admin can create artist via POST /api/v1/artists', async () => {
    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `RBAC Admin Artist ${SUFFIX}` });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    rbacArtistId = res.body.data.id;
    createdArtistIds.push(rbacArtistId);
  });

  test('Manager can create artist via POST /api/v1/artists', async () => {
    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: `RBAC Manager Artist ${SUFFIX}` });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    createdArtistIds.push(res.body.data.id);
  });

  test('Viewer cannot create artist (403)', async () => {
    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: `RBAC Viewer Artist ${SUFFIX}` });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Viewer can list artists (200)', async () => {
    const res = await request(app)
      .get('/api/v1/artists')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('Viewer cannot delete artist (403)', async () => {
    const res = await request(app)
      .delete(`/api/v1/artists/${rbacArtistId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ===========================================================================
// 3. ARTISTS CRUD TESTS (5 tests)
// ===========================================================================
describe('Artists CRUD — /api/v1/artists', () => {
  let artistId;

  test('GET /artists returns array with success: true', async () => {
    const res = await request(app)
      .get('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('page');
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('totalPages');
  });

  test('POST /artists creates artist and returns 201', async () => {
    const payload = {
      name: `CRUD Artist ${SUFFIX}`,
      stage_name: `DJ Test ${SUFFIX}`,
      genre: 'Hip-Hop',
      status: 'active',
      bio: 'Test artist created by API tests',
    };

    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe(payload.name);
    expect(res.body.data.stage_name).toBe(payload.stage_name);
    expect(res.body.data.genre).toBe(payload.genre);
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.is_deleted).toBe(false);

    artistId = res.body.data.id;
    createdArtistIds.push(artistId);
  });

  test('GET /artists/:id returns artist detail', async () => {
    const res = await request(app)
      .get(`/api/v1/artists/${artistId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(artistId);
    expect(res.body.data).toHaveProperty('name');
    expect(res.body.data).toHaveProperty('stage_name');
    expect(res.body.data).toHaveProperty('genre');
    expect(res.body.data).toHaveProperty('created_at');
    expect(res.body.data).toHaveProperty('updated_at');
  });

  test('PUT /artists/:id updates artist', async () => {
    const updatedName = `Updated Artist ${SUFFIX}`;
    const res = await request(app)
      .put(`/api/v1/artists/${artistId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: updatedName, genre: 'R&B' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe(updatedName);
    expect(res.body.data.genre).toBe('R&B');
    expect(res.body.data.id).toBe(artistId);
  });

  test('DELETE /artists/:id soft-deletes artist (sets is_deleted)', async () => {
    const res = await request(app)
      .delete(`/api/v1/artists/${artistId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.is_deleted).toBe(true);
    expect(res.body.data.deleted_at).not.toBeNull();

    // Confirm it no longer appears in normal GET
    const getRes = await request(app)
      .get(`/api/v1/artists/${artistId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(404);
  });
});

// ===========================================================================
// 4. PROJECTS CRUD TESTS (4 tests)
// ===========================================================================
describe('Projects CRUD — /api/v1/projects', () => {
  let projectArtistId;
  let projectId;

  beforeAll(async () => {
    // Create an artist to associate with a project
    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Project Artist ${SUFFIX}` });
    projectArtistId = res.body.data.id;
    createdArtistIds.push(projectArtistId);
  });

  test('GET /projects returns list', async () => {
    const res = await request(app)
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  test('POST /projects creates project', async () => {
    const payload = {
      title: `Test Project ${SUFFIX}`,
      description: 'Integration test project',
      artist_id: projectArtistId,
      status: 'draft',
    };

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe(payload.title);
    expect(res.body.data.description).toBe(payload.description);
    expect(res.body.data.artist_id).toBe(projectArtistId);
    expect(res.body.data.status).toBe('draft');

    projectId = res.body.data.id;
    createdProjectIds.push(projectId);
  });

  test('GET /projects/:id returns project with collaborators array', async () => {
    const res = await request(app)
      .get(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(projectId);
    expect(res.body.data).toHaveProperty('collaborators');
    expect(Array.isArray(res.body.data.collaborators)).toBe(true);
    expect(res.body.data).toHaveProperty('artist_name');
  });

  test('PUT /projects/:id updates project', async () => {
    const updatedTitle = `Updated Project ${SUFFIX}`;
    const res = await request(app)
      .put(`/api/v1/projects/${projectId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: updatedTitle, status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe(updatedTitle);
    expect(res.body.data.status).toBe('in_progress');
  });
});

// ===========================================================================
// 5. VALIDATION TESTS (3 tests)
// ===========================================================================
describe('Validation', () => {
  test('POST /artists with empty name returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error).toHaveProperty('details');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThan(0);

    const nameError = res.body.error.details.find((d) => d.field === 'name');
    expect(nameError).toBeDefined();
  });

  test('POST /auth/login with invalid email format returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
  });

  test('POST /artists with invalid status enum returns 400', async () => {
    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `ValidName ${SUFFIX}`, status: 'nonexistent_status' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const statusError = res.body.error.details.find((d) => d.field === 'status');
    expect(statusError).toBeDefined();
  });
});

// ===========================================================================
// 6. DASHBOARD TESTS (2 tests)
// ===========================================================================
describe('Dashboard — /api/v1/dashboard', () => {
  test('GET /summary returns expected shape (artists, projects objects)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const data = res.body.data;
    expect(data).toHaveProperty('artists');
    expect(data.artists).toHaveProperty('total');
    expect(typeof data.artists.total).toBe('number');
    expect(data.artists).toHaveProperty('byStatus');

    expect(data).toHaveProperty('projects');
    expect(data.projects).toHaveProperty('total');
    expect(typeof data.projects.total).toBe('number');
    expect(data.projects).toHaveProperty('byStatus');

    expect(data).toHaveProperty('assets');
    expect(data).toHaveProperty('kpiSnapshot');
    expect(data.kpiSnapshot).toHaveProperty('grossRevenue');
    expect(data.kpiSnapshot).toHaveProperty('pipelineValue');
    expect(data.kpiSnapshot).toHaveProperty('recoupableBalance');
  });

  test('GET /recent-activity returns array', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/recent-activity')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ===========================================================================
// 7. PASS TESTS — subscription tiers (3 tests)
// ===========================================================================
describe('Pass — /api/v1/pass', () => {
  let tierId;

  test('GET /tiers returns list', async () => {
    const res = await request(app)
      .get('/api/v1/pass/tiers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  test('Admin can create tier via POST /tiers', async () => {
    const payload = {
      name: `Test Tier ${SUFFIX}`,
      access_level: 3,
      price_monthly: 9.99,
      description: 'Test subscription tier',
    };

    const res = await request(app)
      .post('/api/v1/pass/tiers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.name).toBe(payload.name);
    expect(res.body.data.access_level).toBe(3);
    expect(res.body.data.is_active).toBe(true);

    tierId = res.body.data.id;
    createdTierIds.push(tierId);
  });

  test('GET /subscriptions returns list', async () => {
    const res = await request(app)
      .get('/api/v1/pass/subscriptions')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });
});

// ===========================================================================
// 8. PORT TESTS — assets & placements (3 tests)
// ===========================================================================
describe('Port — /api/v1/port', () => {
  let portArtistId;
  let assetId;

  beforeAll(async () => {
    // Create an artist to associate with assets
    const res = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `Port Artist ${SUFFIX}` });
    portArtistId = res.body.data.id;
    createdArtistIds.push(portArtistId);
  });

  test('Admin can create asset via POST /port/assets', async () => {
    const payload = {
      title: `Test Beat ${SUFFIX}`,
      file_type: 'beat',
      genre: 'Trap',
      bpm: 140,
      artist_id: portArtistId,
    };

    const res = await request(app)
      .post('/api/v1/port/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.title).toBe(payload.title);
    expect(res.body.data.file_type).toBe('beat');
    expect(res.body.data.bpm).toBe(140);
    expect(res.body.data.is_deleted).toBe(false);

    assetId = res.body.data.id;
    createdAssetIds.push(assetId);
  });

  test('GET /port/assets returns list', async () => {
    const res = await request(app)
      .get('/api/v1/port/assets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  test('GET /port/placements returns list', async () => {
    const res = await request(app)
      .get('/api/v1/port/placements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });
});

// ===========================================================================
// 9. ADDITIONAL EDGE-CASE & INTEGRATION TESTS
// ===========================================================================
describe('Additional integration tests', () => {
  test('Health check returns success', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('message');
  });

  test('GET /artists with invalid Bearer token returns 401', async () => {
    const res = await request(app)
      .get('/api/v1/artists')
      .set('Authorization', 'Bearer invalid.jwt.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('GET /artists/:id with non-existent UUID returns 404', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .get(`/api/v1/artists/${fakeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('Manager cannot delete artist (403 — admin only)', async () => {
    // Create an artist to try to delete
    const createRes = await request(app)
      .post('/api/v1/artists')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: `ManagerDeleteTest ${SUFFIX}` });
    const id = createRes.body.data.id;
    createdArtistIds.push(id);

    const res = await request(app)
      .delete(`/api/v1/artists/${id}`)
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Viewer cannot create project (403)', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ title: `Viewer Project ${SUFFIX}` });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Viewer cannot create pass tier (403)', async () => {
    const res = await request(app)
      .post('/api/v1/pass/tiers')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ name: 'Viewer Tier', access_level: 1 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Manager cannot create pass tier (403 — admin only)', async () => {
    const res = await request(app)
      .post('/api/v1/pass/tiers')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ name: 'Manager Tier', access_level: 1 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('Dashboard summary is inaccessible without token (401)', async () => {
    const res = await request(app).get('/api/v1/dashboard/summary');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });
});
