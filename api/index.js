import { createClient } from '@libsql/client';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob';

// 1. Khởi tạo kết nối Turso SQL
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Cấu hình CORS đầy đủ cho Frontend tương tác
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // TỰ ĐỘNG TẠO BẢNG 'users' NẾU CHƯA CÓ
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar_url TEXT
      );
    `);

    // ==========================================
    // XỬ LÝ LỆNH LẤY DỮ LIỆU (GET)
    // ==========================================
    if (req.method === 'GET') {
      const result = await client.execute("SELECT * FROM users ORDER BY id DESC LIMIT 20");
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ==========================================
    // XỬ LÝ LỆNH LƯU DỮ LIỆU (POST)
    // ==========================================
    if (req.method === 'POST') {
      
      // GIẢI PHÁP MỚI CHO STORAGE: Nếu Frontend yêu cầu cấp quyền Upload File
      if (req.query.action === 'upload') {
        let body = req.body;
        if (typeof body === 'string') body = JSON.parse(body);

        // Tạo mã Token an toàn cho phía Client dựa trên BLOB_READ_WRITE_TOKEN bảo mật của hệ thống
        const clientToken = await generateClientTokenFromReadWriteToken({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          payload: JSON.stringify({ userId: 'user-anonymous' }),
          maximumSizeInBytes: 5 * 1024 * 1024, // Giới hạn file tối đa 5MB
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif'],
        });

        return res.status(200).json({ clientToken, type: 'clientToken' });
      }

      // Xử lý lưu thông tin Text vào SQL thông thường
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const { name, email, avatar_url } = body || {};

      if (!name || !email) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin tên hoặc email!" });
      }

      await client.execute({
        sql: "INSERT INTO users (name, email, avatar_url) VALUES (?, ?, ?)",
        args: [name, email, avatar_url || null]
      });

      return res.status(200).json({ success: true, message: "Lưu thông tin thành công!" });
    }

    return res.status(405).json({ success: false, error: "Phương thức không được hỗ trợ!" });

  } catch (error) {
    // Trả về định dạng JSON lỗi thay vì làm sập trang trắng
    return res.status(500).json({ success: false, error: error.message });
  }
}
