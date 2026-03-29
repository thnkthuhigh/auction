# 🏷️ RealTime Auction System

> Bài tập chuyên ngành – Nhóm 5 thành viên – Năm 4

---

## 📋 Mô tả dự án

Hệ thống đấu giá trực tuyến **thời gian thực** cho phép người dùng tạo phiên đấu giá, đặt giá và nhận thông báo kết quả ngay lập tức thông qua WebSocket (Socket.IO).

---

## 👥 Phân công nhóm

| Thành viên                 | Vai trò            | Module phụ trách                                                 |
| -------------------------- | ------------------ | ---------------------------------------------------------------- |
| **[Tên TL] – Trưởng nhóm** | Tech Lead / DevOps | Project setup, Docker, CI/CD, Prisma schema, Code review, Deploy |
| **[Tên TV2]**              | Backend Dev 1      | Authentication, User management, JWT, Middleware                 |
| **[Tên TV3]**              | Backend Dev 2      | Auction CRUD, Bidding Engine, Socket.IO, Redis, Background jobs  |
| **[Tên TV4]**              | Frontend Dev 1     | Auth pages, Dashboard, Layout, UI components, Navigation         |
| **[Tên TV5]**              | Frontend Dev 2     | Auction room, Real-time bidding UI, Notifications, Bid history   |

---

## 🛠️ Tech Stack

### Frontend

| Công nghệ        | Phiên bản | Mục đích         |
| ---------------- | --------- | ---------------- |
| React            | 18.x      | UI Framework     |
| TypeScript       | 5.x       | Type safety      |
| Vite             | 5.x       | Build tool       |
| Zustand          | 4.x       | State management |
| React Router     | 6.x       | Client routing   |
| Socket.IO Client | 4.x       | Real-time        |
| Axios            | 1.x       | HTTP client      |
| TailwindCSS      | 3.x       | Styling          |
| shadcn/ui        | latest    | UI Components    |
| React Query      | 5.x       | Server state     |
| React Hook Form  | 7.x       | Form handling    |
| Zod              | 3.x       | Validation       |

### Backend

| Công nghệ       | Phiên bản | Mục đích                    |
| --------------- | --------- | --------------------------- |
| Node.js         | 20.x LTS  | Runtime                     |
| Express         | 4.x       | Web framework               |
| TypeScript      | 5.x       | Type safety                 |
| Socket.IO       | 4.x       | Real-time WebSocket         |
| Prisma          | 5.x       | ORM                         |
| JWT             | -         | Authentication              |
| bcrypt          | -         | Password hashing            |
| Redis (ioredis) | 5.x       | Caching + Socket.IO adapter |
| Zod             | 3.x       | Validation                  |
| node-cron       | -         | Auction scheduler           |

### Database & Infrastructure

| Công nghệ                   | Mục đích                                |
| --------------------------- | --------------------------------------- |
| **PostgreSQL 16**           | Database chính (users, auctions, bids)  |
| **Redis 7**                 | Cache, Socket.IO scaling, session store |
| **Docker + Docker Compose** | Containerization                        |

### DevOps / Tools

- **Git + GitHub** – Version control, mỗi thành viên làm trên nhánh riêng
- **GitHub Actions** – CI/CD pipeline
- **ESLint + Prettier** – Code quality
- **Husky + lint-staged** – Pre-commit hooks
- **Postman Collection** – API documentation

---

## 🗄️ Lý do chọn Database

### PostgreSQL (Primary DB)

- ✅ Hỗ trợ transactions ACID – quan trọng với đấu giá (tránh race condition)
- ✅ Quan hệ dữ liệu rõ ràng (User → Auction → Bids)
- ✅ Prisma ORM hỗ trợ tốt
- ✅ Mạnh với query phức tạp (lọc đấu giá, lịch sử, thống kê)

### Redis (Real-time layer)

