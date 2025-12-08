# CodeCanvas

Real-time collaboration suite for developers. Code together, draw diagrams, and connect face-to-face—all in one shared workspace.

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
**Database:** SQLite (local) / PostgreSQL (production)  
**Deployment:** Render (single-container monolith)

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
- Node.js 18+
- npm

### Setup

```bash
# Install dependencies
npm install

# Run both client and server
npm run dev
```

The client will be available at `http://localhost:5173` and the server at `http://localhost:4000`.

### Testing Collaboration

1. Open two browser windows at `http://localhost:5173`
2. Click "Start a Session" in both windows
3. Copy the session URL from one window and paste it into the other
4. Start coding, drawing, or video chatting!

## Production Build

```bash
# Build frontend and bundle with backend
npm run build

# Start production server
npm start
```

The server will serve the built frontend at `http://localhost:4000`.

## Deployment

### Deploy to Render (Free Tier)

1. Push your code to GitHub
2. Go to [render.com](https://render.com) and sign up
3. Click **New +** → **Blueprint**
4. Connect your GitHub repository
5. Render will automatically detect `render.yaml` and deploy!

Your app will be live at `https://your-app.onrender.com` 🚀

### Docker Deployment (Optional)

```bash
docker-compose up --build
```

Access the app at `http://localhost:8080`.

## Environment Variables

For production, set these in your deployment platform:

- `DATABASE_URL` – PostgreSQL connection string
- `PORT` – Server port (default: 4000)
- `CLIENT_ORIGIN` – Frontend URL for CORS

## License

MIT

