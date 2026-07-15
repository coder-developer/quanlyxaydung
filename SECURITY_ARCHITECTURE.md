# Kiến trúc bảo mật và dữ liệu

## Nguồn xác thực quyền

- Vai trò được đọc từ `app_users` ở mỗi API request, không lấy từ giao diện hoặc `localStorage`.
- JWT chứa `sessionVersion`; khóa tài khoản, đổi vị trí hoặc đặt lại mật khẩu sẽ tăng phiên bản và thu hồi token cũ.
- Frontend gọi `GET /api/auth/me` khi khôi phục phiên và không cho phép người dùng tự chuyển vai trò.

## Ma trận vai trò

| Vai trò | Phạm vi chính |
|---|---|
| CEO | Quản trị hệ thống, doanh nghiệp, dự án, nhân sự, reset |
| ChiefAccountant | Toàn quyền nghiệp vụ kế toán; xem toàn bộ dự án, kho và thiết bị; được cập nhật hợp đồng hiện có nhưng không được lập hợp đồng mới |
| SiteAccountant | Xem dự án được giao; quản lý kho và thiết bị đúng công trường; giao dịch phát sinh luôn ở trạng thái bản nháp |
| SiteManager | Xem và cập nhật tiến độ, trạng thái vận hành của công trường được bổ nhiệm; không được đổi mã, ngân sách hoặc người bổ nhiệm |
| Auditor | Chỉ đọc |
| Employee | Chấm công và dữ liệu cá nhân |

Vị trí `Chỉ huy trưởng`, `Kế toán trưởng`, `Kế toán công trường` hoặc `Kế toán dự án` trong hồ sơ nhân viên được tự động ánh xạ sang vai trò tương ứng. Thay đổi vị trí làm mất hiệu lực JWT cũ.

## Đồng bộ và sao lưu

- Trình duyệt gửi thay đổi tới PostgreSQL sau 1,5 giây và kiểm tra revision mới sau 5 giây.
- Ghi dữ liệu sử dụng optimistic concurrency qua `revision` để tránh ghi đè thay đổi từ máy khác.
- Trước mỗi lần cập nhật, máy chủ lưu snapshot vào `erp_state_backups` và chỉ giữ 50 phiên bản gần nhất.
- Chứng từ thu/chi, nhật ký kế toán và vận hành thiết bị dùng bảng PostgreSQL riêng với khóa ngoại, transaction, audit log và khóa lạc quan `row_version`.
- PostgreSQL là nguồn ERP duy nhất. Google Drive chỉ lưu tệp; Firestore không tham gia đồng bộ dữ liệu nghiệp vụ.
- Đăng ký tự phục vụ phải xác minh OTP qua webhook và chờ CEO phê duyệt. Production đóng luồng đăng ký nếu chưa cấu hình nhà cung cấp OTP.
- Ảnh chấm công là bằng chứng đối chiếu thủ công, không được tuyên bố là nhận diện khuôn mặt hoặc liveness.

## Reset hệ thống

`POST /api/admin/reset-system` chỉ dành cho CEO, yêu cầu mã xác nhận và chạy trong một transaction PostgreSQL. Reset xóa dữ liệu phát sinh, tài khoản gắn nhân viên, log phụ trợ và đưa doanh nghiệp về:

- Công Ty Cổ Phần Xây Dựng
- Tp Hồ Chí Minh
- Toàn bộ danh mục nghiệp vụ rỗng

## Cascade delete

Máy chủ chuẩn hóa quan hệ trước khi lưu. Khi xóa dự án, đối tác, hợp đồng, nhân viên hoặc vật tư, dữ liệu phụ thuộc không còn hợp lệ được xóa; nhân viên và thiết bị mất dự án được chuyển về trạng thái chưa phân công. Các bảng ca làm, yêu cầu nhân sự, thông báo, phiếu lương và đồng ý ảnh cũng được dọn tương ứng.

## Sandbox

Trình mô phỏng sử dụng bản sao dữ liệu bằng `structuredClone` và chỉ thay đổi React local state. Không callback nào của simulator được nối với state production hoặc API đồng bộ.

## Điều kiện trước khi triển khai

1. Chạy migration trên bản sao cơ sở dữ liệu.
2. Kiểm thử từng vai trò và thao tác trái quyền.
3. Kiểm thử reset/cascade trên database staging.
4. Xác nhận Firebase OAuth domain và Google Drive API.
5. Chạy `npm run check` và `npm audit --omit=dev`.
6. Chỉ deploy khi có lệnh xác nhận riêng.
