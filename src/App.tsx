import { useState, useEffect, useRef } from 'react';

// Định nghĩa cấu trúc dữ liệu người dùng nhận về từ Turso SQL
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

  // 1. Tự động tải danh sách thành viên từ database khi mở trang web
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api');
      const result = await res.json();
      if (result.success) {
        setUsers(result.data);
      }
    } catch (err) {
      console.error('Không thể tải dữ liệu thành viên từ SQL:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Hàm xử lý upload ảnh lên Storage và lưu thông tin vào SQL
  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    let uploadedImageUrl = '';

    try {
      // BƯỚC A: Kiểm tra nếu người dùng có chọn file -> Tiến hành tải lên Vercel Storage trước
      if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
        const file = fileInputRef.current.files[0];
        setMessage('⏳ Đang tải hình ảnh lên Vercel Storage...');
        
        // Gửi tệp nhị phân trực tiếp sang API xử lý luồng upload của backend
        const uploadResponse = await fetch('/api?action=upload', {
          method: 'POST',
          headers: {
            'x-filename': encodeURIComponent(file.name), // Gửi tên file qua Header bảo mật
          },
          body: file // Truyền trực tiếp đối tượng file nhị phân
        });

        const uploadResult = await uploadResponse.json();
        
        if (uploadResult.success) {
          uploadedImageUrl = uploadResult.url; // Giữ lại đường dẫn ảnh vừa tạo
        } else {
          throw new Error(uploadResult.error || 'Không nhận được đường dẫn từ Storage.');
        }
      }

      // BƯỚC B: Gửi dữ liệu Text kèm link ảnh vừa có sang Turso SQL để lưu trữ
      setMessage('⏳ Đang đồng bộ thông tin vào Turso SQL...');
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' // Khai báo bắt buộc để backend giải mã JSON
        },
        body: JSON.stringify({
          name: name,
          email: email,
          avatar_url: uploadedImageUrl // Lưu link ảnh từ Storage vào SQL, nếu không có ảnh sẽ gửi chuỗi rỗng
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setMessage('🎉 Hoàn thành! Đã lưu mọi dữ liệu thành công.');
        setName(''); // Reset ô nhập tên
        setEmail(''); // Reset ô nhập email
        if (fileInputRef.current) fileInputRef.current.value = ''; // Xóa file ảnh đã chọn
        fetchUsers(); // Tải lại danh sách mới nhất vừa lưu
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
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email liên hệ:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
          />
        </div>

        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ảnh đại diện (Storage):</label>
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            style={{ width: '100%' }} 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          style={{ width: '100%', padding: '12px', backgroundColor: '#0070f3', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Vui lòng đợi...' : 'Lưu tất cả dữ liệu'}
        </button>
      </form>

      {/* THÔNG BÁO TRẠNG THÁI */}
      {message && (
        <div style={{ padding: '10px', textAlign: 'center', background: '#eef6ff', borderRadius: '6px', color: '#0056b3', fontWeight: 'bold', marginBottom: '20px' }}>
          {message}
        </div>
      )}

      {/* DANH SÁCH DỮ LIỆU ĐÃ LƯU */}
      <h3>Danh sách thành viên hiện có (Turso SQL)</h3>
      <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '6px', padding: '10px', background: '#fff' }}>
        {users.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center' }}>Chưa có dữ liệu nào được lưu trong Database.</p>
        ) : (
          users.map((u) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
              {u.avatar_url ? (
                <img 
                  src={u.avatar_url} 
                  alt="avatar" 
                  style={{ width: '45px', height: '45px', borderRadius: '50%', marginRight: '15px', objectFit: 'cover', border: '1px solid #ddd' }} 
                />
              ) : (
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#ccc', marginRight: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: 'bold' }}>
                  NO IMG
                </div>
              )}
              <div>
                <strong style={{ color: '#333', fontSize: '15px' }}>{u.name}</strong>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>{u.email}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
