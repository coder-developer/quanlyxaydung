# Cài VPS và tên miền bằng một lệnh

## 1. Chuẩn bị DNS

Tạo bản ghi `A` cho tên miền hoặc tên miền phụ và trỏ về địa chỉ IPv4 của VPS.

Ví dụ:

- Tên: `erp`
- Giá trị: `203.0.113.10`
- Kết quả: `erp.tencongty.vn`

VPS phải cho phép kết nối TCP cổng `80` và `443`.

## 2. Chạy một lệnh

Thay tên miền và email trong lệnh sau:

```sh
curl -fsSL https://raw.githubusercontent.com/coder-developer/quanlyxaydung/v1.1.2/install-vps.sh | sudo env DOMAIN=erp.tencongty.vn ACME_EMAIL=admin@tencongty.vn sh
```

Trình cài tự động cài Docker, PostgreSQL, ứng dụng, Caddy, SSL Let's Encrypt, firewall, health check và lịch backup.

## 3. Đăng nhập

Sau khi cài xong:

```sh
sudo cat /opt/quanlyxaydung/.installation-credentials
```

Mở `https://erp.tencongty.vn` và đổi mật khẩu CEO ngay lần đăng nhập đầu tiên.

Nếu DNS đang đi qua proxy Cloudflare, để chế độ SSL/TLS là `Full (strict)`. Chứng chỉ và khóa riêng được giữ trong Docker volume `caddy_data` trên VPS.
