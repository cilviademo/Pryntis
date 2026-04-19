# Pryntis Panel -- RBAC Permission Matrix

**Six roles**: owner, admin, manager, audio_engineer, contributor, viewer

---

## Enforcement Mechanism

Role-based access control is enforced at the **API middleware layer**, not in the frontend. The React client may conditionally render UI elements based on role for usability, but the server is the authoritative source of permission checks.

### How It Works

1. **Authentication middleware** (`middleware/auth.js`) verifies the JWT and attaches `req.user` (including `role`) to the request.
2. **Authorization middleware** (`middleware/rbac.js`) checks `req.user.role` against the allowed roles specified on each route.
3. If the user's role is not in the allowed list, the request is rejected with HTTP 403 and error code `FORBIDDEN`.
4. Some controllers perform additional role checks beyond the route-level middleware (e.g., user list and update operations verify `req.user.role === 'admin'` within the controller itself).

### Middleware Signature

```javascript
authorize('admin', 'manager')  // Only admin and manager roles allowed
authorize('admin')             // Only admin role allowed
// No authorize() call         // Any authenticated user
```

---

## Permission Matrix

### Panel Core

| Resource | Action | Owner/Admin | Manager | Audio Engineer | Contributor | Viewer |
|----------|--------|:-----:|:-------:|:------:|:------:|:------:|
| **Users** | List all | Yes | No* | No | No | No |
| **Users** | Get by ID | Yes | Yes | No | No | No |
| **Users** | Update (role, status) | Yes | No | No | No | No |
| **Users** | Deactivate | Yes | No | No | No | No |
| **Auth** | Register new user | Yes | No | No | No | No |
| **Auth** | Login | Yes | Yes | Yes | Yes | Yes |
| **Auth** | View own profile | Yes | Yes | Yes | Yes | Yes |
| **Auth** | Update own profile | Yes | Yes | Yes | Yes | Yes |
| **Artists** | List / Search | Yes | Yes | Yes | Yes | Yes |
| **Artists** | Get by ID | Yes | Yes | Yes | Yes | Yes |
| **Artists** | Create | Yes | Yes | No | No | No |
| **Artists** | Update | Yes | Yes | No | No | No |
| **Artists** | Delete (soft) | Yes | No | No | No | No |
| **Artists** | Restore | Yes | No | No | No | No |
| **Projects** | List / Search | Yes | Yes | Yes | Yes | Yes |
| **Projects** | Get by ID | Yes | Yes | Yes | Yes | Yes |
| **Projects** | Create | Yes | Yes | No | No | No |
| **Projects** | Update | Yes | Yes | No | No | No |
| **Projects** | Delete (soft) | Yes | No | No | No | No |
| **Projects** | Restore | Yes | No | No | No | No |
| **Projects** | Add collaborator | Yes | Yes | No | No | No |
| **Projects** | Remove collaborator | Yes | Yes | No | No | No |
| **Dashboard** | View summary | Yes | Yes | Yes | Yes | Yes |
| **Dashboard** | View recent activity | Yes | Yes | Yes | Yes | Yes |

*\* The route allows admin and manager, but the controller further restricts the full user list to admins only.*

### Pass Module (Subscriptions)

| Resource | Action | Owner/Admin | Manager | Audio Engineer | Contributor | Viewer |
|----------|--------|:-----:|:-------:|:------:|:------:|:------:|
| **Tiers** | List | Yes | Yes | Yes | Yes | Yes |
| **Tiers** | Create | Yes | No | No | No | No |
| **Tiers** | Update | Yes | No | No | No | No |
| **Subscriptions** | List | Yes | Yes | Yes | Yes | Yes |
| **Subscriptions** | Create | Yes | Yes | No | No | No |
| **Subscriptions** | Update | Yes | Yes | No | No | No |

### Port Module (Assets, Placements, Ownership, Usage)

