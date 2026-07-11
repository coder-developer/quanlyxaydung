import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // TỰ ĐỘNG TẠO BẢNG NẾU CHƯA CÓ TRONG DATABASE
    await client.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL
      );
    `);

    if (req.method === 'POST') {
      const { name, email } = req.body;
      await client.execute({
        sql: "INSERT INTO users (name, email) VALUES (?, ?)",
        args: [name, email]
      });
      return res.status(200).json({ success: true, message: "Lưu vào Turso thành công!" });
    } 
    
    if (req.method === 'GET') {
      const result = await client.execute("SELECT * FROM users LIMIT 10");
      return res.status(200).json({ success: true, data: result.rows });
    }

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
