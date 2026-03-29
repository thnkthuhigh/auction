# HD Hệ Thống Đấu Giá và Quy Trình Thực Thi AS

## A) Nghiệp vụ hệ thống đấu giá

### 1) Mục tiêu hệ thống

Hệ thống đấu giá vận hành tự động trong nền tảng, xử lý phiên đấu giá và bid theo thời gian thực.

Hệ thống phải đảm bảo:

- phiên đấu giá diễn ra đúng thời gian
- giá được cập nhật chính xác
- người thắng được xác định công bằng
- tất cả người mua thấy cùng một thông tin tại cùng thời điểm

### 2) Chức năng chính

- Quản lý trạng thái phiên đấu giá: `Scheduled -> Active -> Ended`
- Kiểm tra và xử lý bid:
  - phiên có đang mở không
  - bid có hợp lệ không
  - có đúng bước giá không
  - lưu bid khi hợp lệ
- Cập nhật dữ liệu sau bid hợp lệ:
  - giá cao nhất hiện tại
  - người đang dẫn đầu
  - số lượt bid
- Đồng bộ real-time cho tất cả client đang xem
- Hiển thị countdown thời gian còn lại theo từng giây
- Kết thúc phiên đúng thời gian, khóa nhận bid mới
- Xác định người thắng theo bid cao nhất hợp lệ
- Lưu lịch sử minh bạch: người bid, giá bid, thời gian bid, danh sách bid

### 3) Luồng nghiệp vụ chuẩn

#### Luồng 1: Khởi động phiên đấu giá

1. Đến thời gian bắt đầu phiên.
2. Hệ thống kiểm tra trạng thái phiên.
3. Chuyển trạng thái sang `Active`.
4. Phiên bắt đầu.
5. Cho phép buyer đặt bid.

#### Luồng 2: Xử lý bid của buyer

1. Buyer gửi yêu cầu đặt bid.
2. Hệ thống nhận yêu cầu và kiểm tra:
   - phiên còn thời gian
   - `bid >= giá hiện tại + bước giá`
3. Nếu hợp lệ:
   - lưu bid
   - cập nhật giá cao nhất
   - cập nhật người dẫn đầu
   - đồng bộ dữ liệu tới tất cả client đang xem

#### Luồng 3: Cập nhật real-time

1. Có bid mới.
2. Hệ thống cập nhật dữ liệu phiên.
3. Push dữ liệu mới đến tất cả client.
4. Giao diện cập nhật ngay:
   - giá hiện tại
   - lịch sử bid
   - người dẫn đầu

#### Luồng 4: Đếm thời gian đấu giá

1. Phiên ở trạng thái `Active`.
2. Hệ thống chạy countdown.
3. Thời gian giảm từng giây.
4. Buyer thấy thời gian còn lại (ví dụ `00:05:23`).

#### Luồng 5: Kết thúc phiên đấu giá

1. Countdown về `0`.
2. Hệ thống khóa phiên.
3. Không nhận thêm bid mới.
4. Tìm bid cao nhất hợp lệ.
5. Xác định người thắng.
6. Lưu kết quả đấu giá.

## B) Quy trình thực thi backlog AS (End-to-End)

### 1) Mục tiêu và phạm vi

- Chỉ làm phần hệ thống theo danh sách mã AS đã chốt.
- Không nhận thêm hạng mục ngoài danh sách.
- Mỗi mã AS phải đi theo flow: `Jira -> Branch -> Code -> Check -> PR -> Merge -> Jira Done`.

### 2) Làm gì đầu tiên?

Bước đầu tiên của cả đợt làm:

```bash
git checkout develop
git pull origin develop
```

Sau đó:

- xác nhận local env chạy được (Docker, DB, Redis, migrate, seed, dev)
- chuẩn bị sẵn mẫu comment Jira

### 3) Quy tắc bắt buộc

- Jira:
  - Story kéo `To Do -> In Progress` trước
  - Story chỉ được kéo `Done` khi toàn bộ sub-task đã `Done`
- Git:
  - `1 mã AS = 1 branch`
  - branch không dấu, không khoảng trắng, viết thường
