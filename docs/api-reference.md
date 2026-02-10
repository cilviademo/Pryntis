# Pryntis Panel -- API Reference

**Base URL**: `/api/v1`

All endpoints return JSON. All authenticated endpoints require `Authorization: Bearer <token>` header.

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Description of result"
}
```

### Success Response with Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "message": "Description of result",
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 142,
    "totalPages": 6
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      { "field": "email", "message": "Valid email required" }
    ]
  }
}
```

---

## Error Codes Reference

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 400 | `NO_FIELDS` | No valid fields provided for update |
| 400 | `ARTIST_ID_REQUIRED` | Tier gate requires artist identification |
| 401 | `AUTH_REQUIRED` | No token or invalid Authorization header |
| 401 | `INVALID_TOKEN` | Token expired, malformed, or missing version |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 401 | `TOKEN_REVOKED` | Token version mismatch (token invalidated) |
| 401 | `ACCOUNT_DISABLED` | User account deactivated |
| 403 | `FORBIDDEN` | User role does not have permission |
| 403 | `ACCOUNT_INACTIVE` | Login attempt for deactivated account |
| 403 | `TIER_REQUIRED` | Artist subscription tier too low |
| 404 | `NOT_FOUND` | Requested resource does not exist |
| 409 | `DUPLICATE_ENTRY` | Unique constraint violation (Postgres 23505) |
| 409 | `DUPLICATE_EMAIL` | Email already registered |
| 409 | `DUPLICATE` | General duplicate record |
| 429 | `RATE_LIMITED` | Too many login attempts |
| 500 | `INTERNAL_ERROR` | Unhandled server error |

---

## Health Check

### `GET /api/health`

No authentication required.

**Response**:
```json
{
  "success": true,
  "message": "Pryntis Panel API is running"
}
```

---

## Auth Endpoints

### `POST /api/v1/auth/register`

Create a new user account. Admin only.

| Field | Required | Auth | Roles |
|-------|----------|------|-------|
| | Yes | Yes | admin |

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Min 8 characters |
| `first_name` | string | Yes | Not empty |
| `last_name` | string | Yes | Not empty |
| `role` | string | Yes | One of: `admin`, `manager`, `viewer` |

**Response** (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "Jane",
    "last_name": "Doe",
    "role": "manager",
    "is_active": true,
    "created_at": "2026-01-15T00:00:00.000Z",
    "updated_at": "2026-01-15T00:00:00.000Z"
  },
  "message": "User created successfully"
}
```

---

### `POST /api/v1/auth/login`

Authenticate and receive a JWT. Rate limited: 10 attempts per 15 minutes.

| Field | Required | Auth | Roles |
|-------|----------|------|-------|
| | No | No | Any |

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | Yes | Valid email |
| `password` | string | Yes | Not empty |

**Response** (200):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "id": "uuid",
      "email": "admin@pryntis.com",
      "first_name": "Marc",
      "last_name": "Miller-Nelson",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

---

### `GET /api/v1/auth/me`

Get the current user's profile.

| Auth | Roles |
|------|-------|
| Yes | Any authenticated user |

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@pryntis.com",
    "first_name": "Marc",
    "last_name": "Miller-Nelson",
    "role": "admin",
    "is_active": true,
    "created_at": "2026-01-15T00:00:00.000Z",
    "updated_at": "2026-01-15T00:00:00.000Z"
  },
  "message": "Profile retrieved"
}
```

---

### `PUT /api/v1/auth/me`

Update the current user's profile.

| Auth | Roles |
|------|-------|
| Yes | Any authenticated user |

**Request Body** (all fields optional):

| Field | Type | Validation |
|-------|------|------------|
| `first_name` | string | Not empty |
| `last_name` | string | Not empty |
| `email` | string | Valid email |

**Response** (200): Same shape as `GET /api/v1/auth/me`.

---

## User Endpoints

All user endpoints require authentication.

