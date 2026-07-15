# Quản trị doanh nghiệp v1.0.4

Bổ sung thông tin pháp nhân cho doanh nghiệp và đối tác:

- Thêm mã số thuế và địa chỉ văn phòng vào Thông tin doanh nghiệp.
- Thêm mã số thuế và địa chỉ văn phòng cho nhà thầu phụ, nhà cung cấp và chủ đầu tư.
- Bắt buộc hai trường pháp nhân khi tạo đối tác mới; chặn trùng mã số thuế.
- Cho phép cập nhật dữ liệu đối tác cũ tại Danh mục dữ liệu.
- Hiển thị thông tin mới trên dashboard và danh sách đối tác.
- Bổ sung mã số thuế, địa chỉ văn phòng vào Excel danh sách đối tác, phiếu thu/chi PDF, Excel, Word và hợp đồng lao động.
- Dữ liệu cũ được nâng cấp tự động; địa chỉ văn phòng ban đầu kế thừa địa chỉ hiện có và mã số thuế để trống.

Kiểm tra:

- `npm run check`: đạt.
- Migration PostgreSQL trên dữ liệu cũ: đạt.
- Container Docker và `/api/health`: đạt.
- Kiểm thử trình duyệt biểu mẫu doanh nghiệp, biểu mẫu đối tác: đạt.
- Console trình duyệt: 0 lỗi.
