/**
 * Manages WebSocket real-time presence for Pryntis.
 * Uses socket.io for rooms and presence tracking.
 *
 * Features:
 * - JWT authentication on handshake
 * - Room-based presence (artist:{id}, project:{id}, asset:{id})
 * - Ephemeral cursor updates (not persisted)
 * - Entity viewing indicators
 * - Comment typing indicators
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');

// In-memory presence store (ephemeral)
const roomPresence = new Map(); // roomId -> Map(userId -> {socketId, user, joinedAt, cursor, viewing})

function initPresence(io) {
  // Auth middleware for socket.io
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      const { rows } = await db.query(
        'SELECT id, email, role, first_name, last_name, is_active, token_version FROM users WHERE id = $1',
        [decoded.sub || decoded.id]
      );
      if (!rows.length || !rows[0].is_active) return next(new Error('Invalid user'));
      if (rows[0].token_version !== decoded.token_version) return next(new Error('Token revoked'));

      socket.user = {
        id: rows[0].id,
        email: rows[0].email,
        role: rows[0].role,
        name: `${rows[0].first_name} ${rows[0].last_name}`,
      };
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.user.name} (${socket.user.id})`);

    // Join a room
    socket.on('join_room', (data) => {
      const { roomId } = data; // e.g. "artist:uuid" or "project:uuid"
      if (!roomId || typeof roomId !== 'string') return;

      socket.join(roomId);

      if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
      roomPresence.get(roomId).set(socket.user.id, {
        socketId: socket.id,
        user: socket.user,
        joinedAt: new Date().toISOString(),
        cursor: null,
        viewing: null,
      });

      // Broadcast updated presence to room
      io.to(roomId).emit('presence_update', {
        roomId,
        users: Array.from(roomPresence.get(roomId).values()).map(p => ({
          id: p.user.id,
          name: p.user.name,
          role: p.user.role,
          joinedAt: p.joinedAt,
        })),
      });
    });

    // Leave a room
    socket.on('leave_room', (data) => {
      const { roomId } = data;
      if (!roomId) return;
      socket.leave(roomId);

      if (roomPresence.has(roomId)) {
        roomPresence.get(roomId).delete(socket.user.id);
        if (roomPresence.get(roomId).size === 0) {
          roomPresence.delete(roomId);
        } else {
          io.to(roomId).emit('presence_update', {
            roomId,
            users: Array.from(roomPresence.get(roomId).values()).map(p => ({
              id: p.user.id,
              name: p.user.name,
              role: p.user.role,
              joinedAt: p.joinedAt,
            })),
          });
        }
      }
    });

    // Cursor update (ephemeral, not persisted)
    socket.on('cursor_update', (data) => {
      const { roomId, x, y, viewport, elementHint } = data;
      if (!roomId) return;
      socket.to(roomId).emit('cursor_move', {
        userId: socket.user.id,
        name: socket.user.name,
        x, y, viewport, elementHint,
      });
    });

    // Entity viewing indicator
    socket.on('entity_viewing', (data) => {
      const { roomId, entityType, entityId, tab } = data;
      if (!roomId) return;
      socket.to(roomId).emit('user_viewing', {
        userId: socket.user.id,
        name: socket.user.name,
        entityType, entityId, tab,
      });
    });

    // Comment typing indicator
    socket.on('comment_typing', (data) => {
      const { roomId, threadId } = data;
      if (!roomId) return;
      socket.to(roomId).emit('user_typing', {
        userId: socket.user.id,
        name: socket.user.name,
        threadId,
      });
    });

    // Disconnect cleanup
    socket.on('disconnect', () => {
      // Remove from all rooms
      for (const [roomId, members] of roomPresence.entries()) {
        if (members.has(socket.user.id)) {
          members.delete(socket.user.id);
          if (members.size === 0) {
            roomPresence.delete(roomId);
          } else {
            io.to(roomId).emit('presence_update', {
              roomId,
              users: Array.from(members.values()).map(p => ({
                id: p.user.id,
                name: p.user.name,
                role: p.user.role,
                joinedAt: p.joinedAt,
              })),
            });
          }
        }
      }
    });
  });

  return io;
}

module.exports = { initPresence, roomPresence };
