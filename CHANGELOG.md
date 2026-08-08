# Changelog

All notable changes to CollabSpace are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-08-08

### 🎉 Initial Release

This is the first stable release of **CollabSpace** — a real-time multiplayer collaborative whiteboard built on a full-stack TypeScript monorepo (React + Vite client, Express + Socket.io + Prisma server).

---

### ✨ Added

#### Drawing Tools
- **Pencil** — freehand drawing with smooth point interpolation
- **Line** — straight lines with directional rendering
- **Rectangle** — hollow or filled rectangles
- **Circle / Ellipse** — hollow or filled ellipses
- **Text** — inline text elements placed directly on the canvas
- **Sticky Note** — colored sticky note cards with inline editing
- **Highlighter** — semi-transparent highlight strokes
- **Eraser** — proximity-based eraser that deletes elements under the cursor
- **Select & Move** — click to select any element and drag to reposition
- **Image** — paste or upload images directly onto the canvas
- **Laser Pointer** — ephemeral laser trails (solid / dashed / dotted / rough styles) that fade after release

#### Styling & Canvas
- 4 curated color palette categories: **Sleek**, **Pastel**, **Neon**, **Earth** (8 colors each)
- Custom HEX color picker
- Stroke weight presets: **Thin**, **Medium**, **Thick**
- Shape **fill toggle** for rectangles and circles
- Canvas **background color picker** — persisted per board
- **Grid overlay** — switchable between Dots, Lines, and None
- **Bring to Front / Send to Back** element layering via zIndex

#### Canvas Navigation
- **Infinite canvas** — zoom with mouse wheel, pan with Shift+drag or middle-click
- **Zoom indicator** — live zoom percentage in the bottom-right corner
- All element coordinates stored in canvas-space (viewport-independent)

#### Undo / Redo
- Full client-side history stack (undoStack + redoStack)
- Undo (`Ctrl+Z`) and Redo (`Ctrl+Y` / `Ctrl+Shift+Z`) synced to all peers via socket events

#### Real-time Collaboration
- WebSocket rooms via Socket.io — join any board instantly
- **Live cursor tracking** — color-coded name badges for all connected collaborators
- **Laser pointer sync** — ephemeral trails broadcast and rendered on all peers
- **Presence list** — live collaborator roster in the sidebar
- Room URLs — shareable `?room=<uuid>` query parameter

#### Board Management
- Create, rename, and delete boards
- Board list ordered by last-updated timestamp
- Join by room ID — paste any board UUID to join directly
- Board metadata (name, background color) persisted to SQLite

#### Persistence
- All canvas elements saved to SQLite via Prisma ORM
- Canvas history delivered on room join — reload and your work is still there
- Element upsert — partial updates and moves don't create duplicates

#### Export
- **Export to PNG** — full canvas exported at native resolution

#### UI / UX
- **Dark mode** and **Light mode** — toggle in the sidebar; preference persisted to `localStorage`
- Glassmorphism toolbar and sidebar with `backdrop-filter: blur`
- Smooth micro-animations on hover, tool selection, and theme transitions
- Google Fonts: **Outfit** (headings) + **Inter** (body)
- Design token system via CSS custom properties (`--bg-*`, `--accent-*`, `--text-*`)

#### Keyboard Shortcuts
| Key | Action |
|---|---|
| `V` | Select tool |
| `P` | Pencil tool |
| `E` | Eraser tool |
| `L` | Line tool |
| `R` | Rectangle tool |
| `O` | Circle tool |
| `T` | Text tool |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |

#### Developer / Repo
- npm workspaces monorepo (`client` + `server`)
- TypeScript strict mode on both client and server
- Prisma migrations with SQLite (swappable to PostgreSQL via `schema.prisma`)
- `vercel.json` SPA deployment configuration
- `VITE_API_URL` env var for pointing the client to any backend
- GitHub Actions CI — TypeScript type-check + production build on every push and PR
- MIT License
- `CONTRIBUTING.md`, `SECURITY.md`, issue templates, PR template

---

### ⚠️ Known Limitations in v1.0.0

- **No automated unit or integration tests** — the existing `Toolbar.test.tsx` is a stub. Full test coverage (Vitest + Testing Library for the client, and supertest for the Express API) is planned for v1.1.0.
- **No automated security tests** — no SAST, dependency audit gates, or penetration testing has been performed for this release. Basic input validation exists on the REST layer; WebSocket payloads are trusted client data.
- **SQLite only** — production deployments should swap `schema.prisma` to `postgresql` and provide a `DATABASE_URL`. SQLite is not suitable for multi-process or horizontally-scaled deployments.
- **No authentication** — user identity is anonymous (`localStorage` random ID). Auth (e.g. GitHub OAuth, Clerk) is planned for a future release.
- **No rate limiting** — the Socket.io and REST endpoints have no request rate limiting. Suitable for demo / portfolio use; add `express-rate-limit` before exposing to the public internet at scale.
- **Images are not persisted** — image elements are stored as base64 in the WebSocket payload and in-memory only; they are not saved to the database in this release.

---

### 🔮 Planned for v1.1.0

- [ ] Vitest unit tests for canvas utilities and React components
- [ ] supertest integration tests for the Express REST API
- [ ] `npm audit` CI gate + Dependabot alerts
- [ ] PostgreSQL support documented end-to-end
- [ ] Anonymous auth with persistent identity across sessions
- [ ] Rate limiting on REST and Socket.io endpoints
- [ ] Image element persistence (store as uploaded file reference)
- [ ] Mobile touch support (pinch-to-zoom, touch drawing)

---

[1.0.0]: https://github.com/devtechedge/collabspace-express/releases/tag/v1.0.0
