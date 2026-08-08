# CollabSpace 🎨

**Real-time Collaborative Whiteboard** — A full-stack portfolio project demonstrating WebSocket-driven multiplayer canvas collaboration, built for Wellfound job applications.

---

## 🚀 Features

| Feature | Details |
|---|---|
| **Real-time collaboration** | Multiple users draw together simultaneously via Socket.io WebSockets |
| **Live cursor tracking** | See every collaborator's cursor with colored name badges |
| **Drawing tools** | Pencil (freehand), Line, Rectangle, Circle, Text, Eraser, Select |
| **Select & Move** | Click any element to select and drag it anywhere |
| **Undo / Redo** | Full undo/redo history synced across all connected clients |
| **Pan & Zoom** | Mouse-wheel zoom, middle-click/Shift+drag to pan the infinite canvas |
| **Keyboard shortcuts** | `V` Select · `P` Pencil · `E` Eraser · `L` Line · `R` Rect · `O` Circle · `T` Text · `Ctrl+Z` Undo · `Ctrl+Y` Redo |
| **Color palette** | 8 preset colors + full custom color picker |
| **Stroke weights** | Thin / Medium / Thick |
| **Board persistence** | All drawings saved to SQLite via Prisma — reload and your work is still there |
| **Shareable rooms** | Every board has a UUID. Share the URL or paste the ID into "Join by Room ID" |
| **Export PNG** | Exports the current canvas content as a high-quality PNG file |
| **Clear board** | Clears canvas for all connected clients simultaneously |
| **Premium dark UI** | Glassmorphism toolbar, dot-grid canvas background, smooth micro-animations |

---

## 🏗️ Tech Stack

```
Frontend                  Backend                   Database
──────────────────────    ──────────────────────    ──────────────
React 18 + Vite 5         Node.js + Express 4       SQLite (via Prisma)
TypeScript                Socket.io 4               
HTML5 Canvas API          Prisma ORM 6              
Vanilla CSS               CORS, tsx (dev server)    
Lucide React icons        
```

---

## 📂 Project Structure

```
collabspace/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── DrawingBoard.tsx # Canvas logic, WebSocket sync, undo/redo
│       │   ├── Toolbar.tsx      # Floating tool palette
│       │   └── Sidebar.tsx      # Board management, user presence
│       ├── types.ts             # Shared TypeScript interfaces
│       ├── App.tsx              # Root layout and state management
│       └── index.css            # Design system & global styles
├── server/
│   ├── src/
│   │   └── index.ts            # Express + Socket.io server + Prisma CRUD
│   └── prisma/
│       └── schema.prisma       # Board + Element data models
├── start_app.ps1               # One-click start script
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 18+
- Windows PowerShell (or adapt commands for your shell)

### 1. Install dependencies
```powershell
npm install
npm install --workspace=client
npm install --workspace=server
```

### 2. Set up the database
```powershell
.\prisma_init.ps1
```
This runs `prisma migrate dev` and generates the Prisma client.

### 3. Start the app
```powershell
.\start_app.ps1
```

This starts both servers concurrently:
- **Client** → http://localhost:5173
- **Backend API + WebSocket** → http://localhost:5000

---

## 🎯 How to Collaborate

1. Open http://localhost:5173 in **two browser windows**
2. In the sidebar, click **Create Board** to start a new room
3. The second window auto-joins the same room if you copy the URL  
   *or* paste the Room ID into **"Join by Room ID"** in the sidebar
4. Draw in either window — changes appear instantly in the other

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/boards` | List all boards (ordered by last updated) |
| `POST` | `/api/boards` | Create a new board `{ name: string }` |
| `GET` | `/api/boards/:id` | Get board details + all saved elements |

### Socket.io Events

| Event (emit) | Payload | Description |
|---|---|---|
| `join-room` | `{ boardId, userName }` | Join a collaboration room |
| `draw-element` | `{ boardId, element }` | Upsert a drawing element |
| `delete-element` | `{ boardId, elementId }` | Delete an element |
| `cursor-move` | `{ boardId, userName, color, x, y }` | Broadcast cursor position |
| `clear-board` | `{ boardId }` | Clear all elements on the board |

| Event (listen) | Description |
|---|---|
| `canvas-history` | Receive saved elements when joining a room |
| `element-update` | Receive a new or updated element from a peer |
| `element-delete` | Remove a deleted element |
| `cursor-update` | Update a remote user's cursor position |
| `user-left` | A collaborator disconnected |
| `canvas-cleared` | The board was cleared by a peer |

---

## 🧠 Architecture Highlights

- **Optimistic updates**: Draw events are applied locally and broadcast simultaneously — zero perceived lag
- **Persistent undo/redo**: Undo/redo operations sync deletions and re-creations to all peers via the same WebSocket events
- **Throttled cursors**: Cursor events are throttled to ~30fps to avoid flooding the WebSocket
- **Infinite canvas**: Pan with Shift+drag or middle-click; zoom with mouse wheel — all coordinates are stored in canvas-space, independent of viewport
- **ARM64 Windows**: Prisma is configured with `PRISMA_CLIENT_ENGINE_TYPE=binary` for compatibility with Windows ARM64

---

## 🎨 Design System

- **Color palette**: Dark indigo/navy base (#0b0f17), accent indigo (#6366f1) + sky (#0ea5e9)
- **Fonts**: Outfit (headings), Inter (body) — loaded from Google Fonts
- **Glassmorphism**: `backdrop-filter: blur(16px)` with translucent backgrounds on the toolbar and sidebar
- **Micro-animations**: Hover lift effects, pulsing live indicators, smooth tool transitions

---

*Built as a portfolio project to demonstrate full-stack engineering skills — React, Node.js, WebSockets, database design, and premium UI/UX.*
