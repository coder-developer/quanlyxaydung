import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-filename',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // KHỞI TẠO BẢNG CHUẨN QUẢN LÝ XÂY DỰNG
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

    const urlObj = new URL(request.url);
    const action = urlObj.searchParams.get('action');

    // ==========================================
    // LẤY DANH SÁCH CÔNG TRÌNH (GET)
    // ==========================================
    if (request.method === 'GET') {
      const result = await client.execute("SELECT * FROM projects ORDER BY id DESC LIMIT 30");
      return new Response(JSON.stringify({ success: true, data: result.rows }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ==========================================
    // LƯU CÔNG TRÌNH / UPLOAD ẢNH (POST)
    // ==========================================
    if (request.method === 'POST') {
      
      // Luồng 1: Tải ảnh phối cảnh lên Vercel Storage
      if (action === 'upload') {
        const filename = request.headers.get('x-filename') || 'blueprint.png';
        const arrayBuffer = await request.arrayBuffer();
        const fileBuffer = Buffer.from(arrayBuffer);

        const blob = await put(filename, fileBuffer, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN
        });

        return new Response(JSON.stringify({ success: true, url: blob.url }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Luồng 2: Ghi nhận thông tin công trình vào Turso SQL
      const body = await request.json();
      const { name, location, budget, status, avatar_url } = body || {};

      if (!name || !location) {
        return new Response(JSON.stringify({ success: false, error: "Tên dự án và Vị trí không được để trống!" }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await client.execute({
        sql: "INSERT INTO projects (name, location, budget, status, avatar_url) VALUES (?, ?, ?, ?, ?)",
        args: [name.trim(), location.trim(), budget || '', status || 'Đang thi công', avatar_url || null]
      });

      return new Response(JSON.stringify({ success: true, message: "Đăng ký dự án thành công!" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405, headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
