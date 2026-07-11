import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';

// 1. Kết nối cơ sở dữ liệu Turso SQL
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Hàm đọc dữ liệu dạng thô (Stream Buffer) từ Frontend gửi lên
async function getRawBody(req) {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const rawString = Buffer.concat(buffers).toString('utf-8');
  return rawString ? JSON.parse(rawString) : {};
}

export default async function handler(req, res) {
  // Cấu hình CORS đầy đủ chống lỗi chặn trình duyệt
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-filename'); // Cho phép nhận tên file từ header

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
    // XỬ LÝ LỆNH LẤY DỮ LIỆU (GET)
    // ==========================================
    if (req.method === 'GET') {
      const result = await client.execute("SELECT * FROM users ORDER BY id DESC LIMIT 20");
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ==========================================
    // XỬ LÝ LỆNH LƯU DỮ LIỆU/UPLOAD (POST)
    // ==========================================
    if (req.method === 'POST') {
      
      // LUỒNG XỬ LÝ 1: Frontend gọi chuyên biệt để Tải ảnh trực tiếp lên Vercel Storage
      if (req.query.action === 'upload') {
        const filename = req.headers['x-filename'] || 'upload_image.png';
        
        // Đọc dữ liệu nhị phân của file từ request stream
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const fileBuffer = Buffer.concat(buffers);

        // Đẩy tệp thẳng lên Vercel Blob bằng mã Token nội bộ của Server
        const blob = await put(filename, fileBuffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return res.status(200).json({ success: true, url: blob.url });
      }

      // LUỒNG XỬ LÝ 2: Lưu dữ liệu Text kèm link ảnh vào Turso SQL thông thường
      const body = await getRawBody(req);
      const { name, email, avatar_url } = body;

      if (!name || !email) {
        return res.status(400).json({ success: false, error: "Tên hoặc Email không được để trống!" });
      }

      await client.execute({
        sql: "INSERT INTO users (name, email, avatar_url) VALUES (?, ?, ?)",
        args: [name.trim(), email.trim(), avatar_url || null]
      });

      return res.status(200).json({ success: true, message: "Dữ liệu được lưu thành công!" });
    }

    return res.status(405).json({ success: false, error: "Phương thức không được hỗ trợ!" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
