# Deploy Production (Render + Vercel) - Checklist Nhanh

## 1. Điều kiện trước deploy

Chạy tại root project:

```bash
npm run lint
npm run type-check
npm run build
```

Nếu fail thì sửa xong rồi mới deploy.

## 2. Deploy Backend lên Render

### 2.1 Tạo service

- Vào Render -> `New` -> `Web Service`
- Kết nối repo GitHub này
- Chọn branch: `develop` (sau khi test ổn mới promote `main`)

### 2.2 Cấu hình Build/Start

- Root Directory: để trống (repo root)
- Build Command:

```bash
npm ci --include=dev && npm run build --workspace=packages/shared && npm run build --workspace=backend
```

`backend` đã ép `prisma generate --schema=prisma/schema.prisma` ngay trong script `build`, nên Render luôn tạo đúng Prisma Client trước khi TypeScript compile.

- Start Command:

```bash
npm run start --workspace=backend
```

Lưu ý: backend đã hỗ trợ nhận `PORT` tự động từ platform.

### 2.3 Biến môi trường bắt buộc (Render Backend)

- `NODE_ENV=production`
- `DATABASE_URL=<render-postgres-internal-url>`
- `REDIS_URL=<render-redis-internal-url>`
- `JWT_SECRET=<secret-dài-ngẫu-nhiên>`
- `JWT_REFRESH_SECRET=<secret-dài-ngẫu-nhiên-khác>`
- `FRONTEND_URL=https://<your-vercel-domain>`
- `CLUSTER_WORKERS=2`
- `SCHEDULER_ENABLED=true`
- `SCHEDULER_BATCH_LIMIT=50`
- `SOCKET_TRANSPORTS=websocket`
- `SOCKET_PER_MESSAGE_DEFLATE=false`
- `SOCKET_REDIS_ADAPTER_ENABLED=true`
- `DB_QUERY_LOG_ENABLED=false`
- `DB_LOG_SKIP_SOCKET=true`
- `JOIN_SNAPSHOT_BIDS_LIMIT=5`
- `VIEWER_BROADCAST_DEBOUNCE_MS=250`
- `BID_RATE_LIMIT_WINDOW_MS=1500`
- `BID_RATE_LIMIT_MAX_REQUESTS=3`
- `BID_SNAPSHOT_CACHE_TTL_MS=500`
- `BID_SNAPSHOT_BIDS_LIMIT=50`
- `BID_REDIS_SNAPSHOT_CACHE_TTL_SECONDS=2`
- `BID_CACHE_TTL_SECONDS=86400`
- `BID_IDEMPOTENCY_RESULT_TTL_SECONDS=120`
- `BID_IDEMPOTENCY_LOCK_TTL_MS=5000`
- `BID_IDEMPOTENCY_WAIT_TIMEOUT_MS=2500`
- `BID_IDEMPOTENCY_POLL_INTERVAL_MS=80`

### 2.4 Migrate sau deploy

Mở Shell trên Render backend và chạy:

```bash
npx prisma migrate deploy --schema=backend/prisma/schema.prisma
```

Nếu cần seed dữ liệu demo cho test:

```bash
npm run prisma:seed
```

## 3. Deploy Frontend lên Vercel

### 3.1 Import project

- Vercel -> `Add New Project` -> chọn repo
- Framework: Vite
- Root Directory: `frontend`

### 3.2 Build/Output

- Build Command:

```bash
cd .. && npm ci && npm run build --workspace=packages/shared && npm run build --workspace=frontend
```

- Output Directory:

```text
dist
```

### 3.3 Biến môi trường (Vercel Frontend)

- `VITE_API_URL=https://<your-render-backend-domain>/api`
- `VITE_SOCKET_URL=https://<your-render-backend-domain>`

Deploy xong lấy domain Vercel và cập nhật lại `FRONTEND_URL` ở Render backend cho đúng domain thật.

## 4. Smoke test production

1. Seller đăng nhập -> tạo sản phẩm -> gửi duyệt.
2. Admin duyệt sản phẩm -> tạo phiên.
3. Buyer vào phòng live -> đặt giá realtime.
4. Kết thúc phiên -> kiểm tra winner + số dư + lịch sử bid.
5. Kiểm tra quyền khóa/mở user ở admin.

## 5. Benchmark production để nộp báo cáo

Chạy từ máy local:

```bash
node scripts/realtime-benchmark.mjs --baseUrl https://<your-render-backend-domain>
```

Mục tiêu pass:

- `dropped = 0`
- `join_warm_500 p95 <= 150ms`
- `fanout_500 p95 <= 150ms` (mục tiêu tốt hơn: `<= 100ms`)
- `join_cold_500 p95 <= 1000ms` (đo sau khi kết nối websocket đã thiết lập)

## 6. Checklist Jira/Handoff

- Gắn commit vào issue AS tương ứng.
- Chuyển trạng thái issue sang `Ready for Test`.
- Báo tester (Mẫn) test theo smoke flow ở mục 4.
- Chỉ promote `main` khi Jira test pass.
