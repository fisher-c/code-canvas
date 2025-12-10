# CodeCanvas

Real-time collaboration suite for developers. Code together, draw diagrams, and connect face-to-face—all in one shared workspace.

## Demo

Drawing:
<p>
  <img src="docs/drawing_demo_1209.png" alt="Whiteboard drawing demo" width="700">
</p>

Coding + video call:
<p>
  <img src="docs/coding_huddle_demo_1209.png" alt="Collaborative coding huddle" width="700">
</p>

## Features

- 🎨 **Interactive Whiteboard** – Draw, diagram, and brainstorm together in real-time
- 💬 **Video Huddles** – Built-in WebRTC video chat for face-to-face collaboration
- 👥 **Remote Cursors** – See where your teammates are editing in real-time
- 🚀 **Multi-Language Execution** – Run JavaScript, Python (via Pyodide), and SQL
- 💾 **Persistent Sessions** – Sessions and code are saved to a database (SQLite/PostgreSQL)
- ⚡ **Real-Time Sync** – Powered by Socket.IO for instant updates
- ⏳ **24h Session Cleanup** – Inactive sessions auto-delete after 24 hours; no long-term user data retained

## Tech Stack at a Glance

| Part | What it does | Tech stack used | Beginner explanation |
| --- | --- | --- | --- |
| Client (Frontend) | What users see and interact with | Vite + React + TypeScript; Socket.IO client for real-time code/whiteboard/cursor | The web UI in your browser; React renders screens and Socket.IO keeps everyone in sync live. |
| Server (Backend) | Business logic + APIs + real-time hub | Node.js with Express + Socket.IO; Prisma ORM | The app’s “brain” and relay: serves APIs, stores data, and broadcasts live updates between users. |
| Database | Persistent storage | Postgres (prod), Prisma-managed | Where session data and code live so it’s saved and shared. |
| Video layer | Peer-to-peer video/voice | WebRTC | Direct browser-to-browser video/audio streaming for huddles. |
| Tests | Automated checks | Client: Vitest; Backend: Pytest (unit + integration) | Scripts that run code to catch bugs. |
| Containerization | Run anywhere | Docker Compose (frontend + backend + Postgres) | Packages all parts into containers so they run consistently on any machine. |
| Deployment | Put it online | Render | Hosted service that builds and runs the app in the cloud. |
| CI/CD | Automate test/deploy | GitHub Actions | Runs lint/tests and triggers Render deploys on pushes to `main`. |

## Project Structure

```
├── client/          # React frontend
├── server/          # Node.js backend
│   ├── prisma/      # Database schema & migrations
│   └── public/      # Built frontend (production)
├── render.yaml      # Render deployment config
└── docker-compose.yml # Docker setup (optional)
```

## Local Development

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL running locally (e.g., via Docker)

### Quick start (local)

```bash
# 1) Install deps (root will install client/ and server/)
npm install

# 2) Start Postgres (example via Docker; keep it running)
docker compose up db
# or: docker run --name codecanvas-db -p 5432:5432 \
#        -e POSTGRES_USER=codecanvas -e POSTGRES_PASSWORD=codecanvas \
#        -e POSTGRES_DB=codecanvas -d postgres:15-alpine

# 3) Set your DATABASE_URL (update creds/host if needed)
export DATABASE_URL="postgresql://codecanvas:codecanvas@localhost:5432/codecanvas"

# 4) Run client + server together
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API/Socket: `http://localhost:4000` (or `PORT` if you set it)

If you see “address already in use,” free port 4000 or start with `PORT=4100 npm start --prefix server`.
