import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Language } from "@/components/LanguageSelector";

// Resolve the socket base URL. If VITE_API_BASE_URL is relative (e.g. "/api"),
// fall back to window.origin so we hit the same host that serves the app.
const RAW_API_BASE = import.meta.env.VITE_API_BASE_URL;
// Resolve socket base:
// - if VITE_API_BASE_URL is absolute, use it
// - if it is relative (e.g. "/api"), use the current origin
// - otherwise fall back to localhost:4000 for dev split-ports
let SOCKET_SERVER_URL = "http://localhost:4000";
if (RAW_API_BASE) {
  if (RAW_API_BASE.startsWith("http")) {
    SOCKET_SERVER_URL = RAW_API_BASE;
  } else if (RAW_API_BASE.startsWith("/") && typeof window !== "undefined") {
    SOCKET_SERVER_URL = window.location.origin;
  }
}

export interface CursorPosition {
  line: number;
  column: number;
  selectionStart?: { line: number; column: number };
  selectionEnd?: { line: number; column: number };
  participantId?: string;
  color?: string;
}

interface UseSocketOptions {
  sessionId: string;
  onCodeUpdate?: (code: string, language?: Language) => void;
  onCodeOutput?: (output: string, error: string | null) => void;
}

interface UseSocketReturn {
  isConnected: boolean;
  connectedUsers: number;
  emitCodeUpdate: (code: string, language?: Language) => void;
  emitCodeOutput: (output: string, error: string | null) => void;
  emitCursorUpdate: (cursor: CursorPosition) => void;
  remoteCursors: Record<string, CursorPosition>;
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
  onCodeOutput,
}: UseSocketOptions): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState(1); // always count self
  const [error, setError] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, CursorPosition>>({});

  const emitCodeUpdate = useCallback(
    (code: string, language?: Language) => {
      if (socketRef.current?.connected && sessionId) {
        socketRef.current.emit("code:update", { sessionId, code, language });
      }
    },
    [sessionId]
  );

  const emitCodeOutput = useCallback(
    (output: string, error: string | null) => {
      if (socketRef.current?.connected && sessionId) {
        socketRef.current.emit("code:output", { sessionId, output, error });
      }
    },
    [sessionId]
  );

  const emitCursorUpdate = useCallback(
    (cursor: CursorPosition) => {
      if (socketRef.current?.connected && sessionId) {
        socketRef.current.emit("cursor:update", { sessionId, cursor });
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
      path: "/socket.io",
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

    socket.on("code:update", (data: { code: string; language?: Language }) => {
      if (data?.code && onCodeUpdate) onCodeUpdate(data.code, data.language);
    });

    socket.on("code:output", (data: { output: string; error: string | null }) => {
      if (onCodeOutput) onCodeOutput(data.output, data.error);
    });

    socket.on("cursor:update", (data: { cursor: CursorPosition }) => {
      if (data?.cursor?.participantId) {
        setRemoteCursors((prev) => ({
          ...prev,
          [data.cursor.participantId!]: data.cursor,
        }));
      }
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("code:update");
      socket.off("code:output");
      socket.off("cursor:update");
      socket.disconnect();
    };
  }, [sessionId, onCodeUpdate, onCodeOutput]);

  return {
    isConnected,
    connectedUsers,
    emitCodeUpdate,
    emitCodeOutput,
    emitCursorUpdate,
    remoteCursors,
    error,
  };
}
