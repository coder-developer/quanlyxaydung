import { createClient } from '@libsql/client';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob';

// 1. Kết nối cơ sở dữ liệu Turso SQL
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Hàm hỗ trợ đọc dữ liệu thô (Stream Buffer) từ Client gửi lên cho Node.js thô
async function getRawBody(req) {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const rawString = Buffer.concat(buffers).toString('utf-8');
  return rawString ? JSON.parse(rawString) : {};
}

export default async function handler(req, res) {
  // Thiết lập CORS đầy đủ chống chặn kết nối
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Tự động kiểm tra và khởi tạo bảng SQL cấu trúc mới
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar_url TEXT
      );
    `);

    // ==========================================
    // XỬ LÝ LỆNH GET
    // ==========================================
    if (req.method === 'GET') {
      const result = await client.execute("SELECT * FROM users ORDER BY id DESC LIMIT 20");
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ==========================================
    // XỬ LÝ LỆNH POST
    // ==========================================
    if (req.method === 'POST') {
      // Đọc toàn bộ dữ liệu thô được gửi lên an toàn
      const body = await getRawBody(req);

      // Nhận diện luồng upload ảnh lên Storage
      if (req.query.action === 'upload') {
        const clientToken = await generateClientTokenFromReadWriteToken({
          token: process.env.BLOB_READ_WRITE_TOKEN,
          payload: JSON.stringify({ userId: 'user-anonymous' }),
          maximumSizeInBytes: 4 * 1024 * 1024, // Giới hạn tệp tối đa 4MB
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/gif'],
        });

        return res.status(200).json({ clientToken, type: 'clientToken' });
      }

      // Xử lý luồng lưu text vào Database SQL
      const { name, email, avatar_url } = body;

      if (!name || !email) {
        return res.status(400).json({ success: false, error: "Tên hoặc Email không được để trống!" });
      }

      await client.execute({
        sql: "INSERT INTO users (name, email, avatar_url) VALUES (?, ?, ?)",
        args: [name, email, avatar_url || null]
      });

      return res.status(200).json({ success: true, message: "Dữ liệu được lưu thành công!" });
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" });

  } catch (error) {
    // Trả về JSON chứa thông báo lỗi để hiển thị trực tiếp lên màn hình Client
    return res.status(500).json({ success: false, error: error.message });
  }
}
