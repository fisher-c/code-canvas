import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: "*" }));
app.use(express.json());

// In-memory storage
const sessions = new Map();

// Helper to get or create session
const getOrCreateSession = (sessionId) => {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, {
      sessionId,
      codeByLanguage: {
        javascript: { content: "// Welcome to CodePair!\n// Write your JavaScript code here\n\nconsole.log('Hello World');", language: "javascript" },
        python: { content: "# Welcome to CodePair!\n# Write your Python code here\n\nprint('Hello World')", language: "python" },
        sql: { content: "-- Welcome to CodePair!\n-- Write your SQL code here\n\nSELECT * FROM users;", language: "sql" },
      },
      participants: new Map(),
    });
  }
  return sessions.get(sessionId);
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// REST API Endpoints
app.post("/sessions", (req, res) => {
  const { sessionId } = req.body;
  const id = sessionId || Math.random().toString(36).substring(2, 15);
  const session = getOrCreateSession(id);
  res.status(201).json({
    sessionId: session.sessionId,
    activeParticipants: session.participants.size,
    codeByLanguage: session.codeByLanguage,
    participants: Array.from(session.participants.values()),
  });
});

app.get("/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = getOrCreateSession(sessionId); // Auto-create for simplicity in this prototype
  res.json({
    sessionId: session.sessionId,
    activeParticipants: session.participants.size,
    codeByLanguage: session.codeByLanguage,
    participants: Array.from(session.participants.values()),
  });
});

app.get("/sessions/:sessionId/code", (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);
  if (!session) return res.status(404).json({ detail: "Session not found" });

  res.json({
    sessionId,
    codeByLanguage: session.codeByLanguage,
  });
});

app.put("/sessions/:sessionId/code", (req, res) => {
  const { sessionId } = req.params;
  const { language, content } = req.body;
  const session = sessions.get(sessionId);

  if (!session) return res.status(404).json({ detail: "Session not found" });

  if (session.codeByLanguage[language]) {
    session.codeByLanguage[language].content = content;
  } else {
    session.codeByLanguage[language] = { content, language };
  }

  res.json(session.codeByLanguage[language]);
});

app.post("/sessions/:sessionId/participants", (req, res) => {
  const { sessionId } = req.params;
  const { displayName } = req.body;
  const session = getOrCreateSession(sessionId);

  const participantId = Math.random().toString(36).substring(2, 15);
  const participant = {
    participantId,
    displayName: displayName || "Guest",
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  };

  session.participants.set(participantId, participant);

  res.json({
    sessionId,
    participantId,
    activeParticipants: session.participants.size,
    participants: Array.from(session.participants.values()),
  });
});

app.delete("/sessions/:sessionId/participants/:participantId", (req, res) => {
  const { sessionId, participantId } = req.params;
  const session = sessions.get(sessionId);
  if (session) {
    session.participants.delete(participantId);
    res.json({
      sessionId,
      participantId: null,
      activeParticipants: session.participants.size,
      participants: Array.from(session.participants.values()),
    });
  } else {
    res.status(404).json({ detail: "Session not found" });
  }
});

io.on("connection", (socket) => {
  const joinRoom = (sessionId) => {
    if (!sessionId) return;
    socket.join(sessionId);
  };

  socket.on("join", ({ sessionId }) => joinRoom(sessionId));
  socket.on("join:session", ({ sessionId }) => joinRoom(sessionId)); // compatibility

  socket.on("code:update", ({ sessionId, code, language }) => {
    if (!sessionId) return;

    // Update in-memory store
    const session = sessions.get(sessionId);
    if (session && session.codeByLanguage[language]) {
      session.codeByLanguage[language].content = code;
    }

    socket.to(sessionId).emit("code:update", { code, language });
  });

  socket.on("code:output", ({ sessionId, output, error }) => {
    if (!sessionId) return;
    socket.to(sessionId).emit("code:output", { output, error });
  });

  socket.on("cursor:update", ({ sessionId, cursor }) => {
    if (!sessionId) return;
    socket.to(sessionId).emit("cursor:update", { cursor });
  });

  // WebRTC Signaling
  socket.on("signal", ({ sessionId, signal, to }) => {
    if (!sessionId) return;
    // Send signal to specific peer
    io.to(to).emit("signal", { signal, from: socket.id });
  });

  socket.on("join-room", ({ sessionId }) => {
    if (!sessionId) return;

    // Notify others in the room that a new peer joined
    // They will initiate the WebRTC connection
    socket.to(sessionId).emit("peer-joined", { peerId: socket.id });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