- ✅ Socket.IO adapter – scale nhiều server
- ✅ Cache giá thầu hiện tại (tốc độ cực nhanh)
- ✅ Pub/Sub cho các sự kiện đấu giá
- ✅ TTL-based auction state (tự hết hạn)
- ✅ Rate limiting cho API

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                       │
│              React + TypeScript + Socket.IO              │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────────┐
│                  NODE.JS BACKEND                         │
│         Express REST API + Socket.IO Server              │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │   Auth API  │  │  Auction API │  │  Socket Events│  │
│  │  /api/auth  │  │  /api/auction│  │  bid:place    │  │
│  └─────────────┘  └──────────────┘  │  auction:join │  │
│                                      │  bid:new      │  │
│                                      └───────────────┘  │
└─────────┬────────────────────┬────────────────────────--┘
          │                    │
┌─────────▼──────┐   ┌─────────▼──────┐
│  PostgreSQL    │   │    Redis        │
│                │   │                 │
│  - users       │   │  - active bids  │
│  - auctions    │   │  - socket rooms │
│  - bids        │   │  - sessions     │
│  - categories  │   │  - rate limits  │
└────────────────┘   └─────────────────┘
```

---

## 📁 Cấu trúc thư mục

```
auction/
├── 📄 README.md
├── 📄 docker-compose.yml
├── 📄 docker-compose.prod.yml
├── 📄 .env.example
├── 📄 .gitignore
├── 📄 package.json                 # Root workspace (npm workspaces)
│
├── 📦 packages/
│   └── shared/                     # Shared TypeScript types
│       ├── package.json
│       └── src/
│           ├── types/
│           │   ├── auction.types.ts
│           │   ├── user.types.ts
│           │   ├── bid.types.ts
│           │   └── socket.types.ts
│           └── index.ts
│
├── 🖥️ backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma           # Database schema
│   │   └── seed.ts                 # Seed data
│   └── src/
│       ├── index.ts                # Entry point
│       ├── app.ts                  # Express app setup
│       ├── config/
│       │   ├── database.ts         # Prisma client
│       │   ├── redis.ts            # Redis client
│       │   └── env.ts              # Environment config
│       ├── middlewares/
│       │   ├── auth.middleware.ts  # JWT verification
│       │   ├── error.middleware.ts # Error handler
│       │   ├── validate.middleware.ts
│       │   └── rateLimit.middleware.ts
│       ├── modules/
│       │   ├── auth/
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── auth.routes.ts
│       │   │   └── auth.schema.ts  # Zod validation
│       │   ├── users/
│       │   │   ├── user.controller.ts
│       │   │   ├── user.service.ts
│       │   │   └── user.routes.ts
│       │   ├── auctions/
│       │   │   ├── auction.controller.ts
│       │   │   ├── auction.service.ts
│       │   │   ├── auction.routes.ts
│       │   │   └── auction.schema.ts
│       │   └── bids/
│       │       ├── bid.controller.ts
│       │       ├── bid.service.ts
│       │       └── bid.routes.ts
│       ├── socket/
│       │   ├── socket.server.ts    # Socket.IO setup
│       │   ├── socket.auth.ts      # Socket authentication
│       │   └── handlers/
│       │       ├── auction.handler.ts
│       │       └── bid.handler.ts
│       ├── services/
│       │   ├── auction-scheduler.service.ts  # Cron jobs
│       │   └── notification.service.ts
│       └── utils/
│           ├── jwt.utils.ts
│           ├── password.utils.ts
│           └── response.utils.ts
│
└── 🌐 frontend/
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── env.d.ts
        ├── components/
        │   ├── ui/                 # shadcn components
        │   ├── layout/
        │   │   ├── Navbar.tsx
        │   │   ├── Sidebar.tsx
        │   │   └── Footer.tsx
        │   ├── auction/
        │   │   ├── AuctionCard.tsx
        │   │   ├── AuctionTimer.tsx
        │   │   ├── BidForm.tsx
        │   │   ├── BidHistory.tsx
        │   │   └── AuctionStatus.tsx
        │   └── common/
        │       ├── ProtectedRoute.tsx
        │       ├── LoadingSpinner.tsx
        │       └── ErrorBoundary.tsx
        ├── pages/
        │   ├── auth/
        │   │   ├── LoginPage.tsx
        │   │   └── RegisterPage.tsx
        │   ├── HomePage.tsx
        │   ├── DashboardPage.tsx
        │   ├── auction/
        │   │   ├── AuctionListPage.tsx
        │   │   ├── AuctionDetailPage.tsx
        │   │   └── CreateAuctionPage.tsx
        │   └── profile/
        │       └── ProfilePage.tsx
        ├── hooks/
        │   ├── useSocket.ts        # Socket.IO hook
        │   ├── useAuction.ts
        │   ├── useAuth.ts
        │   └── useCountdown.ts
        ├── services/
        │   ├── api.service.ts      # Axios instance
        │   ├── auth.service.ts
        │   ├── auction.service.ts
        │   └── socket.service.ts   # Socket.IO client
        ├── store/
        │   ├── auth.store.ts       # Zustand auth store
        │   ├── auction.store.ts    # Zustand auction store
        │   └── socket.store.ts
        └── types/
            └── index.ts
