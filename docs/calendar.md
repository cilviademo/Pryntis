# Calendar System

Pryntis includes an Outlook-style calendar for scheduling sessions, deadlines, meetings, and releases.

## Features

- **Month/Week/Day views** with responsive layout
- **Event CRUD** with modal form
- **Event types**: session, deadline, meeting, release, task (color-coded)
- **Conflict detection**: prevents double-booking assigned users
- **Upcoming events panel**: next 7 days overview
- **Linked entities**: events can reference artists, projects, or assets
- **RBAC**: viewers read-only, engineers and above can create/edit

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/calendar/events?from=&to=` | List events in date range |
| POST | `/api/v1/calendar/events` | Create event |
| PUT | `/api/v1/calendar/events/:id` | Update event (supports drag/drop time changes) |
| DELETE | `/api/v1/calendar/events/:id` | Soft delete (sets status to 'canceled') |

## Event Schema

```sql
calendar_events (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(50),     -- session, deadline, meeting, release, task
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  timezone VARCHAR(50),
  status VARCHAR(50),          -- scheduled, completed, canceled
  owner_type VARCHAR(50),      -- artist, project (nullable)
  owner_id UUID,
  assigned_to UUID,            -- user responsible
  created_by UUID,
  updated_by UUID
)
```

## Conflict Detection

When creating or updating an event with `assigned_to`:
- The server checks for overlapping events: `WHERE assigned_to = $user AND start_at < $end AND end_at > $start AND status = 'scheduled'`
- Returns 409 Conflict with details of the conflicting event
- The frontend displays the conflict and allows the user to proceed anyway or adjust times

## Integration with Pass

When booking an engineering service (mixing, mastering, etc.) from the Pass page, a calendar event is automatically created for the session.
