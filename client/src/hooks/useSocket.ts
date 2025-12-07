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

export interface DrawEvent {
  x: number;
  y: number;
  color: string;
  type: 'start' | 'move' | 'end';
  participantId?: string;
}

interface UseSocketOptions {
  sessionId: string;
  onCodeUpdate?: (code: string, language?: Language) => void;
  onCodeOutput?: (output: string, error: string | null) => void;
  onDraw?: (event: DrawEvent) => void;
  onClear?: () => void;
}

interface UseSocketReturn {
  isConnected: boolean;
  connectedUsers: number;
  emitCodeUpdate: (code: string, language?: Language) => void;
  emitCodeOutput: (output: string, error: string | null) => void;
  emitCursorUpdate: (cursor: CursorPosition) => void;
  emitDraw: (event: DrawEvent) => void;
  emitClear: () => void;
  remoteCursors: Record<string, CursorPosition>;
  error: string | null;
  socket: Socket | null;
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
  onDraw,
  onClear,
}: UseSocketOptions): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null); // Keep ref for callbacks if needed, or just use state
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

  const emitDraw = useCallback(
    (event: DrawEvent) => {
      if (socketRef.current?.connected && sessionId) {
        socketRef.current.emit(`draw:${event.type}`, { sessionId, ...event });
      }
    },
    [sessionId]
  );

  const emitClear = useCallback(() => {
    if (socketRef.current?.connected && sessionId) {
      socketRef.current.emit("draw:clear", { sessionId });
    }
  }, [sessionId]);

  // Use refs for callbacks to avoid re-connecting socket when they change
  const onCodeUpdateRef = useRef(onCodeUpdate);
  const onCodeOutputRef = useRef(onCodeOutput);
  const onDrawRef = useRef(onDraw);
  const onClearRef = useRef(onClear);

  useEffect(() => {
    onCodeUpdateRef.current = onCodeUpdate;
    onCodeOutputRef.current = onCodeOutput;
    onDrawRef.current = onDraw;
    onClearRef.current = onClear;
  }, [onCodeUpdate, onCodeOutput, onDraw, onClear]);

  useEffect(() => {
    if (!sessionId) return;

    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ["websocket", "polling"],
      timeout: 5000,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      path: "/socket.io",
      query: { sessionId },
    });

    setSocket(newSocket);
    socketRef.current = newSocket;

    newSocket.on("connect", () => {
      setIsConnected(true);
      setError(null);
      setConnectedUsers(1);
      newSocket.emit("join", { sessionId });
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      setConnectedUsers(1);
    });

    newSocket.on("connect_error", (err) => {
      console.log("Socket connection error:", err.message);
      setError("Unable to reach collaboration server (offline mode).");
      setIsConnected(false);
    });

    newSocket.on("code:update", (data: { code: string; language?: Language }) => {
      if (data?.code && onCodeUpdateRef.current) {
        onCodeUpdateRef.current(data.code, data.language);
      }
    });

    newSocket.on("code:output", (data: { output: string; error: string | null }) => {
      if (onCodeOutputRef.current) {
        onCodeOutputRef.current(data.output, data.error);
      }
    });

    newSocket.on("cursor:update", (data: { cursor: CursorPosition }) => {
      if (data?.cursor?.participantId) {
        setRemoteCursors((prev) => ({
          ...prev,
          [data.cursor.participantId!]: data.cursor,
        }));
      }
    });

    const handleDraw = (type: 'start' | 'move' | 'end') => (data: any) => {
      if (onDrawRef.current) {
        onDrawRef.current({ ...data, type });
      }
    };

    newSocket.on("draw:start", handleDraw('start'));
    newSocket.on("draw:move", handleDraw('move'));
    newSocket.on("draw:end", handleDraw('end'));
    newSocket.on("draw:clear", () => {
      if (onClearRef.current) onClearRef.current();
    });

    return () => {
      newSocket.off("connect");
      newSocket.off("disconnect");
      newSocket.off("connect_error");
      newSocket.off("code:update");
      newSocket.off("code:output");
      newSocket.off("cursor:update");
      newSocket.off("draw:start");
      newSocket.off("draw:move");
      newSocket.off("draw:end");
      newSocket.off("draw:clear");
      newSocket.disconnect();
      setSocket(null);
    };
  }, [sessionId]); // Only re-connect if sessionId changes

  return {
    isConnected,
    connectedUsers,
    emitCodeUpdate,
    emitCodeOutput,
    emitCursorUpdate,
    emitDraw,
    emitClear,
    remoteCursors,
    error,
    socket,
  };
}
