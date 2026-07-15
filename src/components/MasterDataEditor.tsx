import React, { useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import type { Contract, Contractor, Employee, Equipment, InventoryItem, Project } from '../types';
import { normalizeBusinessId } from '../lib/businessIds';
import { Trash2 } from 'lucide-react';

type Tab = 'projects' | 'employees' | 'partners' | 'contracts' | 'inventory' | 'equipment';
interface Props {
  projects: Project[]; setProjects: Dispatch<SetStateAction<Project[]>>;
  employees: Employee[]; setEmployees: Dispatch<SetStateAction<Employee[]>>;
  contractors: Contractor[]; setContractors: Dispatch<SetStateAction<Contractor[]>>;
  contracts: Contract[]; setContracts: Dispatch<SetStateAction<Contract[]>>;
  inventoryItems: InventoryItem[]; setInventoryItems: Dispatch<SetStateAction<InventoryItem[]>>;
  equipment: Equipment[]; setEquipment: Dispatch<SetStateAction<Equipment[]>>;
}

export default function MasterDataEditor(props: Props) {
  const [tab, setTab] = useState<Tab>('projects');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const tabs: Array<[Tab, string]> = [['projects', 'Dự án'], ['employees', 'Nhân viên'], ['partners', 'Đối tác'], ['contracts', 'Hợp đồng'], ['inventory', 'Vật tư'], ['equipment', 'Thiết bị']];

  const notify = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 2200);
  };

  const codeField = (key: string, current: string, prefix: string, occupied: string[], commit: (value: string) => void) => {
    const value = drafts[key] ?? current;
    return <input
      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold uppercase focus:ring-2 focus:ring-blue-500"
      value={value}
      placeholder={`${prefix}-001`}
      onChange={event => setDrafts(previous => ({ ...previous, [key]: event.target.value }))}
      onBlur={() => {
        const normalized = normalizeBusinessId(value, current);
        if (occupied.some(item => item !== current && item === normalized)) {
          setDrafts(previous => ({ ...previous, [key]: current }));
          notify(`Mã ${normalized} đã tồn tại.`);
          return;
        }
        commit(normalized);
        setDrafts(previous => ({ ...previous, [key]: normalized }));
        notify(`Đã đổi mã và ID nội bộ thành ${normalized}.`);
      }}
    />;
  };

  const nameField = (value: string, commit: (value: string) => void, placeholder: string) => <input
    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
    value={value}
    placeholder={placeholder}
    onChange={event => commit(event.target.value)}
    onBlur={() => notify('Đã lưu và chờ đồng bộ.')}
  />;

  const deleteItem = (id: string) => {
    if (!window.confirm('Xóa mục này và đồng bộ dọn toàn bộ dữ liệu liên quan?')) return;
    if (tab === 'projects') props.setProjects(rows => rows.filter(item => item.id !== id));
    if (tab === 'employees') props.setEmployees(rows => rows.filter(item => item.id !== id));
    if (tab === 'partners') props.setContractors(rows => rows.filter(item => item.id !== id));
    if (tab === 'contracts') props.setContracts(rows => rows.filter(item => item.id !== id));
    if (tab === 'inventory') props.setInventoryItems(rows => rows.filter(item => item.id !== id));
    if (tab === 'equipment') props.setEquipment(rows => rows.filter(item => item.id !== id));
    notify('Đã xóa và đang dọn dữ liệu liên quan trên máy chủ.');
  };

  const rows = () => {
    if (tab === 'projects') return props.projects.map(item => <Row key={item.id} id={item.id} onDelete={() => deleteItem(item.id)} code={codeField(`project:${item.id}`, item.code || item.id, 'DA', props.projects.map(value => value.code || value.id), code => props.setProjects(values => values.map(value => value.id === item.id ? { ...value, code } : value)))} name={nameField(item.name, name => props.setProjects(values => values.map(value => value.id === item.id ? { ...value, name } : value)), 'Tên dự án')}/>);
    if (tab === 'employees') return props.employees.map(item => <Row key={item.id} id={item.id} onDelete={() => deleteItem(item.id)} code={codeField(`employee:${item.id}`, item.code || item.id, 'NV', props.employees.map(value => value.code || value.id), code => props.setEmployees(values => values.map(value => value.id === item.id ? { ...value, code } : value)))} name={nameField(item.name, name => props.setEmployees(values => values.map(value => value.id === item.id ? { ...value, name } : value)), 'Họ tên')}/>);
    if (tab === 'partners') return props.contractors.map(item => <Row key={item.id} id={item.id} onDelete={() => deleteItem(item.id)} code={codeField(`partner:${item.id}`, item.code || item.id, 'DT', props.contractors.map(value => value.code || value.id), code => props.setContractors(values => values.map(value => value.id === item.id ? { ...value, code } : value)))} name={nameField(item.name, name => props.setContractors(values => values.map(value => value.id === item.id ? { ...value, name } : value)), 'Tên đối tác')}/>);
    if (tab === 'contracts') return props.contracts.map(item => <Row key={item.id} id={item.id} onDelete={() => deleteItem(item.id)} code={codeField(`contract:${item.id}`, item.contractNumber, 'HD', props.contracts.map(value => value.contractNumber), contractNumber => props.setContracts(values => values.map(value => value.id === item.id ? { ...value, contractNumber } : value)))} name={nameField(item.title, title => props.setContracts(values => values.map(value => value.id === item.id ? { ...value, title } : value)), 'Tên hợp đồng')}/>);
    if (tab === 'inventory') return props.inventoryItems.map(item => <Row key={item.id} id={item.id} onDelete={() => deleteItem(item.id)} code={codeField(`inventory:${item.id}`, item.code || item.id, 'VT', props.inventoryItems.map(value => value.code || value.id), code => props.setInventoryItems(values => values.map(value => value.id === item.id ? { ...value, code } : value)))} name={nameField(item.name, name => props.setInventoryItems(values => values.map(value => value.id === item.id ? { ...value, name } : value)), 'Tên vật tư')}/>);
    return props.equipment.map(item => <Row key={item.id} id={item.id} onDelete={() => deleteItem(item.id)} code={codeField(`equipment:${item.id}`, item.code || item.id, 'TB', props.equipment.map(value => value.code || value.id), code => props.setEquipment(values => values.map(value => value.id === item.id ? { ...value, code } : value)))} name={nameField(item.name, name => props.setEquipment(values => values.map(value => value.id === item.id ? { ...value, name } : value)), 'Tên thiết bị')}/>);
  };

  return <div className="space-y-4">
    {message && <div className="fixed bottom-5 right-5 z-50 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-xl">{message}</div>}
    <div className="flex flex-wrap gap-2">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-lg px-4 py-2 text-sm font-bold ${tab === id ? 'bg-blue-600 text-white' : 'border bg-white'}`}>{label}</button>)}</div>
    <div className="overflow-hidden rounded-2xl border bg-white">
      <div className="grid grid-cols-[150px_1fr_150px_52px] gap-3 bg-slate-100 px-4 py-3 text-xs font-black uppercase text-slate-500"><div>Mã = ID nội bộ</div><div>Tên / Tiêu đề</div><div>ID hiện tại</div><div></div></div>
      {rows()}
    </div>
  </div>;
}

function Row({ id, code, name, onDelete }: { key?: string; id: string; code: ReactNode; name: ReactNode; onDelete: () => void }) {
  return <div className="grid grid-cols-[150px_1fr_150px_52px] gap-3 border-t p-3">{code}{name}<code className="self-center truncate text-xs font-bold text-blue-700" title={id}>{id}</code><button onClick={onDelete} className="grid place-items-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50" title="Xóa"><Trash2 className="h-4 w-4"/></button></div>;
}
