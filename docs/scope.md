# Pryntis Panel -- Scope: Implemented vs Roadmap

**APCV 498 Senior Capstone | University of Arizona | Spring 2026**

---

## Implemented

### Panel Core

- **Artist CRUD**: Full create, read, update, and soft-delete operations for artist records. Includes stage name, contact info, bio, genre, status, and notes fields.
- **Project CRUD**: Full create, read, update, and soft-delete operations for production projects. Projects are linked to a primary artist and include status tracking, start dates, and target completion dates.
- **Collaborator management**: Add and remove artist collaborators on projects with role descriptions. Uniqueness constraint prevents duplicate entries.
- **Dashboard with charts**: Aggregated summary dashboard pulling real-time counts, status distributions, subscription data, and KPI metrics. Visualized with ECharts (bar charts, pie charts) in a dark admin theme.
- **User management**: Admin-only user administration including listing all accounts, updating roles and activation status, and deactivating users (which revokes all tokens via `token_version` increment).
- **Soft deletes with restore**: Artists, projects, assets, and placements support soft deletion (`is_deleted` + `deleted_at`). Admin-only restore functionality returns records to active state.
- **Full-text search**: PostgreSQL-native full-text search using `tsvector` columns with weighted fields and GIN indexes. Applied to artists (name, stage name, genre, bio, notes) and projects (title, description, status). Results ranked by relevance via `ts_rank`.
- **Audit trail**: `updated_by` field on artists, projects, assets, and placements tracks the last user to modify each record. `updated_at` timestamps maintained via database triggers.

### Pass Module (Subscriptions)

- **Subscription tier configuration**: CRUD operations for subscription tiers with name, description, access level (1-5), feature list (JSONB), monthly price, and active flag.
- **Artist subscription assignment**: Create and manage artist subscriptions linking artists to tiers. Supports status tracking (active, expired, suspended), start and end dates.
- **Tier-gated access enforcement middleware**: `requireTier(minLevel)` middleware checks an artist's active subscription level before allowing access to tier-restricted endpoints. Enforced at the API layer.

### Port Module (Portfolio and Assets)

- **Asset library with metadata and tags**: Full CRUD for digital assets with detailed metadata: file type (beat, stem, mix, master, sample), genre, BPM, key signature, duration, external URL. Tag system with add/remove operations and uniqueness constraint per asset.
- **Placement tracking with pipeline view**: Placement records with type (sync, feature, license, release), status pipeline (pending, confirmed, completed, declined), placed-with party, expected value, and date. Dashboard aggregates pipeline value with weighted calculations.
- **Ownership records with split validation**: Ownership records per asset with owner name, type (writer, producer, publisher, master), percentage (0-100, DB constraint), PRO affiliation, and IPI number. Unique constraint on (asset, owner, type) prevents duplicates.
- **Usage record logging with analytics**: Usage records tracking streams, downloads, syncs, and broadcasts per asset. Includes platform name, date, count, and revenue fields.

### KPI Engine

- **Gross revenue**: Total sum of all revenue events across artists.
- **Recoupable balance**: Calculated as total expenses minus total revenue applied to recoupment. Positive balance indicates unrecouped expenses.
- **Pipeline value**: Weighted sum of placement expected values: pending placements at 25%, confirmed at 60%, completed at 100%.
- **At-risk revenue**: Sum of expected values for pending placements weighted at 25%, representing revenue that may not materialize.
- **Per-artist KPI endpoints**: Revenue events and recoupable expenses tracked at the individual artist level.

### Tasks

- **Task management**: Full CRUD for tasks with title, description, status (open, in_progress, done, cancelled), priority (low, medium, high, urgent), due dates, and user assignment.
- **Entity linking**: Tasks linked to artists, projects, or assets via polymorphic `related_entity_type` + `related_entity_id` fields. Also supports direct `artist_id` foreign key.

### Activity Feed

- **Event logging**: Append-only activity feed recording CRUD operations across the platform. Each entry captures event type, actor, entity type/ID, human-readable summary, and optional JSONB metadata.
- **Dashboard integration**: Recent activity feed displayed on the dashboard with actor names joined from the users table.

