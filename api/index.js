import { createClient } from '@libsql/client';
import { handleUpload } from '@vercel/blob/next';

// 1. Khởi tạo kết nối Turso SQL
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Cấu hình CORS cho phép Frontend tương tác mượt mà
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // TỰ ĐỘNG TẠO BẢNG 'users' (Thêm cột avatar_url để lưu link ảnh)
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
      // KIỂM TRA ĐƯỜNG DẪN: Nếu Frontend gọi đến để cấp quyền upload ảnh
      if (req.query.action === 'upload') {
        return await handleBlobUpload(req, res);
      }

      // Xử lý lưu thông tin Text vào SQL thông thường
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const { name, email, avatar_url } = body || {};

      if (!name || !email) {
        return res.status(400).json({ success: false, error: "Thiếu thông tin name hoặc email!" });
      }

      await client.execute({
        sql: "INSERT INTO users (name, email, avatar_url) VALUES (?, ?, ?)",
        args: [name, email, avatar_url || null]
      });

      return res.status(200).json({ success: true, message: "Lưu thông tin thành công!" });
    }

    return res.status(405).json({ success: false, error: "Phương thức không được hỗ trợ!" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

// Hàm xử lý tạo token xác thực an toàn cho Vercel Blob Storage
async function handleBlobUpload(req, res) {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
          tokenPayload: JSON.stringify({ userId: 'user-anonymous' }), // Có thể đổi thành ID người dùng thật nếu có hệ thống đăng nhập
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Tải tệp thành công lên Vercel Storage:', blob.url);
      },
    });
    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}
