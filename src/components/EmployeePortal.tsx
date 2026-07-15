import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { CalendarDays, CheckCircle2, Clock, LogOut, MapPin, Wallet } from 'lucide-react';
import type { CompanyConfig, Employee, LaborContract, Project, Timesheet } from '../types';
import { apiFetch } from '../lib/api';
import { subscribeRealtime } from '../lib/realtime';
import ChangePinButton from './ChangePinButton';

interface Props {
  employeeId: string;
  employees: Employee[];
  projects: Project[];
  timesheets: Timesheet[];
  setTimesheets: Dispatch<SetStateAction<Timesheet[]>>;
  laborContracts: LaborContract[];
  companyConfig: CompanyConfig;
  onLogout: () => void;
}

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);

export default function EmployeePortal({ employeeId, employees, projects, timesheets, setTimesheets, laborContracts, companyConfig, onLogout }: Props) {
  const employee = employees.find(item => item.id === employeeId);
  const [message, setMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]); const [shifts, setShifts] = useState<any[]>([]); const [notifications, setNotifications] = useState<any[]>([]);
  const [requestForm, setRequestForm] = useState({ requestType: 'leave', startAt: '', endAt: '', reason: '', amount: 0 });
  const [photo, setPhoto] = useState<string | undefined>(); const [photoConsent, setPhotoConsent] = useState(false);
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const ownTimesheets = useMemo(() => timesheets.filter(item => item.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date)), [timesheets, employeeId]);
  const monthRows = ownTimesheets.filter(item => {
    const date = new Date(`${item.date}T00:00:00`);
    return date.getMonth() + 1 === month && date.getFullYear() === year;
  });
  const todayRow = ownTimesheets.find(item => item.date === today);
  const presentDays = monthRows.filter(item => item.status !== 'Absent').length;
  const contract = laborContracts.find(item => item.employeeId === employeeId && item.status === 'Active');
  const isDaily = employee?.type === 'Seasonal' || contract?.salaryType === 'Daily';
  const base = contract?.salaryAmount || employee?.baseSalary || 0;
  const allowance = contract?.allowance || 0;
  const estimatedSalary = isDaily ? base * presentDays + allowance : base / 26 * presentDays + allowance;
  const project = projects.find(item => item.id === employee?.projectId);
  const loadWorkforce = useCallback(() => Promise.all([apiFetch('/api/workforce/requests'),apiFetch('/api/workforce/shifts'),apiFetch('/api/notifications')]).then(([r,s,n])=>{setRequests(r);setShifts(s);setNotifications(n)}).catch(()=>{}), []);
  useEffect(() => {
    loadWorkforce();
    const unsubscribe = subscribeRealtime(['notifications', 'workforce_requests', 'shifts'], loadWorkforce);
    const fallback = window.setInterval(loadWorkforce, 30_000);
    return () => { unsubscribe(); window.clearInterval(fallback); };
  }, [loadWorkforce]);
  const distanceMeters = (lat1:number,lon1:number,lat2:number,lon2:number) => { const r=6371000; const dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; return 2*r*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); };

  const markAttendance = () => {
    if (!employee) return;
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (todayRow?.checkOutTime) {
      setMessage('Hôm nay bạn đã hoàn tất chấm công.');
      return;
    }
    if (todayRow) {
      setTimesheets(rows => rows.map(row => row.id === todayRow.id ? { ...row, checkOutTime: time } : row));
      setMessage(`Đã ghi nhận giờ ra lúc ${time}.`);
      return;
    }
    const create = (latitude = 0, longitude = 0, gpsStatus: Timesheet['gpsStatus'] = 'Out-Of-Range') => {
      if (project?.latitude && project?.longitude) gpsStatus = distanceMeters(latitude, longitude, project.latitude, project.longitude) <= (project.geofenceRadius || 200) ? 'In-Range' : 'Out-Of-Range';
      if (photo && !photoConsent) { setMessage('Vui lòng đồng ý chính sách ảnh chấm công trước khi tiếp tục.'); return; }
      setTimesheets(rows => [...rows, {
        id: `ts-${employeeId}-${Date.now()}`, employeeId, projectId: employee.projectId, date: today,
        checkInTime: time, checkOutTime: null, status: now.getHours() >= 8 ? 'Late' : 'Present',
        latitude, longitude, gpsStatus, verifiedByFace: Boolean(photo), attendancePhoto: photo,
      }]);
      setMessage(`Đã điểm danh lúc ${time}${gpsStatus === 'In-Range' ? ' và xác nhận vị trí.' : '.'}`);
    };
    if (!navigator.geolocation) return create();
    navigator.geolocation.getCurrentPosition(
      position => create(position.coords.latitude, position.coords.longitude, 'In-Range'),
      () => create(),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const submitRequest = async () => { await apiFetch('/api/workforce/requests',{method:'POST',body:JSON.stringify(requestForm)}); setMessage('Đã gửi yêu cầu tới Chỉ huy trưởng.'); setRequestForm({...requestForm,reason:'',amount:0}); loadWorkforce(); };
  const printPayslip = async () => { await apiFetch(`/api/payslips/${year}-${String(month).padStart(2,'0')}/viewed`,{method:'POST'}); const popup=window.open('','_blank'); if(!popup)return; popup.document.write(`<html><head><title>Phiếu lương ${month}-${year}</title><style>body{font-family:Arial;padding:40px}table{width:100%;border-collapse:collapse}td{border:1px solid #ccc;padding:10px}.total{font-size:22px;font-weight:bold}</style></head><body><h2>${companyConfig.companyName}</h2><h1>PHIẾU LƯƠNG THÁNG ${month}/${year}</h1><p>Nhân viên: <b>${employee.name}</b></p><table><tr><td>Ngày công</td><td>${presentDays}</td></tr><tr><td>Lương cơ sở</td><td>${money(base)}</td></tr><tr><td>Phụ cấp</td><td>${money(allowance)}</td></tr><tr><td class="total">Tạm tính</td><td class="total">${money(estimatedSalary)}</td></tr></table><p>Đã xem trên hệ thống lúc ${new Date().toLocaleString('vi-VN')}</p></body></html>`); popup.document.close(); setTimeout(() => popup.print(), 250); };

  if (!employee) return <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Tài khoản chưa được liên kết với hồ sơ nhân viên.</div>;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white px-4 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div><div className="text-xs font-bold text-cyan-400 uppercase">{companyConfig.appTitle || 'Quản trị doanh nghiệp'} • Cổng nhân viên</div><h1 className="font-black text-lg">{employee.name}</h1></div>
          <div className="flex items-center gap-3"><div className="bg-white rounded-lg px-2 py-1"><ChangePinButton onChanged={onLogout}/></div><button onClick={onLogout} className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold hover:bg-slate-700"><LogOut className="w-4 h-4" />Đăng xuất</button></div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">
        {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</div>}
        <section className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 rounded-2xl bg-gradient-to-br from-cyan-700 to-blue-800 p-6 text-white shadow-lg">
            <p className="text-xs font-bold uppercase text-cyan-100">Điểm danh hôm nay • {today}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div><div className="text-3xl font-black">{todayRow ? todayRow.checkInTime : '--:--'}</div><div className="text-sm text-cyan-100">{todayRow ? (todayRow.checkOutTime ? `Đã ra: ${todayRow.checkOutTime}` : 'Đang trong ca') : 'Chưa chấm công'}</div></div>
              <button onClick={markAttendance} className="rounded-xl bg-white px-5 py-3 font-black text-blue-800 shadow hover:bg-cyan-50">{todayRow ? 'Chấm giờ ra' : 'Chấm công vào'}</button>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200"><MapPin className="w-5 h-5 text-rose-500"/><div className="mt-3 text-xs font-bold uppercase text-slate-400">Công trường</div><div className="font-black mt-1">{project?.name || 'Chưa phân công'}</div><div className="text-xs text-slate-500 mt-1">{employee.role}</div></div>
        </section>
        <section className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-5 border border-slate-200"><CalendarDays className="text-blue-600"/><div className="text-2xl font-black mt-3">{presentDays} ngày</div><div className="text-xs text-slate-500">Công tháng {month}/{year}</div></div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200"><Clock className="text-amber-600"/><div className="text-2xl font-black mt-3">{monthRows.filter(item => item.status === 'Late').length}</div><div className="text-xs text-slate-500">Lần đi muộn</div></div>
          <div className="rounded-2xl bg-white p-5 border border-slate-200"><Wallet className="text-emerald-600"/><div className="text-xl font-black mt-3">{money(estimatedSalary)}</div><div className="text-xs text-slate-500">Lương tạm tính tháng này</div></div>
        </section>
        <section className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5"><h2 className="font-black">Ảnh xác minh & geofence</h2><p className="text-xs text-slate-500 mt-1">Ảnh chỉ dùng xác minh chấm công, được lưu cùng bản ghi và áp dụng theo sự đồng ý của bạn.</p><input className="mt-3 text-sm" type="file" accept="image/*" capture="user" onChange={e=>{const file=e.target.files?.[0];if(file&&file.size<1500000){const reader=new FileReader();reader.onload=()=>setPhoto(String(reader.result));reader.readAsDataURL(file)}else setMessage('Ảnh phải nhỏ hơn 1,5 MB.')}}/><label className="flex gap-2 mt-3 text-xs"><input type="checkbox" checked={photoConsent} onChange={async e=>{setPhotoConsent(e.target.checked);await apiFetch('/api/privacy/attendance-photo',{method:'PUT',body:JSON.stringify({consent:e.target.checked})})}}/>Tôi đồng ý sử dụng ảnh cho mục đích xác minh chấm công và có thể thu hồi đồng ý.</label>{photo&&<img src={photo} className="mt-3 w-24 h-24 object-cover rounded-xl" alt="Ảnh xác minh"/>}</div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5"><h2 className="font-black">Phiếu lương cá nhân</h2><div className="text-2xl font-black text-emerald-700 mt-4">{money(estimatedSalary)}</div><p className="text-xs text-slate-500">Tạm tính tháng {month}/{year}</p><button onClick={printPayslip} className="mt-4 rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm font-bold">In / Lưu PDF & xác nhận đã xem</button></div>
        </section>
        <section className="grid lg:grid-cols-2 gap-4"><div className="rounded-2xl bg-white border p-5"><h2 className="font-black mb-3">Gửi yêu cầu</h2><div className="grid gap-2"><select className="border rounded p-2" value={requestForm.requestType} onChange={e=>setRequestForm({...requestForm,requestType:e.target.value})}><option value="leave">Nghỉ phép</option><option value="salary_advance">Tạm ứng lương</option><option value="overtime">Tăng ca</option><option value="business_trip">Công tác</option><option value="shift_swap">Đổi ca</option></select>{requestForm.requestType==='salary_advance'&&<input type="number" min="1" max="1000000000" step="1000" className="border rounded p-2" placeholder="Số tiền tạm ứng" value={requestForm.amount||''} onChange={e=>setRequestForm({...requestForm,amount:Number(e.target.value)})}/>}<input type="datetime-local" className="border rounded p-2" value={requestForm.startAt} onChange={e=>setRequestForm({...requestForm,startAt:e.target.value})}/><input type="datetime-local" className="border rounded p-2" value={requestForm.endAt} onChange={e=>setRequestForm({...requestForm,endAt:e.target.value})}/><textarea className="border rounded p-2" placeholder="Lý do" value={requestForm.reason} onChange={e=>setRequestForm({...requestForm,reason:e.target.value})}/><button onClick={()=>submitRequest().catch(e=>setMessage(e.message))} className="bg-blue-600 text-white rounded p-2 font-bold">Gửi phê duyệt</button></div><div className="mt-3 text-xs">{requests.slice(0,4).map(r=><div key={r.id}>{r.request_type==='salary_advance'?'Tạm ứng lương':r.request_type}{r.request_type==='salary_advance'?` (${money(Number(r.amount||0))})`:''}: <b>{r.status}</b></div>)}</div></div><div className="rounded-2xl bg-white border p-5"><h2 className="font-black">Lịch ca & Thông báo</h2>{shifts.slice(0,5).map(s=><div key={s.id} className="border-b py-2 text-sm"><b>{s.shift_date}</b> • {s.shift_name} {s.start_time}-{s.end_time}</div>)}<h3 className="font-bold mt-4">Thông báo mới</h3>{notifications.slice(0,5).map(n=><div key={n.id} className="mt-2 rounded bg-amber-50 p-2 text-xs"><b>{n.title}</b><br/>{n.message}</div>)}</div></section>
        <section className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200"><h2 className="font-black">Bảng chấm công cá nhân</h2><p className="text-xs text-slate-500">Chỉ hiển thị dữ liệu của tài khoản đang đăng nhập</p></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3 text-left">Ngày</th><th className="p-3 text-left">Giờ vào</th><th className="p-3 text-left">Giờ ra</th><th className="p-3 text-left">Trạng thái</th><th className="p-3 text-left">Vị trí</th></tr></thead><tbody>{ownTimesheets.slice(0, 31).map(row => <tr key={row.id} className="border-t border-slate-100"><td className="p-3 font-semibold">{row.date}</td><td className="p-3">{row.checkInTime}</td><td className="p-3">{row.checkOutTime || '—'}</td><td className="p-3"><span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-4 h-4"/>{row.status}</span></td><td className="p-3">{row.gpsStatus}</td></tr>)}</tbody></table></div>
        </section>
      </main>
    </div>
  );
}
