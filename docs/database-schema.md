# Pryntis Panel -- Database Schema

**PostgreSQL 16 | 16 Tables | UUID Primary Keys**

---

## Enum Types

The schema defines the following custom enum types:

| Enum | Values |
|------|--------|
| `user_role` | `admin`, `manager`, `viewer` |
| `artist_status` | `active`, `inactive`, `archived` |
| `project_status` | `draft`, `in_progress`, `completed`, `archived` |
| `subscription_st` | `active`, `expired`, `suspended` |
| `asset_file_type` | `beat`, `stem`, `mix`, `master`, `sample` |
| `placement_type` | `sync`, `feature`, `license`, `release` |
| `placement_status` | `pending`, `confirmed`, `completed`, `declined` |
| `ownership_type` | `writer`, `producer`, `publisher`, `master` |
| `usage_type` | `stream`, `download`, `sync`, `broadcast` |
| `task_status` | `open`, `in_progress`, `done`, `cancelled` |
| `task_priority` | `low`, `medium`, `high`, `urgent` |
| `expense_category` | `advance`, `marketing`, `recording`, `distribution`, `legal`, `other` |

---

## Extensions

- `uuid-ossp` -- Provides `uuid_generate_v4()` for generating UUID primary keys.
- `pg_trgm` -- Trigram-based text similarity, used alongside full-text search.

---

## Tables

### 1. users

Core user accounts for platform administrators.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash (cost factor 12) |
| `first_name` | VARCHAR(100) | NOT NULL | User first name |
| `last_name` | VARCHAR(100) | NOT NULL | User last name |
| `role` | `user_role` | NOT NULL, DEFAULT `'viewer'` | RBAC role |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT `true` | Account active flag |
| `token_version` | INTEGER | NOT NULL, DEFAULT `0` | Incremented to revoke all JWTs |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### 2. artists

Artist roster records managed through the Panel module.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Legal or real name |
| `stage_name` | VARCHAR(255) | | Artist stage name |
| `email` | VARCHAR(255) | | Contact email |
| `phone` | VARCHAR(50) | | Contact phone |
| `bio` | TEXT | | Artist biography |
| `genre` | VARCHAR(100) | | Primary genre |
| `status` | `artist_status` | NOT NULL, DEFAULT `'active'` | Active/inactive/archived |
| `notes` | TEXT | | Internal notes |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT `false` | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | | Soft delete timestamp |
| `updated_by` | UUID | FK -> users(id) ON DELETE SET NULL | Audit: last editor |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |
| `search_vector` | tsvector | | Full-text search index column |

---

### 3. projects

Production projects associated with artists.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `title` | VARCHAR(255) | NOT NULL | Project title |
| `description` | TEXT | | Project description |
| `artist_id` | UUID | FK -> artists(id) ON DELETE SET NULL | Primary artist |
| `status` | `project_status` | NOT NULL, DEFAULT `'draft'` | Project status |
| `start_date` | DATE | | Project start date |
| `target_completion_date` | DATE | | Target completion |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT `false` | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | | Soft delete timestamp |
| `updated_by` | UUID | FK -> users(id) ON DELETE SET NULL | Audit: last editor |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |
| `search_vector` | tsvector | | Full-text search index column |

---

### 4. project_collaborators

Join table linking additional artists to projects.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `project_id` | UUID | NOT NULL, FK -> projects(id) ON DELETE CASCADE | Parent project |
| `artist_id` | UUID | NOT NULL, FK -> artists(id) ON DELETE CASCADE | Collaborating artist |
| `role_description` | VARCHAR(255) | | Role on the project (e.g., "Co-producer") |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

**Unique constraint**: `(project_id, artist_id)` -- an artist can only be listed once per project.

---

### 5. subscription_tiers (Pass)

Subscription tier definitions for the Pass module.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `name` | VARCHAR(100) | NOT NULL | Tier name (e.g., "Gold", "Platinum") |
| `description` | TEXT | | Tier description |
| `access_level` | INTEGER | NOT NULL, CHECK (1-5) | Numeric access level for tier gating |
| `features` | JSONB | DEFAULT `'[]'` | JSON array of feature descriptions |
| `price_monthly` | DECIMAL(10,2) | DEFAULT `0` | Monthly price |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT `true` | Whether tier is available |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### 6. artist_subscriptions (Pass)

