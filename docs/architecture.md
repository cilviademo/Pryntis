# Pryntis Panel -- System Architecture

**APCV 498 Senior Capstone | University of Arizona | Spring 2026**

---

## Overview

Pryntis Panel is a monolithic full-stack web application for managing music production operations. The system is organized into three logical modules -- Panel, Pass, and Port -- that share a single PostgreSQL database, a single Express API server, and a single React client. All modules are deployed together as one unit via Docker Compose.

```
+---------------------------------------------------------------+
|                        BROWSER (Client)                       |
|  React 18 + Vite + React Router + ECharts                     |
|  Dark admin UI, SPA routing, token stored in memory           |
+------------------------------|--------------------------------+
                               | HTTP (JSON)
                               v
+---------------------------------------------------------------+
|                     API SERVER (Express)                       |
|  Port 5000  |  /api/v1/*  |  CORS enabled                    |
|                                                               |
|  +-----------+  +----------+  +-----------+  +------------+   |
|  | Auth MW   |->| RBAC MW  |->| Validate  |->| Controller |   |
|  | (JWT)     |  | (roles)  |  | (express- |  | (business  |   |
|  |           |  |          |  |  validator)|  |  logic)    |   |
|  +-----------+  +----------+  +-----------+  +-----+------+   |
|                                                    |           |
|  +-------------------+  +------------------------+ |           |
|  | Tier Gate MW      |  | Error Handler MW       | |           |
|  | (subscription     |  | (centralized, AppError)| |           |
|  |  enforcement)     |  +------------------------+ |           |
|  +-------------------+                             |           |
+------------------------------|---------------------+-----------+
                               | SQL (pg driver)
                               v
+---------------------------------------------------------------+
|                     PostgreSQL 16 (Alpine)                     |
|  Port 5432  |  Database: pryntis                              |
|  16 tables  |  UUID PKs  |  tsvector FTS  |  GIN indexes      |
|  Docker volume: pgdata                                        |
+---------------------------------------------------------------+
```

---

## Module Relationships

All three modules are logical groupings within the same codebase. They share the database, the API server, and the client application.

| Module | Purpose | API Prefix | Key Tables |
|--------|---------|------------|------------|
| **Panel** | Core admin operations | `/api/v1/artists`, `/api/v1/projects`, `/api/v1/users`, `/api/v1/dashboard`, `/api/v1/tasks` | users, artists, projects, project_collaborators, tasks, activity_feed, contacts |
| **Pass** | Subscription management | `/api/v1/pass` | subscription_tiers, artist_subscriptions |
| **Port** | Portfolio and asset management | `/api/v1/port`, `/api/v1/kpi` | assets, asset_tags, placements, ownership_records, usage_records, revenue_events, recoupable_expenses |

---

## Architecture Pattern

- **Monolithic full-stack**: Single deployable unit containing API and client.
- **RESTful API**: All data access through versioned JSON endpoints (`/api/v1/*`).
- **MVC-adjacent**: Routes define URL mapping, controllers contain business logic, models/queries handle data access. No formal model layer with ORMs -- controllers issue raw SQL via the `pg` driver.
- **No ORM**: Direct parameterized SQL queries throughout. This keeps the stack simple and the queries transparent.

---

## Tech Stack

### Server

| Component | Technology | Version |
|-----------|-----------|---------|
| Runtime | Node.js | 18+ |
| Framework | Express | 4.21 |
| Database driver | pg (node-postgres) | 8.13 |
| Authentication | jsonwebtoken | 9.0 |
| Password hashing | bcryptjs | 2.4 |
| Validation | express-validator | 7.2 |
| Rate limiting | express-rate-limit | 7.4 |
| Environment | dotenv | 16.4 |

### Client

| Component | Technology | Version |
|-----------|-----------|---------|
| Library | React | 18.3 |
| Build tool | Vite | 6.0 |
| Routing | React Router | 6.28 |
| Charts | ECharts (echarts-for-react) | 5.5 |

### Infrastructure

| Component | Technology | Version |
|-----------|-----------|---------|
| Database | PostgreSQL | 16 (Alpine) |
| Containerization | Docker Compose | 3.9 |
| Testing | Jest + Supertest | 29.7 / 7.0 |
| Dev tools | Nodemon, Concurrently | 3.1 / 9.0 |

---

## Directory Structure

