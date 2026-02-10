# Pryntis Panel

Web-based administrative platform for music production operations -- managing artists, projects, subscriptions, digital asset portfolios, placements, ownership splits, usage tracking, and KPI analytics.

**APCV 498 Senior Capstone -- University of Arizona, Spring 2026**
**Author:** Marc Miller-Nelson

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router 6, ECharts |
| Backend | Node.js, Express.js, express-validator |
| Database | PostgreSQL 16 (uuid-ossp, pg_trgm, tsvector FTS) |
| Auth | JWT + bcrypt (12 rounds), token_version invalidation |
| Testing | Jest + Supertest (25+ integration tests) |
| Infra | Docker Compose (PostgreSQL) |

## Modules

| Module | Scope |
|--------|-------|
| **Panel** (Increment 1) | Dashboard, artist/project CRUD, auth, RBAC, users admin, soft delete/restore |
| **Pass** (Increment 2) | Subscription tiers, artist subscriptions, tier-gated access middleware |
| **Port** (Increment 3) | Assets, tags, placements, ownership records, usage records, pipeline analytics |
| **KPI Engine** | Gross revenue, recoupable balance, pipeline value, at-risk revenue, payable calculation |
| **Ops** | Tasks, activity feed, contacts, analytics dashboard |

## Project Structure

```
client/                 React frontend (Vite)
  src/
    components/         Layout, shared components
    context/            AuthContext (JWT, role state)
    pages/              13 page components
    services/           API client
    styles/             Global CSS (dark slate theme)
server/                 Express API
  config/               Database pool, environment config
  controllers/          9 controller modules
  middleware/           Auth, RBAC, tierGate, validation, error handling
  routes/              9 route modules
  seeds/               Seed runner (JS)
  utils/               listQuery (FTS + pagination), response helpers
database/               SQL schema + seed data
  schema.sql           16 tables, 12 enums, FTS triggers, GIN indexes
  seed.sql             Comprehensive seed data (all modules)
docs/                   Documentation suite
  architecture.md      System architecture
  database-schema.md   Full schema reference
  api-reference.md     All API endpoints
  rbac-matrix.md       Role-based access control matrix
  development-log.md   Development timeline
  scope.md             Project scope document
scripts/                Utility scripts
  preflight.js         Environment + database check
tests/                  Integration tests
  api.test.js          25+ endpoint tests
docker-compose.yml      PostgreSQL service
```

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose (for PostgreSQL)

### One-Command Setup

```bash
# 1. Clone and install everything
git clone <repo-url> && cd Pryntis
npm run install:all

# 2. Copy environment config
cp .env.example .env

# 3. Start PostgreSQL, seed data, and run dev servers
npm run dev:all
```

The app will be available at `http://localhost:3000` (frontend) and `http://localhost:5000` (API).

### Step-by-Step Setup

```bash
# Install dependencies (root + client)
npm run install:all

# Copy and configure environment
cp .env.example .env
# Edit .env if needed (defaults work with Docker Compose)

# Start PostgreSQL via Docker
docker compose up -d

# Wait for database to be ready, then seed
sleep 5
npm run db:seed

# Run preflight check
npm run preflight

# Start development servers
npm run dev
```

### Available Scripts

| Script | Description |
|--------|------------|
| `npm run dev` | Start API + frontend concurrently |
| `npm run dev:all` | Docker Compose up + dev servers |
| `npm run server:dev` | API server with nodemon |
| `npm run client` | Vite dev server (port 3000) |
| `npm run db:seed` | Run seed data |
| `npm run db:reset` | Drop schema, recreate, reseed |
| `npm run reset` | Full Docker reset + reseed |
| `npm test` | Run Jest test suite |
| `npm run preflight` | Check env + database health |

### Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@pryntis.com | password123 | admin |
| admin2@pryntis.com | password123 | admin |
| manager@pryntis.com | password123 | manager |
| manager2@pryntis.com | password123 | manager |
| viewer@pryntis.com | password123 | viewer |