Artist subscription assignments linking artists to tiers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `artist_id` | UUID | NOT NULL, FK -> artists(id) ON DELETE CASCADE | Subscribed artist |
| `tier_id` | UUID | NOT NULL, FK -> subscription_tiers(id) ON DELETE RESTRICT | Assigned tier |
| `status` | `subscription_st` | NOT NULL, DEFAULT `'active'` | Subscription status |
| `start_date` | DATE | NOT NULL, DEFAULT `CURRENT_DATE` | Subscription start |
| `end_date` | DATE | | Subscription end (null = ongoing) |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### 7. assets (Port)

Digital assets (beats, stems, mixes, masters, samples) in the portfolio.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `title` | VARCHAR(255) | NOT NULL | Asset title |
| `file_type` | `asset_file_type` | NOT NULL | Type of audio file |
| `file_name` | VARCHAR(255) | | Original file name |
| `storage_key` | VARCHAR(500) | | Storage reference key |
| `genre` | VARCHAR(100) | | Genre classification |
| `bpm` | INTEGER | | Beats per minute |
| `key_signature` | VARCHAR(10) | | Musical key |
| `duration_seconds` | INTEGER | | Duration in seconds |
| `artist_id` | UUID | FK -> artists(id) ON DELETE SET NULL | Associated artist |
| `project_id` | UUID | FK -> projects(id) ON DELETE SET NULL | Associated project |
| `external_url` | VARCHAR(1000) | | External reference URL |
| `notes` | TEXT | | Internal notes |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT `false` | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | | Soft delete timestamp |
| `updated_by` | UUID | FK -> users(id) ON DELETE SET NULL | Audit: last editor |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### 8. asset_tags (Port)

Tags associated with assets for categorization and filtering.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `asset_id` | UUID | NOT NULL, FK -> assets(id) ON DELETE CASCADE | Parent asset |
| `tag` | VARCHAR(100) | NOT NULL | Tag value |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |

**Unique constraint**: `(asset_id, tag)` -- no duplicate tags per asset.

---

### 9. placements (Port)

Placement records tracking where assets have been placed (sync, features, licenses, releases).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `asset_id` | UUID | NOT NULL, FK -> assets(id) ON DELETE CASCADE | Placed asset |
| `placement_type` | `placement_type` | NOT NULL | Type of placement |
| `status` | `placement_status` | NOT NULL, DEFAULT `'pending'` | Pipeline status |
| `placed_with` | VARCHAR(255) | | Recipient/licensee name |
| `placement_date` | DATE | | Date of placement |
| `expected_value` | DECIMAL(12,2) | DEFAULT `0` | Expected revenue |
| `notes` | TEXT | | Placement notes |
| `is_deleted` | BOOLEAN | NOT NULL, DEFAULT `false` | Soft delete flag |
| `deleted_at` | TIMESTAMPTZ | | Soft delete timestamp |
| `updated_by` | UUID | FK -> users(id) ON DELETE SET NULL | Audit: last editor |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### 10. ownership_records (Port)

Ownership split records for assets (writing, production, publishing, master).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `asset_id` | UUID | NOT NULL, FK -> assets(id) ON DELETE CASCADE | Associated asset |
| `owner_name` | VARCHAR(255) | NOT NULL | Name of rights holder |
| `ownership_type` | `ownership_type` | NOT NULL | Type of ownership |
| `percentage` | DECIMAL(5,2) | NOT NULL, CHECK (0-100) | Ownership percentage |
| `pro_affiliation` | VARCHAR(100) | | Performing Rights Org (ASCAP, BMI, etc.) |
| `ipi_number` | VARCHAR(50) | | IPI/CAE number |
| `notes` | TEXT | | Additional notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

**Unique constraint**: `(asset_id, owner_name, ownership_type)` -- one record per owner per type per asset.

---

### 11. usage_records (Port)

