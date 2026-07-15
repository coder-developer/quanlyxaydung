# Quản trị doanh nghiệp v1.0.3

Bản tối ưu realtime production trên Vercel:

- Giữ PostgreSQL `LISTEN/NOTIFY` cho container và VPS có kết nối trực tiếp.
- Tự động chuyển sang dò bảng sự kiện mỗi 750 ms trong long-poll trên Vercel, do proxy database serverless không bảo đảm chuyển tiếp `NOTIFY` tức thì.
- Giữ nguyên xác thực JWT, RBAC và gói sự kiện không chứa dữ liệu nghiệp vụ nhạy cảm.
- Polling giao diện 30 giây vẫn là lớp dự phòng cuối khi mạng yếu.

Kiểm tra:

- `npm run check`: đạt.
- `npm audit --omit=dev`: 0 lỗ hổng.
- Container/VPS nhận sự kiện bằng `LISTEN/NOTIFY`: khoảng 0,76 giây.
- Endpoint chưa đăng nhập: `401`.
