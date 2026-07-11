import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';

// 1. Kết nối cơ sở dữ liệu Turso SQL
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Cấu hình CORS đầy đủ chống lỗi chặn trình duyệt cho môi trường Express/Node thuần của Vercel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-filename');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Khởi tạo bảng dữ liệu Xây dựng
    await client.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        budget TEXT,
        status TEXT,
        avatar_url TEXT
      );
    `);

    // ==========================================
    // LẤY DANH SÁCH CÔNG TRÌNH (GET)
    // ==========================================
    if (req.method === 'GET') {
      const result = await client.execute("SELECT * FROM projects ORDER BY id DESC LIMIT 30");
      return res.status(200).json({ success: true, data: result.rows });
    }

    // ==========================================
    // LƯU CÔNG TRÌNH / UPLOAD ẢNH (POST)
    // ==========================================
    if (req.method === 'POST') {
      const { action } = req.query;

      // LUỒNG 1: Xử lý upload ảnh trực tiếp lên Vercel Storage bằng cơ chế Stream thô của Node.js
      if (action === 'upload') {
        const filename = req.headers['x-filename'] || 'blueprint.png';
        
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const fileBuffer = Buffer.concat(buffers);

        const blob = await put(filename, fileBuffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return res.status(200).json({ success: true, url: blob.url });
      }

      // LUỒNG 2: Ghi nhận thông tin công trình vào Turso SQL từ Body đã tự động parse nếu có
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      } else if (!body || Object.keys(body).length === 0) {
        // Giải pháp vá lỗi: Nếu req.body bị trống do Vercel Stream, tự động bóc tách từ stream thô
        const buffers = [];
        for await (const chunk of req) {
          buffers.push(chunk);
        }
        const rawString = Buffer.concat(buffers).toString('utf-8');
        body = rawString ? JSON.parse(rawString) : {};
      }

      const { name, location, budget, status, avatar_url } = body || {};

      if (!name || !location) {
        return res.status(400).json({ success: false, error: "Tên dự án và Vị trí không được để trống!" });
      }

      await client.execute({
        sql: "INSERT INTO projects (name, location, budget, status, avatar_url) VALUES (?, ?, ?, ?, ?)",
        args: [name.trim(), location.trim(), budget || '', status || 'Đang thi công', avatar_url || null]
      });

      return res.status(200).json({ success: true, message: "Đăng ký dự án thành công!" });
    }

    return res.status(405).json({ success: false, error: "Method Not Allowed" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