### `GET /api/v1/users`

List all users with pagination.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Note**: The controller additionally restricts the full list to admins only. Managers can access the route but the controller returns 403 for non-admins.

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 25 | Items per page (max 100) |

**Response** (200): Array of user objects with pagination.

---

### `GET /api/v1/users/:id`

Get a single user by ID.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Response** (200): Single user object (excludes `password_hash`).

---

### `PUT /api/v1/users/:id`

Update a user account. Admin only.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Request Body** (all fields optional):

| Field | Type | Validation |
|-------|------|------------|
| `first_name` | string | |
| `last_name` | string | |
| `email` | string | |
| `role` | string | One of: `admin`, `manager`, `viewer` |
| `is_active` | boolean | |

**Response** (200): Updated user object.

---

### `POST /api/v1/users/:id/deactivate`

Deactivate a user account and revoke all their tokens.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Request Body**: None.

**Response** (200): Deactivated user object with `is_active: false`.

---

## Artist Endpoints

All artist endpoints require authentication.

### `GET /api/v1/artists`

List artists with search, filtering, sorting, and pagination.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | | Full-text search query |
| `status` | string | | Filter by status (`active`, `inactive`, `archived`) |
| `genre` | string | | Filter by genre |
| `sortBy` | string | `created_at` | Sort column |
| `sortDir` | string | `DESC` | Sort direction (`ASC` or `DESC`) |
| `page` | integer | 1 | Page number |
| `limit` | integer | 25 | Items per page (max 100) |

**Response** (200): Array of artist objects with pagination. When `q` is provided, results include a `rank` field and are sorted by relevance.

---

### `GET /api/v1/artists/:id`

Get a single artist by ID.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Single artist object. Returns 404 if artist is soft-deleted.

---

### `POST /api/v1/artists`

Create a new artist.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Not empty |
| `stage_name` | string | No | |
| `email` | string | No | Valid email if provided |
| `phone` | string | No | |
| `bio` | string | No | |
| `genre` | string | No | |
| `status` | string | No | One of: `active`, `inactive`, `archived`. Default: `active` |
| `notes` | string | No | |

**Response** (201): Created artist object.

---

### `PUT /api/v1/artists/:id`

Update an existing artist.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**: Same fields as create, all optional.

**Response** (200): Updated artist object. Sets `updated_by` to current user.

---

### `DELETE /api/v1/artists/:id`

Soft-delete an artist (sets `is_deleted = true`).

| Auth | Roles |
|------|-------|
| Yes | admin |

**Response** (200): Archived artist object.

---

### `POST /api/v1/artists/:id/restore`

Restore a soft-deleted artist.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Response** (200): Restored artist object with `is_deleted: false`.

---

## Project Endpoints

All project endpoints require authentication.

### `GET /api/v1/projects`

List projects with search, filtering, sorting, and pagination.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | | Full-text search query |
| `status` | string | | Filter by status |
| `artist_id` | UUID | | Filter by primary artist |
| `sortBy` | string | `created_at` | Sort column |
| `sortDir` | string | `DESC` | Sort direction |
| `page` | integer | 1 | Page number |
| `limit` | integer | 25 | Items per page (max 100) |

**Response** (200): Array of project objects with `artist_name` joined and pagination.

---

### `GET /api/v1/projects/:id`