## API Reference

All endpoints under `/api/v1/`. Protected routes require `Authorization: Bearer <token>`.

### Auth
- `POST /auth/login` -- authenticate, returns JWT
- `GET /auth/me` -- current user profile

### Artists
- `GET /artists` -- list (FTS search, filter, paginate)
- `POST /artists` -- create (admin/manager)
- `GET /artists/:id` -- detail
- `PUT /artists/:id` -- update (admin/manager)
- `DELETE /artists/:id` -- soft delete (admin/manager)
- `POST /artists/:id/restore` -- restore (admin)

### Projects
- `GET /projects` -- list (FTS search, filter, paginate)
- `POST /projects` -- create (admin/manager)
- `GET /projects/:id` -- detail with collaborators
- `PUT /projects/:id` -- update (admin/manager)
- `DELETE /projects/:id` -- soft delete (admin/manager)
- `POST /projects/:id/restore` -- restore (admin)
- `POST /projects/:id/collaborators` -- add collaborator
- `DELETE /projects/:id/collaborators/:artistId` -- remove collaborator

### Users (admin only)
- `GET /users` -- list all users
- `GET /users/:id` -- user detail
- `PUT /users/:id` -- update role/status
- `POST /users/:id/deactivate` -- deactivate + bump token_version

### Pass (Subscriptions)
- `GET /pass/tiers` -- list subscription tiers
- `POST /pass/tiers` -- create tier (admin)
- `PUT /pass/tiers/:id` -- update tier (admin)
- `GET /pass/subscriptions` -- list subscriptions
- `POST /pass/subscriptions` -- assign subscription (admin/manager)
- `PUT /pass/subscriptions/:id` -- update subscription (admin/manager)

### Port (Assets & Placements)
- `GET /port/assets` -- list assets
- `POST /port/assets` -- create asset (admin/manager)
- `GET /port/assets/:id` -- asset detail with tags, ownership, placements
- `PUT /port/assets/:id` -- update asset
- `DELETE /port/assets/:id` -- soft delete asset
- `POST /port/assets/:id/tags` -- add tags
- `DELETE /port/assets/:id/tags/:tag` -- remove tag
- `GET /port/placements` -- list placements
- `POST /port/placements` -- create placement
- `PUT /port/placements/:id` -- update placement
- `GET /port/assets/:id/ownership` -- list ownership records
- `POST /port/assets/:id/ownership` -- add ownership record
- `PUT /port/ownership/:id` -- update ownership record
- `GET /port/assets/:id/usage` -- list usage records
- `POST /port/assets/:id/usage` -- add usage record

### Tasks
- `GET /tasks` -- list tasks (filter by status, priority, assignee, artist)
- `POST /tasks` -- create task
- `GET /tasks/:id` -- task detail
- `PUT /tasks/:id` -- update task

### KPI Engine
- `GET /kpi/artist/:artistId` -- artist KPI snapshot
- `GET /kpi/artist/:artistId/revenue` -- revenue events
- `POST /kpi/artist/:artistId/revenue` -- add revenue event
- `GET /kpi/artist/:artistId/expenses` -- recoupable expenses
- `POST /kpi/artist/:artistId/expenses` -- add expense

### Dashboard
- `GET /dashboard/summary` -- aggregate metrics + KPI snapshot
- `GET /dashboard/recent-activity` -- activity feed

## Database

16 tables across all three increments:

| Table | Module | Purpose |
|-------|--------|---------|
| users | Core | Auth accounts with token_version |
| artists | Core | Artist profiles with FTS (tsvector + GIN) |
| projects | Core | Production projects with FTS |
| project_collaborators | Core | Artist-project associations |
| subscription_tiers | Pass | Tier definitions |
| artist_subscriptions | Pass | Artist-tier assignments |
| assets | Port | Digital asset catalog |
| asset_tags | Port | Freeform tagging |
| placements | Port | Sync/feature/license placements |
| ownership_records | Port | Split ownership tracking |
| usage_records | Port | Stream/download/sync metrics |
| revenue_events | KPI | Revenue tracking per artist |
| recoupable_expenses | KPI | Advance/marketing/recording costs |
| tasks | Ops | Task management |
| activity_feed | Ops | Event logging |
| contacts | Ops | Industry contact repository |

