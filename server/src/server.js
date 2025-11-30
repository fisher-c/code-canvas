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
    origin: ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  const joinRoom = (sessionId) => {
    if (!sessionId) return;
    socket.join(sessionId);
  };

  socket.on("join", ({ sessionId }) => joinRoom(sessionId));
  socket.on("join:session", ({ sessionId }) => joinRoom(sessionId)); // compatibility

  socket.on("code:update", ({ sessionId, code }) => {
    if (!sessionId) return;
    socket.to(sessionId).emit("code:update", { code });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
