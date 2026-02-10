# Pryntis Panel -- Development Log

**APCV 498 Senior Capstone | University of Arizona | Spring 2026**

---

## Increment 1 -- Foundation

### Decisions

- **Monolithic architecture**: Chose a single Express server + single React client over microservices. For a capstone project scope, this avoids operational complexity while still demonstrating clean separation of concerns.
- **PostgreSQL over MongoDB**: Relational data (artists, projects, subscriptions, ownership splits) fits naturally into tables with foreign keys. PostgreSQL also provides full-text search natively, eliminating the need for Elasticsearch.
- **UUID primary keys**: Using `uuid_generate_v4()` instead of auto-incrementing integers. Avoids ID enumeration, simplifies future data migration, and works cleanly with frontend routing.
- **No ORM**: Direct SQL via `pg` driver. Keeps queries transparent and avoids the abstraction overhead of Sequelize or Prisma for a project of this size.
- **JWT with token_version**: Chose stateless JWT authentication with a `token_version` column for token revocation. This avoids maintaining a token blacklist while still supporting instant token invalidation on user deactivation.
- **bcrypt cost factor 12**: Balances security with performance for development. Production could increase this.

### Implementation Notes

- Set up Docker Compose for PostgreSQL 16 with Alpine image. Schema applied automatically via `/docker-entrypoint-initdb.d/`.
- Created the full DDL with 16 tables, enum types, indexes, and triggers in a single `schema.sql` file.
- Implemented Express server with versioned API routes (`/api/v1/*`).
- Built authentication flow: registration (admin-only), login with rate limiting, JWT issuance with `token_version` claim.
- Built RBAC middleware (`authorize(...roles)`) and applied it to all routes.
- Created standardized response helpers (`success()`, `created()`) and centralized error handler with `AppError` class.
- Seed script generates 5 users, 25 artists, 20 projects, and 12 collaborator records.

---

## Increment 2 -- Panel Core + Pass

### Decisions

- **Full-text search with tsvector**: Used PostgreSQL-native full-text search with weighted fields rather than adding an external search service. Artists weight stage_name/name highest (A), genre as secondary (B), bio as tertiary (C), notes as lowest (D). Trigger functions keep search vectors up to date automatically.
- **Soft deletes over hard deletes**: Implemented `is_deleted` + `deleted_at` pattern on artists, projects, assets, and placements. This preserves referential integrity and allows admin-only restore. Partial indexes on `WHERE NOT is_deleted` keep query performance unaffected.
- **Pagination convention**: All list endpoints use `page` + `limit` query params with a max limit of 100. Response includes a `pagination` object with `page`, `limit`, `total`, `totalPages`.
- **Subscription tier access_level as integer (1-5)**: Allows simple numeric comparison for tier gating rather than string-based feature flags.
- **Tier gate middleware**: Created `requireTier(minLevel)` that checks the artist's active subscription level. Resolves artist ID from multiple request sources (`body.artist_id`, `params.artistId`, `params.artist_id`).

### Implementation Notes

- Artist CRUD with full-text search, status filtering, genre filtering, and configurable sort.
- Project CRUD with collaborator management (add/remove with uniqueness constraint).
- User management endpoints for admins: list, get, update role/status, deactivate (increments `token_version`).
- Dashboard summary endpoint with 11 parallel queries for aggregated stats.
- Pass module: subscription tiers CRUD and artist subscription assignment.
- React client: login page, dashboard with ECharts visualizations, artist and project list/detail pages.
- Client-side auth context with token stored in module-scoped variable (not localStorage).

---

## Increment 3 -- Port + KPI + Tasks

### Decisions

- **Assets as metadata-only**: File upload infrastructure was deferred. Assets store metadata (title, file_type, bpm, key, duration) and an optional `external_url` for external references. The `storage_key` field exists for future file storage integration.
- **Placement pipeline with weighted value**: Pipeline value calculation uses weights: pending (25%), confirmed (60%), completed (100%). At-risk revenue is the 25% weighting of pending placements.
- **Ownership split validation at DB level**: The `percentage` column has a CHECK constraint (0-100), and a UNIQUE constraint on `(asset_id, owner_name, ownership_type)` prevents duplicate entries. Application-level sum validation (ensuring splits total 100%) was deferred.
- **Generic entity linking for tasks**: Tasks use `related_entity_type` (string) + `related_entity_id` (UUID) for polymorphic association rather than separate foreign keys for each entity type.
- **Activity feed as append-only log**: The `activity_feed` table has no UPDATE or DELETE operations. Events are inserted and queried chronologically.
- **ECharts for client dashboards**: Chose ECharts via `echarts-for-react` for dashboard visualizations. Supports bar charts, pie charts, and more with a dark theme.

### Implementation Notes

