# Security Assessment — CollabSpace Express

**Date:** 2026-08-21  
**Scope:** Auth, XSS, injection, CORS, Socket.io, secrets, persistence  
**Context:** Public deploy is the **Vite client on Vercel**. Express + Socket.io + Prisma/SQLite is the **local production path**, not exposed on the live alias.

---

## Executive summary

| Area | Risk | Notes |
|------|------|--------|
| Authentication | **N/A (by design)** | Anonymous display name in `localStorage`. No login, no JWT, no NextAuth. |
| Authorization | **High if the engine is public** | Any Socket.io client that knows a board UUID can draw, delete, or clear it. |
| XSS | **Low** | No `dangerouslySetInnerHTML`. React text escaping for names and board titles. |
| Injection (SQL) | **Low locally** | Prisma parameterized queries. REST/socket payloads are allow-listed. |
| CORS | **Medium (local engine)** | `CORS_ORIGIN` env, default `*` for local DX — unsafe for a public bind. |
| Secrets in repo | **Low** | `.env` gitignored; `.env.example` has no credentials. Session PowerShell junk removed. |
| Rate limiting | **None** | Accepted residual risk for the portfolio demo. |
| Payments | **N/A** | No payments, no PII store. |

**Overall (public Vercel demo):** Low residual risk — static client, no backend secrets, no auth boundary to break. Offline boards stay in `localStorage`.

**Overall (if Express is bound to the internet):** High — unauthenticated Socket.io mutations on any room id.

---

## 1. Authentication & session

**Findings**
- Identity is `collabspace_username` in `localStorage`.
- Room membership is “know the UUID”.
- There is no NextAuth, JWT, or signed cookie.

**Verdict:** Do not claim authenticated collaboration. Do not claim JWT.

---

## 2. Authorization / rooms

**Findings**
- `GET/POST/PATCH/DELETE /api/boards` are unauthenticated.
- Socket events (`draw-element`, `delete-element`, `clear-board`) mutate the room for anyone who joined.

**Accepted for local/portfolio use.** Not accepted for a public multi-tenant whiteboard.

---

## 3. XSS

- Code search found **no** `dangerouslySetInnerHTML`.
- User names, board names, and sticky-note text render as React text or canvas fillText.
- Image elements accept a data URL chosen by the same browser; they are not fetched server-side.

---

## 4. Injection & payload guards

Hardening in this pass (`server/src/validation.ts`, mirrored in `client/src/lib/validation.ts`):

- Board names 1–80 characters.
- Board ids `[a-zA-Z0-9_-]{8,80}`.
- Element types allow-listed (`pencil`, `line`, `rectangle`, `circle`, `text`, `highlighter`, `image`, `sticky-note`).
- Stroke width clamped 1–40; stroke style allow-listed.
- Points JSON capped; text capped.
- Unknown socket payloads are dropped, not persisted.

SQL stays on the Prisma client. Do not interpolate user input into raw SQL if the provider is swapped to Postgres.

---

## 5. CORS & network exposure

- `CORS_ORIGIN` (default `*`) feeds both Express `cors` and Socket.io.
- Operational rule: **never bind port 5000 to the internet** without auth and a locked origin.

---

## 6. Secrets & config

- `.gitignore` excludes `.env`, `*.db`, Playwright reports, coverage.
- `.env.example` documents `PORT`, `CORS_ORIGIN`, `VITE_API_URL` — no live secrets.
- Root PowerShell PAT/OAuth helpers were deleted; they read `GITHUB_PERSONAL_ACCESS_TOKEN` from the environment and never committed a token.

---

## 7. HTTP / Socket surface

| Path / event | Auth | Notes |
|--------------|------|--------|
| `GET /` | None | Health |
| `GET/POST /api/boards` | None | List / create |
| `GET/PATCH/DELETE /api/boards/:id` | None | Id format checked |
| `join-room` | None | Loads Prisma history |
| `draw-element` | None | Allow-listed upsert |
| `clear-board` / `delete-element` | None | Room-scoped |

Hello-world placeholder APIs: none.

---

## 8. Residual risk & acceptance

**Accepted for portfolio demo**
- No user login on Vercel or locally.
- `CORS_ORIGIN=*` for local DX.
- No rate limit.
- Image blobs are not stored in SQLite (`src` stays client-side).

**Not accepted if this is a public realtime service**
- Open Socket.io mutations.
- Unauthenticated REST deletes.
- `CORS_ORIGIN=*` on a public host.

---

## 9. How to re-test

```bash
npm install
npx prisma generate --schema=server/prisma/schema.prisma
npm test
npm run typecheck
npx playwright install chromium
npm run test:e2e
npm audit --omit=dev
```
