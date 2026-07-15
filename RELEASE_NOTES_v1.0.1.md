# Quản trị doanh nghiệp v1.0.1

Bản vá vận hành Vercel:

- Khắc phục API production trả `500 FUNCTION_INVOCATION_FAILED` do deployment cũ không tương thích schema RBAC mới.
- Không chạy lại hàng chục truy vấn đồng bộ tài khoản ở mỗi cold start serverless.
- Chỉ băm và tạo tài khoản mặc định khi tài khoản chưa tồn tại.
- Container/VPS vẫn thực hiện đối soát tài khoản đầy đủ khi khởi động.
- Vercel tiếp tục tự tạo và ánh xạ tài khoản khi CEO hoặc Chỉ huy trưởng cập nhật dữ liệu nhân sự.

Kiểm tra:

- `npm run check`: đạt.
- `npm audit --omit=dev`: 0 lỗ hổng.
- Cold start với database production: khoảng 2,3–2,7 giây.
- `/api/health`: phản hồi `ok`.
- Đăng nhập Kế toán công trường bằng `NV-012`: thành công, đúng vai trò `SiteAccountant`.
