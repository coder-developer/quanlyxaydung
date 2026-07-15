# Quản trị doanh nghiệp v1.1.2

- Bổ sung bộ cài VPS và tên miền công khai bằng một lệnh.
- Tự động cài Caddy, reverse proxy và chứng chỉ SSL Let's Encrypt.
- Tự động gia hạn HTTPS và lưu chứng chỉ trong Docker volume riêng.
- App chỉ bind vào localhost khi dùng tên miền; PostgreSQL không mở ra Internet.
- Tự cấu hình UFW/firewalld cho cổng 80 và 443 khi firewall đang hoạt động.
- Kiểm tra DNS, health nội bộ và health HTTPS trước khi báo cài đặt thành công.
- Vẫn giữ backup hằng ngày, restore drill và thông tin đăng nhập chỉ root đọc được.
