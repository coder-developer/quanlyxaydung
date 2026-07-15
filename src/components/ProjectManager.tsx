import { useMemo, useState, type Dispatch, type FormEvent, type ReactElement, type SetStateAction } from 'react';
import { Building2, CalendarDays, Edit3, MapPin, Plus, Search, ShieldCheck, Trash2, Wallet, X } from 'lucide-react';
import type { Project, UserRole } from '../types';
import { normalizeBusinessId } from '../lib/businessIds';

interface Props {
  projects: Project[];
  setProjects: Dispatch<SetStateAction<Project[]>>;
  role: UserRole;
}

type ProjectForm = Omit<Project, 'id'>;

const emptyForm = (): ProjectForm => ({
  code: '',
  name: '',
  location: '',
  budget: 0,
  spent: 0,
  progress: 0,
  manager: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  status: 'Planning',
  latitude: undefined,
  longitude: undefined,
  geofenceRadius: 200,
});

const statusLabel: Record<Project['status'], string> = {
  Planning: 'Chuẩn bị', Active: 'Đang thi công', Delayed: 'Chậm tiến độ', Completed: 'Hoàn thành',
};

const statusStyle: Record<Project['status'], string> = {
  Planning: 'bg-sky-50 text-sky-700 border-sky-200',
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Delayed: 'bg-rose-50 text-rose-700 border-rose-200',
  Completed: 'bg-slate-100 text-slate-700 border-slate-200',
};

const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value || 0);

