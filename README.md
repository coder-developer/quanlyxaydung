# Quản lý xây dựng – CONSTRUCT-OS

Ứng dụng quản trị doanh nghiệp xây dựng chạy trên React 19, TypeScript, Express và PostgreSQL. App gồm dashboard, nhân sự, chấm công, hợp đồng, kho vật tư, thiết bị, nhật ký kế toán, công nợ, cấu hình doanh nghiệp và Google Drive lưu tài liệu. PostgreSQL là nguồn dữ liệu ERP duy nhất.

## Chạy giao diện trên máy

Yêu cầu Node.js 20 trở lên.

```bash
npm ci
npm run dev
```

Mở `http://localhost:3000`. Dữ liệu nghiệp vụ được tự động lưu trong trình duyệt; có thể xuất/nhập bản sao lưu tại mục cấu hình doanh nghiệp.

## Tài khoản demo

| Vai trò | PIN | Quyền chính |
| --- | --- | --- |
| Giám đốc | `1111` | Toàn quyền |
| Kế toán trưởng | `2222` | Tài chính, nhân sự |
| Chỉ huy trưởng | `3333` | Công trường, kho, thiết bị |
| Thanh tra/Khách | `4444` | Chỉ xem |
| Nhân viên | `5555` | Chấm công và xem dữ liệu cá nhân |

Các PIN trên chỉ dành cho bản demo. Khi triển khai thật, cần thay đăng nhập cục bộ bằng hệ thống xác thực phía máy chủ.

Ở bản VPS, tài khoản mẫu `nhanvien` được liên kết với hồ sơ `emp-1`. PIN production được lấy từ `SEED_EMPLOYEE_PIN` trong `.env` và không hiển thị công khai.

Nhân viên chưa có tài khoản có thể chọn **Đăng ký tài khoản** tại màn hình đăng nhập, nhập mã nhân viên, số điện thoại đang lưu trong hồ sơ và PIN mới 6–12 chữ số. Hệ thống chỉ cấp vai trò Nhân viên; các tài khoản quản trị phải do CEO tạo. Mọi tài khoản có thể dùng nút **Đổi PIN**, nhập PIN hiện tại và sẽ phải đăng nhập lại sau khi đổi.

## Triển khai VPS với dữ liệu tập trung

Bản VPS gồm React, API Node.js và PostgreSQL. Dữ liệu được dùng chung giữa các máy, mật khẩu/PIN được băm bằng bcrypt, phiên đăng nhập dùng JWT 12 giờ và mọi lần đăng nhập/lưu dữ liệu đều có audit log.

### Cài VPS bằng một lệnh

Trên VPS Ubuntu/Debian/RHEL mới, chạy:

```sh
curl -fsSL https://raw.githubusercontent.com/coder-developer/quanlyxaydung/v1.1.2/install-vps.sh | sudo sh
```

Trình cài tự cài Docker, tạo bí mật ngẫu nhiên, build container, kiểm tra health và cài lịch backup. Thông tin đăng nhập CEO ban đầu được lưu tại `/opt/quanlyxaydung/.installation-credentials` với quyền chỉ root đọc. Có thể truyền `REPO_REF` để cài phiên bản khác hoặc tải gói ZIP VPS và chạy `sudo sh install-vps.sh` trong thư mục đã giải nén.

Để cài luôn tên miền bên ngoài và HTTPS tự động, trỏ DNS về VPS rồi chạy đúng một lệnh:

```sh
curl -fsSL https://raw.githubusercontent.com/coder-developer/quanlyxaydung/v1.1.2/install-vps.sh | sudo env DOMAIN=erp.tencongty.vn ACME_EMAIL=admin@tencongty.vn sh
```

Caddy tự xin và gia hạn SSL Let's Encrypt. Chi tiết nằm trong `deploy/CAI-DAT-TEN-MIEN-1-CLICK.md`.

Khi một máy thay đổi dữ liệu, app tự lưu sau khoảng 1,5 giây. Các máy khác đang đăng nhập kiểm tra phiên bản máy chủ mỗi 5 giây và tự tải dữ liệu mới nếu không có chỉnh sửa cục bộ chưa lưu. Nếu hai máy sửa cùng lúc, app hiển thị cảnh báo xung đột thay vì âm thầm ghi đè.

```bash
cp .env.vps.example .env
# Thay toàn bộ CHANGE_ME bằng chuỗi mạnh; PIN production cần 6–12 chữ số.
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:8080/api/health
```

Mặc định app mở tại cổng `8080`. Khi truyền `DOMAIN`, app chỉ bind cổng nội bộ `127.0.0.1:8080` và Caddy công khai HTTPS qua cổng 443; PostgreSQL không được công khai ra Internet.

Sao lưu PostgreSQL thủ công:

```bash
sh scripts/backup.sh
```

Có thể thêm lệnh trên vào cron hằng đêm. Volume `postgres_data` giữ dữ liệu khi container hoặc VPS app khởi động lại; file backup cần được sao chép sang một máy hoặc object storage khác.

Thiết lập `BACKUP_REMOTE` theo remote rclone rồi cài lịch tự động:

```sh
sh scripts/install-backup-cron.sh
sh scripts/restore-drill.sh
```

Cron chạy backup lúc 02:15 hằng ngày và diễn tập khôi phục vào Chủ nhật. OTP đăng ký cần cấu hình `OTP_WEBHOOK_URL` và `OTP_WEBHOOK_TOKEN`; nếu production chưa có kênh gửi OTP, đăng ký tự phục vụ sẽ đóng an toàn và CEO vẫn có thể tạo tài khoản.

## Kiểm thử

```sh
npm run check
ALLOW_TEST_MUTATIONS=true TEST_BASE_URL=http://127.0.0.1:18080 npm run test:api
E2E_BASE_URL=http://127.0.0.1:18080 E2E_CEO_PIN=... npm run test:e2e
```

Chỉ chạy `test:api` trên database test riêng vì bộ test cố ý tạo và xóa dữ liệu kiểm thử.

## Kiểm tra và đóng gói

```bash
npm run check
npm run preview
```

Bản production nằm trong `dist/` và có thể triển khai lên Vercel, Netlify hoặc máy chủ tĩnh. Nếu dùng Firebase riêng, sao chép `.env.example` thành `.env.local` rồi điền các biến `VITE_FIREBASE_*`.

## Lưu ý dữ liệu

- Khi `VITE_USE_SERVER=true`, PostgreSQL là nguồn dữ liệu dùng chung và localStorage chỉ là bản dự phòng khi mất mạng.
- Khi chạy riêng `npm run dev` mà không bật server mode, localStorage phù hợp cho demo hoặc một người dùng trên một trình duyệt.
- Google Drive cần cấu hình Firebase Authentication/OAuth riêng; Firestore không được dùng làm cơ sở dữ liệu ERP.
- Luôn xuất bản sao lưu trước khi xóa dữ liệu hoặc chuyển máy.