```

---

## 🔌 API Endpoints

### Auth API (`/api/auth`)

| Method | Endpoint             | Mô tả             | Thành viên |
| ------ | -------------------- | ----------------- | ---------- |
| POST   | `/api/auth/register` | Đăng ký tài khoản | TV2        |
| POST   | `/api/auth/login`    | Đăng nhập         | TV2        |
| POST   | `/api/auth/logout`   | Đăng xuất         | TV2        |
| POST   | `/api/auth/refresh`  | Refresh token     | TV2        |

### Users API (`/api/users`)

| Method | Endpoint                 | Mô tả              | Thành viên |
| ------ | ------------------------ | ------------------ | ---------- |
| GET    | `/api/users/me`          | Thông tin bản thân | TV2        |
| PUT    | `/api/users/me`          | Cập nhật profile   | TV2        |
| GET    | `/api/users/:id`         | Xem profile user   | TV2        |
| GET    | `/api/users/me/bids`     | Lịch sử đặt giá    | TV2        |
| GET    | `/api/users/me/auctions` | Đấu giá của tôi    | TV2        |

### Auctions API (`/api/auctions`)

| Method | Endpoint                  | Mô tả             | Thành viên |
| ------ | ------------------------- | ----------------- | ---------- |
| GET    | `/api/auctions`           | Danh sách đấu giá | TV3        |
| GET    | `/api/auctions/:id`       | Chi tiết đấu giá  | TV3        |
| POST   | `/api/auctions`           | Tạo đấu giá mới   | TV3        |
| PUT    | `/api/auctions/:id`       | Cập nhật đấu giá  | TV3        |
| DELETE | `/api/auctions/:id`       | Xoá đấu giá       | TV3        |
| POST   | `/api/auctions/:id/start` | Bắt đầu đấu giá   | TV3        |
| POST   | `/api/auctions/:id/end`   | Kết thúc đấu giá  | TV3        |

### Bids API (`/api/bids`)

| Method | Endpoint                | Mô tả            | Thành viên |
| ------ | ----------------------- | ---------------- | ---------- |
| POST   | `/api/bids`             | Đặt giá          | TV3        |
| GET    | `/api/bids/auction/:id` | Lịch sử giá thầu | TV3        |

---

## ⚡ Socket.IO Events

### Client → Server (emit)

| Event           | Payload                 | Mô tả             |
| --------------- | ----------------------- | ----------------- |
| `auction:join`  | `{ auctionId }`         | Vào phòng đấu giá |
| `auction:leave` | `{ auctionId }`         | Rời phòng đấu giá |
| `bid:place`     | `{ auctionId, amount }` | Đặt giá thầu      |

### Server → Client (on)

| Event             | Payload                             | Mô tả                  |
| ----------------- | ----------------------------------- | ---------------------- |
| `bid:new`         | `{ bid, currentPrice }`             | Có giá mới             |
| `auction:started` | `{ auctionId, endsAt }`             | Đấu giá bắt đầu        |
| `auction:ended`   | `{ auctionId, winner, finalPrice }` | Đấu giá kết thúc       |
| `auction:updated` | `{ auction }`                       | Cập nhật trạng thái    |
| `user:outbid`     | `{ auctionId, newPrice }`           | Bị người khác vượt giá |
| `error`           | `{ message }`                       | Lỗi                    |

---

## 🗃️ Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  username  String   @unique
  password  String
  avatar    String?
  balance   Decimal  @default(0)
  role      Role     @default(USER)
  createdAt DateTime @default(now())
  auctions  Auction[]
  bids      Bid[]
}

model Auction {
  id           String        @id @default(uuid())
  title        String
  description  String
  imageUrl     String?
  startPrice   Decimal
  currentPrice Decimal
  minBidStep   Decimal       @default(1000)
  status       AuctionStatus @default(PENDING)
  startTime    DateTime
  endTime      DateTime
  createdAt    DateTime      @default(now())
  seller       User          @relation(fields: [sellerId], references: [id])
  sellerId     String
  bids         Bid[]
  winner       User?         @relation("AuctionWinner", fields: [winnerId], references: [id])
  winnerId     String?
  category     Category      @relation(fields: [categoryId], references: [id])
  categoryId   String
}

model Bid {
  id        String   @id @default(uuid())
  amount    Decimal
  createdAt DateTime @default(now())
  bidder    User     @relation(fields: [bidderId], references: [id])
  bidderId  String
  auction   Auction  @relation(fields: [auctionId], references: [id])
  auctionId String
}

model Category {
  id       String    @id @default(uuid())
  name     String    @unique
  slug     String    @unique
  auctions Auction[]
}

enum AuctionStatus {
  PENDING    // Chưa bắt đầu
  ACTIVE     // Đang diễn ra
  ENDED      // Đã kết thúc
  CANCELLED  // Đã huỷ
}

enum Role {
  USER
  ADMIN
}
```

