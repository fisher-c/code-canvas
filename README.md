# CodeCanvas

Real-time collaboration suite for developers. Code together, draw diagrams, and connect face-to-face—all in one shared workspace.

## Demo

<p>
  <img src="docs/drawing_demo.png" alt="Whiteboard drawing demo" width="700">
</p>
<p>
  <img src="docs/coding_huddle_demo.png" alt="Collaborative coding huddle" width="700">
</p>

## Features

- 🎨 **Interactive Whiteboard** – Draw, diagram, and brainstorm together in real-time
- 💬 **Video Huddles** – Built-in WebRTC video chat for face-to-face collaboration
- 👥 **Remote Cursors** – See where your teammates are editing in real-time
- 🚀 **Multi-Language Execution** – Run JavaScript, Python (via Pyodide), and SQL
- 💾 **Persistent Sessions** – Sessions and code are saved to a database (SQLite/PostgreSQL)
- ⚡ **Real-Time Sync** – Powered by Socket.IO for instant updates

## Tech Stack

**Frontend:** React + TypeScript + Vite + Monaco Editor  
**Backend:** Node.js + Express + Socket.IO + Prisma  
**Database:** PostgreSQL (local + production; dev via Docker)  
**Deployment:** Render (single-container blueprint)

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

### Testing collaboration locally

1) Open two tabs at `http://localhost:5173`  
2) Start a session in one tab and copy the URL  
3) Paste the session URL into the second tab  
4) Type in one tab and watch it sync in the other (code, cursors, and participant count)

## Production Build

```bash
# Build frontend and bundle into server/public
npm run build

# Start production server (DATABASE_URL must point to Postgres)
npm start
```

## Docker (all-in-one local stack)

```bash
docker compose up --build
```
- Nginx + frontend: `http://localhost:8080`
- Backend: reachable inside the Compose network at `backend:4000` (proxied to the frontend at `/api`)
- Postgres: internal service `db:5432`

## Deployment (Render)

- Render reads `render.yaml` at the repo root.  
- Build: `npm run build` then `cd server && npx prisma generate`  
- Start: `cd server && npx prisma db push && node src/server.js`
- Ensure `DATABASE_URL` is set to the Render Postgres connection string; `PORT` will be provided by Render.

## Environment Variables

- `DATABASE_URL` – PostgreSQL connection string (required)
- `PORT` – Server port (default: 4000; Render sets this automatically)
- `CLIENT_ORIGIN` – Frontend URL for CORS (set to your deployed URL)