| Resource | Action | Owner/Admin | Manager | Audio Engineer | Contributor | Viewer |
|----------|--------|:-----:|:-------:|:------:|:------:|:------:|
| **Assets** | List | Yes | Yes | Yes | Yes | Yes |
| **Assets** | Get by ID | Yes | Yes | Yes | Yes | Yes |
| **Assets** | Create | Yes | Yes | Yes | No | No |
| **Assets** | Update | Yes | Yes | Yes | No | No |
| **Assets** | Delete (soft) | Yes | No | No | No | No |
| **Assets** | Restore | Yes | No | No | No | No |
| **Assets** | Add tag | Yes | Yes | Yes | No | No |
| **Assets** | Remove tag | Yes | Yes | Yes | No | No |
| **Placements** | List | Yes | Yes | Yes | Yes | Yes |
| **Placements** | Create | Yes | Yes | No | No | No |
| **Placements** | Update | Yes | Yes | No | No | No |
| **Ownership** | List | Yes | Yes | Yes | Yes | Yes |
| **Ownership** | Create | Yes | Yes | No | No | No |
| **Ownership** | Update | Yes | Yes | No | No | No |
| **Usage** | List | Yes | Yes | Yes | Yes | Yes |
| **Usage** | Create | Yes | Yes | No | No | No |

### Tasks

| Resource | Action | Owner/Admin | Manager | Audio Engineer | Contributor | Viewer |
|----------|--------|:-----:|:-------:|:------:|:------:|:------:|
| **Tasks** | List | Yes | Yes | Yes | Yes | Yes |
| **Tasks** | Get by ID | Yes | Yes | Yes | Yes | Yes |
| **Tasks** | Create | Yes | Yes | No | No | No |
| **Tasks** | Update | Yes | Yes | No | No | No |

### KPI

| Resource | Action | Owner/Admin | Manager | Audio Engineer | Contributor | Viewer |
|----------|--------|:-----:|:-------:|:------:|:------:|:------:|
| **KPI** | View artist KPIs | Yes | Yes | Yes | Yes | Yes |
| **KPI** | View revenue events | Yes | Yes | Yes | Yes | Yes |
| **KPI** | Create revenue event | Yes | Yes | No | No | No |
| **KPI** | View expenses | Yes | Yes | Yes | Yes | Yes |
| **KPI** | Create expense | Yes | Yes | No | No | No |

---

## Role Summary

### Owner

Full access to all resources and operations, equivalent to admin. Represents the label owner with complete platform control.

### Admin

Full access to all resources and operations. This is the only role (alongside owner) that can:
- Register new user accounts
- Manage user roles and activation status
- Deactivate users (which also revokes their tokens)
- Soft-delete and restore records (artists, projects, assets)
- Create and configure subscription tiers

### Manager

Read-write access to most operational resources. Managers can create and update artists, projects, assets, placements, ownership records, usage records, tasks, subscriptions, revenue events, and expenses. Managers cannot:
- Manage other user accounts
- Soft-delete or restore records
- Create or modify subscription tiers

### Audio Engineer

Project and asset operations. Audio engineers can create and update assets, add tags, and view all resources. They cannot manage placements, ownership, users, or subscriptions.

### Contributor

Limited write access. Contributors can view all resources and update their own profile. Financial amounts in activity feed summaries are redacted for this role.

### Viewer

Read-only access across all modules. Viewers can:
- View dashboard summaries and recent activity (with financial amounts redacted)
- Browse artists, projects, assets, placements, ownership, usage, tasks, and KPI data
- View subscription tiers and subscription assignments
- View and update their own profile

Viewers cannot create, update, or delete any resource other than their own profile.

---

## Frontend Route Guards

The React client implements two route guard components for UI-level access control:

- **`ProtectedRoute`**: Redirects unauthenticated users to `/login`.
- **`AdminRoute`**: Redirects non-admin users to `/` (dashboard).

The Users page (`/users`) is wrapped in `AdminRoute`, restricting its visibility in the UI to admins. All other authenticated pages use `ProtectedRoute`. These guards are for user experience only; the API middleware is the authoritative enforcement layer.