Usage tracking records for assets across platforms.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `asset_id` | UUID | NOT NULL, FK -> assets(id) ON DELETE CASCADE | Associated asset |
| `usage_type` | `usage_type` | NOT NULL | Type of usage |
| `platform` | VARCHAR(100) | | Platform name (e.g., "Spotify") |
| `date_recorded` | DATE | NOT NULL, DEFAULT `CURRENT_DATE` | Date of usage record |
| `count` | INTEGER | NOT NULL, DEFAULT `0` | Usage count (streams, downloads, etc.) |
| `revenue` | DECIMAL(12,2) | DEFAULT `0` | Revenue generated |
| `notes` | TEXT | | Additional notes |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### 12. revenue_events (KPI)

Revenue event records for KPI calculations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `artist_id` | UUID | NOT NULL, FK -> artists(id) ON DELETE CASCADE | Associated artist |
| `asset_id` | UUID | FK -> assets(id) ON DELETE SET NULL | Associated asset (optional) |
| `placement_id` | UUID | FK -> placements(id) ON DELETE SET NULL | Associated placement (optional) |
| `amount` | DECIMAL(12,2) | NOT NULL, DEFAULT `0` | Revenue amount |
| `amount_applied_to_recoupment` | DECIMAL(12,2) | NOT NULL, DEFAULT `0` | Portion applied to recoupment |
| `source` | VARCHAR(255) | | Revenue source |
| `description` | TEXT | | Event description |
| `event_date` | DATE | NOT NULL, DEFAULT `CURRENT_DATE` | Date of event |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |

---

### 13. recoupable_expenses (KPI)

Recoupable expense records for balance calculations.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `artist_id` | UUID | NOT NULL, FK -> artists(id) ON DELETE CASCADE | Associated artist |
| `category` | `expense_category` | NOT NULL | Expense category |
| `amount` | DECIMAL(12,2) | NOT NULL, DEFAULT `0` | Expense amount |
| `description` | TEXT | | Expense description |
| `expense_date` | DATE | NOT NULL, DEFAULT `CURRENT_DATE` | Date of expense |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |

---

### 14. tasks

Task management records linked to artists, projects, or assets.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `title` | VARCHAR(255) | NOT NULL | Task title |
| `description` | TEXT | | Task description |
| `status` | `task_status` | NOT NULL, DEFAULT `'open'` | Task status |
| `priority` | `task_priority` | NOT NULL, DEFAULT `'medium'` | Task priority |
| `due_date` | DATE | | Due date |
| `assigned_to` | UUID | FK -> users(id) ON DELETE SET NULL | Assigned user |
| `related_entity_type` | VARCHAR(50) | | Entity type (e.g., "artist", "project", "asset") |
| `related_entity_id` | UUID | | ID of related entity |
| `artist_id` | UUID | FK -> artists(id) ON DELETE SET NULL | Associated artist |
| `created_by` | UUID | FK -> users(id) ON DELETE SET NULL | Creator |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

### 15. activity_feed

Event log for CRUD operations across the platform.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `event_type` | VARCHAR(50) | NOT NULL | Event type (e.g., "create", "update", "delete") |
| `actor_user_id` | UUID | FK -> users(id) ON DELETE SET NULL | User who performed the action |
| `entity_type` | VARCHAR(50) | NOT NULL | Entity type (e.g., "artist", "project") |
| `entity_id` | UUID | NOT NULL | ID of affected entity |
| `summary` | TEXT | NOT NULL | Human-readable event summary |
| `metadata` | JSONB | DEFAULT `'{}'` | Additional event data |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Event timestamp |

---

### 16. contacts

Industry contact repository.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT `uuid_generate_v4()` | Primary key |
| `name` | VARCHAR(255) | NOT NULL | Contact name |
| `organization` | VARCHAR(255) | | Company or organization |
| `role` | VARCHAR(100) | | Contact's role/title |
| `email` | VARCHAR(255) | | Contact email |
| `phone` | VARCHAR(50) | | Contact phone |
| `notes` | TEXT | | Notes about the contact |
| `tags` | TEXT[] | DEFAULT `'{}'` | Array of tags |
| `relationship_strength` | INTEGER | CHECK (1-5) | Relationship quality score |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `NOW()` | Last update timestamp |