Get a single project with its collaborators.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Neon Nights EP",
    "artist_name": "Marcus Thompson",
    "collaborators": [
      {
        "id": "uuid",
        "artist_id": "uuid",
        "artist_name": "Samantha Chen",
        "stage_name": "Sable",
        "role_description": "Co-producer",
        "created_at": "..."
      }
    ],
    "...": "..."
  },
  "message": "Project retrieved"
}
```

---

### `POST /api/v1/projects`

Create a new project.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `title` | string | Yes | Not empty |
| `description` | string | No | |
| `artist_id` | UUID | No | Valid UUID |
| `status` | string | No | One of: `draft`, `in_progress`, `completed`, `archived`. Default: `draft` |
| `start_date` | date | No | |
| `target_completion_date` | date | No | |

**Response** (201): Created project object.

---

### `PUT /api/v1/projects/:id`

Update an existing project.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**: Same fields as create, all optional. Also accepts `artist_id`.

**Response** (200): Updated project object.

---

### `DELETE /api/v1/projects/:id`

Soft-delete a project.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Response** (200): Archived project object.

---

### `POST /api/v1/projects/:id/restore`

Restore a soft-deleted project.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Response** (200): Restored project object.

---

### `POST /api/v1/projects/:id/collaborators`

Add a collaborator to a project.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `artist_id` | UUID | Yes | Valid UUID |
| `role_description` | string | No | |

**Response** (201): Created collaborator record. Returns 409 if the artist is already a collaborator.

---

### `DELETE /api/v1/projects/:id/collaborators/:artistId`

Remove a collaborator from a project.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Response** (200): Success message with null data.

---

## Dashboard Endpoints

All dashboard endpoints require authentication.

### `GET /api/v1/dashboard/summary`

Get aggregated dashboard data including KPI metrics.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200):
```json
{
  "success": true,
  "data": {
    "artists": {
      "total": 22,
      "byStatus": { "active": 18, "inactive": 3, "archived": 1 }
    },
    "projects": {
      "total": 18,
      "byStatus": { "draft": 5, "in_progress": 8, "completed": 5 }
    },
    "assets": {
      "total": 45
    },
    "placements": {
      "byStatus": { "pending": 3, "confirmed": 5, "completed": 10 }
    },
    "subscriptionDistribution": [
      { "tier_name": "Gold", "access_level": 2, "subscriber_count": 5 }
    ],
    "kpiSnapshot": {
      "grossRevenue": 125000.00,
      "recoupableBalance": 15000.00,
      "recouped": false,
      "pipelineValue": 45000.00,
      "atRiskRevenue": 7500.00
    }
  },
  "message": "Dashboard summary retrieved"
}
```

**KPI Calculations**:
- **Gross revenue**: `SUM(amount)` from `revenue_events`.
- **Recoupable balance**: `SUM(expenses.amount) - SUM(revenue.amount_applied_to_recoupment)`. Positive means unrecouped.
- **Pipeline value**: Weighted sum of placement expected values: pending at 25%, confirmed at 60%, completed at 100%.
- **At-risk revenue**: `SUM(expected_value * 0.25)` for pending placements.

---

### `GET /api/v1/dashboard/recent-activity`

Get the 20 most recent activity feed entries.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of activity feed entries with actor name joined.

---

## Pass Endpoints (Subscriptions)

All Pass endpoints require authentication.

### `GET /api/v1/pass/tiers`

List subscription tiers with pagination.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Query Parameters**:

| Param | Type | Default |
|-------|------|---------|
| `page` | integer | 1 |
| `limit` | integer | 25 |

**Response** (200): Array of tier objects ordered by `access_level ASC`.

---

### `POST /api/v1/pass/tiers`

Create a new subscription tier.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | Yes | Not empty |
| `access_level` | integer | Yes | Not empty (CHECK 1-5 enforced by DB) |
| `description` | string | No | |
| `features` | JSON array | No | |
| `price_monthly` | decimal | No | |
| `is_active` | boolean | No | Default: true |

**Response** (201): Created tier object.

---

### `PUT /api/v1/pass/tiers/:id`

Update a subscription tier.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Request Body**: Fields `name`, `description`, `access_level`, `features`, `price_monthly`, `is_active` -- all optional.

**Response** (200): Updated tier object.

---

### `GET /api/v1/pass/subscriptions`

List artist subscriptions with optional filters and pagination.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Query Parameters**:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `artist_id` | UUID | | Filter by artist |
| `status` | string | | Filter by subscription status |
| `page` | integer | 1 | |
| `limit` | integer | 25 | |

**Response** (200): Array of subscription objects with joined `artist_name`, `stage_name`, `tier_name`, `access_level`, `price_monthly`.

---

### `POST /api/v1/pass/subscriptions`

Create a new artist subscription.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `artist_id` | UUID | Yes | Valid UUID |
| `tier_id` | UUID | Yes | Valid UUID |
| `status` | string | No | Default: `active` |
| `start_date` | date | No | Default: today |
| `end_date` | date | No | |

**Response** (201): Created subscription object.

---

### `PUT /api/v1/pass/subscriptions/:id`

Update a subscription.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**: Fields `tier_id`, `status`, `start_date`, `end_date` -- all optional.

**Response** (200): Updated subscription object.

---

## Port Endpoints (Assets, Placements, Ownership, Usage)

All Port endpoints require authentication.

### Assets

#### `GET /api/v1/port/assets`

List assets.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of asset objects.

---

#### `GET /api/v1/port/assets/:id`

Get a single asset by ID.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Single asset object.

---

#### `POST /api/v1/port/assets`

Create a new asset.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Asset title |
| `file_type` | string | Yes | One of: `beat`, `stem`, `mix`, `master`, `sample` |
| `file_name` | string | No | Original file name |
| `storage_key` | string | No | Storage reference |
| `genre` | string | No | Genre classification |
| `bpm` | integer | No | Beats per minute |
| `key_signature` | string | No | Musical key |
| `duration_seconds` | integer | No | Duration |
| `artist_id` | UUID | No | Associated artist |
| `project_id` | UUID | No | Associated project |
| `external_url` | string | No | External reference URL |
| `notes` | string | No | Internal notes |

**Response** (201): Created asset object.

---

#### `PUT /api/v1/port/assets/:id`

Update an asset.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**: Same fields as create, all optional.

**Response** (200): Updated asset object.

---

#### `DELETE /api/v1/port/assets/:id`

Soft-delete an asset.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Response** (200): Archived asset object.

---

#### `POST /api/v1/port/assets/:id/restore`

Restore a soft-deleted asset.

| Auth | Roles |
|------|-------|
| Yes | admin |

**Response** (200): Restored asset object.

---

#### `POST /api/v1/port/assets/:id/tags`

Add a tag to an asset.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required |
|-------|------|----------|
| `tag` | string | Yes |

**Response** (201): Created tag record. Returns 409 if tag already exists on asset.

---

#### `DELETE /api/v1/port/assets/:id/tags/:tagId`

Remove a tag from an asset.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Response** (200): Success message.

---

### Placements

#### `GET /api/v1/port/placements`

List placements.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of placement objects.

---

#### `POST /api/v1/port/placements`

Create a new placement.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset_id` | UUID | Yes | Asset being placed |
| `placement_type` | string | Yes | One of: `sync`, `feature`, `license`, `release` |
| `status` | string | No | Default: `pending` |
| `placed_with` | string | No | Recipient name |
| `placement_date` | date | No | |
| `expected_value` | decimal | No | |
| `notes` | string | No | |