export default function ProjectManager({ projects, setProjects, role }: Props) {
  const canCreateDelete = role === 'CEO';
  const canEdit = role === 'CEO' || role === 'SiteManager';
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | Project['status']>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const filtered = useMemo(() => projects.filter(project => {
    const term = query.trim().toLowerCase();
    const matchesText = !term || [project.code, project.name, project.location, project.manager].some(value => String(value || '').toLowerCase().includes(term));
    return matchesText && (status === 'all' || project.status === status);
  }), [projects, query, status]);

  const openCreate = () => {
    setFormOpen(true);
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  };

  const openEdit = (project: Project) => {
    setFormOpen(true);
    setEditingId(project.id);
    const { id: _id, ...values } = project;
    setForm({ ...emptyForm(), ...values });
    setError('');
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(emptyForm());
    setError('');
  };

  const removeProject = (project: Project) => {
    if (!canCreateDelete || !window.confirm(`Xóa dự án ${project.name}? Hợp đồng, giao dịch, chấm công và dữ liệu liên quan sẽ được xử lý đồng bộ.`)) return;
    setProjects(current => current.filter(item => item.id !== project.id));
    setNotice('Đã xóa dự án và đang dọn dữ liệu liên quan.');
    window.setTimeout(() => setNotice(''), 2500);
  };

  const update = <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => setForm(current => ({ ...current, [key]: value }));

  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || (!editingId && !canCreateDelete)) return;
    const rawCode = String(form.code || '').trim();
    const code = normalizeBusinessId(rawCode, 'DA-001');
    const name = form.name.trim();
    const location = form.location.trim();
    if (!rawCode || !name || !location || !form.startDate || !form.endDate) {
      setError('Vui lòng nhập mã, tên, địa điểm và thời gian dự án.');
      return;
    }
    if (projects.some(project => project.id !== editingId && String(project.code || '').toUpperCase() === code)) {
      setError('Mã dự án đã tồn tại.');
      return;
    }
    if (form.endDate < form.startDate) {
      setError('Ngày kết thúc phải sau hoặc bằng ngày khởi công.');
      return;
    }
    if (form.budget < 0 || form.spent < 0 || form.progress < 0 || form.progress > 100) {
      setError('Ngân sách, chi phí và tiến độ không hợp lệ.');
      return;
    }
    if ((form.latitude == null) !== (form.longitude == null)) {
      setError('Cần nhập đủ cả vĩ độ và kinh độ geofence.');
      return;
    }
    if ((form.latitude != null && (form.latitude < -90 || form.latitude > 90)) || (form.longitude != null && (form.longitude < -180 || form.longitude > 180))) {
      setError('Tọa độ công trường nằm ngoài phạm vi hợp lệ.');
      return;
    }
    let values: ProjectForm = { ...form, code, name, location, manager: form.manager.trim(), geofenceRadius: Math.max(50, Number(form.geofenceRadius || 200)) };
    if (role === 'SiteManager' && editingId) {
      const current = projects.find(project => project.id === editingId);
      if (!current) return;
      values = { ...values, code: current.code, manager: current.manager, budget: current.budget, spent: current.spent };
    }
    if (editingId) {
      setProjects(current => current.map(project => project.id === editingId ? { ...project, ...values } : project));
      setNotice('Đã cập nhật dự án và chờ đồng bộ.');
    } else {
      setProjects(current => [...current, { id: code, ...values }]);
      setNotice('Đã tạo dự án mới và chờ đồng bộ.');
    }
    closeForm();
    window.setTimeout(() => setNotice(''), 2500);
  };

  const showForm = canEdit && formOpen;

  return <div className="space-y-5">
    {notice && <div className="fixed right-5 bottom-5 z-50 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white shadow-2xl">{notice}</div>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-blue-600"/><h2 className="text-lg font-black text-slate-900">Danh sách dự án</h2></div>
          <p className="mt-1 text-xs text-slate-500">Quản lý hồ sơ công trường, ngân sách, tiến độ và vùng chấm công.</p>
        </div>
        {canCreateDelete ? <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Plus className="h-4 w-4"/>Thêm dự án mới</button> : <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"><ShieldCheck className="h-4 w-4"/>{canEdit ? 'Quản lý dự án được bổ nhiệm' : 'Chế độ chỉ xem'}</span>}
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px]">
        <label className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã, tên, địa điểm, chỉ huy trưởng..." className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500"/></label>
        <select value={status} onChange={event => setStatus(event.target.value as typeof status)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="all">Tất cả trạng thái</option>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
    </section>

    {showForm && <ProjectFormPanel form={form} editing={Boolean(editingId)} managerMode={role === 'SiteManager'} error={error} onUpdate={update} onSave={save} onClose={closeForm}/>}

    <div className="grid gap-4 xl:grid-cols-2">
      {filtered.map(project => <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-widest text-blue-600">{project.code || project.id}</div><h3 className="mt-1 text-base font-black text-slate-900">{project.name}</h3></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyle[project.status]}`}>{statusLabel[project.status]}</span></div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <Info icon={<MapPin/>} label="Địa điểm" value={project.location}/>
          <Info icon={<ShieldCheck/>} label="Chỉ huy trưởng" value={project.manager || 'Chưa phân công'}/>
          <Info icon={<Wallet/>} label="Ngân sách" value={money(project.budget)}/>
          <Info icon={<CalendarDays/>} label="Thời gian" value={`${project.startDate} → ${project.endDate}`}/>
        </div>
        <div className="mt-4"><div className="mb-1.5 flex justify-between text-[10px] font-bold text-slate-500"><span>TIẾN ĐỘ</span><span>{project.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }}/></div></div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span>Đã chi: <b className="text-slate-800">{money(project.spent)}</b></span>{canEdit && <div className="flex gap-2"><button onClick={() => openEdit(project)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-blue-700 hover:bg-blue-50"><Edit3 className="h-3.5 w-3.5"/>Chỉnh sửa</button>{canCreateDelete && <button onClick={() => removeProject(project)} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 font-bold text-rose-700 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5"/>Xóa</button>}</div>}</div>
      </article>)}
    </div>
    {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-500">Không tìm thấy dự án phù hợp.</div>}
  </div>;
}

function Info({ icon, label, value }: { icon: ReactElement; label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-400">{icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}{label}</div><div className="mt-1 font-bold text-slate-700">{value}</div></div>;
}

function ProjectFormPanel({ form, editing, managerMode, error, onUpdate, onSave, onClose }: { form: ProjectForm; editing: boolean; managerMode: boolean; error: string; onUpdate: <K extends keyof ProjectForm>(key: K, value: ProjectForm[K]) => void; onSave: (event: FormEvent) => void; onClose: () => void }) {
  const number = (value: string) => value === '' ? 0 : Number(value);
  return <form onSubmit={onSave} className="rounded-2xl border border-blue-200 bg-white p-5 shadow-lg">
    <div className="flex items-center justify-between"><div><h3 className="font-black text-slate-900">{editing ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'}</h3><p className="text-xs text-slate-500">Các thay đổi sẽ tự động đồng bộ tới các thiết bị đăng nhập.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5"/></button></div>
    {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">{error}</div>}
    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Field label="Mã dự án *"><input disabled={managerMode} value={form.code || ''} onChange={e => onUpdate('code', e.target.value)} placeholder="DA-006"/></Field>
      <Field label="Tên dự án *" wide><input value={form.name} onChange={e => onUpdate('name', e.target.value)} placeholder="Tên công trình / dự án"/></Field>
      <Field label="Trạng thái"><select value={form.status} onChange={e => onUpdate('status', e.target.value as Project['status'])}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
      <Field label="Địa điểm *" wide><input value={form.location} onChange={e => onUpdate('location', e.target.value)} placeholder="Địa chỉ công trường"/></Field>
      <Field label="Chỉ huy trưởng"><input disabled={managerMode} value={form.manager} onChange={e => onUpdate('manager', e.target.value)} placeholder="Họ tên người phụ trách"/></Field>
      <Field label="Ngân sách (VND)"><input disabled={managerMode} type="number" min="0" value={form.budget} onChange={e => onUpdate('budget', number(e.target.value))}/></Field>
      <Field label="Chi phí đã dùng (VND)"><input disabled={managerMode} type="number" min="0" value={form.spent} onChange={e => onUpdate('spent', number(e.target.value))}/></Field>
      <Field label="Tiến độ (%)"><input type="number" min="0" max="100" value={form.progress} onChange={e => onUpdate('progress', number(e.target.value))}/></Field>
      <Field label="Ngày khởi công *"><input type="date" value={form.startDate} onChange={e => onUpdate('startDate', e.target.value)}/></Field>
      <Field label="Ngày kết thúc *"><input type="date" value={form.endDate} onChange={e => onUpdate('endDate', e.target.value)}/></Field>
      <Field label="Vĩ độ"><input type="number" step="any" value={form.latitude ?? ''} onChange={e => onUpdate('latitude', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="10.7769"/></Field>
      <Field label="Kinh độ"><input type="number" step="any" value={form.longitude ?? ''} onChange={e => onUpdate('longitude', e.target.value === '' ? undefined : Number(e.target.value))} placeholder="106.7009"/></Field>
      <Field label="Bán kính geofence (m)"><input type="number" min="50" value={form.geofenceRadius ?? 200} onChange={e => onUpdate('geofenceRadius', number(e.target.value))}/></Field>
    </div>
    <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Hủy</button><button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700">{editing ? 'Lưu thay đổi' : 'Tạo dự án'}</button></div>
  </form>;
}

function Field({ label, children, wide = false }: { label: string; children: ReactElement; wide?: boolean }) {
  return <label className={`text-xs font-bold text-slate-600 ${wide ? 'md:col-span-2' : ''}`}><span className="mb-1.5 block">{label}</span><span className="block [&>input]:w-full [&>input]:rounded-xl [&>input]:border [&>input]:border-slate-200 [&>input]:px-3 [&>input]:py-2.5 [&>select]:w-full [&>select]:rounded-xl [&>select]:border [&>select]:border-slate-200 [&>select]:px-3 [&>select]:py-2.5">{children}</span></label>;
}
