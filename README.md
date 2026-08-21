# CollabSpace Express

Real-time multiplayer whiteboard — infinite canvas, live cursors, and Prisma-backed rooms.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://collabspace-express.vercel.app)
[![CI](https://github.com/devtechedge/collabspace-express/actions/workflows/ci.yml/badge.svg)](https://github.com/devtechedge/collabspace-express/actions/workflows/ci.yml)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite)](https://vite.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4-black?logo=express)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4-black?logo=socket.io)](https://socket.io/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Live Demo

**https://collabspace-express.vercel.app**

> **Status:** Vercel hosts the **Vite client only**. There is no public Express/Socket.io process on that URL — creating a room and live cursors need the Node backend from this repo. Clone and `npm run dev` for full multiplayer (two browser windows on the same room ID).
>
> This is not a production auth or payment product. Identity is an anonymous display name in `localStorage`.

---

## Screenshots

| Dark canvas | Light canvas |
|-------------|--------------|
| ![Dark mode whiteboard with toolbar and sidebar](docs/screenshots/01-dark-canvas.png) | ![Light mode whiteboard with rooms and collaborators](docs/screenshots/02-light-canvas.png) |

---

## Features

- **11 drawing tools** — pencil, highlighter, line, rectangle, circle, text, sticky note, eraser, select, image, laser pointer
- **Live collaboration** — Socket.io rooms, color-coded cursors, laser trails, presence list
- **Infinite canvas** — scroll zoom, Shift-drag / middle-click pan, grid overlay
- **Undo / redo** — local history, broadcast to peers
- **Shareable rooms** — UUID in the URL (`?room=`), join-by-ID in the sidebar
- **Persistence** — boards and elements in SQLite via Prisma (local backend)
- **PNG export**, dark / light theme, keyboard shortcuts (`V` `P` `E` `L` `R` `O` `T`)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, TypeScript, HTML5 Canvas, Lucide |
| Realtime | Socket.io 4 |
| API | Express 4 |
| Data | Prisma 5 + SQLite (swap the provider for Postgres locally) |
| Hosting | Vercel (client). Express is **local** |
| CI | GitHub Actions |

---

## Quick Start

```bash
git clone https://github.com/devtechedge/collabspace-express.git
cd collabspace-express
npm install

cp client/.env.example client/.env
cp server/.env.example server/.env

cd server && npx prisma migrate dev && npx prisma generate && cd ..

npm run dev
```

| Service | URL |
|---------|-----|
| Client | http://localhost:5173 |
| API + WebSocket | http://localhost:5000 |

Open two windows, create a board, paste the room ID in the second — strokes sync live.

---

## Project shape

```
client/                 Vite + React UI (Vercel)
  public/favicon.svg
  src/components/       DrawingBoard, Toolbar, Sidebar
server/                 Express + Socket.io + Prisma
  prisma/schema.prisma
  src/index.ts
```

Prisma is the local production path, not leftover template. The public Vercel alias does not run this server.

---

## License

MIT. See [LICENSE](LICENSE).