---

## 🌿 Git Workflow

```
main (protected)
├── develop (integration branch)
│   ├── feature/auth-backend        → TV2
│   ├── feature/user-backend        → TV2
│   ├── feature/auction-backend     → TV3
│   ├── feature/socket-backend      → TV3
│   ├── feature/auth-frontend       → TV4
│   ├── feature/dashboard-frontend  → TV4
│   ├── feature/auction-list-fe     → TV5
│   └── feature/auction-room-fe     → TV5
```

### Quy trình Jira + Release (AS)

1. Luôn làm việc trên nhánh feature/hotfix tách từ `develop`, không push trực tiếp vào `main`.
2. Mỗi commit/PR gắn đúng mã issue Jira hiện có (AS-xxx) để auto-link với board.
3. Merge vào `develop` trước để QA nội bộ (Mẫn test), chỉ promote lên `main` khi đã đạt tiêu chí release.
4. Deploy production chỉ thực hiện sau khi benchmark realtime và smoke test nghiệp vụ đều đạt.

### Quy tắc commit (Conventional Commits)

```
feat: thêm tính năng mới
fix: sửa lỗi
docs: cập nhật tài liệu
style: format code (không đổi logic)
refactor: tái cấu trúc code
test: thêm tests
chore: cập nhật deps, config
```

**Ví dụ:**

```
feat(auth): add JWT refresh token
fix(auction): fix race condition on bid placement
feat(socket): add real-time bid notification
```

---

## 🚀 Kế hoạch phát triển

### Sprint 1 – Setup & Foundation (Tuần 1)

| Task                                 | Thành viên | Branch                |
| ------------------------------------ | ---------- | --------------------- |
| Project setup, Docker, Prisma schema | TL         | `setup/project-init`  |
| Backend boilerplate (Express + TS)   | TV2, TV3   | `setup/backend-init`  |
| Frontend boilerplate (React + Vite)  | TV4, TV5   | `setup/frontend-init` |
| Database design & migrations         | TL         | `setup/database`      |

