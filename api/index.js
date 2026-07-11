import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function getRawBody(req) {
  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const rawString = Buffer.concat(buffers).toString('utf-8');
  return rawString ? JSON.parse(rawString) : {};
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-filename');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Khởi tạo cấu trúc bảng cơ bản
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      );
    `);

    // TỰ ĐỘNG VÁ LỖI THIẾU CỘT CHO BẢNG CŨ
    try {
      await client.execute(`ALTER TABLE users ADD COLUMN avatar_url TEXT;`);
    } catch (alterError) {
      // Cột đã tồn tại hoặc bảng đã được cập nhật, bỏ qua lỗi này
    }

    if (req.method === 'GET') {
      const result = await client.execute("SELECT * FROM users ORDER BY id DESC LIMIT 20");
      return res.status(200).json({ success: true, data: result.rows });
    }

    if (req.method === 'POST') {
      if (req.query.action === 'upload') {
        const filename = req.headers['x-filename'] || 'upload_image.png';
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

    return res.status(405).json({ success: false, error: "Method Not Allowed" });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
