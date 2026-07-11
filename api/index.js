import { createClient } from '@libsql/client';

// Vercel tự động nạp TURSO_DATABASE_URL và TURSO_AUTH_TOKEN khi bạn liên kết
const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Hỗ trợ CORS nếu gọi từ giao diện Frontend độc lập
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'POST') {
      // Lấy dữ liệu gửi lên từ giao diện Frontend
      const { name, email } = req.body;

      // Thực hiện câu lệnh lưu dữ liệu vào Turso SQL
      await client.execute({
        sql: "INSERT INTO users (name, email) VALUES (?, ?)",
        args: [name, email]
      });

      return res.status(200).json({ success: true, message: "Lưu vào Turso thành công!" });
    } 

    if (req.method === 'GET') {
      // Lấy danh sách dữ liệu ra ngoài
      const result = await client.execute("SELECT * FROM users LIMIT 10");
      return res.status(200).json({ success: true, data: result.rows });
    }

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