**Response** (201): Created placement object.

---

#### `PUT /api/v1/port/placements/:id`

Update a placement.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**: Same fields as create, all optional.

**Response** (200): Updated placement object.

---

### Ownership Records

#### `GET /api/v1/port/ownership`

List ownership records.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of ownership record objects.

---

#### `POST /api/v1/port/ownership`

Create a new ownership record.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset_id` | UUID | Yes | Associated asset |
| `owner_name` | string | Yes | Rights holder name |
| `ownership_type` | string | Yes | One of: `writer`, `producer`, `publisher`, `master` |
| `percentage` | decimal | Yes | Ownership percentage (0-100) |
| `pro_affiliation` | string | No | PRO (ASCAP, BMI, etc.) |
| `ipi_number` | string | No | IPI/CAE number |
| `notes` | string | No | |

**Response** (201): Created ownership record. Returns 409 if duplicate `(asset_id, owner_name, ownership_type)`.

---

#### `PUT /api/v1/port/ownership/:id`

Update an ownership record.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**: Same fields as create, all optional.

**Response** (200): Updated ownership record.

---

### Usage Records

#### `GET /api/v1/port/usage`

List usage records.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of usage record objects.

---

#### `POST /api/v1/port/usage`

Create a new usage record.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `asset_id` | UUID | Yes | Associated asset |
| `usage_type` | string | Yes | One of: `stream`, `download`, `sync`, `broadcast` |
| `platform` | string | No | Platform name |
| `date_recorded` | date | No | Default: today |
| `count` | integer | No | Default: 0 |
| `revenue` | decimal | No | Default: 0 |
| `notes` | string | No | |

**Response** (201): Created usage record.

---

## Task Endpoints

All task endpoints require authentication.

### `GET /api/v1/tasks`

List tasks.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of task objects.

---

### `GET /api/v1/tasks/:id`

Get a single task by ID.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Single task object.

---

### `POST /api/v1/tasks`

Create a new task.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `description` | string | No | Task description |
| `status` | string | No | Default: `open`. One of: `open`, `in_progress`, `done`, `cancelled` |
| `priority` | string | No | Default: `medium`. One of: `low`, `medium`, `high`, `urgent` |
| `due_date` | date | No | |
| `assigned_to` | UUID | No | User to assign |
| `related_entity_type` | string | No | e.g., `artist`, `project`, `asset` |
| `related_entity_id` | UUID | No | ID of related entity |
| `artist_id` | UUID | No | Associated artist |

**Response** (201): Created task object.

---

### `PUT /api/v1/tasks/:id`

Update a task.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**: Same fields as create, all optional.

**Response** (200): Updated task object.

---

## KPI Endpoints

All KPI endpoints require authentication.

### `GET /api/v1/kpi/artist/:artistId`

Get KPI summary for a specific artist.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Artist KPI object with revenue, expense, and pipeline metrics.

---

### `GET /api/v1/kpi/artist/:artistId/revenue`

Get revenue events for a specific artist.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of revenue event records.

---

### `POST /api/v1/kpi/artist/:artistId/revenue`

Create a revenue event for a specific artist.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | decimal | Yes | Revenue amount |
| `amount_applied_to_recoupment` | decimal | No | Portion applied to recoupment |
| `asset_id` | UUID | No | Associated asset |
| `placement_id` | UUID | No | Associated placement |
| `source` | string | No | Revenue source |
| `description` | string | No | Event description |
| `event_date` | date | No | Default: today |

**Response** (201): Created revenue event.

---

### `GET /api/v1/kpi/artist/:artistId/expenses`

Get recoupable expenses for a specific artist.

| Auth | Roles |
|------|-------|
| Yes | admin, manager, viewer |

**Response** (200): Array of expense records.

---

### `POST /api/v1/kpi/artist/:artistId/expenses`

Create a recoupable expense for a specific artist.

| Auth | Roles |
|------|-------|
| Yes | admin, manager |

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | decimal | Yes | Expense amount |
| `category` | string | Yes | One of: `advance`, `marketing`, `recording`, `distribution`, `legal`, `other` |
| `description` | string | No | Expense description |
| `expense_date` | date | No | Default: today |

**Response** (201): Created expense record.

---

## Tier Gate Middleware

The `requireTier(minLevel)` middleware is available for routes that need to enforce subscription-tier access. It checks whether the artist (resolved from `req.body.artist_id`, `req.params.artistId`, or `req.params.artist_id`) has an active subscription with `access_level >= minLevel`.

This middleware is defined in `server/middleware/tierGate.js` and can be applied to any route that requires tier-gated access. If the artist does not have a qualifying subscription, it returns a 403 with code `TIER_REQUIRED`.
