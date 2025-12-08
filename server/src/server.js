import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const prisma = new PrismaClient();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "../public")));

// Helper to get or create session
const getOrCreateSession = async (sessionId) => {
  const defaultCode = JSON.stringify({
    javascript: { content: "// Welcome to CodeCanvas!\n// Write your JavaScript code here\n\nconsole.log('Hello World');", language: "javascript" },
    python: { content: "# Welcome to CodeCanvas!\n# Write your Python code here\n\nprint('Hello World')", language: "python" },
    sql: { content: "-- Welcome to CodeCanvas!\n-- Write your SQL code here\n\nSELECT * FROM users;", language: "sql" },
  });

  return await prisma.session.upsert({
    where: { id: sessionId },
    update: {},
    create: {
      id: sessionId,
      code: defaultCode,
    },
    include: { participants: true },
  });
};

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// REST API Endpoints
app.post("/sessions", async (req, res) => {
  const { sessionId } = req.body;
  const id = sessionId || Math.random().toString(36).substring(2, 15);

  try {
    const session = await getOrCreateSession(id);
    const codeByLanguage = JSON.parse(session.code);

    res.status(201).json({
      sessionId: session.id,
      activeParticipants: session.participants.length,
      codeByLanguage,
      participants: session.participants,
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ detail: "Internal server error" });
  }
});

app.get("/sessions/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await getOrCreateSession(sessionId);
    const codeByLanguage = JSON.parse(session.code);

    res.json({
      sessionId: session.id,
      activeParticipants: session.participants.length,
      codeByLanguage,
      participants: session.participants,
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({ detail: "Internal server error" });
  }
});

app.get("/sessions/:sessionId/code", async (req, res) => {
  const { sessionId } = req.params;
  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ detail: "Session not found" });

    const codeByLanguage = JSON.parse(session.code);
    res.json({
      sessionId,
      codeByLanguage,
    });
  } catch (error) {
    console.error("Error fetching code:", error);
    res.status(500).json({ detail: "Internal server error" });
  }
});

app.put("/sessions/:sessionId/code", async (req, res) => {
  const { sessionId } = req.params;
  const { language, content } = req.body;

  try {
    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    if (!session) return res.status(404).json({ detail: "Session not found" });

    const codeByLanguage = JSON.parse(session.code);

    if (codeByLanguage[language]) {
      codeByLanguage[language].content = content;
    } else {
      codeByLanguage[language] = { content, language };
    }

    await prisma.session.update({
      where: { id: sessionId },
      data: { code: JSON.stringify(codeByLanguage) },
    });

    res.json(codeByLanguage[language]);
  } catch (error) {
    console.error("Error updating code:", error);
    res.status(500).json({ detail: "Internal server error" });
  }
});

app.post("/sessions/:sessionId/participants", async (req, res) => {
  const { sessionId } = req.params;
  const { displayName } = req.body;

  try {
    // Ensure session exists
    await getOrCreateSession(sessionId);

    const participant = await prisma.participant.create({
      data: {
        sessionId,
        displayName: displayName || "Guest",
      },
    });

    const count = await prisma.participant.count({ where: { sessionId } });
    const participants = await prisma.participant.findMany({ where: { sessionId } });

    res.json({
      sessionId,
      participantId: participant.id,
      activeParticipants: count,
      participants,
    });
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({ detail: "Internal server error" });
  }
});

app.delete("/sessions/:sessionId/participants/:participantId", async (req, res) => {
  const { sessionId, participantId } = req.params;
  try {
    await prisma.participant.delete({
      where: { id: participantId },
    }).catch(() => { }); // Ignore if already deleted

    const count = await prisma.participant.count({ where: { sessionId } });
    const participants = await prisma.participant.findMany({ where: { sessionId } });

    res.json({
      sessionId,
      participantId: null,
      activeParticipants: count,
      participants,
    });
  } catch (error) {
    console.error("Error removing participant:", error);
    res.status(500).json({ detail: "Internal server error" });
  }
});

io.on("connection", (socket) => {
  const joinRoom = (sessionId) => {
    if (!sessionId) return;
    socket.join(sessionId);
  };

  socket.on("join", ({ sessionId }) => joinRoom(sessionId));
  socket.on("join:session", ({ sessionId }) => joinRoom(sessionId));

  socket.on("code:update", async ({ sessionId, code, language }) => {
    if (!sessionId) return;

    // Update DB asynchronously
    try {
      const session = await prisma.session.findUnique({ where: { id: sessionId } });
      if (session) {
        const codeByLanguage = JSON.parse(session.code);
        if (codeByLanguage[language]) {
          codeByLanguage[language].content = code;
          await prisma.session.update({
            where: { id: sessionId },
            data: { code: JSON.stringify(codeByLanguage) },
          });
        }
      }
    } catch (err) {
      console.error("Error saving code update:", err);
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
    io.to(to).emit("signal", { signal, from: socket.id });
  });

  socket.on("join-room", ({ sessionId }) => {
    if (!sessionId) return;
    socket.to(sessionId).emit("peer-joined", { peerId: socket.id });
  });

  // Whiteboard Signaling
  const relayDrawing = (event, data) => {
    const { sessionId } = data;
    if (!sessionId) return;
    socket.to(sessionId).emit(event, data);
  };

  socket.on("draw:start", (data) => relayDrawing("draw:start", data));
  socket.on("draw:move", (data) => relayDrawing("draw:move", data));
  socket.on("draw:end", (data) => relayDrawing("draw:end", data));
  socket.on("draw:clear", (data) => relayDrawing("draw:clear", data));
});

// Catch-all route for React Router
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
