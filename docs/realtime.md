# Real-Time Collaboration (WebSocket)

Pryntis uses Socket.IO for real-time features including presence indicators and collaboration primitives.

## Architecture

The WebSocket server runs on the same HTTP server as the Express API. Socket.IO handles transport negotiation (WebSocket preferred, HTTP long-polling fallback).

### Authentication

Clients authenticate via JWT token in the handshake:

```javascript
const socket = io(serverUrl, {
  auth: { token: jwtToken },
  transports: ['websocket', 'polling'],
});
```

The server verifies the JWT, checks user active status and token version, and attaches user info to the socket.

### Rooms

Presence is organized by rooms:
- `artist:{uuid}` - Artist detail page
- `project:{uuid}` - Project detail page
- `asset:{uuid}` - Asset detail page

### Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `join_room` | Client -> Server | `{ roomId }` | Join a presence room |
| `leave_room` | Client -> Server | `{ roomId }` | Leave a presence room |
| `presence_update` | Server -> Client | `{ roomId, users[] }` | Room membership changed |
| `cursor_update` | Client -> Server | `{ roomId, x, y, viewport, elementHint }` | Mouse position (ephemeral) |
| `cursor_move` | Server -> Client | `{ userId, name, x, y }` | Another user's cursor moved |
| `entity_viewing` | Client -> Server | `{ roomId, entityType, entityId, tab }` | What tab/section user is viewing |
| `user_viewing` | Server -> Client | `{ userId, name, entityType, entityId, tab }` | Another user's viewing state |
| `comment_typing` | Client -> Server | `{ roomId, threadId }` | User is typing a comment |
| `user_typing` | Server -> Client | `{ userId, name, threadId }` | Another user is typing |

### Data Persistence

- Presence data is **ephemeral** (in-memory only)
- Cursor positions are **not persisted**
- No data is stored in the database for real-time features
- Collaboration activity can optionally be logged to the audit table

## Frontend Components

### PresencePill

Shows who else is viewing the current page:

```jsx
import PresencePill from '../components/PresencePill';

<PresencePill roomId={`artist:${artistId}`} />
```

The component:
- Dynamically imports socket.io-client (optional dependency)
- Falls back gracefully if WebSocket is unavailable
- Hides on mobile viewports
- Shows up to 3 user names + overflow count

## Configuration

No additional configuration needed. WebSocket initializes automatically on server startup.

To disable WebSocket (e.g., for testing), the server catches any initialization errors and continues without it.
