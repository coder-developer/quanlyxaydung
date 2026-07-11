import { useState, useEffect, useRef } from 'react';
import { upload } from '@vercel/blob/client';

interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Hàm tải danh sách người dùng từ database hiển thị lên màn hình
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api');
      const result = await res.json();
      if (result.success) setUsers(result.data);
    } catch (err) {
      console.error('Không thể tải dữ liệu:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Hàm xử lý upload tệp và lưu toàn bộ thông tin
  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    let uploadedImageUrl = '';

    try {
      // BƯỚC A: Kiểm tra và tải ảnh lên Vercel Storage trước (nếu có chọn file)
      if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
        const file = fileInputRef.current.files[0];
        setMessage('⏳ Đang tải hình ảnh lên Storage...');
        
        const newBlob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api?action=upload', // Gọi đến hàm bảo mật của backend ở Bước 2
        });
        uploadedImageUrl = newBlob.url; // Lấy link ảnh sau khi up thành công
      }

      // BƯỚC B: Gửi dữ liệu Text kèm link ảnh vừa có sang Turso SQL để lưu trữ
      setMessage('⏳ Đang đồng bộ lưu vào Turso SQL...');
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          avatar_url: uploadedImageUrl // Lưu link ảnh vào SQL
        }),
      });

      const result = await response.json();
      if (result.success) {
        setMessage('🎉 Hoàn thành! Đã lưu mọi dữ liệu thành công.');
        setName('');
        setEmail('');
        if (fileInputRef.current) fileInputRef.current.value = ''; // Xóa file đã chọn
        fetchUsers(); // Tải lại danh sách mới
      } else {
        setMessage(`❌ Thất bại: ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Lỗi hệ thống: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '30px auto', padding: '20px', border: '1px solid #ddd', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Hệ thống Quản lý dữ liệu & Storage</h2>
      
      {/* FORM NHẬP DỮ LIỆU */}
      <form onSubmit={handleSaveData} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px', marginBottom: '25px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Họ và tên:</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email liên hệ:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ảnh đại diện (Storage):</label>
          <input type="file" ref={fileInputRef} accept="image/*" style={{ width: '100%' }} />
        </div>

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? 'Vui lòng đợi...' : 'Lưu tất cả dữ liệu'}
        </button>
      </form>

      {message && <div style={{ padding: '10px', textAlign: 'center', background: '#eef6ff', borderRadius: '6px', color: '#0056b3', fontWeight: 'bold', marginBottom: '20px' }}>{message}</div>}

      {/* DANH SÁCH DỮ LIỆU ĐÃ LƯU */}
      <h3>Danh sách thành viên hiện có (Turso SQL)</h3>
      <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
        {users.length === 0 ? <p style={{ color: '#888' }}>Chưa có dữ liệu nào được lưu.</p> : (
          users.map((u) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '15px', objectFit: 'cover', border: '1px solid #ddd' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#ccc', marginRight: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#fff' }}>No IMg</div>
              )}
              <div>
                <strong style={{ color: '#333' }}>{u.name}</strong>
                <div style={{ fontSize: '13px', color: '#666' }}>{u.email}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
