# Contributing Guide

Welcome to the Auction Platform project! This guide covers everything you need to know before pushing your first commit.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Project Structure](#project-structure)
3. [Branch Naming](#branch-naming)
4. [Commit Messages](#commit-messages)
5. [Development Workflow](#development-workflow)
6. [Code Standards](#code-standards)
7. [Pull Request Process](#pull-request-process)
8. [Code Review Checklist](#code-review-checklist)
9. [Environment Variables](#environment-variables)

---

## Initial Setup

**Requirements:** Node.js 20+, Docker Desktop (running), Git

```bash
# 1. Clone the repo
git clone <repo-url>
cd auction

# 2. Run the automated setup (does everything for you)
node scripts/setup.mjs
```

The setup script will:

- Check Node 20+ and Docker
- Run `npm install` across all packages
- Copy `.env.example` → `.env` for root, backend, and frontend
- Start PostgreSQL and Redis via Docker
- Run Prisma migrations and seed demo data

After that, start developing:

```bash
npm run dev          # starts backend (port 5000) + frontend (port 5173) together
```

---

## Project Structure

```
auction/
├── packages/shared/     # Shared TypeScript types (imported by both sides)
├── backend/             # Express + Socket.IO + Prisma API server
│   ├── prisma/          # DB schema and seed
│   └── src/
│       ├── config/      # DB & Redis clients
│       ├── middlewares/
│       ├── modules/     # Feature modules (auth, users, auctions, bids)
│       ├── services/    # Background services (auction scheduler)
│       └── socket/      # Socket.IO server + handlers
└── frontend/            # React + Vite SPA
    └── src/
        ├── components/  # Reusable UI components
        ├── hooks/       # Custom React hooks
        ├── pages/       # Route-level page components
        ├── services/    # API + Socket service wrappers
        └── store/       # Zustand state stores
```

**Path aliases** (use these instead of relative hell):

- `@/*` → `src/*` (within backend or frontend)
- `@auction/shared` → `packages/shared/src`

---

## Branch Naming

```
<type>/<short-description>
```

| Type        | When to use                            |
| ----------- | -------------------------------------- |
| `feat/`     | New feature                            |
| `fix/`      | Bug fix                                |
| `refactor/` | Code refactoring (no behaviour change) |
| `docs/`     | Documentation only                     |
| `test/`     | Adding or fixing tests                 |
| `chore/`    | Build, tooling, CI changes             |

**Examples:**

```
feat/real-time-bid-notifications
fix/auction-end-race-condition
docs/update-api-endpoints
chore/upgrade-prisma-v6
```

- Branch off `develop`, never directly off `main`
- Keep branches focused — one feature/fix per branch
- Delete your branch after the PR is merged

---

## Commit Messages

This project enforces [Conventional Commits](https://www.conventionalcommits.org/).
The commit-msg hook will **reject** any commit that doesn't follow the format.

```
<type>(<optional scope>): <short description>

[optional body]
```

**Allowed types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `revert`, `build`, `ci`

**Examples:**

```
feat(bids): add WebSocket event for outbid notification
fix(auth): handle expired refresh token edge case
refactor(auction-service): extract price validation to helper
docs: add environment variable reference to CONTRIBUTING
chore: upgrade @typescript-eslint to v7
```

Rules:

- Header must be ≤ 100 characters
- Use imperative mood: "add" not "added", "fix" not "fixed"
- No period at the end of the header

---

## Development Workflow

```
main            ← production-ready only, protected
  └── develop   ← integration branch, all PRs target here
        └── feat/your-feature   ← your working branch
```

1. Pull the latest `develop`:
   ```bash
   git checkout develop && git pull
   ```
2. Create your feature branch:
   ```bash
   git checkout -b feat/your-feature
   ```
3. Make changes, commit often with meaningful messages
4. Push and open a PR against `develop`
5. Address review feedback, then request re-review
6. Team lead merges when approved

---

## Code Standards

### TypeScript

- No `any` — use proper types or `unknown`
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use `type` imports: `import type { Foo } from '...'`
- Add return types to all exported functions

### Backend

- Validate all request data with Zod schemas in `modules/<feature>/schema.ts`
- Use `async/await` — no floating promises (ESLint will catch them)
- Handle errors by throwing `AppError` — do not `res.status(...)` directly in controllers
- Use transactions (`prisma.$transaction`) when multiple DB writes must be atomic

### Frontend

- One component per file, filename = component name
- Hooks start with `use`, return typed objects not arrays (for >1 value)
- Do not call API services directly from components — use hooks or React Query
- UI state in component, server/shared state in Zustand store or React Query

### General

- ESLint + Prettier run automatically on save (VSCode) and on commit (Husky)
- `npm run lint` and `npm run type-check` must both pass before pushing
- Max line length: 100 characters (ruler visible in VSCode)

---

## Pull Request Process

1. **Title** follows the same Conventional Commits format as commit messages
2. **Description** should include:
   - What was changed and why
   - Steps to test (if UI change, include screenshots)
   - Any breaking changes or migration steps
3. **Self-review** your diff before requesting reviewers — remove debug logs, TODOs, commented-out code
4. **CI must pass** — the GitHub Actions checks run lint + type-check automatically
5. Assign at least **1 reviewer** (team lead reviews all PRs targeting `main`)
6. **Do not merge your own PR** unless it's a trivial hotfix approved by the team lead

---

## Code Review Checklist

### Reviewer

- [ ] Logic is correct and handles edge cases
- [ ] No security issues (no unvalidated input reaching DB or shell, no secrets in code)
- [ ] No N+1 queries (check Prisma calls in loops)
- [ ] Error handling is appropriate
- [ ] TypeScript types are accurate (no sneaky `as any`)
- [ ] New env variables are documented in `.env.example`

### Author (before requesting review)

- [ ] `npm run lint` passes with 0 warnings
- [ ] `npm run type-check` passes
- [ ] Tested manually — happy path + at least one edge case
- [ ] No unrelated changes mixed into this PR
- [ ] PR description is filled out

---

## Environment Variables

Never commit `.env` files. Add new variables to `.env.example` with a placeholder value and a comment.

**Backend** (`backend/.env`):

| Variable                 | Description                                |
| ------------------------ | ------------------------------------------ |
| `DATABASE_URL`           | PostgreSQL connection string               |
| `REDIS_URL`              | Redis connection string                    |
| `JWT_SECRET`             | Access token signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET`     | Refresh token signing secret               |
| `JWT_EXPIRES_IN`         | Access token TTL (e.g. `15m`)              |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL (e.g. `7d`)              |
| `PORT`                   | HTTP server port (default `5000`)          |
| `NODE_ENV`               | `development` \| `production` \| `test`    |
| `CORS_ORIGIN`            | Allowed origin for CORS (frontend URL)     |

**Frontend** (`frontend/.env`):

| Variable          | Description               |
| ----------------- | ------------------------- |
| `VITE_API_URL`    | Backend REST API base URL |
| `VITE_SOCKET_URL` | Backend Socket.IO URL     |

---

## Getting Help

- Check the [README](./README.md) for architecture overview and API docs
- Ask in the team group chat before going down a rabbit hole
- If you're stuck for >30 minutes, ask — don't push broken code just to hit a deadline