- Port module: assets CRUD with tags (add/remove), placements with pipeline status, ownership records with split tracking, usage records for analytics.
- KPI endpoints: artist-level revenue events, recoupable expenses, and computed KPI summaries.
- Task management: CRUD with priority, status, due dates, assignment, and entity linking.
- Analytics page in the React client for deeper data exploration.
- Dark admin interface styling across all pages.
- Responsive tables with integrated search, filter, and pagination controls.

---

## Testing Approach

- **Framework**: Jest + Supertest for API integration tests.
- **Strategy**: Tests run against a real PostgreSQL database (requires Docker to be running). Tests use the seed data as a baseline.
- **Commands**:
  - `npm test` -- Run all tests.
  - `npm run test:smoke` -- Run tests with verbose output.
- **Prerequisites**: Database must be running and seeded before tests execute.
- **Configuration**: Tests use the same `.env` configuration as development. The test suite conditionally skips server startup when `NODE_ENV=test`.

---

## Troubleshooting

### If Something Breaks

**Database not running**
```bash
docker compose up -d
```
Wait a few seconds for PostgreSQL to start. Check health with:
```bash
docker compose ps
```

**Port conflicts**
Check what is using ports 5432, 5000, or 3000:
```bash
lsof -i :5432
lsof -i :5000
lsof -i :3000
```
Kill the conflicting process or change ports in `.env` and `docker-compose.yml`.

**Schema did not apply**
If the database exists but tables are missing:
```bash
npm run db:reset
```
This drops and recreates the schema, then seeds the data.

**Login fails**
1. Rerun the seed script:
   ```bash
   npm run db:seed
   ```
2. Confirm you are using the correct credentials. Seed password for all accounts is `password123`.
3. Test accounts:
   - `admin@pryntis.com` / `password123` (admin)
   - `manager@pryntis.com` / `password123` (manager)
   - `viewer@pryntis.com` / `password123` (viewer)

**401 Unauthorized everywhere**
- Check that the `Authorization` header has the `Bearer ` prefix (with a trailing space before the token).
- Verify the JWT has not expired (default expiry is 24 hours).
- If a user was deactivated, their `token_version` was incremented and all existing tokens are now invalid. Re-login is required.

**Tests fail**
1. Ensure Docker is running and the database is accessible:
   ```bash
   docker compose up -d
   ```
2. Ensure `.env` exists at the project root with correct `DATABASE_URL`.
3. Seed the database:
   ```bash
   npm run db:seed
   ```
4. Run tests:
   ```bash
   npm test
   ```

**Client won't start**
```bash
cd client && npm install
```
Then return to the project root and run:
```bash
npm run client
```

**Blank page in browser**
1. Open the browser developer console (F12) and check for JavaScript errors.
2. Verify the API server is running on port 5000.
3. Verify the Vite dev server proxy is configured to forward `/api` requests to the Express server.
4. Check network tab for failed API requests.

**Everything is broken -- full reset**
```bash
npm run reset
```
This stops Docker, deletes the database volume, restarts Docker, waits for PostgreSQL, and re-seeds.

---

### Tests Failing Checklist

1. Is Docker running?
   ```bash
   docker compose ps
   ```
   Expected: `db` service should show `healthy` status.

2. Does `.env` exist?
   ```bash
   ls -la server/.env.example
   cat .env
   ```
   If `.env` is missing, copy from example:
   ```bash
   cp server/.env.example .env
   ```

3. Is the database accessible?
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

4. Is seed data present?
   ```bash
   npm run db:seed
   ```

5. Are there port conflicts?
   ```bash
   lsof -i :5432
   lsof -i :5000
   ```

6. Is `node_modules` up to date?
   ```bash
   npm install
   ```

7. Run tests with verbose output for detailed error information:
   ```bash
   npm run test:smoke
   ```

---

## npm Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run server` | `node server/server.js` | Start API server |
| `npm run server:dev` | `nodemon server/server.js` | Start API with hot reload |
| `npm run client` | `npm run dev --prefix client` | Start Vite dev server |
| `npm run dev` | `concurrently server:dev + client` | Start both API and client |
| `npm run dev:all` | Docker up + dev | Start Docker, API, and client |
| `npm run db:schema` | `psql -f schema.sql` | Apply schema to database |
| `npm run db:seed` | `node server/seeds/run.js` | Seed database with test data |
| `npm run db:reset` | Drop + schema + seed | Full database reset |
| `npm run reset` | Docker reset + seed | Nuclear reset (destroys volume) |
| `npm test` | `jest` | Run test suite |
| `npm run test:smoke` | `jest --verbose` | Run tests with verbose output |
| `npm run preflight` | `node scripts/preflight.js` | Pre-run validation |
| `npm run install:all` | Install root + client | Install all dependencies |