### Sprint 2 – Core Backend (Tuần 2)

| Task                            | Thành viên | Branch                    |
| ------------------------------- | ---------- | ------------------------- |
| Auth API (register, login, JWT) | TV2        | `feature/auth-backend`    |
| User API (profile, history)     | TV2        | `feature/user-backend`    |
| Auction CRUD API                | TV3        | `feature/auction-backend` |
| Redis setup + Socket.IO server  | TV3        | `feature/socket-backend`  |

### Sprint 3 – Core Frontend (Tuần 3)

| Task                              | Thành viên | Branch                       |
| --------------------------------- | ---------- | ---------------------------- |
| Login / Register UI               | TV4        | `feature/auth-frontend`      |
| Dashboard + Layout                | TV4        | `feature/dashboard-frontend` |
| Auction list + Create form        | TV5        | `feature/auction-list-fe`    |
| Socket integration + Bidding room | TV5        | `feature/auction-room-fe`    |

### Sprint 4 – Integration & Polish (Tuần 4)

| Task                             | Thành viên | Branch                      |
| -------------------------------- | ---------- | --------------------------- |
| E2E testing + Bug fixes          | Full team  | -                           |
| Auction scheduler (auto-end)     | TV3        | `feature/auction-scheduler` |
| Notifications UI                 | TV5        | `feature/notifications-fe`  |
| Admin dashboard                  | TV4        | `feature/admin-fe`          |
| Deploy (Render/Railway + Vercel) | TL         | `chore/deployment`          |

---

## ⚙️ Cài đặt & Chạy dự án

### Yêu cầu

- Node.js >= 20.x
- Docker & Docker Compose
- npm >= 10.x

### 1. Clone & Install

```bash
git clone <repo-url>
cd auction
npm install      # Cài tất cả workspace packages
```

### 2. Cau hinh Environment

Quan trong: 3 lenh tao file `.env` ben duoi deu chay tai thu muc goc du an `auction` (noi co file `package.json` root).

#### Windows PowerShell

```powershell
# Neu vua clone xong
git clone <repo-url>
cd auction

# Neu dang o sai thu muc thi chay:
# cd D:\CODE\auction

Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

#### macOS/Linux (bash/zsh)

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Khởi động Database

```bash
docker-compose up -d postgres redis
```

### 4. Chay migrations va seed

Chay tai root `auction` (khong can `cd backend`):

```bash
npm run prisma:migrate
npm run prisma:seed
```

### 5. Chạy Development

```bash
# Tại root (chạy cả frontend + backend)
npm run dev

