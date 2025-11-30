import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_SERVER_URL = "http://localhost:4000";

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
 * Handles Socket.IO connection for collaboration.
 * - Connects to backend and joins room for sessionId
 * - Emits code updates and listens for incoming updates
 * - Falls back gracefully when server is offline
 */
export function useSocket({
  sessionId,
  onCodeUpdate,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(1); // always count self
  const [error, setError] = useState<string | null>(null);

  const emitCodeUpdate = useCallback(
    (code: string) => {
      if (socketRef.current?.connected && sessionId) {
        socketRef.current.emit("code:update", { sessionId, code });
      }
    },
    [sessionId]
  );

  useEffect(() => {
    if (!sessionId) return;

    const socket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      timeout: 5000,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      query: { sessionId },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      setConnectedUsers(1);
      socket.emit("join", { sessionId });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      setConnectedUsers(1);
    });

    socket.on("connect_error", (err) => {
      console.log("Socket connection error:", err.message);
      setError("Unable to reach collaboration server (offline mode).");
      setIsConnected(false);
    });

    socket.on("code:update", (data: { code: string }) => {
      if (data?.code && onCodeUpdate) onCodeUpdate(data.code);
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("code:update");
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
