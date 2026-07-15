# Quản trị doanh nghiệp v1.0.2

Bổ sung đồng bộ tức thì giữa các tài khoản đang đăng nhập:

- Kênh realtime có xác thực cho tài khoản, thông báo, nghỉ phép, tạm ứng lương và phân ca.
- PostgreSQL `LISTEN/NOTIFY` đánh thức các phiên đang chờ; bảng sự kiện bảo đảm không mất thay đổi khi phiên kết nối lại.
- Sự kiện chỉ chứa loại thay đổi, không chứa tên nhân viên, lý do nghỉ hay số tiền tạm ứng.
- Mỗi giao diện tải lại dữ liệu qua API RBAC hiện có, giữ nguyên giới hạn vai trò và phạm vi công trường.
- Đồng bộ trạng thái duyệt, thông báo đã đọc và khóa kỳ công/lương trên các phiên khác.
- Polling 30 giây làm lớp dự phòng khi mạng yếu hoặc kênh realtime tạm gián đoạn.
- Sự kiện kỹ thuật tự xóa sau 7 ngày để không làm đầy cơ sở dữ liệu.

Kiểm tra:

- `npm run check`: đạt.
- `npm audit --omit=dev`: 0 lỗ hổng.
- Container Docker build và `/api/health`: đạt.
- Kiểm thử hai phiên: sự kiện đến sau khoảng 0,76 giây.
- Endpoint realtime không đăng nhập trả `401`; sự kiện không chứa dữ liệu nghiệp vụ nhạy cảm.
