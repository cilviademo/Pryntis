# Pryntis Panel -- Scope: Implemented vs Roadmap

**APCV 498 Senior Capstone | University of Arizona | Spring 2026**

---

## Implemented

### Panel Core

- **Artist CRUD**: Full create, read, update, and soft-delete operations for artist records. Includes stage name, contact info, bio, genre, status, and notes fields.
- **Project CRUD**: Full create, read, update, and soft-delete operations for production projects. Projects are linked to a primary artist and include status tracking, start dates, and target completion dates.
- **Collaborator management**: Add and remove artist collaborators on projects with role descriptions. Uniqueness constraint prevents duplicate entries.
- **Dashboard with charts**: Aggregated summary dashboard pulling real-time counts, status distributions, subscription data, and KPI metrics. Visualized with ECharts (bar charts, pie charts, line charts) in a dark admin theme.
- **User management**: Admin-only user administration including listing all accounts, updating roles and activation status, and deactivating users (which revokes all tokens via `token_version` increment).
- **Soft deletes with restore**: Artists, projects, assets, and placements support soft deletion (`is_deleted` + `deleted_at`). Admin-only restore functionality returns records to active state.
- **Full-text search**: PostgreSQL-native full-text search using `tsvector` columns with weighted fields and GIN indexes. Applied to artists (name, stage name, genre, bio, notes) and projects (title, description, status). Results ranked by relevance via `ts_rank`. Global search component in sidebar.
- **Audit trail**: `updated_by` field on artists, projects, assets, and placements tracks the last user to modify each record. `updated_at` timestamps maintained via database triggers.
- **Calendar view**: Full calendar page displaying tasks, project deadlines, and placement dates in a monthly grid layout.
- **Notification system**: In-app notification bell with real-time notification feed for task assignments, status changes, and system events.

### Pass Module (Subscriptions)

- **Subscription tier configuration**: CRUD operations for subscription tiers with name, description, access level (1-5), feature list (JSONB), monthly price, and active flag.
- **Artist subscription assignment**: Create and manage artist subscriptions linking artists to tiers. Supports status tracking (active, expired, suspended), start and end dates.
- **Tier-gated access enforcement middleware**: `requireTier(minLevel)` middleware checks an artist's active subscription level before allowing access to tier-restricted endpoints. Enforced at the API layer.
- **Engineering services catalog**: Service listing for mixing, mastering, vocal tuning, stem preparation, session editing, and vinyl mastering with pricing and turnaround times.
- **Producer library**: Curated sample pack catalog with genre, BPM, key, license type, and creator attribution.
- **Ops toolkit**: Operational checklists for weekly label review, release readiness, metadata QC, sync pitch preparation, new artist onboarding, and quarterly royalty review.
- **Roadmap view**: Product roadmap displaying current capabilities and planned feature phases (analog modeling subscriptions).
- **Activity feed**: Real-time feed of platform events with emoji reactions, filterable by event type.

### Port Module (Portfolio and Assets)

- **Asset library with metadata and tags**: Full CRUD for digital assets with detailed metadata: file type (beat, stem, mix, master, sample), genre, BPM, key signature, duration, external URL. Tag system with add/remove operations and uniqueness constraint per asset.
- **Placement tracking with pipeline view**: Placement records with type (sync, feature, license, release), status pipeline (pending, confirmed, completed, declined), placed-with party, expected value, and date. Dashboard aggregates pipeline value with weighted calculations.
- **Ownership records with split validation**: Ownership records per asset with owner name, type (writer, producer, publisher, master), percentage (0-100, DB constraint), PRO affiliation, and IPI number. Unique constraint on (asset, owner, type) prevents duplicates.
- **Usage record logging with analytics**: Usage records tracking streams, downloads, syncs, and broadcasts per asset. Includes platform name, date, count, and revenue fields.
- **Contact management**: Industry contact repository with name, organization, role, email, phone, notes, tags (PostgreSQL array), and relationship strength score (1-5).
- **Template management**: Contract and document template management for standardized workflows.

### KPI Engine

- **Gross revenue**: Total sum of all revenue events across artists.
- **Recoupable balance**: Calculated as total expenses minus total revenue applied to recoupment. Positive balance indicates unrecouped expenses.
- **Pipeline value**: Weighted sum of placement expected values: pending placements at 25%, confirmed at 60%, completed at 100%.
- **At-risk revenue**: Sum of expected values for pending placements weighted at 25%, representing revenue that may not materialize.
- **Per-artist KPI endpoints**: Revenue events and recoupable expenses tracked at the individual artist level.
- **30-day revenue projections**: Conservative (35%), moderate (55%), and optimistic (75%) pipeline conversion estimates.

### Artist Health Score Engine

- **Six-dimensional scoring**: Composite health score (0-100) computed from momentum, delivery reliability, revenue trajectory, audience signals, team engagement, and compliance readiness.
- **Weighted formula**: Momentum (20%), Delivery (20%), Revenue (20%), Audience (15%), Engagement (15%), Compliance (10%).
- **Momentum trends**: 12-month trend tracking with period-over-period comparison.
- **Next-action recommendations**: Rule-based suggested actions per artist based on weakest health dimensions.
- **Dashboard integration**: Health scores displayed on the main dashboard with color-coded status indicators.

### Advanced Analytics (Deep Analytics)

- **Cross-module insights**: Revenue waterfall analysis (gross → expenses → recoupment → net payable), monthly revenue vs expenses trend, and subscription tier performance correlation.
- **Metadata coverage matrix**: Per-artist heatmap showing ISRC, ISWC, genre, BPM, key, and duration completeness percentages with color-coded thresholds.
- **Health radar charts**: Six-axis radar visualization for each artist's health dimensions.
- **Placement pipeline funnel**: Visual funnel showing placement flow from pending through confirmed to completed, with count and value breakdowns.
- **Ownership conflict detection**: Automated identification of assets where total ownership percentage exceeds 100%.

