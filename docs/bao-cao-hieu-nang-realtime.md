# MẪU BÁO CÁO HIỆU NĂNG HỆ THỐNG ĐẤU GIÁ REALTIME

## 0. Thông tin chung

- Môn học: `[Điền tên môn]`
- Giảng viên: `[Điền tên giảng viên]`
- Nhóm: `[Điền tên nhóm]`
- Thành viên thực hiện: `[Danh sách thành viên]`
- Ngày báo cáo: `[dd/mm/yyyy]`

## 1. Mục tiêu đánh giá

- Đánh giá khả năng realtime khi có từ `200-500` người dùng cùng tham gia đấu giá.
- Theo dõi các chỉ số chính:
  - `connect_cold`: thời gian mở kết nối websocket mới.
  - `join_cold`: người dùng đã connect xong và vào phòng đấu giá.
  - `join_warm`: người dùng đã có kết nối socket, chỉ thực hiện join room.
  - `fanout`: thời gian server phát 1 bid mới tới toàn bộ client trong phòng.
- Mục tiêu tham chiếu:
  - `fanout p95 < 100ms`
  - `join_warm p95 < 150ms`
  - `join_cold p95 < 1000ms`
  - `connect_cold` phụ thuộc mạnh vào hạ tầng mạng/cpu, đánh giá theo môi trường triển khai.

## 2. Môi trường kiểm thử

- Backend: `Node.js + Express + Socket.IO`
- Frontend: `React + Socket.IO Client`
- Database: `PostgreSQL`
- Cache/Realtime adapter: `Redis`
- Chế độ chạy backend: `Cluster workers`
- Transport realtime: `websocket`
- Máy chạy test:
  - CPU: `[Điền cấu hình]`
  - RAM: `[Điền cấu hình]`
  - OS: `[Điền hệ điều hành]`

## 3. Công nghệ dùng và lý do chọn

| Thành phần         | Dùng gì                     | Lý do                                                         |
| ------------------ | --------------------------- | ------------------------------------------------------------- |
| Realtime transport | Socket.IO + WebSocket       | Đẩy dữ liệu hai chiều, độ trễ thấp, hỗ trợ room/event rõ ràng |
| Cache nóng         | Redis                       | Truy xuất cực nhanh cho currentPrice, bidCount, recentBids    |
| Đa tiến trình      | Node cluster                | Tận dụng nhiều lõi CPU để xử lý đồng thời nhiều socket        |
| Đồng bộ đa node    | Socket.IO Redis adapter     | Cho phép scale ngang nhiều backend instance                   |
| Tối ưu DB          | Composite index trên `bids` | Tăng tốc truy vấn top bid và lịch sử bid                      |
| State frontend     | Zustand (batch update)      | Giảm re-render dư khi có nhiều event realtime                 |

## 4. Các tối ưu đã triển khai

1. Cache snapshot realtime trong `bid.service.ts` (TTL ngắn + in-flight dedupe).
2. Lưu `auctionCurrentPrice`, `auctionBidCount`, `auctionRecentBids` vào Redis.
3. Debounce broadcast `auction:viewers` để tránh spam event.
4. Bật `websocket` làm transport chính, tắt nén per-message mặc định.
5. Chạy backend theo cluster, chỉ 1 worker chạy scheduler.
6. Thêm index:
   - `bids(auctionId, createdAt DESC)`
   - `bids(auctionId, amount DESC, createdAt, id)`
7. Gom update state phía client (`applySnapshot`, `applyRealtimeBid`) để giảm render.

## 5. Quy trình benchmark

```bash
npm run docker:up
npm run prisma:migrate
npm run prisma:seed
npm run build --workspace=backend
```

PowerShell chạy backend benchmark mode:

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

Terminal khác chạy benchmark:

```bash
npm run perf:realtime
```

## 6. Kết quả đo (mẫu điền nhanh)

> Gợi ý: copy thẳng block JSON của script vào phụ lục, còn bảng này chỉ giữ số p95/p99.

| Kịch bản     | Số client | p95 (ms) | p99 (ms) | Nhận xét         |
| ------------ | --------- | -------- | -------- | ---------------- |
| connect_cold | 200       | `[điền]` | `[điền]` | `[đạt/chưa đạt]` |
| connect_cold | 500       | `[điền]` | `[điền]` | `[đạt/chưa đạt]` |
| join_cold    | 200       | `[điền]` | `[điền]` | `[đạt/chưa đạt]` |
| join_cold    | 500       | `[điền]` | `[điền]` | `[đạt/chưa đạt]` |
| join_warm    | 500       | `[điền]` | `[điền]` | `[đạt/chưa đạt]` |
| fanout       | 200       | `[điền]` | `[điền]` | `[đạt/chưa đạt]` |
| fanout       | 500       | `[điền]` | `[điền]` | `[đạt/chưa đạt]` |

Ví dụ kết quả tham chiếu (đo ngày 30/03/2026, benchmark local production-like):

- `connect_cold_200`: p95 ~ `1199ms`, p99 ~ `1220ms`
- `connect_cold_500`: p95 ~ `3173ms`, p99 ~ `3286ms`
- `join_cold_500`: p95 ~ `168ms`, p99 ~ `197ms`
- `join_warm_500`: p95 ~ `129ms`, p99 ~ `130ms`
- `fanout_500`: p95 ~ `127ms`, p99 ~ `128ms`

## 7. Kết luận

- Hệ thống đáp ứng tốt mục tiêu realtime trong phòng đấu giá (`join_cold`, `join_warm`, `fanout` đều ổn định khi đã có kết nối).
- Nút nghẽn chính còn lại là `connect_cold` khi mở số lượng websocket mới cực lớn cùng lúc trên 1 máy.
- Cần benchmark thêm ở staging/prod để kết luận chính xác hơn về năng lực production thực tế.

## 8. Hướng cải tiến tiếp theo

1. Triển khai benchmark trên staging/prod gần môi trường thật.
2. Dùng load balancer + nhiều backend instance + sticky session.
3. Theo dõi thêm `CPU`, `memory`, `event loop lag`, `Redis ops`, `PostgreSQL slow query`.
4. Bổ sung dashboard quan sát (Grafana/Prometheus) cho báo cáo định kỳ.

## 9. Phụ lục

- File benchmark: `scripts/realtime-benchmark.mjs`
- Tài liệu triển khai tối ưu: `README.md` (mục Báo Cáo Hiệu Năng Realtime)
