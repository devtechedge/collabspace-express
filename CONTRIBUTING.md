# Contributing to CollabSpace

Thank you for your interest in contributing! This guide covers everything you need to get started.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Conventions](#commit-conventions)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to be respectful, inclusive, and constructive in all interactions.

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/collabspace-express.git
   cd collabspace-express
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up the database**:
   ```bash
   cd server && npx prisma migrate dev && npx prisma generate && cd ..
   ```
5. **Start the dev servers**:
   ```bash
   npm run dev
   ```

---

## Development Workflow

- **Frontend** runs at `http://localhost:5173` (Vite HMR)
- **Backend** runs at `http://localhost:5000` (tsx watch)
- Client code lives in `client/src/`
- Server code lives in `server/src/`

### Running tests

```bash
npm run test --workspace=client
```

### Type checking

```bash
cd client && npx tsc --noEmit
```

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | When to use |
|---|---|
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `refactor:` | Code change that neither fixes a bug nor adds a feature |
| `style:` | Formatting, missing semicolons, etc. (no logic change) |
| `docs:` | Documentation only |
| `test:` | Adding or updating tests |
| `chore:` | Build process or tooling changes |

Example: `feat: add sticky note tool with inline editing`

---

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Make sure `tsc --noEmit` passes with no errors
3. Keep PRs focused — one feature or fix per PR
4. Fill out the PR template completely
5. A maintainer will review and merge

---

## Reporting Issues

Please use GitHub Issues. Include:

- A clear title and description
- Steps to reproduce
- Expected vs actual behaviour
- Browser/OS if UI-related
- Screenshots or recordings if helpful
