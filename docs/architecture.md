# System Architecture

> Tài liệu này giúp AI tools và thành viên hiểu toàn bộ hệ thống trước khi sinh code.
> Đọc trước khi bắt đầu feature mới.

---

## Tổng quan

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React SPA)                     │
│  port 5173 (dev) / port 80 (prod via Nginx)                     │
│                                                                 │
│  ┌──────────┐   HTTP/REST   ┌──────────────────────────────┐   │
│  │ React UI │ ────────────► │  Express API  (port 5000)    │   │
│  │+ Zustand │               │  /api/v1/*                   │   │
│  │+ RQ      │ ◄──────────── │                              │   │
│  │          │               │  ┌──────────┐ ┌──────────┐  │   │
│  │          │  Socket.IO    │  │  Prisma  │ │  Redis   │  │   │
│  │          │ ◄────────────►│  │  ORM     │ │  Adapter │  │   │
│  └──────────┘               └──┴──────────┴─┴──────────┘──┘   │
│                                    │               │            │
│                          ┌─────────┘         ┌─────┘           │
│                   ┌──────▼──────┐     ┌──────▼──────┐          │
│                   │ PostgreSQL  │     │    Redis    │          │
│                   │  (port 5432)│     │  (port 6379)│          │
│                   └─────────────┘     └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Packages trong monorepo

### `packages/shared`

- **Vai trò:** Single source of truth cho TypeScript types
- **Import:** `import type { AuctionDto } from '@auction/shared'`
- **Khi thêm type mới:** Tạo/sửa file trong `src/types/`, export từ `src/index.ts`
- **KHÔNG** chứa: Business logic, utility functions, constants phụ thuộc runtime

### `backend`

- **Port:** 5000
- **Framework:** Express 4 + TypeScript 5
- **ORM:** Prisma 5 (PostgreSQL)
- **Realtime:** Socket.IO 4 với Redis adapter (pub/sub giữa nhiều instances)
- **Auth:** JWT (access token 15m + refresh token 7d)
- **Validation:** Zod schemas

### `frontend`

- **Port:** 5173 (dev) / 80 (prod)
- **Framework:** React 18 + Vite 5
- **State:** Zustand (client state) + React Query (server state)
- **Realtime:** Socket.IO client, kết nối tới backend
- **Styling:** Tailwind CSS 3
- **Forms:** React Hook Form + Zod resolver

---

## Database Schema

```
User
  id, email, passwordHash, username, role (USER|ADMIN), balance
  ↕ has many Auctions (as seller)
  ↕ has many Bids

Category
  id, name, slug
  ↕ has many Auctions

Auction
  id, title, description, startingPrice, currentPrice
  status: DRAFT | ACTIVE | ENDED | CANCELLED
  startTime, endTime
  sellerId → User
  categoryId → Category
  ↕ has many Bids
  ↕ has one winner (winnerId → User, nullable)

Bid
  id, amount, createdAt
  auctionId → Auction
  bidderId → User
```

**Indexes quan trọng:**

- `Auction.status + endTime` — dùng cho auction scheduler
- `Bid.auctionId` — dùng cho leaderboard query
- `Bid.bidderId + auctionId` — dùng cho "my bids" query

---

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Auth

| Method | Path             | Auth   | Mô tả                     |
| ------ | ---------------- | ------ | ------------------------- |
| POST   | `/auth/register` | Public | Đăng ký tài khoản         |
| POST   | `/auth/login`    | Public | Đăng nhập, trả JWT        |
| POST   | `/auth/refresh`  | Public | Refresh access token      |
| POST   | `/auth/logout`   | User   | Logout, xóa refresh token |

### Users

| Method | Path         | Auth   | Mô tả                  |
| ------ | ------------ | ------ | ---------------------- |
| GET    | `/users/me`  | User   | Profile của mình       |
| PATCH  | `/users/me`  | User   | Cập nhật profile       |
| GET    | `/users/:id` | Public | Xem profile người khác |

### Auctions

| Method | Path            | Auth         | Mô tả                         |
| ------ | --------------- | ------------ | ----------------------------- |
| GET    | `/auctions`     | Public       | Danh sách auction (paginated) |
| GET    | `/auctions/:id` | Public       | Chi tiết 1 auction + bids     |
| POST   | `/auctions`     | User         | Tạo auction mới               |
| PATCH  | `/auctions/:id` | Seller/Admin | Cập nhật auction              |
| DELETE | `/auctions/:id` | Seller/Admin | Xóa auction                   |

### Bids

| Method | Path                        | Auth   | Mô tả                   |
| ------ | --------------------------- | ------ | ----------------------- |
| POST   | `/auctions/:auctionId/bids` | User   | Đặt bid                 |
| GET    | `/auctions/:auctionId/bids` | Public | Lịch sử bid của auction |

---

## Socket.IO Events

### Client → Server (emit)

```typescript
socket.emit('auction:join', { auctionId: string });
socket.emit('auction:leave', { auctionId: string });
socket.emit('bid:place', { auctionId: string, amount: number });
```

### Server → Client (listen)

```typescript
socket.on('bid:new', (data: BidPlacedEvent) => {}); // new bid from anyone
socket.on('auction:ended', (data: AuctionEndedEvent) => {}); // auction expired
socket.on('user:outbid', (data: UserOutbidEvent) => {}); // you were outbid
socket.on('auction:updated', (data: Partial<AuctionDto>) => {});
```

**Rooms:** Mỗi auction có room riêng: `auction:${auctionId}`
**Auth:** Socket kết nối phải có JWT token trong `handshake.auth.token`

---

## Request/Response Flow

### REST API (ví dụ: đặt bid)

```
Browser
  → POST /api/v1/auctions/:id/bids  { amount }
  → authenticate middleware (verify JWT)
  → validateRequest(bidSchema) middleware (Zod)
  → bidController.create
    → bidService.create(userId, auctionId, amount)
      → prisma.$transaction(...)  ← atomic check + insert
      → io.to(auctionId).emit('bid:new', ...)  ← notify realtime
    → return bid
  → res.status(201).json({ success: true, data: bid })
```

### Socket.IO flow (subscribe realtime)

```
Browser
  → socket.connect() với JWT trong handshake.auth
  → socket.auth middleware xác thực token
  → socket.emit('auction:join', { auctionId })
  ← nhận tất cả events của room auction:${auctionId}
```

---

## Authentication Flow

```
Login → POST /auth/login
  ← { accessToken (15m), refreshToken (7d), user }
  → Frontend lưu accessToken trong memory (Zustand)
  → Frontend lưu refreshToken trong httpOnly cookie

Mỗi request → Authorization: Bearer <accessToken>

Token hết hạn → Axios interceptor tự gọi POST /auth/refresh
  → Backend verify refreshToken
  ← { accessToken mới }
  → Retry request gốc với token mới
```

---

## Auction Lifecycle

```
DRAFT → ACTIVE (khi startTime đến, scheduler tự chuyển)
ACTIVE → ENDED (khi endTime đến, scheduler tự chuyển)
ACTIVE → CANCELLED (seller/admin cancel thủ công)
```

**Scheduler:** `backend/src/services/auction-scheduler.service.ts`
Cron chạy mỗi 30 giây, tự động:

1. Tìm auction DRAFT có startTime ≤ now → chuyển ACTIVE
2. Tìm auction ACTIVE có endTime ≤ now → chuyển ENDED, set winner = highest bid

---

## Race Condition Prevention

Khi 2 user cùng bid 1 lúc:

```typescript
// ✅ Prisma transaction đảm bảo atomic
await prisma.$transaction(async (tx) => {
  // Lock row, đọc giá hiện tại
  const auction = await tx.auction.findUnique({ where: { id } });
  // Validate trong transaction — không bị race condition
  if (amount <= auction.currentPrice) throw new AppError('Bid too low', 400);
  // Update price + insert bid trong cùng transaction
  await tx.auction.update({ where: { id }, data: { currentPrice: amount } });
  return tx.bid.create({ data: { amount, auctionId: id, bidderId: userId } });
});
```

---

## Caching với Redis

```
REDIS_KEYS.AUCTION_PRICE(auctionId)   → giá hiện tại (TTL: 5 phút)
REDIS_KEYS.AUCTION_BID_COUNT(id)      → số lượng bid (TTL: 5 phút)
REDIS_KEYS.USER_SESSION(userId)        → session cache
```

Socket.IO Redis Adapter: đồng bộ events giữa các backend instances khi scale horizontal.

---

## Môi trường phát triển

```bash
# Start mọi thứ
npm run dev              # backend (5000) + frontend (5173) cùng lúc

# Chỉ backend
npm run dev:backend

# Chỉ frontend
npm run dev:frontend

# Xem DB qua UI
npm run prisma:studio    # mở http://localhost:5555

# Reset DB
npm run prisma:migrate   # apply migrations
npm run prisma:seed      # seed demo data
```

**Demo accounts sau khi seed:**

- Admin: `admin@auction.com` / `password123`
- Seller: `seller@auction.com` / `password123`
- Buyer: `buyer@auction.com` / `password123`
