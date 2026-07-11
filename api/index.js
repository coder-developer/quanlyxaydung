import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
  try {
    // Lấy dữ liệu từ Postgres SQL của Vercel
    const { rows } = await sql`SELECT * FROM users LIMIT 10;`;
    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
