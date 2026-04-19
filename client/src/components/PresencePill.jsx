import React, { useState, useEffect, useRef } from 'react';

/**
 * Shows who else is viewing this page/entity.
 * Connects to socket.io for real-time presence.
 * Falls back gracefully if WebSocket is unavailable.
 */
export default function PresencePill({ roomId }) {
  const [users, setUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    let socket = null;
    let mounted = true;

    async function connect() {
      try {
        // Dynamic import so socket.io-client is optional
        const { io } = await import('socket.io-client');
        const token = sessionStorage.getItem('pryntis_token');
        if (!token || !mounted) return;

        socket = io(window.location.origin, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join_room', { roomId });
        });

        socket.on('presence_update', (data) => {
          if (data.roomId === roomId && mounted) {
            setUsers(data.users || []);
          }
        });

        socket.on('connect_error', () => {
          // WebSocket not available, degrade gracefully
          if (mounted) setUsers([]);
        });
      } catch {
        // socket.io-client not available
      }
    }

    connect();

    return () => {
      mounted = false;
      if (socket) {
        socket.emit('leave_room', { roomId });
        socket.disconnect();
      }
    };
  }, [roomId]);

  if (users.length === 0) return null;

  const displayUsers = users.slice(0, 3);
  const overflow = users.length - 3;

  return (
    <div className="presence-pill">
      <span className="presence-pill__dot" />
      <span className="presence-pill__label">
        {displayUsers.map((u) => u.name?.split(' ')[0]).join(', ')}
        {overflow > 0 && ` +${overflow}`}
        {users.length === 1 ? ' is viewing' : ' are viewing'}
      </span>
    </div>
  );
}
