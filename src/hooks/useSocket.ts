import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Backend server URL - can be configured via environment variable
const SOCKET_SERVER_URL = 'http://localhost:4000';

interface UseSocketOptions {
  sessionId: string;
  onCodeUpdate?: (code: string) => void;
}

interface UseSocketReturn {
  isConnected: boolean;
  connectedUsers: number;
  emitCodeUpdate: (code: string) => void;
  error: string | null;
}

/**
 * Custom hook for managing Socket.IO connection for real-time collaboration.
 * 
 * This hook:
 * - Connects to the Socket.IO server when mounted
 * - Joins a room based on sessionId for session-specific collaboration
 * - Handles connection errors gracefully (app works offline)
 * - Provides methods to emit code updates to other users
 * - Listens for code updates from other users
 * 
 * The backend is expected to:
 * - Accept connections at SOCKET_SERVER_URL
 * - Handle 'join:session' event to add user to a room
 * - Broadcast 'code:update' events to all users in the same room
 */
export function useSocket({ sessionId, onCodeUpdate }: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(1); // At least the current user
  const [error, setError] = useState<string | null>(null);

  // Emit code update to server
  const emitCodeUpdate = useCallback((code: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('code:update', { sessionId, code });
    }
  }, [sessionId]);

  useEffect(() => {
    // Create socket connection
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setIsConnected(true);
      setError(null);
      
      // Join the session room
      socket.emit('join:session', { sessionId });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.log('Socket connection error:', err.message);
      setError('Unable to connect to collaboration server');
      setIsConnected(false);
    });

    // Listen for code updates from other users
    socket.on('code:update', (data: { code: string; userId: string }) => {
      // Only update if the change came from another user
      if (data.userId !== socket.id && onCodeUpdate) {
        onCodeUpdate(data.code);
      }
    });

    // Listen for user count updates
    socket.on('users:count', (data: { count: number }) => {
      setConnectedUsers(data.count);
    });

    // Cleanup on unmount
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('code:update');
      socket.off('users:count');
      socket.disconnect();
    };
  }, [sessionId, onCodeUpdate]);

  return {
    isConnected,
    connectedUsers,
    emitCodeUpdate,
    error,
  };
}
