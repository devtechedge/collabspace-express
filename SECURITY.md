# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| `1.0.x` (latest `main`) | ✅ Yes |
| Older branches | ❌ No |

---

## Current Security Posture (v1.0.0)

> This is a **portfolio / demonstration project**. The security posture described below is accurate as of v1.0.0. Production deployments should review and address all items in the Known Gaps section before exposing the service publicly.

### What is in place

| Area | Status | Notes |
|---|---|---|
| Input validation (REST) | ✅ Partial | Board name and ID validated on POST/PATCH endpoints |
| CORS | ✅ Configured | Restricted via `CORS_ORIGIN` env var (defaults to `*` for local dev) |
| SQL injection | ✅ Protected | All DB access via Prisma ORM parameterised queries |
| HTTPS | ✅ Frontend | Vercel enforces HTTPS on the client |
| Secrets in repo | ✅ Resolved | Hardcoded tokens removed; `.env` files gitignored |
| Dependency pinning | ⚠️ Partial | `package-lock.json` present; no automated Dependabot alerts configured yet |

### Known Gaps (v1.0.0)

| Area | Status | Notes |
|---|---|---|
| **Automated security tests** | ❌ None | No SAST, DAST, or `npm audit` CI gate in this release |
| **Unit / integration tests** | ❌ None | `Toolbar.test.tsx` is a stub; no server-side tests exist |
| **Authentication** | ❌ None | Identity is anonymous; no session management or auth tokens |
| **WebSocket payload validation** | ❌ None | Socket.io payloads are trusted client data; no schema validation |
| **Rate limiting** | ❌ None | No rate limiting on REST or WebSocket endpoints |
| **HTTPS on backend** | ⚠️ Depends on host | Backend is plain HTTP; TLS termination depends on the deployment platform |

All gaps are tracked and planned for resolution in **v1.1.0**. See [CHANGELOG.md](CHANGELOG.md) for the roadmap.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not open a public GitHub issue.**

Instead, report it privately:

1. Go to the [Security Advisories page](https://github.com/devtechedge/collabspace-express/security/advisories/new)
2. Click **"New draft security advisory"**
3. Describe the vulnerability, steps to reproduce, and potential impact

We will acknowledge your report within **48 hours** and aim to release a fix within **7 days** for critical issues.

Thank you for helping keep CollabSpace secure.