- PR:
  - tất cả PR vào `develop`
  - chỉ kéo Jira `Done` sau khi PR đã merge và đạt đủ điều kiện
- Commit:
  - bắt buộc đúng commitlint (Conventional Commits)
  - phải có mã AS trong subject hoặc body

### 4) Quy ước branch và commit

- Branch Task/Story/Sub-task:

```bash
feature/<ten>/as-49-api-tao-phien
```

- Branch Bug:

```bash
fix/<ten>/as-68-...
```

- Commit hợp lệ:

```text
feat(module): as-49 tao api tao phien
```

hoặc

```text
feat(module): tao api tao phien

AS-49
```

### 5) Mẫu comment Jira

- Bắt đầu:

```text
Đã nhận AS-xx. Đang chuyển In Progress và tạo branch.
```

- Sau khi tạo branch:

```text
Đã tạo branch feature/<ten>/as-xx-... và đang thực hiện code.
```

- Sau khi mở PR:

```text
Đã push code và mở PR "AS-xx ..." vào develop.
```

- Sau merge:

```text
PR AS-xx đã merge vào develop. Đã test đạt AC, đã đính kèm link PR/check pass. Task hoàn thành.
```

### 6) Checklist lặp cho mỗi mã AS

```bash
git checkout develop
git pull origin develop
git checkout -b feature/<ten>/as-xx-<mo-ta>    # bug dùng fix/<ten>/as-68-...
```

- Code theo phạm vi ticket.
- Chạy check bắt buộc trước push:

```bash
npm run type-check --workspace=backend
npm run type-check --workspace=frontend
npm run build --workspace=packages/shared
npm run build --workspace=frontend
```

- Commit và push:

```bash
git add .
git commit -m "feat(module): as-xx <noi-dung-ngan>"
git push -u origin <branch>
```

- Mở PR vào `develop`.

### 7) PR checklist bắt buộc

- Base đúng `develop`
- Checks xanh
- Đủ approve
- Không conflict

### 8) Sau khi merge PR

```bash
git checkout develop
git pull origin develop
git branch -d <branch>
git push origin --delete <branch>   # nếu team cho phép
```

### 9) Điều kiện kéo Jira Done

- PR đã merge vào `develop`
- Đã test đạt AC của ticket
- Đã comment Jira kèm link PR và trạng thái check pass

### 10) Thứ tự thực thi mã

- AS-12 (Task): `In Progress -> PR -> Done`
- AS-38 (Story): kéo `In Progress`
- AS-73 (Sub-task của AS-38): làm xong -> `Done`
- Đóng AS-38 (Story) -> `Done`
- AS-40 (Task): `In Progress -> Done`
- AS-13 (Task): `In Progress -> Done`
- AS-14 (Task): `In Progress -> Done`
- AS-41 (Task): `In Progress -> Done`
- AS-25 (Task): `In Progress -> Done`
- AS-54 (Task): `In Progress -> Done`
- AS-55 (Story): kéo `In Progress`
- AS-79 (Sub-task của AS-55): `Done`
- AS-80 (Sub-task của AS-55): `Done`
- Đóng AS-55 (Story) -> `Done`
- AS-26 (Task): `In Progress -> Done`
- AS-56 (Story): kéo `In Progress`
- AS-81 (Sub-task của AS-56): `Done`
- Đóng AS-56 (Story) -> `Done`
- AS-27 (Task): `In Progress -> Done`
- AS-68 (Bug): `In Progress -> Done`
- AS-32 (Task): `In Progress -> Done`
- AS-62 (Task): `In Progress -> Done`
- AS-63 (Task): `In Progress -> Done`
- AS-33 (Task): `In Progress -> Done`
- AS-66 (Task): `In Progress -> Done`
- AS-36 (Task): `In Progress -> Done`
- AS-67 (Task): `In Progress -> Done`

### 11) Checklist kết thúc đợt

- Tất cả Story đã `Done` và không còn sub-task mở
- Tất cả Task/Bug đã `Done` và có comment link PR/check pass
- Local đã đồng bộ `develop` mới nhất
