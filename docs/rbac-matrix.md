# Pryntis Panel -- RBAC Permission Matrix

**Three roles**: admin, manager, viewer

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

| Resource | Action | Admin | Manager | Viewer |
|----------|--------|:-----:|:-------:|:------:|
| **Users** | List all | Yes | No* | No |
| **Users** | Get by ID | Yes | Yes | No |
| **Users** | Update (role, status) | Yes | No | No |
| **Users** | Deactivate | Yes | No | No |
| **Auth** | Register new user | Yes | No | No |
| **Auth** | Login | Yes | Yes | Yes |
| **Auth** | View own profile | Yes | Yes | Yes |
| **Auth** | Update own profile | Yes | Yes | Yes |
| **Artists** | List / Search | Yes | Yes | Yes |
| **Artists** | Get by ID | Yes | Yes | Yes |
| **Artists** | Create | Yes | Yes | No |
| **Artists** | Update | Yes | Yes | No |
| **Artists** | Delete (soft) | Yes | No | No |
| **Artists** | Restore | Yes | No | No |
| **Projects** | List / Search | Yes | Yes | Yes |
| **Projects** | Get by ID | Yes | Yes | Yes |
| **Projects** | Create | Yes | Yes | No |
| **Projects** | Update | Yes | Yes | No |
| **Projects** | Delete (soft) | Yes | No | No |
| **Projects** | Restore | Yes | No | No |
| **Projects** | Add collaborator | Yes | Yes | No |
| **Projects** | Remove collaborator | Yes | Yes | No |
| **Dashboard** | View summary | Yes | Yes | Yes |
| **Dashboard** | View recent activity | Yes | Yes | Yes |

*\* The route allows admin and manager, but the controller further restricts the full user list to admins only.*

### Pass Module (Subscriptions)

| Resource | Action | Admin | Manager | Viewer |
|----------|--------|:-----:|:-------:|:------:|
| **Tiers** | List | Yes | Yes | Yes |
| **Tiers** | Create | Yes | No | No |
| **Tiers** | Update | Yes | No | No |
| **Subscriptions** | List | Yes | Yes | Yes |
| **Subscriptions** | Create | Yes | Yes | No |
| **Subscriptions** | Update | Yes | Yes | No |

### Port Module (Assets, Placements, Ownership, Usage)

| Resource | Action | Admin | Manager | Viewer |
|----------|--------|:-----:|:-------:|:------:|
| **Assets** | List | Yes | Yes | Yes |
| **Assets** | Get by ID | Yes | Yes | Yes |
| **Assets** | Create | Yes | Yes | No |
| **Assets** | Update | Yes | Yes | No |
| **Assets** | Delete (soft) | Yes | No | No |
| **Assets** | Restore | Yes | No | No |
| **Assets** | Add tag | Yes | Yes | No |
| **Assets** | Remove tag | Yes | Yes | No |
| **Placements** | List | Yes | Yes | Yes |
| **Placements** | Create | Yes | Yes | No |
| **Placements** | Update | Yes | Yes | No |
| **Ownership** | List | Yes | Yes | Yes |
| **Ownership** | Create | Yes | Yes | No |
| **Ownership** | Update | Yes | Yes | No |
| **Usage** | List | Yes | Yes | Yes |
| **Usage** | Create | Yes | Yes | No |

### Tasks

| Resource | Action | Admin | Manager | Viewer |
|----------|--------|:-----:|:-------:|:------:|
| **Tasks** | List | Yes | Yes | Yes |
| **Tasks** | Get by ID | Yes | Yes | Yes |
| **Tasks** | Create | Yes | Yes | No |
| **Tasks** | Update | Yes | Yes | No |

### KPI

| Resource | Action | Admin | Manager | Viewer |
|----------|--------|:-----:|:-------:|:------:|
| **KPI** | View artist KPIs | Yes | Yes | Yes |
| **KPI** | View revenue events | Yes | Yes | Yes |
| **KPI** | Create revenue event | Yes | Yes | No |
| **KPI** | View expenses | Yes | Yes | Yes |
| **KPI** | Create expense | Yes | Yes | No |

---

## Role Summary

### Admin

Full access to all resources and operations. This is the only role that can:
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

### Viewer

Read-only access across all modules. Viewers can:
- View dashboard summaries and recent activity
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
