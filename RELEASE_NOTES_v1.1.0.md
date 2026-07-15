# Quản trị doanh nghiệp v1.1.0

## Dữ liệu nghiệp vụ PostgreSQL

- Phiếu thu/chi, bút toán thủ công, cấp nhiên liệu, bảo trì và điều động thiết bị được lưu trong các bảng PostgreSQL riêng.
- Bảng phát sinh có khóa ngoại dự án/thiết bị, transaction, audit log và `row_version` để phát hiện sửa đồng thời.
- Xóa thiết bị dọn nhật ký vận hành và bút toán tự động liên quan.
- Dữ liệu mẫu đã được loại khỏi các màn hình nghiệp vụ thật.

## Đồng bộ và bảo mật

- PostgreSQL là nguồn dữ liệu ERP duy nhất; Firestore không còn tham gia đồng bộ. Google Drive chỉ lưu tài liệu.
- Conflict có lựa chọn tải bản máy chủ hoặc hợp nhất theo mã; bản ghi nghiệp vụ hỗ trợ ghi đè có kiểm soát phiên bản.
- Đăng ký tài khoản dùng OTP qua webhook và chỉ tạo tài khoản sau khi CEO phê duyệt.
- CSP được bật trên Express/VPS; Electron được nâng lên 43.1.1.
- Chức năng sinh trắc học chưa được triển khai và được ghi đúng là “ảnh xác minh”.

## Vận hành và kiểm thử

- Backup có checksum, sao chép ngoài VPS qua rclone, lịch cron hằng ngày và script diễn tập khôi phục.
- Có integration test cho RBAC, conflict, realtime, khóa kỳ và cascade; có Playwright E2E đăng nhập CEO.