### Contacts

- **Industry contact repository**: Contact records with name, organization, role, email, phone, notes, tags (PostgreSQL array), and relationship strength score (1-5).

### Authentication and Security

- **JWT authentication**: Stateless token-based auth with configurable expiry (default 24h). Tokens contain user ID, email, role, and `token_version`.
- **Token version invalidation**: `token_version` column on users allows instant revocation of all outstanding tokens. Incremented on user deactivation.
- **bcrypt password hashing**: Cost factor 12 for password storage.
- **Rate limiting on login**: 10 attempts per 15-minute window on the login endpoint.
- **Input validation**: `express-validator` on all mutating endpoints with standardized error responses.

### RBAC

- **Three-tier role enforcement**: Admin (full access), manager (read-write), viewer (read-only). Enforced via `authorize()` middleware on all API routes.
- **Registration restriction**: Only admins can create new user accounts.

### Search

- **PostgreSQL full-text search**: Weighted `tsvector` columns on artists and projects, maintained by trigger functions. GIN indexes for efficient lookup. Queries use `plainto_tsquery` with `ts_rank` scoring. Partial indexes exclude soft-deleted records.

### User Interface

- **ECharts dashboards**: Interactive charts for artist status distribution, project status breakdown, subscription distribution, and KPI metrics.
- **Dark admin interface**: Consistent dark theme across all pages and components.
- **Responsive tables**: Data tables with integrated search bars, filter controls, and pagination.
- **SPA routing**: React Router with protected routes and admin-only route guards.
- **Pages**: Login, Dashboard, Artists (list + detail), Projects (list + detail), Users (admin), Pass (subscriptions), Assets (list + detail), Placements, Tasks, Analytics.

---

## Roadmap (Not Implemented)

### File Upload for Assets

Assets currently store metadata only (title, file type, BPM, key signature, etc.) and support an `external_url` field for referencing files hosted elsewhere. The `storage_key` and `file_name` columns exist in the schema but actual file upload, storage (e.g., S3, local disk), and retrieval are not implemented.

### Email Notifications

No email integration exists. Potential notifications include:
- Task assignment alerts when a task is assigned to a user.
- Placement status change notifications when placements move through the pipeline.
- Subscription expiration warnings.

### Audit Log Viewer UI

The `updated_by` field tracks which user last modified a record, and the `activity_feed` table logs CRUD events. However, there is no dedicated UI page for browsing, filtering, or searching the audit log. The dashboard shows only the 20 most recent entries.

### Apache Superset Deep Integration

An iframe stub is provided in the client for embedding Superset dashboards. Full Superset setup (Docker service configuration, chart creation, dashboard publishing, authentication bridging) is optional and not included in the core deployment.

### Producer Points Calculation Engine

The schema includes fields that support producer points tracking (ownership percentages, revenue events, recoupment tracking), but advanced calculation logic for producer points (e.g., pro-rata distribution based on splits, multi-tier recoupment waterfalls) has been deferred.

### Contract Template Document Management

The `contacts` table stores industry contact information, but document linking (attaching contracts, agreements, or templates to contacts, artists, or projects) is not implemented. No document storage or template management exists.

### Export to CSV/PDF for Reports

No export functionality is implemented. Dashboard data, artist lists, project summaries, and KPI reports are viewable only within the web interface.

### Two-Factor Authentication

Authentication is single-factor (email + password). 2FA via TOTP, SMS, or email codes is not implemented. The auth system would need a `two_factor_secret` column, a verification step in the login flow, and recovery code management.

### Webhook Integrations for External Services

No outbound webhook or event-driven integration exists. Potential use cases include:
- Notifying external services when placements change status.
- Syncing revenue data with accounting platforms.
- Triggering distribution workflows on project completion.

### Mobile-Responsive Layout Optimization

The interface uses responsive tables and a sidebar layout, but dedicated mobile optimization (hamburger menus, touch-friendly controls, compact card layouts, mobile breakpoints) has not been prioritized.
