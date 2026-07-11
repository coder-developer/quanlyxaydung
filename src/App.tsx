import { useState, useEffect, useRef } from 'react';

interface Project {
  id: number;
  name: string;
  location: string;
  budget: string;
  status: string;
  avatar_url: string | null;
}

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState('Đang thi công');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api');
      const result = await res.json();
      if (result.success) setProjects(result.data);
    } catch (err) {
      console.error('Lỗi kết nối API lấy danh sách:', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    let uploadedImageUrl = '';

    try {
      if (fileInputRef.current?.files && fileInputRef.current.files[0]) {
        const file = fileInputRef.current.files[0];
        setMessage('⏳ Đang tải ảnh bản vẽ phối cảnh lên Vercel Storage...');
        
        const uploadResponse = await fetch('/api?action=upload', {
          method: 'POST',
          headers: { 'x-filename': encodeURIComponent(file.name) },
          body: file
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.success) uploadedImageUrl = uploadResult.url;
      }

      setMessage('⏳ Đang đồng bộ thông tin dự án vào Turso SQL...');
      const response = await fetch('/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, location, budget, status, avatar_url: uploadedImageUrl }),
      });

      const result = await response.json();
      if (result.success) {
        setMessage('🎉 Thêm dự án xây dựng vào hệ thống thành công!');
        setName('');
        setLocation('');
        setBudget('');
        setStatus('Đang thi công');
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchProjects();
      } else {
        setMessage(`❌ Lỗi lưu trữ: ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ Lỗi kết nối mạng: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: '"Segoe UI", Roboto, sans-serif', backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '25px' }}>
      <header style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 30px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>🏗️ HỆ THỐNG QUẢN LÝ XÂY DỰNG ERP</h1>
        <div style={{ fontSize: '13px', background: '#1e293b', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155' }}>Cơ sở dữ liệu: <span style={{ color: '#10b981', fontWeight: 'bold' }}>Turso SQL Live</span></div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', maxWidth: '1240px', margin: '0 auto' }}>
        
        {/* KHỐI THÊM MỚI */}
        <section style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', height: 'fit-content' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '18px' }}>Khởi tạo Dự án Mới</h3>
          <form onSubmit={handleAddProject}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#475569' }}>Tên công trình/Dự án:</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Chung cư Diamond Riverside" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#475569' }}>Địa điểm thi công:</label>
              <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ví dụ: Quận 7, TP. Hồ Chí Minh" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#475569' }}>Dự toán ngân sách:</label>
              <input type="text" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="Ví dụ: 45 Tỷ VNĐ" required style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#475569' }}>Trạng thái dự án:</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '14px' }}>
                <option value="Đang thi công">🟢 Đang thi công</option>
                <option value="Chuẩn bị khởi công">🟡 Chuẩn bị khởi công</option>
                <option value="Đã hoàn thành">🔵 Đã hoàn thành</option>
                <option value="Tạm dừng">🔴 Tạm dừng</option>
              </select>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#475569' }}>Ảnh phối cảnh thiết kế:</label>
              <input type="file" ref={fileInputRef} accept="image/*" style={{ fontSize: '13px', color: '#64748b', width: '100%' }} />
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Đang thực hiện...' : '🧱 Đăng ký công trình'}
            </button>
          </form>

          {message && (
            <div style={{ marginTop: '15px', padding: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#166534', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
              {message}
            </div>
          )}
        </section>

        {/* KHỐI HIỂN THỊ DANH SÁCH */}
        <section style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px', fontSize: '18px' }}>Danh mục Công trình đang giám sát</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', maxHeight: '630px', overflowY: 'auto', paddingRight: '5px' }}>
            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0' }}>
                <span style={{ fontSize: '45px' }}>📋</span>
                <p style={{ margin: '15px 0 0 0', fontSize: '15px' }}>Chưa có công trình nào được cập nhật trong cơ sở dữ liệu.</p>
              </div>
            ) : (
              projects.map((p) => (
                <div key={p.id} style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#f8fafc', alignItems: 'center' }}>
                  
                  {/* Khối ảnh thực tế từ Vercel Storage */}
                  <div style={{ width: '130px', height: '90px', borderRadius: '6px', backgroundColor: '#e2e8f0', marginRight: '20px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #cbd5e1' }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="Bản vẽ" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600', textAlign: 'center', padding: '5px' }}>CHƯA CÓ BẢN VẼ</span>
                    )}
                  </div>
                  
                  {/* Khối text thông tin */}
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <h4 style={{ margin: 0, color: '#0f172a', fontSize: '18px', fontWeight: 600 }}>{p.name}</h4>
                      <span style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', backgroundColor: p.status?.includes('hoàn thành') ? '#dcfce7' : p.status?.includes('tạm dừng') ? '#fee2e2' : '#e0f2fe', color: p.status?.includes('hoàn thành') ? '#15803d' : p.status?.includes('tạm dừng') ? '#b91c1c' : '#0369a1', fontWeight: 'bold' }}>
                        {p.status || 'Đang thi công'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#475569' }}>
                      <div>📍 <strong>Vị trí:</strong> {p.location}</div>
