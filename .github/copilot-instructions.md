# GitHub Copilot Instructions — Auction Platform

These instructions apply to all AI-assisted code generation in this repository.
Follow them strictly to produce code that is consistent, secure, and mergeable.

---

## Project Overview

Real-time auction platform — monorepo with three packages:

- `packages/shared` — TypeScript types shared between backend and frontend
- `backend` — Express + Prisma + Socket.IO REST API (port 5000)
- `frontend` — React + Vite SPA (port 5173)

Database: PostgreSQL (via Prisma ORM) + Redis (caching + Socket.IO adapter).

---

## Absolute Rules (never break these)

### 1. No `any` types

```typescript
// ❌ NEVER
const data: any = response.data;
function process(input: any) {}

// ✅ ALWAYS use proper types or generics
const data: AuctionDto = response.data;
function process<T extends Record<string, unknown>>(input: T) {}
```

### 2. No `@ts-ignore` or `@ts-nocheck`

```typescript
// ❌ These are banned by ESLint
// @ts-ignore
// @ts-nocheck

// ✅ Use typed assertions with description
// @ts-expect-error: Prisma types don't expose this internal field yet
```

### 3. No raw SQL — use Prisma typed queries

```typescript
// ❌ SQL injection risk — ESLint will block this
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE id = ${id}`);

// ✅ Tagged template literal (safe, parameterized)
await prisma.$queryRaw`SELECT * FROM users WHERE id = ${id}`;

// ✅ Even better — use Prisma model methods
await prisma.user.findUnique({ where: { id } });
```

### 4. Always validate request input with Zod

```typescript
// ❌ Never trust req.body directly
const { amount } = req.body;

// ✅ Always validate through the Zod schema middleware
// The route already calls validateRequest(bidSchema) — schema is in *.schema.ts
```

### 5. Always check authentication before accessing protected data

```typescript
// ❌ Missing auth guard
router.get('/auctions/:id/admin', auctionController.adminDetail);

// ✅ Use the auth middleware
router.get('/auctions/:id/admin', authenticate, authorize('ADMIN'), auctionController.adminDetail);
```

### 6. Never use `import axios from 'axios'` in frontend components

```typescript
// ❌ Bypasses the shared API client (auth headers, interceptors, base URL)
import axios from 'axios';
const res = await axios.get('/auctions');

// ✅ Always use the shared service
import { auctionService } from '@/services/auction.service';
const auctions = await auctionService.getList();
```

---

## Project Structure Rules

### Where to put new files

| What                                                         | Where                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------- |
| Shared TypeScript interface/type                             | `packages/shared/src/types/*.types.ts` + export from `index.ts`   |
| Backend feature (controller + routes + Zod schema + service) | `backend/src/modules/<feature>/`                                  |
| Background job / cron                                        | `backend/src/services/<name>.service.ts`                          |
| Socket.IO event handler                                      | `backend/src/socket/handlers/<feature>.handler.ts`                |
| React page component                                         | `frontend/src/pages/<feature>/`                                   |
| Reusable UI component                                        | `frontend/src/components/<category>/`                             |
| API call logic                                               | `frontend/src/services/<feature>.service.ts`                      |
| React state (server-cached)                                  | React Query in a custom hook `frontend/src/hooks/use<Feature>.ts` |
| React state (client UI)                                      | Zustand store `frontend/src/store/<name>.store.ts`                |

### Naming conventions

```
Files:         kebab-case.ts          → auction.service.ts
React components: PascalCase.tsx      → AuctionCard.tsx
Hooks:         camelCase with use*    → useAuctionSocket.ts
Types/Interfaces: PascalCase          → AuctionDto, BidPayload
Constants:     SCREAMING_SNAKE_CASE   → MAX_BID_AMOUNT
Zod schemas:   camelCase + Schema     → createBidSchema
```

### Path aliases — always use these, never relative `../../`

```typescript
import { AuctionStatus } from '@auction/shared'; // shared types
import { prisma } from '@/config/database'; // backend internal
import { api } from '@/services/api.service'; // frontend internal
```

---

## Backend Patterns

### Module structure (every feature follows this)

```
backend/src/modules/<feature>/
  <feature>.routes.ts      ← Express router, only routing + middleware
  <feature>.controller.ts  ← Thin: parse req → call service → send res
  <feature>.service.ts     ← Business logic, DB queries
  <feature>.schema.ts      ← Zod validation schemas
```

### Controller pattern

```typescript
// ✅ Controllers are thin — no business logic
export const createBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await bidService.create(req.user!.id, req.params.auctionId, req.body);
    res.status(201).json({ success: true, data: bid });
  } catch (error) {
    next(error); // always delegate to error middleware
  }
};
```

### Service pattern — use transactions for multi-step writes

```typescript
// ✅ Atomic bid placement (prevents race conditions)
const result = await prisma.$transaction(async (tx) => {
  const auction = await tx.auction.findUnique({ where: { id: auctionId } });
  // ... validation ...
  return tx.bid.create({ data: { ... } });
});
```

### Error handling — throw AppError, never res.status() in services

```typescript
// ❌ Wrong
if (!auction) res.status(404).json({ error: 'Not found' });

// ✅ Correct — AppError is caught by the global error middleware
if (!auction) throw new AppError('Auction not found', 404);
```

---

## Frontend Patterns

### Component pattern

```typescript
// ✅ Typed props, no inline API calls
interface AuctionCardProps {
  auction: AuctionSummary;
  onBid?: (id: string) => void;
}

export function AuctionCard({ auction, onBid }: AuctionCardProps) {
  // UI only — data fetched by parent via React Query hook
}
```

### Data fetching — always React Query + service layer

```typescript
// ✅ Correct pattern
export function useAuctions() {
  return useQuery({
    queryKey: ['auctions'],
    queryFn: () => auctionService.getList(),
  });
}

// ❌ Never fetch in useEffect directly
useEffect(() => {
  fetch('/api/auctions').then(...);  // bypasses loading/error states, auth headers
}, []);
```

### Form validation — React Hook Form + Zod schema

```typescript
// ✅ Always use the shared Zod schema for form validation
const form = useForm<BidFormData>({
  resolver: zodResolver(bidFormSchema),
});
```

---

## Security Checklist (AI must check before generating backend routes)

- [ ] Is the route behind `authenticate` middleware?
- [ ] Does the controller check `req.user.id` ownership before modifying records?
- [ ] Is input validated with Zod before touching the database?
- [ ] Are all Prisma calls using model methods (not `$queryRawUnsafe`)?
- [ ] Does the response omit sensitive fields (passwords, tokens)?
- [ ] Are file uploads (if any) validated for type and size?

---

## What AI should NOT generate

- New npm dependencies without discussing with the team (comment the need first)
- New database tables/columns — modify `prisma/schema.prisma` only after team discussion
- Global state outside the existing Zustand stores
- New API base URLs or socket connections — use the existing service singletons
- `.env` files with real secrets
- `console.log` in production paths — use the logger or remove before committing
- Commented-out code blocks — delete dead code, use git history to recover