## Seed Data

The seed includes realistic music industry data:
- 5 users (2 admin, 2 manager, 1 viewer)
- 35 artists including 7 "case artists" representing real scenarios:
  - MVRK -- Unrecouped ($50k advances, $18k earned)
  - Luna Rey -- Split dispute (overlapping ownership claims)
  - Crux -- Pending sync ($25k Netflix placement)
  - Sable -- Fully recouped ($5k payable)
  - JO Beats -- Expired subscription
  - Ray K -- Multi-asset producer (8+ assets, high placement activity)
  - Nate Wolfe -- New signing (zero revenue, high pipeline value)
- 75 projects across all statuses
- 25 project collaborators
- 3 subscription tiers (Basic $9.99, Premium $29.99, VIP $79.99)
- 25+ artist subscriptions
- 40 assets (beats, stems, mixes, masters, samples)
- 60+ asset tags
- 20 placements (sync, feature, license, release)
- 120 ownership records with realistic splits
- 200 usage records across platforms
- 30+ revenue events
- 20+ recoupable expenses
- 15+ tasks
- 20+ activity feed entries
- 10+ industry contacts

## RBAC Matrix

| Action | Admin | Manager | Viewer |
|--------|:-----:|:-------:|:------:|
| View dashboard | Y | Y | Y |
| View artists/projects | Y | Y | Y |
| Create/edit artists | Y | Y | N |
| Delete artists (soft) | Y | Y | N |
| Restore deleted records | Y | N | N |
| Manage users | Y | N | N |
| Create/edit subscriptions | Y | Y | N |
| Manage subscription tiers | Y | N | N |
| Create/edit assets | Y | Y | N |
| Manage placements | Y | Y | N |
| View analytics | Y | Y | Y |

## Security Features

- JWT with `token_version` for instant invalidation
- bcrypt (12 rounds) password hashing
- Rate limiting on login (10 req/15 min/IP)
- RBAC middleware enforced at API layer
- Soft deletes with `is_deleted` + `deleted_at`
- Audit fields (`updated_by` FK to users)
- Parameterized SQL queries (no raw interpolation)
- CORS configuration

## KPI Formulas

| Metric | Formula |
|--------|---------|
| Gross Revenue | SUM(revenue_events.amount) for artist |
| Recoupable Balance | SUM(expenses) - SUM(amount_applied_to_recoupment) |
| Pipeline Value | SUM(pending * 0.25 + confirmed * 0.6 + completed * 1.0) on placements |
| At-Risk Revenue | SUM(pending placements * 0.25) |
| Payable | MAX(0, -recoupable_balance) -- only positive when fully recouped |

## Runbook

### Full Reset
```bash
npm run reset
# Tears down Docker volumes, restarts PostgreSQL, reseeds all data
```

### Database Only Reset
```bash
npm run db:reset
# Drops and recreates schema, reseeds (requires running PostgreSQL)
```

### Run Tests
```bash
# Requires PostgreSQL running with seeded data
npm test
```

### Preflight Check
```bash
npm run preflight
# Verifies: .env exists, DATABASE_URL set, PostgreSQL reachable, all 16 tables present
```

### Production Build
```bash
cd client && npm run build
# Output in client/dist/, serve with any static file server
```

## Documentation

Detailed documentation is available in the `docs/` directory:
- `architecture.md` -- System design, data flow, deployment
- `database-schema.md` -- Complete table definitions and relationships
- `api-reference.md` -- Full endpoint documentation with examples
- `rbac-matrix.md` -- Detailed permission matrix
- `development-log.md` -- Build timeline and decisions
- `scope.md` -- Project scope and requirements
