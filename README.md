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