---

## Entity Relationships

### Foreign Key Map

```
users
  |
  +-- artists.updated_by
  +-- projects.updated_by
  +-- assets.updated_by
  +-- placements.updated_by
  +-- tasks.assigned_to
  +-- tasks.created_by
  +-- activity_feed.actor_user_id

artists
  |
  +-- projects.artist_id
  +-- project_collaborators.artist_id
  +-- artist_subscriptions.artist_id
  +-- assets.artist_id
  +-- revenue_events.artist_id
  +-- recoupable_expenses.artist_id
  +-- tasks.artist_id

projects
  |
  +-- project_collaborators.project_id
  +-- assets.project_id

subscription_tiers
  |
  +-- artist_subscriptions.tier_id (ON DELETE RESTRICT)

assets
  |
  +-- asset_tags.asset_id
  +-- placements.asset_id
  +-- ownership_records.asset_id
  +-- usage_records.asset_id
  +-- revenue_events.asset_id

placements
  |
  +-- revenue_events.placement_id
```

### Cascade Behavior

| Parent | Child | ON DELETE |
|--------|-------|-----------|
| projects | project_collaborators | CASCADE |
| artists | project_collaborators | CASCADE |
| artists | artist_subscriptions | CASCADE |
| subscription_tiers | artist_subscriptions | RESTRICT |
| assets | asset_tags | CASCADE |
| assets | placements | CASCADE |
| assets | ownership_records | CASCADE |
| assets | usage_records | CASCADE |
| artists | revenue_events | CASCADE |
| artists | recoupable_expenses | CASCADE |
| users | *(all FK refs)* | SET NULL |
| artists | projects | SET NULL |
| artists | assets | SET NULL |
| projects | assets | SET NULL |
| assets | revenue_events | SET NULL |
| placements | revenue_events | SET NULL |

---

## Indexes

### Lookup Indexes

| Table | Index | Columns | Condition |
|-------|-------|---------|-----------|
| users | `idx_users_email` | `email` | |
| users | `idx_users_role` | `role` | |
| artists | `idx_artists_status` | `status` | `WHERE NOT is_deleted` |
| artists | `idx_artists_genre` | `genre` | `WHERE NOT is_deleted` |
| artists | `idx_artists_stage_name` | `stage_name` | |
| artists | `idx_artists_deleted` | `is_deleted` | |
| projects | `idx_projects_status` | `status` | `WHERE NOT is_deleted` |
| projects | `idx_projects_artist_id` | `artist_id` | |
| projects | `idx_projects_deleted` | `is_deleted` | |
| project_collaborators | `idx_collabs_project` | `project_id` | |
| project_collaborators | `idx_collabs_artist` | `artist_id` | |
| artist_subscriptions | `idx_subs_artist` | `artist_id` | |
| artist_subscriptions | `idx_subs_tier` | `tier_id` | |
| artist_subscriptions | `idx_subs_status` | `status` | |
| assets | `idx_assets_artist` | `artist_id` | `WHERE NOT is_deleted` |
| assets | `idx_assets_project` | `project_id` | |
| assets | `idx_assets_file_type` | `file_type` | `WHERE NOT is_deleted` |
| assets | `idx_assets_genre` | `genre` | `WHERE NOT is_deleted` |
| assets | `idx_assets_deleted` | `is_deleted` | |
| asset_tags | `idx_tags_asset` | `asset_id` | |
| asset_tags | `idx_tags_tag` | `tag` | |
| placements | `idx_place_asset` | `asset_id` | `WHERE NOT is_deleted` |
| placements | `idx_place_status` | `status` | `WHERE NOT is_deleted` |
| placements | `idx_place_type` | `placement_type` | |
| placements | `idx_place_deleted` | `is_deleted` | |
| ownership_records | `idx_own_asset` | `asset_id` | |
| ownership_records | `idx_own_type` | `ownership_type` | |
| usage_records | `idx_usage_asset` | `asset_id` | |
| usage_records | `idx_usage_type` | `usage_type` | |
| usage_records | `idx_usage_date` | `date_recorded` | |
| revenue_events | `idx_rev_artist` | `artist_id` | |
| revenue_events | `idx_rev_date` | `event_date` | |
| recoupable_expenses | `idx_exp_artist` | `artist_id` | |
| tasks | `idx_tasks_assigned` | `assigned_to` | |
| tasks | `idx_tasks_status` | `status` | |
| tasks | `idx_tasks_artist` | `artist_id` | |
| tasks | `idx_tasks_due` | `due_date` | |
| activity_feed | `idx_activity_entity` | `entity_type, entity_id` | |
| activity_feed | `idx_activity_actor` | `actor_user_id` | |
| activity_feed | `idx_activity_created` | `created_at DESC` | |
| contacts | `idx_contacts_org` | `organization` | |