# Hoặc chạy riêng lẻ
npm run dev:backend
npm run dev:frontend
```

### 6. Mở browser

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Prisma Studio: http://localhost:5555

---

## 📌 Ghi chú cho nhóm

1. **Không commit trực tiếp vào `main` hoặc `develop`**
2. **Mỗi feature phải tạo Pull Request và được ít nhất 1 người review**
3. **Commit thường xuyên** – tối thiểu 1 commit/ngày khi đang làm task
4. **Types chia sẻ** – đặt trong `packages/shared/src/types/`
5. **Gặp khó khăn** – tạo GitHub Issue và tag trưởng nhóm
6. **API thay đổi** – cập nhật Postman Collection và báo team

---

## ✅ Điều kiện trước khi deploy production

1. `npm run lint`, `npm run type-check`, `npm run build` đều pass.
2. Benchmark production-like không drop event và đạt:
   - `join_cold_500 < 1000ms` (từ lúc connect xong đến snapshot đầu tiên)
   - `join_warm_500 < 150ms`
   - `fanout_500 < 150ms` local (`< 100ms` ở staging/prod)
3. Smoke test nghiệp vụ pass:
   - Seller gửi duyệt → Admin duyệt → tạo phiên → Buyer vào phòng → đặt giá realtime → chốt phiên.
4. Jira issue liên quan đã gắn commit/PR và chuyển đúng trạng thái theo flow team.

Checklist triển khai chi tiết Render + Vercel: [docs/deploy-render-vercel.md](docs/deploy-render-vercel.md)

---

## 📊 Báo Cáo Hiệu Năng Realtime (Dùng Để Trình Bày Với Giảng Viên)

Mẫu báo cáo 1 trang có thể điền nhanh: [docs/bao-cao-hieu-nang-realtime.md](docs/bao-cao-hieu-nang-realtime.md)

### Mình đã tối ưu gì và vì sao

1. **Socket.IO ưu tiên `websocket` thay vì fallback `polling`**
   - **Dùng gì:** `SOCKET_TRANSPORTS=websocket` ở backend và `VITE_SOCKET_TRANSPORTS=websocket` ở frontend.
   - **Vì sao:** giảm overhead handshake/polling, giữ độ trễ realtime ổn định hơn khi nhiều người cùng tham gia.

2. **Backend chạy đa tiến trình (cluster)**
   - **Dùng gì:** `CLUSTER_WORKERS` trong `backend/src/index.ts`.
   - **Vì sao:** tận dụng nhiều lõi CPU để xử lý nhiều kết nối đồng thời thay vì dồn vào 1 process.

3. **Chỉ cho 1 worker chạy scheduler**
   - **Dùng gì:** `SCHEDULER_ENABLED` được gán theo worker slot.
   - **Vì sao:** tránh nhiều worker cùng tick cron làm trùng xử lý start/end phiên.

4. **Cache snapshot realtime bằng Redis + memory cache ngắn hạn**
   - **Dùng gì:** `auctionCurrentPrice`, `auctionBidCount`, `auctionRecentBids` + in-memory snapshot TTL trong `bid.service.ts`.
   - **Vì sao:** giảm query DB lặp khi nhiều client `auction:join` cùng lúc.

5. **Debounce broadcast số người xem**
   - **Dùng gì:** `VIEWER_BROADCAST_DEBOUNCE_MS` trong `auction.handler.ts`.
   - **Vì sao:** tránh spam event `auction:viewers` mỗi lần join/leave gây bão broadcast.

6. **Tối ưu index cho bảng bids**
   - **Dùng gì:** migration `20260329123000_optimize_bid_indexes`.
   - **Vì sao:** tăng tốc query lấy top bid/lịch sử bid theo `auctionId + amount + createdAt`.

7. **Giảm re-render phía frontend**
   - **Dùng gì:** `applyRealtimeBid`, `applySnapshot` trong Zustand store.
   - **Vì sao:** gom cập nhật state để UI mượt hơn khi bid dồn dập.

8. **Redis realtime snapshot cho `auction:join`**
   - **Dùng gì:** key `auctionRealtimeSnapshot` + in-flight dedupe trong `bid.service.ts`.
   - **Vì sao:** giảm truy vấn lặp khi nhiều client cùng join 1 phòng đấu giá.

9. **Scheduler chạy theo batch + chống chồng tick**
   - **Dùng gì:** `SCHEDULER_BATCH_LIMIT` + cờ `isSchedulerTickRunning` trong `auction-scheduler.service.ts`.
   - **Vì sao:** giảm tải DB khi nhiều phiên đến giờ start/end cùng lúc.

10. **Prisma query log bật theo cờ**

- **Dùng gì:** `DB_QUERY_LOG_ENABLED` trong `database.ts`.
- **Vì sao:** bỏ overhead log query ở benchmark/production, chỉ bật khi cần truy vết sâu.

### Biến môi trường liên quan hiệu năng (backend)

- `CLUSTER_WORKERS`: số worker backend (khuyến nghị staging/prod: 2-4 hoặc theo số core).
- `SCHEDULER_ENABLED`: bật/tắt cron scheduler trên worker hiện tại.
- `SCHEDULER_BATCH_LIMIT`: số phiên tối đa xử lý mỗi tick scheduler.
- `SOCKET_TRANSPORTS`: danh sách transport (`websocket` hoặc `websocket,polling`).
- `SOCKET_PER_MESSAGE_DEFLATE`: bật/tắt nén gói socket.
- `SOCKET_REDIS_ADAPTER_ENABLED`: bật adapter Redis cho Socket.IO (auto bật khi `CLUSTER_WORKERS > 1`).
- `VIEWER_BROADCAST_DEBOUNCE_MS`: thời gian debounce broadcast viewer count.
- `JOIN_SNAPSHOT_BIDS_LIMIT`: số bản ghi bid gửi kèm snapshot lúc `auction:join` (khuyến nghị `5`).
- `BID_REDIS_SNAPSHOT_CACHE_TTL_SECONDS`: TTL cache snapshot realtime ở Redis cho join burst.
- `DB_QUERY_LOG_ENABLED`: bật query log Prisma khi cần debug sâu (mặc định khuyến nghị `false`).
- `DB_LOG_SKIP_SOCKET`: bỏ ghi DB log cho event socket connect/disconnect để giảm tải I/O.
- `BID_RATE_LIMIT_WINDOW_MS`, `BID_RATE_LIMIT_MAX_REQUESTS`: chống spam bid.
- `BID_SNAPSHOT_CACHE_TTL_MS`, `BID_SNAPSHOT_BIDS_LIMIT`, `BID_CACHE_TTL_SECONDS`: tuning cache snapshot và bid feed.

### Cách chạy benchmark để làm báo cáo

1. Chuẩn bị dữ liệu:

```bash
npm run docker:up
npm run prisma:migrate
npm run prisma:seed
npm run build --workspace=backend
```

2. Profile mặc định local (đo baseline):

```powershell
# Dùng giá trị trong backend/.env (thường 1 worker)
npm run start --workspace=backend
```

3. Profile production-like (đo trước deploy):

```powershell
$env:NODE_ENV='production'
$env:CLUSTER_WORKERS='2'
$env:SCHEDULER_ENABLED='true'
$env:SOCKET_TRANSPORTS='websocket'
$env:SOCKET_PER_MESSAGE_DEFLATE='false'
$env:SOCKET_REDIS_ADAPTER_ENABLED='true'
$env:DB_QUERY_LOG_ENABLED='false'
npm run start --workspace=backend
```

4. Chạy benchmark realtime (terminal khác):

```bash
npm run perf:realtime
```

5. Nếu muốn tùy chỉnh số client theo mẫu `joinColdA joinColdB joinWarm fanoutA fanoutB`:

```bash
npm run perf:realtime -- 100 300 300 100 300
```

6. Nếu muốn chỉ đo join và bỏ fanout:

```bash
node scripts/realtime-benchmark.mjs --skipFanout
```

### Tiêu chí đọc kết quả (đề xuất báo cáo)

- `connect_cold_500`: đo thời gian mở kết nối websocket từ đầu (phụ thuộc mạnh vào CPU/mạng máy benchmark).
- `join_cold_500`: đo thời gian từ lúc socket đã connect tới lúc nhận snapshot đầu tiên; mục tiêu release `< 1000ms`.
- `join_warm_500`: đã có kết nối sẵn, chỉ join room; mục tiêu `< 150ms` p95.
- `fanout_500`: 1 bid phát tới 500 client; mục tiêu `< 150ms` p95 local và `< 100ms` khi staging/prod đủ tài nguyên.

### Kết quả benchmark gần nhất (30/03/2026 - local, sau tối ưu)

Profile mặc định local (`backend/.env`, thường 1 worker):

- `connect_cold_200`: p95 `1240ms`, p99 `1245ms`
- `connect_cold_500`: p95 `4274ms`, p99 `4287ms`
- `join_cold_500`: p95 `1300ms`, p99 `1589ms`
- `join_warm_500`: p95 `438ms`, p99 `457ms`
- `fanout_500`: p95 `123ms`, p99 `134ms`

Profile production-like (`NODE_ENV=production`, `CLUSTER_WORKERS=2`, Redis adapter bật):

- `connect_cold_200`: p95 `1199ms`, p99 `1220ms`
- `connect_cold_500`: p95 `3173ms`, p99 `3286ms`
- `join_cold_500`: p95 `168ms`, p99 `197ms`
- `join_warm_500`: p95 `129ms`, p99 `130ms`
- `fanout_500`: p95 `127ms`, p99 `128ms`

Nhận xét nhanh:

- Realtime sau khi vào phòng (`join_*`, `fanout_*`) đã ổn định ở tải 200-500 client và không drop event.
- Nút nghẽn chính còn lại là `connect_cold_*` khi mở số lượng websocket mới cực lớn cùng lúc trên cùng 1 máy benchmark.

> Ghi chú khi báo cáo: kết quả local thường thấp hơn production về network và cũng dễ nghẽn CPU khi mở quá nhiều socket cùng lúc trên 1 máy. Vì vậy cần nhấn mạnh thêm benchmark trên staging/prod để kết luận cuối.

---

## 💳 Luồng Tài Chính Đấu Giá (Đã triển khai)

1. Khi người dùng đang dẫn đầu giá:
   - Hệ thống giữ tiền tạm vào `heldAmount` của phiên và gắn `heldBidderId`.
2. Khi có người khác vượt giá:
   - Người dẫn đầu cũ được hoàn tiền ngay lập tức.
   - Người mới dẫn đầu bị giữ tiền theo mức bid mới.
3. Khi Admin tạm dừng hoặc hủy phiên:
   - Tiền đang giữ được hoàn lại cho người đang dẫn đầu.
   - `heldBidderId` và `heldAmount` được reset về `null/0`.
4. Khi phiên kết thúc:
   - Hệ thống chốt `winnerId`, chuyển tiền cho seller, và xóa trạng thái giữ tiền.
   - Nếu có chênh lệch giữ tiền do dữ liệu cũ, hệ thống tự cân bằng (trừ/hoàn phần thiếu hoặc dư).

---

## 🛡️ Chống Bid Trùng (Idempotency - 30/03/2026)

Mục tiêu: khi user click nhanh, double-click, hoặc retry do mất mạng thì server chỉ ghi nhận **1 bid hợp lệ** cho cùng một yêu cầu.

Đã triển khai:

1. Database:
   - Thêm `bids.clientRequestId` (nullable).
   - Unique key: `(bidderId, auctionId, clientRequestId)`.
2. Backend bid service:
   - Nhận `clientRequestId` từ REST và Socket.
   - Redis lock ngắn hạn để chặn race cùng request.
   - Redis cache kết quả để retry trả về cùng response.
   - Fallback theo DB (đọc bid đã tạo) khi gặp race/unique conflict.
3. Frontend:
   - Mỗi lần submit bid tạo `clientRequestId` mới (`crypto.randomUUID()`).
   - Gửi kèm request id cho cả bid thường và quick bid.
4. Cấu hình môi trường mới:
   - `BID_IDEMPOTENCY_RESULT_TTL_SECONDS`
   - `BID_IDEMPOTENCY_LOCK_TTL_MS`
   - `BID_IDEMPOTENCY_WAIT_TIMEOUT_MS`
   - `BID_IDEMPOTENCY_POLL_INTERVAL_MS`

Kiểm tra nhanh đã chạy:

- Gửi 2 request `/api/bids` đồng thời cùng `clientRequestId`:
  - `increment = 1`
  - `sameBidId = true`
  - Không tạo bản ghi bid trùng.

Benchmark sau cập nhật (30/03/2026, local):

- `join_cold_200`: p95 `142ms`
- `join_cold_500`: p95 `168ms`
- `join_warm_500`: p95 `129ms`
- `fanout_200`: p95 `84ms`
- `fanout_500`: p95 `127ms`

Kết luận ngắn: thêm idempotency không làm lệch realtime; hệ thống vẫn giữ được tốc độ fanout tốt ở tải 200-500 client trong test local sạch.