```
Pryntis/
  client/                     # React SPA
    src/
      components/             # Reusable UI components
        Artists/              # Artist-related components
        Auth/                 # Login form
        Dashboard/            # Dashboard widgets and charts
        Pass/                 # Subscription management UI
        Port/                 # Asset/placement UI
        Projects/             # Project-related components
      context/
        AuthContext.jsx        # Auth state provider, token management
      pages/                  # Top-level route pages
        LoginPage.jsx
        DashboardPage.jsx
        ArtistsPage.jsx
        ArtistDetailPage.jsx
        ProjectsPage.jsx
        ProjectDetailPage.jsx
        UsersPage.jsx
        PassPage.jsx
        AssetsPage.jsx
        AssetDetailPage.jsx
        PlacementsPage.jsx
        TasksPage.jsx
        AnalyticsPage.jsx
      services/
        api.js                # HTTP client, token injection
      styles/                 # Global and shared CSS
      utils/                  # Client-side utilities
      App.jsx                 # Router and route definitions
      main.jsx                # Vite entry point
    package.json
  server/
    config/
      index.js                # Environment config (port, JWT secret, etc.)
      db.js                   # PostgreSQL connection pool
    controllers/
      authController.js       # Register, login, profile
      userController.js       # User CRUD (admin)
      artistController.js     # Artist CRUD with FTS
      projectController.js    # Project CRUD with collaborators
      dashboardController.js  # Dashboard summary and activity feed
      passController.js       # Tiers and subscriptions
    middleware/
      auth.js                 # JWT verification, token_version check
      rbac.js                 # Role-based access control
      validate.js             # express-validator result handler
      errorHandler.js         # Centralized error handler, AppError class
      tierGate.js             # Subscription tier enforcement
    models/                   # Optional model helpers
    routes/
      authRoutes.js
      userRoutes.js
      artistRoutes.js
      projectRoutes.js
      dashboardRoutes.js
      passRoutes.js
      portRoutes.js
      taskRoutes.js
      kpiRoutes.js
    seeds/
      run.js                  # Database seeder (users, artists, projects)
    services/                 # Business logic services
    utils/
      response.js             # Standard response helpers (success, created)
      listQuery.js            # Query builder utilities
    server.js                 # Express app setup and startup
    .env.example
  database/
    schema.sql                # Full DDL (16 tables, indexes, triggers)
  scripts/
    preflight.js              # Pre-run validation script
  docker-compose.yml          # PostgreSQL service definition
  package.json                # Root package with npm scripts
```

---

## Data Flow

A typical authenticated request follows this path:

```
1. React Component
   |
   v
2. api.js (services/api.js)
   - Attaches Bearer token from memory
   - Sends fetch() to /api/v1/*
   |
   v
3. Express Router (routes/*.js)
   - Matches HTTP method and path
   |
   v
4. Authentication Middleware (middleware/auth.js)
   - Extracts JWT from Authorization header
   - Verifies signature and expiry
   - Looks up user in DB, checks is_active and token_version
   - Attaches req.user = { id, email, role, token_version }
   |
   v
5. RBAC Middleware (middleware/rbac.js)
   - Checks req.user.role against allowed roles for this route
   - Returns 403 if unauthorized
   |
   v
6. Validation Middleware (middleware/validate.js)
   - Runs express-validator checks defined in route
   - Returns 400 with field-level errors if invalid
   |
   v
7. Controller (controllers/*.js)
   - Executes business logic
   - Issues parameterized SQL queries via db.query()
   - Calls success() or created() response helper
   |
   v
8. PostgreSQL
   - Executes query, returns rows
   |
   v
9. Response Helper (utils/response.js)
   - Wraps data in { success: true, data, message, pagination? }
   - Sends JSON response to client
```

---

## Authentication Flow

1. **Login**: Client sends `POST /api/v1/auth/login` with email and password.
2. **Verification**: Server checks credentials against bcrypt hash. Verifies account is active.
3. **Token issuance**: Server signs a JWT containing `{ id, email, role, token_version }` with configurable expiry (default 24h).
4. **Token storage**: Client stores the token in JavaScript memory (not localStorage, not cookies). The `api.js` module holds the token in a module-scoped variable.
5. **Subsequent requests**: Client attaches `Authorization: Bearer <token>` on every API call.
6. **Token validation**: Auth middleware verifies the JWT signature, checks that the user exists and is active, and confirms `token_version` matches the database value.
7. **Token revocation**: Incrementing `token_version` in the database invalidates all outstanding tokens for that user immediately. This happens on user deactivation.

---

## RBAC Enforcement

Role-based access control is enforced at the middleware layer, not in the frontend. The frontend may hide UI elements for convenience, but the API is the source of truth.

- **Middleware**: The `authorize(...allowedRoles)` function returns Express middleware that checks `req.user.role` against the specified roles.
- **Route-level**: Each route explicitly declares which roles may access it (e.g., `authorize('admin', 'manager')`).
- **Three roles**: `admin` (full access), `manager` (read-write on most resources), `viewer` (read-only access).
- **Registration**: Only admins can create new user accounts (`POST /api/v1/auth/register` requires admin role).

---

## Apache Superset Integration (Optional)

The architecture supports embedding Apache Superset as an optional analytics layer:

- **Deployment**: Superset runs as a separate Docker Compose service connected to the same PostgreSQL database.
- **Integration**: Superset dashboards are embedded in the React client via iframe.
- **Status**: An iframe stub is provided in the client. Full Superset configuration is optional and not required for core functionality.

---

## Environment Configuration

Configuration is managed via `.env` file at the server root:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | API server port |
| `NODE_ENV` | `development` | Environment mode |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/pryntis` | PostgreSQL connection string |
| `JWT_SECRET` | (none, required) | Secret for signing JWTs |
| `JWT_EXPIRES_IN` | `24h` | Token expiry duration |

---

## Key Design Decisions

1. **No ORM**: Raw SQL keeps queries visible and avoids abstraction overhead for a project of this scope.
2. **UUID primary keys**: All tables use `uuid_generate_v4()` for globally unique, non-sequential identifiers.
3. **Soft deletes**: Artists, projects, assets, and placements use `is_deleted` + `deleted_at` instead of hard deletes, preserving data integrity and enabling restore.
4. **Token versioning**: The `token_version` column on users enables instant token revocation without a token blacklist.
5. **Centralized error handling**: All errors flow through `errorHandler` middleware with a consistent JSON response shape.
6. **Full-text search**: PostgreSQL-native tsvector with weighted fields and GIN indexes, avoiding external search services.