### Full-Text Search (GIN) Indexes

| Table | Index | Column |
|-------|-------|--------|
| artists | `idx_artists_search` | `search_vector` (GIN) |
| projects | `idx_projects_search` | `search_vector` (GIN) |

**Partial indexes**: Many indexes on tables with soft deletes use `WHERE NOT is_deleted` to exclude soft-deleted records from the index, reducing index size and improving query performance for the common case.

---

## Full-Text Search Setup

### Artists

The `search_vector` column on `artists` is maintained by a trigger function that fires before every INSERT and UPDATE:

```sql
search_vector :=
  setweight(to_tsvector('english', coalesce(stage_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(name, '')),       'A') ||
  setweight(to_tsvector('english', coalesce(genre, '')),      'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')),        'C') ||
  setweight(to_tsvector('english', coalesce(notes, '')),      'D');
```

**Weight priorities**: Stage name and name are highest priority (A), genre is secondary (B), bio is tertiary (C), and notes are lowest (D).

### Projects

The `search_vector` column on `projects` follows the same pattern:

```sql
search_vector :=
  setweight(to_tsvector('english', coalesce(title, '')),       'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(status::text, '')), 'C');
```

### Query Pattern

The API uses `plainto_tsquery` for search queries and `ts_rank` for relevance scoring:

```sql
WHERE search_vector @@ plainto_tsquery('english', $1)
ORDER BY ts_rank(search_vector, plainto_tsquery('english', $1)) DESC
```

---

## Soft Delete Pattern

Tables that support soft deletes: `artists`, `projects`, `assets`, `placements`.

Each uses two columns:
- `is_deleted` (BOOLEAN, DEFAULT `false`) -- Indicates whether the record is soft-deleted.
- `deleted_at` (TIMESTAMPTZ, nullable) -- Timestamp of when the record was soft-deleted.

**Conventions**:
- All list queries filter with `WHERE is_deleted = false` by default.
- Partial indexes exclude soft-deleted records (`WHERE NOT is_deleted`).
- Restore operations set `is_deleted = false` and `deleted_at = NULL`.
- Only admins can execute soft deletes and restores.

---

## Audit Fields

- `updated_by` (UUID, FK -> users) -- Present on `artists`, `projects`, `assets`, `placements`. Set to `req.user.id` on every create and update operation.
- `updated_at` (TIMESTAMPTZ) -- Present on all tables with mutable data. Automatically set via `update_updated_at_column()` trigger.

---

## Triggers

### updated_at Triggers

A single trigger function `update_updated_at_column()` is applied to 12 tables. It sets `NEW.updated_at = NOW()` before every UPDATE:

Applied to: `users`, `artists`, `projects`, `project_collaborators`, `subscription_tiers`, `artist_subscriptions`, `assets`, `placements`, `ownership_records`, `usage_records`, `tasks`, `contacts`.

### Search Vector Triggers

- `trig_artists_search` -- Fires before INSERT or UPDATE on `artists`, regenerates `search_vector`.
- `trig_projects_search` -- Fires before INSERT or UPDATE on `projects`, regenerates `search_vector`.

---

## Seed Data

The seed script (`server/seeds/run.js`) creates:
- 5 user accounts (2 admins, 2 managers, 1 viewer)
- 25 artists across multiple genres
- 20 projects in various statuses
- 12 project collaborator assignments

Default credentials: all seed users use password `password123`.
