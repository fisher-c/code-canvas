# CodePair

Collaborative coding workspace with real-time sync (Socket.IO), Monaco editor, and in-browser execution (JS + Python via Pyodide). Includes SQL syntax highlighting and a huddle/iframe placeholder for future voice/video.

## Structure
- `client/` – Vite + React + TypeScript frontend (Monaco, Pyodide, Socket.IO client).
- `server/` – Express + Socket.IO backend for room-based code sync.

## Setup
```bash
cd server && npm install
cd ../client && npm install
```

## Development
From the repo root:
```bash
npm install        # installs root dev deps (concurrently)
npm run dev        # runs server:4000 and client:5173 together
```

## Tests (frontend)
```bash
cd client
npm test           # run Vitest once
npm run test:watch # watch mode
```

## How to test
1) Start dev servers (`npm run dev` from root).  
2) Open two browser windows at `http://localhost:5173`.  
3) Create/visit the same session URL (e.g., `/session/ABCD`).  
4) Type in the editor and see changes sync live across both windows.

## Notes & future ideas
- Add voice/video provider into the huddle placeholder.
- Expand SQL to actual execution (server sandbox or WASM db).
- Add authentication and persistence for rooms/history.
