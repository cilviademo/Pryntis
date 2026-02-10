# Pryntis Panel

Web-based administrative platform for music production operations.

**APCV 498 Senior Capstone — University of Arizona, Spring 2026**

## Tech Stack

- **Frontend:** React 18, React Router, Recharts
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Auth:** JWT + bcrypt

## Project Structure

```
client/           React frontend (admin dashboard)
server/           Express API server
  config/         Database & environment config
  controllers/    Request handlers
  middleware/     Auth, RBAC, validation, error handling
  models/         Database query layer
  routes/         API route definitions
  seeds/          Test data generation
database/         SQL schema & migrations
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install all dependencies
npm install
npm install --prefix client

# Copy environment config
cp .env.example .env
# Edit .env with your database credentials

# Create database and run schema
createdb pryntis
psql pryntis -f database/schema.sql

# Seed test data
npm run db:seed
```

### Running

```bash
# Development (both server and client)
npm run dev

# Server only
npm run server:dev

# Client only
npm run client
```

### Test Accounts

| Email | Password | Role |
|---|---|---|
| admin@pryntis.com | password123 | admin |
| manager@pryntis.com | password123 | manager |
| viewer@pryntis.com | password123 | viewer |

## API

All endpoints at `/api/v1/`. Protected routes require `Authorization: Bearer <token>` header.

- `POST /api/v1/auth/login` — authenticate
- `GET /api/v1/auth/me` — current user profile
- `GET|POST /api/v1/artists` — list / create artists
- `GET|PUT|DELETE /api/v1/artists/:id` — artist detail / update / archive
- `GET|POST /api/v1/projects` — list / create projects
- `GET|PUT|DELETE /api/v1/projects/:id` — project detail / update / archive
- `POST|DELETE /api/v1/projects/:id/collaborators` — manage collaborators
- `GET /api/v1/dashboard/summary` — aggregate metrics
- `GET /api/v1/dashboard/recent-activity` — recent changes

## Modules

1. **Panel** (Increment 1) — Dashboard, artist/project management, auth & RBAC
2. **Pass** (Increment 2) — Subscription tier config & access enforcement
3. **Port** (Increment 3) — Portfolio tracking, placements, ownership, usage records
