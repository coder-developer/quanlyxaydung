# Quản trị doanh nghiệp v1.0.5

Bản hoàn thiện lưu trữ đối tác:

- Hợp nhất Chủ đầu tư vào danh mục đối tác tập trung cùng nhà thầu và nhà cung cấp.
- Chủ đầu tư được tạo mới hiện lưu trong PostgreSQL thay vì chỉ giữ tạm trong giao diện.
- Mã số thuế và địa chỉ văn phòng của mọi loại đối tác đồng bộ tới các máy đăng nhập khác.
- Giữ tương thích với danh sách Chủ đầu tư mẫu và các hợp đồng cũ.

Kiểm tra:

- `npm run check`: đạt.
- `npm audit --omit=dev`: 0 lỗ hổng.
- Kiểm thử ghi, đọc lại và khôi phục một Chủ đầu tư tạm trên PostgreSQL: đạt.