### Business Operations

- **Revenue event management**: Full CRUD for revenue events with type classification (streaming, sync, mechanical, performance, other), amount, date, and artist linkage.
- **Expense tracking**: Expense records with category, amount, recoupable flag, and artist association.
- **Recoupment dashboard**: Real-time recoupment position calculation per artist showing expenses vs revenue applied.
- **Ownership conflict detection**: Automated flagging of assets with ownership splits exceeding 100%.

### Tasks

- **Task management**: Full CRUD for tasks with title, description, status (open, in_progress, done, cancelled), priority (low, medium, high, urgent), due dates, and user assignment.
- **Entity linking**: Tasks linked to artists, projects, or assets via polymorphic `related_entity_type` + `related_entity_id` fields. Also supports direct `artist_id` foreign key.

### Activity Feed

- **Event logging**: Append-only activity feed recording CRUD operations across the platform. Each entry captures event type, actor, entity type/ID, human-readable summary, and optional JSONB metadata.
- **Dashboard integration**: Recent activity feed displayed on the dashboard with actor names joined from the users table.
- **Emoji reactions**: Users can add reactions to activity feed entries.

### Authentication and Security

- **JWT authentication**: Stateless token-based auth with configurable expiry (default 24h). Tokens contain user ID, email, role, and `token_version`.
- **Token version invalidation**: `token_version` column on users allows instant revocation of all outstanding tokens. Incremented on user deactivation.
- **bcrypt password hashing**: Cost factor 12 for password storage.
- **Rate limiting**: 10 attempts per 15-minute window on login; general API rate limiting at 100 requests per 15-minute window.
- **Input validation**: `express-validator` and Zod schemas on all mutating endpoints with standardized error responses.
- **Security headers**: Custom security middleware with CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy headers.
- **PII protection**: Serializer layer that strips sensitive fields (email, phone) from API responses for viewer-role users.
- **Admin impersonation**: Admin-only ability to impersonate other user roles for testing and support, with audit logging and banner indicator.

### RBAC

- **Six-tier role hierarchy**: Owner, admin, manager, audio_engineer, contributor, and viewer roles. Enforced via `authorize()` middleware on all API routes.
- **Role-based UI rendering**: Frontend conditionally renders admin controls, edit buttons, and sensitive data based on user role.
- **Registration restriction**: Only admins can create new user accounts.

### Search

- **PostgreSQL full-text search**: Weighted `tsvector` columns on artists and projects, maintained by trigger functions. GIN indexes for efficient lookup. Queries use `plainto_tsquery` with `ts_rank` scoring. Partial indexes exclude soft-deleted records.
- **Global search component**: Sidebar search bar with real-time results across artists, projects, and assets.

### User Interface

- **ECharts dashboards**: Interactive charts for artist status distribution, project status breakdown, subscription distribution, KPI metrics, revenue trends, and advanced analytics.
- **Dark/Light theme toggle**: User-selectable theme with persistence via localStorage.
- **Responsive layout**: Mobile-first responsive design with hamburger menu, slide-over sidebar drawer, horizontal-scroll tabs, and stacked card grids at 768px and 480px breakpoints.
- **SPA routing**: React Router with protected routes and admin-only route guards.
- **Error boundary**: Global React error boundary with fallback UI.
- **Toast notifications**: Context-based toast notification system for user feedback.
- **PII Safe Mode**: Toggle in Settings to mask personal information during demos and screen sharing.
- **Pages**: Login, Dashboard, Artists (list + detail), Projects (list + detail), Users (admin), Pass (subscriptions with 6 sub-tabs), Assets (list + detail), Placements, Contacts, Templates, Tasks, Analytics, Deep Analytics (admin), Business Ops, Calendar, Settings.

### Export

- **CSV export**: Export functionality for tabular data across the platform.
- **PDF report generation**: Server-side PDF generation for reports and summaries.

### File Upload

- **Media upload**: Multer-based file upload with configurable storage, file type validation, and size limits. Media version history tracking with rollback capability.

### Testing

- **API integration tests**: 38 test cases covering CRUD operations, RBAC enforcement, input validation, and edge cases across all major endpoints.
- **Security tests**: Dedicated security test suite covering authentication, authorization, token invalidation, rate limiting, and injection prevention.

---

## Roadmap (Not Implemented)

### Two-Factor Authentication

Authentication is single-factor (email + password). 2FA via TOTP, SMS, or email codes is not implemented. The auth system would need a `two_factor_secret` column, a verification step in the login flow, and recovery code management.

### Email Notifications

No email integration exists. Potential notifications include:
- Task assignment alerts when a task is assigned to a user.
- Placement status change notifications when placements move through the pipeline.
- Subscription expiration warnings.

### Webhook Integrations for External Services

No outbound webhook or event-driven integration exists. Potential use cases include:
- Notifying external services when placements change status.
- Syncing revenue data with accounting platforms.
- Triggering distribution workflows on project completion.

### Producer Points Calculation Engine

The schema includes fields that support producer points tracking (ownership percentages, revenue events, recoupment tracking), but advanced calculation logic for producer points (e.g., pro-rata distribution based on splits, multi-tier recoupment waterfalls) has been deferred.

### Real-Time Collaboration (WebSocket)

WebSocket presence indicators exist in the UI (PresencePill component) but full real-time collaboration features (live editing, shared cursors, instant notifications) are not implemented.
