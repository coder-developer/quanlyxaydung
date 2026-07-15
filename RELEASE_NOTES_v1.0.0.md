# Quản trị doanh nghiệp v1.0.0

Thông tin mặc định:

- Doanh nghiệp: Công Ty Cổ Phần Xây Dựng
- Địa chỉ: Tp Hồ Chí Minh
- Tên ứng dụng: Quản trị doanh nghiệp

Nội dung chính của bản phát hành:

- Phân quyền backend theo CEO, Kế toán trưởng, Kế toán công trường, Chỉ huy trưởng, Nhân viên và Kiểm toán.
- Giới hạn dữ liệu Kế toán công trường và Chỉ huy trưởng theo công trường được phân công.
- Quản lý dự án, nhân sự, hợp đồng, vật tư, thiết bị, thu chi, chấm công và bảng lương.
- Quy trình nghỉ phép, tăng ca, công tác, đổi ca và tạm ứng lương.
- Tài khoản nhân viên, đổi mật khẩu lần đầu, khóa tài khoản và thu hồi phiên đăng nhập.
- Geofence phía máy chủ, ảnh chấm công, khóa kỳ công và bảng lương.
- PostgreSQL tập trung, Docker Compose, PWA và sao lưu trạng thái.
- Bộ lọc tài khoản theo vai trò và công trường; đăng nhập bằng tên tài khoản hoặc mã nhân viên.

Gói mã nguồn không chứa `.env`, mật khẩu, dữ liệu PostgreSQL hoặc file sao lưu của doanh nghiệp.
