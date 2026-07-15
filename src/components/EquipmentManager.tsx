import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Project, Equipment, FinancialTransaction, CompanyConfig, UserRole } from '../types';
import { normalizeBusinessId } from '../lib/businessIds';
import { createOperation, listOperations } from '../lib/api';
import { subscribeRealtime } from '../lib/realtime';
import {
  Wrench, Truck, AlertCircle, Plus, ClipboardList, CheckCircle2,
  MapPin, HelpCircle, Activity, Gauge, Calendar, DollarSign, PenSquare,
  FileSpreadsheet, Download, Trash2
} from 'lucide-react';

interface EquipmentManagerProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  equipment: Equipment[];
  setEquipment: React.Dispatch<React.SetStateAction<Equipment[]>>;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  companyConfig?: CompanyConfig;
  userRole?: UserRole;
}

interface FuelLog {
  id: string;
  equipmentId: string;
  date: string;
  litersOrKw: number;
  cost: number;
  recordedBy: string;
  rowVersion?: number;
}

interface MaintenanceLog {
  id: string;
  equipmentId: string;
  date: string;
  type: 'Routine' | 'Repair' | 'Inspection';
  cost: number;
  details: string;
  technician: string;
  rowVersion?: number;
}

interface DispatchLog {
  id: string;
  equipmentId: string;
  equipmentName: string;
  fromProjectId: string;
  fromProjectName: string;
  toProjectId: string;
  toProjectName: string;
  date: string;
  cost: number;
  recordedBy: string;
  carrierUnit: string;
  rowVersion?: number;
}

export default function EquipmentManager({
  projects,
  setProjects,
  equipment,
  setEquipment,
  transactions,
  setTransactions,
  companyConfig,
  userRole
}: EquipmentManagerProps) {
  const canManageOperations = userRole === 'CEO' || userRole === 'SiteManager' || userRole === 'SiteAccountant';
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DispatchLog[]>([]);

  // UI state filters
  const [selectedEquipId, setSelectedEquipId] = useState<string>(equipment[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'directory' | 'logs' | 'procurement'>('directory');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Modal: Dispatch Equipment
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchTargetProjId, setDispatchTargetProjId] = useState('');
  const [dispatchSurcharge, setDispatchSurcharge] = useState<number>(5000000); // 5 triệu vận chuyển xe nâng

  // Form: Buy / Rent new Equipment & Tools
  const [procureType, setProcureType] = useState<'Purchase' | 'Rental'>('Purchase');
  const [procureCategory, setProcureCategory] = useState<'Heavy' | 'Tool'>('Heavy');
  const [procureCode, setProcureCode] = useState('');
  const [procureName, setProcureName] = useState('');
  const [procureCost, setProcureCost] = useState<number>(0);
  const [procureSupplier, setProcureSupplier] = useState('');
  const [procureProject, setProcureProject] = useState('');
  const [procurePaymentMethod, setProcurePaymentMethod] = useState<'Cash' | 'Bank' | 'Debt'>('Bank');

  // Form: Log fuel / energy
  const [newFuelDate, setNewFuelDate] = useState(new Date().toISOString().split('T')[0]);
  const [newFuelQty, setNewFuelQty] = useState<number>(100);
  const [newFuelCost, setNewFuelCost] = useState<number>(2300000);
  const [newFuelRecorder, setNewFuelRecorder] = useState('');

  // Form: Log Maintenance
  const [newMaintDate, setNewMaintDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMaintType, setNewMaintType] = useState<'Routine' | 'Repair' | 'Inspection'>('Routine');
  const [newMaintCost, setNewMaintCost] = useState<number>(5000000);
  const [newMaintDetails, setNewMaintDetails] = useState('');
  const [newMaintTech, setNewMaintTech] = useState('');

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadOperationalLogs = useCallback(async () => {
    const [fuel, maintenance, dispatches] = await Promise.all([
      listOperations<FuelLog>('fuel'), listOperations<MaintenanceLog>('maintenance'), listOperations<DispatchLog>('dispatches'),
    ]);
    setFuelLogs(fuel); setMaintenanceLogs(maintenance); setDispatchLogs(dispatches);
  }, []);

  useEffect(() => {
    loadOperationalLogs().catch(error => showToast(error instanceof Error ? error.message : 'Không tải được nhật ký thiết bị.'));
    return subscribeRealtime(['operations'], () => { loadOperationalLogs().catch(() => undefined); });
  }, [loadOperationalLogs]);

  const selectedEquipmentDetail = useMemo(() => {
    return equipment.find(eq => eq.id === selectedEquipId);
  }, [equipment, selectedEquipId]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = equipment.length;
    const inUseCount = equipment.filter(e => e.status === 'In-Use').length;
    const maintCount = equipment.filter(e => e.status === 'Maintenance').length;
    const totalFuelCost = fuelLogs.reduce((acc, log) => acc + log.cost, 0);
    const totalMaintCost = maintenanceLogs.reduce((acc, log) => acc + log.cost, 0);

    return {
      totalCount,
      inUseCount,
      maintCount,
      totalFuelCost,
      totalMaintCost
    };
  }, [equipment, fuelLogs, maintenanceLogs]);

  // Filtered equipment list
  const filteredEquipmentList = useMemo(() => {
    return equipment.filter(eq => {
      const matchProj = filterProject === 'all' || eq.currentProjectId === filterProject;

      // Classify "Heavy" vs "Tool"
      // Handheld tools usually don't consume heavy diesel or have electric power rate
      const isTool = eq.name.toLowerCase().includes('đầm dùi') || eq.name.toLowerCase().includes('bộ đàm') || eq.name.toLowerCase().includes('khoan') || eq.name.toLowerCase().includes('búa') || eq.name.toLowerCase().includes('hàn');
      const eqType = isTool ? 'Tool' : 'Heavy';
      const matchType = filterType === 'all' || eqType === filterType;

      return matchProj && matchType;
    });
  }, [equipment, filterProject, filterType]);

  const handleDeleteEquipment = (item: Equipment) => {
    const hasOperationalHistory = fuelLogs.some(row => row.equipmentId === item.id)
      || maintenanceLogs.some(row => row.equipmentId === item.id)
      || dispatchLogs.some(row => row.equipmentId === item.id);
    const message = hasOperationalHistory
      ? `Thiết bị ${item.code || item.id} có lịch sử nhiên liệu, bảo trì hoặc điều động. Xóa sẽ dọn toàn bộ nhật ký vận hành liên quan. Bạn có chắc chắn?`
      : `Xóa thiết bị ${item.code || item.id} - ${item.name}?`;
    if (!window.confirm(message)) return;

    const remaining = equipment.filter(row => row.id !== item.id);
    setEquipment(remaining);
    setFuelLogs(rows => rows.filter(row => row.equipmentId !== item.id));
    setMaintenanceLogs(rows => rows.filter(row => row.equipmentId !== item.id));
    setDispatchLogs(rows => rows.filter(row => row.equipmentId !== item.id));
    setSelectedEquipId(current => current === item.id ? remaining[0]?.id || '' : current);
    showToast(`Đã xóa thiết bị ${item.code || item.id} và nhật ký vận hành liên quan.`);
  };

  // Handle Dispatching Equipment
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations) { showToast('Tài khoản hiện tại chỉ được xem thiết bị.'); return; }
    if (!selectedEquipId || !dispatchTargetProjId) return;

    const eq = equipment.find(e => e.id === selectedEquipId);
    const targetProj = projects.find(p => p.id === dispatchTargetProjId);
    if (!eq || !targetProj) return;

    // 1. Update Equipment status & project location
    setEquipment(prev => prev.map(e => {
      if (e.id === selectedEquipId) {
        return {
          ...e,
          currentProjectId: dispatchTargetProjId,
          status: 'In-Use',
          fuelCostThisMonth: e.fuelCostThisMonth + dispatchSurcharge
        };
      }
      return e;
    }));

    // Find source project details
    const sourceProj = projects.find(p => p.id === eq.currentProjectId);
    const sourceName = sourceProj ? sourceProj.name : 'Kho ';

    // 4. Record to dispatch history
    const newDispatchLog: DispatchLog = {
      id: `disp-${Date.now().toString().slice(-4)}`, // clean short ID
      equipmentId: eq.id,
      equipmentName: eq.name,
      fromProjectId: eq.currentProjectId || 'all',
      fromProjectName: sourceName,
      toProjectId: dispatchTargetProjId,
      toProjectName: targetProj.name,
      date: new Date().toISOString().split('T')[0],
      cost: dispatchSurcharge,
      recordedBy: 'Điều phối viên ',
      carrierUnit: 'Công ty vận tải cơ giới liên kết 911'
    };
    try {
      const saved = await createOperation<DispatchLog>('dispatches', newDispatchLog);
      setDispatchLogs(prev => [saved, ...prev]);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Không lưu được lệnh điều động.'); return; }

    setShowDispatchModal(false);
    showToast(`Đã điều động thành công ${eq.name} sang công trình ${targetProj.name}!`);
  };

  // Handle Logging Fuel / Electricity
  const handleLogFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations) { showToast('Tài khoản hiện tại chỉ được xem thiết bị.'); return; }
    if (!selectedEquipId || newFuelCost <= 0) return;

    const eq = equipment.find(e => e.id === selectedEquipId);
    if (!eq) return;

    // 1. Add fuel log
    const newLog: FuelLog = {
      id: `f-${Date.now()}`,
      equipmentId: selectedEquipId,
      date: newFuelDate,
      litersOrKw: newFuelQty,
      cost: newFuelCost,
      recordedBy: newFuelRecorder || 'Người điều phối'
    };
    try {
      const saved = await createOperation<FuelLog>('fuel', newLog);
      setFuelLogs(prev => [saved, ...prev]);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Không lưu được phiếu nhiên liệu.'); return; }

    // 2. Increment fuelCostThisMonth on machinery
    setEquipment(prev => prev.map(e => {
      if (e.id === selectedEquipId) {
        return {
          ...e,
          fuelCostThisMonth: e.fuelCostThisMonth + newFuelCost
        };
      }
      return e;
    }));

    showToast(`Đã cập nhật chi phí nhiên liệu ${newFuelCost.toLocaleString()} VND cho ${eq.name}!`);
    setNewFuelQty(100);
    setNewFuelCost(2300000);
  };

  // Handle Logging Maintenance
  const handleLogMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageOperations) { showToast('Tài khoản hiện tại chỉ được xem thiết bị.'); return; }
    if (!selectedEquipId || newMaintCost <= 0) return;

    const eq = equipment.find(e => e.id === selectedEquipId);
    if (!eq) return;

    // 1. Add maintenance log
    const newLog: MaintenanceLog = {
      id: `m-${Date.now()}`,
      equipmentId: selectedEquipId,
      date: newMaintDate,
      type: newMaintType,
      cost: newMaintCost,
      details: newMaintDetails,
      technician: newMaintTech || 'Tổ sửa chữa cơ giới'
    };
    try {
      const saved = await createOperation<MaintenanceLog>('maintenance', newLog);
      setMaintenanceLogs(prev => [saved, ...prev]);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Không lưu được phiếu bảo trì.'); return; }

    // 2. Put equipment back to available or available after maintenance
    setEquipment(prev => prev.map(e => {
      if (e.id === selectedEquipId) {
        return {
          ...e,
          status: 'Available',
          lastMaintenance: newMaintDate,
          // Calculate next maintenance as 6 months later
          nextMaintenance: new Date(new Date(newMaintDate).setMonth(new Date(newMaintDate).getMonth() + 6)).toISOString().split('T')[0]
        };
      }
      return e;
    }));

    showToast(`Đã hạch toán bảo dưỡng thiết bị ${eq.name} thành công!`);
    setNewMaintCost(5000000);
    setNewMaintDetails('');
    setNewMaintTech('');
  };

  // Export Dispatch Order to beautiful Excel
  const exportDispatchExcel = (log: DispatchLog) => {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const logDateStr = log.date.split('-').reverse().join('/');

    const cName = companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT';
    const sOffice = companyConfig?.siteOffice || 'BAN ĐIỀU HÀNH CAO TỐC BẮC NAM';
    const dTitle = companyConfig?.dispatchTitle || 'LỆNH ĐIỀU ĐỘNG THIẾT BỊ CƠ GIỚI';
    const directorName = companyConfig?.directorName || 'Giám đốc Đỗ Minh Tuấn';

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Lệnh Điều Động</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Times New Roman', Times, serif; margin: 20px; }
  .org-name { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
  .national-title { font-size: 11pt; font-weight: bold; text-align: center; }
  .national-sub { font-size: 10pt; font-style: italic; text-align: center; border-bottom: 1px solid #000; padding-bottom: 5px; }
  .title { font-size: 15pt; font-weight: bold; text-align: center; margin-top: 20px; text-transform: uppercase; }
  .code { font-size: 10pt; font-style: italic; text-align: center; margin-bottom: 20px; }

  table.content-table { border-collapse: collapse; width: 100%; margin-top: 15px; }
  table.content-table td { padding: 8px; font-size: 11pt; border: none; }
  table.content-table td.label { font-weight: bold; width: 30%; }
  table.content-table td.value { border-bottom: 1px dashed #cbd5e1; }

  .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
  .signature-table td { border: none; text-align: center; font-size: 11pt; padding-top: 5px; width: 33%; }
  .sig-title { font-weight: bold; }
  .sig-sub { font-style: italic; font-size: 9pt; color: #475569; }
  .sig-space { height: 80px; }
</style>
</head>
<body>

<table style="width:100%; border:none; border-collapse:collapse;">
  <tr style="border:none;">
    <td style="width:50%; border:none;" class="text-left">
      <div class="org-name">${cName}</div>
      <div style="font-size: 9.5pt; color:#475569; text-transform: uppercase;">${sOffice}</div>
    </td>
    <td style="width:50%; border:none; text-align: center;">
      <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="national-title" style="font-size: 10pt;">Độc lập - Tự do - Hạnh phúc</div>
      <div style="font-size: 9pt;">---o0o---</div>
    </td>
  </tr>
</table>

<div class="title">${dTitle}</div>
<div class="code">Số: ${log.id}/LĐĐ-BĐH</div>

<p style="font-size: 11pt; font-style: italic; text-align: center;">
    Căn cứ tiến độ thi công thực tế tại các mũi công trường và nhu cầu luân chuyển thiết bị.
</p>

<table class="content-table">
  <tr>
    <td class="label">Tên thiết bị cơ giới:</td>
    <td class="value" style="font-weight: bold; color: #1e40af;">${log.equipmentName}</td>
  </tr>
  <tr>
    <td class="label">Mã số quản lý:</td>
    <td class="value" style="font-family: monospace; font-weight: bold;">${log.equipmentId}</td>
  </tr>
  <tr>
    <td class="label">Vị trí xuất phát (Nơi đi):</td>
    <td class="value">${log.fromProjectName}</td>
  </tr>
  <tr>
    <td class="label">Vị trí tiếp nhận (Nơi đến):</td>
    <td class="value" style="font-weight: bold;">${log.toProjectName}</td>
  </tr>
  <tr>
    <td class="label">Ngày thực hiện điều phối:</td>
    <td class="value font-mono">${logDateStr}</td>
  </tr>
  <tr>
    <td class="label">Phương thức vận chuyển:</td>
    <td class="value">${log.carrierUnit}</td>
  </tr>
  <tr>
    <td class="label">Chi phí vận tải hạch toán:</td>
    <td class="value" style="font-weight: bold; color: #b91c1c;">${log.cost.toLocaleString('vi-VN')} VND</td>
  </tr>
  <tr>
    <td class="label">Mục đích điều động:</td>
      <td class="value">Phục vụ thi công dầm mố, san gạt dốc khẩn cấp theo tiến độ bàn giao.</td>
  </tr>
  <tr>
    <td class="label">Cán bộ lập lệnh:</td>
    <td class="value">${log.recordedBy}</td>
  </tr>
</table>

<p style="font-size: 10.5pt; font-style: italic; margin-top: 25px; line-height: 1.5;">
  * Ghi chú kỹ thuật: Đơn vị tiếp nhận chịu trách nhiệm kiểm tra hiện trạng máy móc, ký biên bản giao nhận kỹ thuật và ghi nhận chi phí vận hành, ca dầu vào phân hệ kế toán theo đúng định mức quy định.
</p>

<table class="signature-table">
  <tr>
    <td colspan="2"></td>
    <td class="font-italic text-center" style="font-size: 10pt; padding-bottom: 10px;">Lập ngày ${dateStr} tại BĐH Công trường </td>
  </tr>
  <tr>
    <td>
      <div class="sig-title">Người lập lệnh</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">${log.recordedBy}</div>
    </td>
    <td>
      <div class="sig-title">Trưởng phòng Thiết bị - Vật tư</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">Kỹ sư cơ giới Trần Hải Nam</div>
    </td>
    <td>
      <div class="sig-title">Chỉ huy trưởng công trường</div>
      <div class="sig-sub">(Ký, đóng dấu)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">${directorName}</div>
    </td>
  </tr>
</table>

</body>
</html>
    `;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lenh_Dieu_Dong_${log.id}_${log.equipmentId}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất thành công Lệnh điều động ${log.id} ra file Excel (.xls)!`);
  };

  // Export Fuel Slip to beautiful Excel
  const exportFuelExcel = (log: FuelLog) => {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const logDateStr = log.date.split('-').reverse().join('/');
    const eq = equipment.find(e => e.id === log.equipmentId);
    const eqName = eq ? eq.name : 'Thiết bị ';
    const projName = eq ? (projects.find(p => p.id === eq.currentProjectId)?.name || 'Kho ') : 'Mũi thi công ';

    const cName = companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT';
    const sOffice = companyConfig?.siteOffice || 'BAN ĐIỀU HÀNH CAO TỐC BẮC NAM';
    const fTitle = companyConfig?.fuelTitle || 'PHIẾU CẤP PHÁT XĂNG DẦU - NHIÊN LIỆU ';
    const directorName = companyConfig?.directorName || 'Giám đốc Đỗ Minh Tuấn';

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Phiếu Cấp Phát Nhiên Liệu</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Times New Roman', Times, serif; margin: 20px; }
  .org-name { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
  .title { font-size: 15pt; font-weight: bold; text-align: center; margin-top: 20px; text-transform: uppercase; }
  .code { font-size: 10pt; font-style: italic; text-align: center; margin-bottom: 20px; }

  table.content-table { border-collapse: collapse; width: 100%; margin-top: 15px; }
  table.content-table td { padding: 8px; font-size: 11pt; border: none; }
  table.content-table td.label { font-weight: bold; width: 30%; }
  table.content-table td.value { border-bottom: 1px dashed #cbd5e1; }

  .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
  .signature-table td { border: none; text-align: center; font-size: 11pt; padding-top: 5px; width: 33%; }
  .sig-title { font-weight: bold; }
  .sig-sub { font-style: italic; font-size: 9pt; color: #475569; }
  .sig-space { height: 80px; }
</style>
</head>
<body>

<table style="width:100%; border:none; border-collapse:collapse;">
  <tr style="border:none;">
    <td style="width:60%; border:none;" class="text-left">
      <div class="org-name">${cName}</div>
      <div style="font-size: 9.5pt; color:#475569; text-transform: uppercase;">${sOffice}</div>
    </td>
    <td style="width:40%; border:none; text-align: right; font-size: 9.5pt; font-style: italic;">
      Mẫu số: 02-VT <br/>
      Ký hiệu: PCPNL/ĐV-2026
    </td>
  </tr>
</table>

<div class="title">${fTitle}</div>
<div class="code">Số: ${log.id}/PCPNL</div>

<table class="content-table">
  <tr>
    <td class="label">Ngày cấp nhiên liệu:</td>
    <td class="value font-mono" style="font-weight: bold;">${logDateStr}</td>
  </tr>
  <tr>
    <td class="label">Cấp cho thiết bị:</td>
    <td class="value" style="font-weight: bold; color: #1e40af;">${eqName} (${log.equipmentId})</td>
  </tr>
  <tr>
    <td class="label">Định mức tiêu hao gốc:</td>
    <td class="value">${eq ? eq.fuelConsumptionRate : 'Tùy chỉnh'}</td>
  </tr>
  <tr>
    <td class="label">Công trình tiếp nhận:</td>
    <td class="value">${projName}</td>
  </tr>
  <tr>
    <td class="label">Số lượng cấp phát thực tế:</td>
    <td class="value font-mono" style="font-weight: bold; color: #16a34a;">${log.litersOrKw} Lít / kW</td>
  </tr>
  <tr>
    <td class="label">Thành tiền hạch toán:</td>
    <td class="value font-mono text-red-600" style="font-weight: bold;">${log.cost.toLocaleString('vi-VN')} VND</td>
  </tr>
  <tr>
    <td class="label">Người chịu trách nhiệm cấp:</td>
    <td class="value">${log.recordedBy}</td>
  </tr>
</table>

<table class="signature-table">
  <tr>
    <td colspan="2"></td>
    <td class="font-italic text-center" style="font-size: 10pt; padding-bottom: 10px;">Lập ngày ${dateStr} tại Kho vật tư </td>
  </tr>
  <tr>
    <td>
      <div class="sig-title">Người cấp phát (Thủ kho)</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">${log.recordedBy}</div>
    </td>
    <td>
      <div class="sig-title">Người nhận (Lái máy/Tài xế)</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">Đại diện lái máy </div>
    </td>
    <td>
      <div class="sig-title">Chỉ huy trưởng duyệt</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">${directorName}</div>
    </td>
  </tr>
</table>

</body>
</html>
    `;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Phieu_Cap_Nhien_Lieu_${log.id}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất thành công Phiếu cấp phát nhiên liệu ${log.id} ra file Excel (.xls)!`);
  };

  // Export Maintenance Log / Slips to beautiful Excel
  const exportMaintExcel = (log: MaintenanceLog) => {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const logDateStr = log.date.split('-').reverse().join('/');
    const eq = equipment.find(e => e.id === log.equipmentId);
    const eqName = eq ? eq.name : 'Thiết bị cơ giới';
    const projName = eq ? (projects.find(p => p.id === eq.currentProjectId)?.name || 'Kho ') : 'Mũi thi công';

    const cName = companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT';
    const sOffice = companyConfig?.siteOffice || 'BAN ĐIỀU HÀNH CAO TỐC BẮC NAM';
    const mTitle = companyConfig?.maintenanceTitle || 'BIÊN BẢN NGHIỆM THU & BÀN GIAO SỬA CHỮA THIẾT BỊ';
    const directorName = companyConfig?.directorName || 'Giám đốc Đỗ Minh Tuấn';

    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Biên Bản Bảo Dưỡng Sửa Chữa</x:Name>
    <x:WorksheetOptions>
     <x:DisplayGridlines/>
    </x:WorksheetOptions>
   </x:ExcelWorksheet>
  </x:ExcelWorksheets>
 </x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Times New Roman', Times, serif; margin: 20px; }
  .org-name { font-size: 11pt; font-weight: bold; text-transform: uppercase; }
  .title { font-size: 15pt; font-weight: bold; text-align: center; margin-top: 20px; text-transform: uppercase; }
  .code { font-size: 10pt; font-style: italic; text-align: center; margin-bottom: 20px; }

  table.content-table { border-collapse: collapse; width: 100%; margin-top: 15px; }
  table.content-table td { padding: 8px; font-size: 11pt; border: none; }
  table.content-table td.label { font-weight: bold; width: 30%; }
  table.content-table td.value { border-bottom: 1px dashed #cbd5e1; }

  .signature-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
  .signature-table td { border: none; text-align: center; font-size: 11pt; padding-top: 5px; width: 33%; }
  .sig-title { font-weight: bold; }
  .sig-sub { font-style: italic; font-size: 9pt; color: #475569; }
  .sig-space { height: 80px; }
</style>
</head>
<body>

<table style="width:100%; border:none; border-collapse:collapse;">
  <tr style="border:none;">
    <td style="width:60%; border:none;" class="text-left">
      <div class="org-name">${cName}</div>
      <div style="font-size: 9.5pt; color:#475569; text-transform: uppercase;">${sOffice}</div>
    </td>
    <td style="width:40%; border:none; text-align: right; font-size: 9.5pt; font-style: italic;">
      Mẫu số: 08-SCBB <br/>
      Ký hiệu: BBBGSC-2026
    </td>
  </tr>
</table>

<div class="title">${mTitle}</div>
<div class="code">Số: ${log.id}/BBBG-SC</div>

<table class="content-table">
  <tr>
    <td class="label">Thời gian nghiệm thu bàn giao:</td>
    <td class="value font-mono" style="font-weight: bold;">${logDateStr}</td>
  </tr>
  <tr>
    <td class="label">Tên thiết bị cơ giới:</td>
    <td class="value" style="font-weight: bold; color: #1e40af;">${eqName} (${log.equipmentId})</td>
  </tr>
  <tr>
    <td class="label">Phân vùng thi công bàn giao:</td>
    <td class="value">${projName}</td>
  </tr>
  <tr>
    <td class="label">Hình thức kỹ thuật:</td>
    <td class="value" style="font-weight: bold;">
      ${log.type === 'Routine' ? 'Bảo dưỡng định kỳ ' : (log.type === 'Repair' ? 'Sửa chữa đột xuất - Khắc phục sự cố' : 'Kiểm định chất lượng định kỳ')}
    </td>
  </tr>
  <tr>
    <td class="label">Nội dung chi tiết xử lý:</td>
    <td class="value" style="font-style: italic; color: #475569;">${log.details}</td>
  </tr>
  <tr>
    <td class="label">Chi phí vật tư phụ tùng thay thế:</td>
    <td class="value font-mono text-red-600" style="font-weight: bold;">${log.cost.toLocaleString('vi-VN')} VND</td>
  </tr>
  <tr>
    <td class="label">Kỹ sư / Kỹ thuật viên phụ trách:</td>
    <td class="value">${log.technician}</td>
  </tr>
  <tr>
    <td class="label">Đánh giá trạng thái sau bàn giao:</td>
    <td class="value" style="font-weight: bold; color: #16a34a;">Đạt tiêu chuẩn an toàn kỹ thuật, hệ thống thủy lực và động cơ hoạt động tốt 100% công suất. Đủ điều kiện đưa lại công trường hoạt động liên tục.</td>
  </tr>
</table>

<p style="font-size: 10pt; font-style: italic; margin-top: 25px; line-height: 1.5;">
  * Xác nhận: Các bên cùng ký xác nhận đồng ý đưa thiết bị vào hoạt động. Tổ cơ giới chịu trách nhiệm theo dõi sát tiến trình chạy thử 24h đầu sau sửa chữa để đảm bảo tính ổn định tuyệt đối.
</p>

<table class="signature-table">
  <tr>
    <td colspan="2"></td>
    <td class="font-italic text-center" style="font-size: 10pt; padding-bottom: 10px;">Lập ngày ${dateStr} tại Ban điều hành </td>
  </tr>
  <tr>
    <td>
      <div class="sig-title">Người bàn giao (Tổ Kỹ thuật)</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">${log.technician}</div>
    </td>
    <td>
      <div class="sig-title">Lái máy tiếp nhận</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">Đại diện lái máy </div>
    </td>
    <td>
      <div class="sig-title">Chỉ huy trưởng phê duyệt</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div style="font-weight: bold;">${directorName}</div>
    </td>
  </tr>
</table>

</body>
</html>
    `;

    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bien_Ban_Ban_Giao_Sua_Chua_${log.id}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất thành công Biên bản bàn giao sửa chữa ${log.id} ra file Excel (.xls)!`);
  };

  // Handle procuring (buying/renting) new equipment or tool
  const handleProcure = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'CEO') { showToast('Chỉ Giám đốc được thêm, mua hoặc thuê thiết bị mới.'); return; }
    if (!procureName || procureCost <= 0 || !procureProject) {
      alert('Vui lòng điền đầy đủ Tên thiết bị, Chi phí và Dự án áp dụng!');
      return;
    }

    const matchedProj = projects.find(p => p.id === procureProject);
    if (!matchedProj) return;

    const generatedCode = normalizeBusinessId(procureCode || `TB-${(equipment.length + 1).toString().padStart(3, '0')}`, `TB-${(equipment.length + 1).toString().padStart(3, '0')}`);
    if (equipment.some(item => item.id === generatedCode || item.code === generatedCode)) {
      alert(`Mã thiết bị ${generatedCode} đã tồn tại.`);
      return;
    }
    const uniqueId = generatedCode;

    // 1. Add equipment to registry list
    const newEq: Equipment = {
      id: uniqueId,
      code: generatedCode,
      name: procureName,
      currentProjectId: procureProject,
      status: 'Available',
      fuelConsumptionRate: procureCategory === 'Heavy' ? '12 Lít / Giờ' : 'Sử dụng điện cầm tay',
      lastMaintenance: new Date().toISOString().split('T')[0],
      nextMaintenance: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
      fuelCostThisMonth: 0
    };
    setEquipment(prev => [...prev, newEq]);

    // 2. Generate Central financial transaction (Purchase / Rental overhead)
    const isDebt = procurePaymentMethod === 'Debt';
    const desc = procureType === 'Purchase'
      ? `Mua mới ${procureCategory === 'Heavy' ? 'Máy móc cơ giới' : 'Công cụ cầm tay '} [${procureName}] từ ${procureSupplier || 'NCC Thiết bị'}`
      : `Thuê thiết bị [${procureName}] phục vụ công trình từ ${procureSupplier || 'NCC Thiết bị'}`;

    const newTx: FinancialTransaction = {
      id: `tx-eq-proc-${Date.now()}`,
      projectId: procureProject,
      type: 'Expense',
      category: 'Equipment',
      amount: procureCost,
      description: desc,
      date: new Date().toISOString().split('T')[0],
      referenceId: isDebt ? `HD-MUA-EQ-${uniqueId}` : `PC-EQ-${uniqueId}`
    };
    setTransactions(prev => [newTx, ...prev]);

    // 3. Update project spent stats
    setProjects(prev => prev.map(p => {
      if (p.id === procureProject) {
        return {
          ...p,
          spent: p.spent + procureCost
        };
      }
      return p;
    }));

    showToast(`Đã hạch toán và ghi nhận thiết bị mới: ${procureName}!`);

    // Reset Form
    setProcureCode('');
    setProcureName('');
    setProcureCost(0);
    setProcureSupplier('');
  };

  return (
    <div className="space-y-6" id="equipment-manager-root">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 text-xs border border-emerald-500 animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-white" />
          {toastMessage}
        </div>
      )}

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">MÁY MÓC & DỤNG CỤ</p>
          <h2 className="text-xl font-black font-mono text-slate-900 mt-1">{stats.totalCount} thiết bị</h2>
          <p className="text-[10px] text-slate-400 mt-1">Gồm 3 xe cơ giới & 2 dụng cụ </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">ĐANG HOẠT ĐỘNG</p>
          <h2 className="text-xl font-black font-mono text-emerald-600 mt-1">{stats.inUseCount} thi công</h2>
          <p className="text-[10px] text-slate-400 mt-1">Đang trực chiến tại các mũi thi công</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">BẢO DƯỠNG / SỬA CHỮA</p>
          <h2 className="text-xl font-black font-mono text-amber-600 mt-1">{stats.maintCount} tại xưởng</h2>
          <p className="text-[10px] text-slate-400 mt-1">Đang rà soát động cơ & hệ thống xích</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">CHI PHÍ XĂNG / DẦU THÁNG</p>
          <h2 className="text-xl font-black font-mono text-slate-800 mt-1">{stats.totalFuelCost.toLocaleString('vi-VN')} ₫</h2>
          <p className="text-[10px] text-slate-400 mt-1">Hạch toán thực tế theo ca </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">TỔNG PHÍ BẢO TRÌ/BẢO DƯỠNG</p>
          <h2 className="text-xl font-black font-mono text-slate-800 mt-1">{stats.totalMaintCost.toLocaleString('vi-VN')} ₫</h2>
          <p className="text-[10px] text-slate-400 mt-1">Phục hồi hao mòn máy công trình</p>
        </div>
      </div>

      {/* Tabs Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 rounded-md text-xs font-black transition-all ${
              activeTab === 'directory' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            DANH MỤC THIẾT BỊ & DỤNG CỤ
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-md text-xs font-black transition-all ${
              activeTab === 'logs' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            LOGS NHIÊN LIỆU & BẢO TRÌ
          </button>
          {userRole === 'CEO' && (
            <button
              onClick={() => setActiveTab('procurement')}
              className={`px-4 py-2 rounded-md text-xs font-black transition-all ${
                activeTab === 'procurement' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              THÊM / MUA / THUÊ THIẾT BỊ
            </button>
          )}
        </div>

        {activeTab === 'directory' && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 w-full sm:w-auto">
            {userRole === 'CEO' && (
              <button
                type="button"
                onClick={() => setActiveTab('procurement')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm thiết bị
              </button>
            )}
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="whitespace-nowrap">Dự án:</span>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="p-1.5 border border-slate-200 bg-slate-50 rounded text-slate-700 font-semibold"
              >
                <option value="all">Tất cả dự án</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="whitespace-nowrap">Loại:</span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="p-1.5 border border-slate-200 bg-slate-50 rounded text-slate-700 font-semibold"
              >
                <option value="all">Tất cả</option>
                <option value="Heavy">Xe cơ giới nặng (Komatsu/Hamm...)</option>
                <option value="Tool">Công cụ/Dụng cụ </option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Areas */}
      {activeTab === 'directory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left list directory */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between border-b border-slate-800">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-400" />
                  Sổ theo dõi cấp phát máy móc thiết bị công trường
                </span>
                <span className="text-[10px] font-black bg-blue-600 px-2 py-0.5 rounded text-white uppercase">
                  {filteredEquipmentList.length} Bản ghi
                </span>
              </div>

              <div className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredEquipmentList.map(eq => {
                  const proj = projects.find(p => p.id === eq.currentProjectId);
                  const isTool = eq.name.toLowerCase().includes('đầm dùi') || eq.name.toLowerCase().includes('bộ đàm') || eq.name.toLowerCase().includes('khoan') || eq.name.toLowerCase().includes('búa') || eq.name.toLowerCase().includes('hàn');

                  let statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                  if (eq.status === 'In-Use') statusBadge = 'bg-blue-50 text-blue-700 border border-blue-200';
                  if (eq.status === 'Maintenance') statusBadge = 'bg-amber-50 text-amber-700 border border-amber-200';

                  return (
                    <div
                      key={eq.id}
                      onClick={() => setSelectedEquipId(eq.id)}
                      className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedEquipId === eq.id ? 'bg-blue-50/40 border-l-4 border-l-blue-600' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded">
                            {eq.code || eq.id}
                          </span>
                          <h4 className="font-black text-slate-800 text-sm">{eq.name}</h4>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            ({isTool ? 'Dụng cụ' : 'Xe cơ giới'})
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {proj ? proj.name : 'Kho tổng '}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span className="flex items-center gap-1 font-mono">
                            <Gauge className="w-3.5 h-3.5 text-slate-400" />
                            Định mức: {eq.fuelConsumptionRate}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${statusBadge}`}>
                          {eq.status === 'Available' ? 'Sẵn sàng' : (eq.status === 'In-Use' ? 'Đang thi công' : 'Bảo dưỡng')}
                        </span>

                        {canManageOperations && <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEquipId(eq.id);
                            setShowDispatchModal(true);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white rounded border border-slate-200 text-[10px] font-bold text-slate-600 transition-all flex items-center gap-1"
                        >
                          <Truck className="w-3 h-3" />
                          Điều động
                        </button>}
                        {userRole === 'CEO' && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteEquipment(eq);
                            }}
                            className="inline-flex items-center gap-1 rounded border border-rose-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                            title={`Xóa thiết bị ${eq.code || eq.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                            Xóa
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right details box */}
          <div className="space-y-4">
            {selectedEquipmentDetail ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4 text-xs font-semibold">

                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-sm leading-tight">{selectedEquipmentDetail.name}</h4>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">MÃ QUẢN LÝ: {selectedEquipmentDetail.code || selectedEquipmentDetail.id}</span>
                  </div>
                </div>

                {/* Info List */}
                <div className="grid grid-cols-2 gap-4 text-[11px] border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-1">MŨI THI CÔNG HIỆN TẠI</p>
                    <p className="text-slate-800 font-bold">
                      {projects.find(p => p.id === selectedEquipmentDetail.currentProjectId)?.name || 'Kho '}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-1">ĐỊNH MỨC TIÊU HAO</p>
                    <p className="text-slate-800 font-bold font-mono">{selectedEquipmentDetail.fuelConsumptionRate}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-1">NGÀY BẢO DƯỠNG TRƯỚC</p>
                    <p className="text-slate-800 font-bold font-mono">{selectedEquipmentDetail.lastMaintenance}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 uppercase font-bold text-[9px] tracking-wider mb-1">LỊCH HẸN BẢO DƯỠNG KẾ</p>
                    <p className="text-amber-600 font-black font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      {selectedEquipmentDetail.nextMaintenance}
                    </p>
                  </div>
                </div>

                {/* Sub Forms inside details */}
                <div className="space-y-4">

                  {/* Form Log Fuel */}
                  <form onSubmit={handleLogFuel} className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg space-y-3">
                    <div className="flex items-center gap-1 text-slate-700 font-black text-[10px] uppercase tracking-wider">
                      <Gauge className="w-3.5 h-3.5 text-blue-600" />
                      Ghi nhận tiêu hao nhiên liệu & chi phí
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Số lượng (Lít / Kw)</label>
                        <input
                          type="number"
                          value={newFuelQty}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setNewFuelQty(val);
                            setNewFuelCost(val * 23000); // Simple auto calculate
                          }}
                          className="w-full p-1.5 border border-slate-200 bg-white rounded font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Thành tiền (VND) *</label>
                        <input
                          type="number"
                          value={newFuelCost}
                          onChange={(e) => setNewFuelCost(Number(e.target.value))}
                          className="w-full p-1.5 border border-slate-200 bg-white rounded font-mono font-bold text-red-600"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded font-black text-[10px] tracking-wider uppercase transition-colors"
                    >
                      XÁC NHẬN GHI CHI PHÍ HÀCH TOÁN
                    </button>
                  </form>

                  {/* Form Log Maintenance */}
                  <form onSubmit={handleLogMaint} className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg space-y-3">
                    <div className="flex items-center gap-1 text-slate-700 font-black text-[10px] uppercase tracking-wider">
                      <Wrench className="w-3.5 h-3.5 text-amber-600" />
                      Hạch toán kiểm định & bảo dưỡng sửa chữa
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <label className="text-slate-400 block mb-0.5">Loại bảo dưỡng</label>
                        <select
                          value={newMaintType}
                          onChange={(e) => setNewMaintType(e.target.value as any)}
                          className="w-full p-1.5 border border-slate-200 bg-white rounded font-bold"
                        >
                          <option value="Routine">Định kỳ</option>
                          <option value="Repair">Sửa chữa đột xuất</option>
                          <option value="Inspection">Kiểm định tải trọng</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-0.5">Chi phí (VND) *</label>
                        <input
                          type="number"
                          value={newMaintCost}
                          onChange={(e) => setNewMaintCost(Number(e.target.value))}
                          className="w-full p-1.5 border border-slate-200 bg-white rounded font-mono font-bold text-red-600"
                        />
                      </div>
                    </div>

                    <div className="text-[10px]">
                      <label className="text-slate-400 block mb-0.5">Chi tiết sửa chữa/bảo dưỡng *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Thay thế dây curoa máy trộn, vệ sinh..."
                        value={newMaintDetails}
                        onChange={(e) => setNewMaintDetails(e.target.value)}
                        className="w-full p-1.5 border border-slate-200 bg-white rounded"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-black text-[10px] tracking-wider uppercase transition-colors"
                    >
                      HẠCH TOÁN BẢO TRÌ & CẬP NHẬT TRẠNG THÁI
                    </button>
                  </form>

                </div>

              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400 font-medium">
                Vui lòng chọn thiết bị trong danh mục để quản trị chi tiết.
              </div>
            )}
          </div>

        </div>
      )}

      {activeTab === 'logs' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Fuel Consumption Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">Cấp nhiên liệu </h3>
              </div>
              <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">Phiếu Số 02-VT</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="py-2">Thiết bị</th>
                    <th className="py-2">Lượng</th>
                    <th className="py-2 text-right">Chi phí</th>
                    <th className="py-2 text-center">In Phiếu</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700">
                  {fuelLogs.map(log => {
                    const eqName = equipment.find(e => e.id === log.equipmentId)?.name || 'Thiết bị';
                    return (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-900 truncate max-w-[120px]" title={eqName}>{eqName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{log.date}</div>
                        </td>
                        <td className="py-2.5 font-mono text-slate-600">{log.litersOrKw} L</td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">{log.cost.toLocaleString()} ₫</td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => exportFuelExcel(log)}
                            className="inline-flex items-center gap-1 px-1.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md transition-all font-bold text-[9px] cursor-pointer"
                            title="Xuất file Excel Phiếu cấp nhiên liệu"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                            <span>Excel</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Maintenance Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">Nhật ký bảo dưỡng sửa chữa</h3>
              </div>
              <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">Mẫu 08-SC</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="py-2">Thiết bị / Phân loại</th>
                    <th className="py-2">Nội dung kỹ thuật</th>
                    <th className="py-2 text-right">Vật tư / SC</th>
                    <th className="py-2 text-center">Biên bản</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700">
                  {maintenanceLogs.map(log => {
                    const eqName = equipment.find(e => e.id === log.equipmentId)?.name || 'Thiết bị';
                    return (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-900 truncate max-w-[110px]" title={eqName}>{eqName}</div>
                          <span className={`px-1 rounded text-[8px] font-bold ${
                            log.type === 'Repair' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {log.type === 'Repair' ? 'Sửa chữa' : 'Bảo dưỡng'}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-500 max-w-[120px] truncate" title={log.details}>{log.details}</td>
                        <td className="py-2.5 text-right">
                          <div className="font-mono font-bold text-slate-900">{log.cost.toLocaleString()} ₫</div>
                          <div className="text-[9px] text-slate-400 font-mono">{log.date}</div>
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => exportMaintExcel(log)}
                            className="inline-flex items-center gap-1 px-1.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md transition-all font-bold text-[9px] cursor-pointer"
                            title="Xuất file Excel Biên bản nghiệm thu sửa chữa"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-amber-600" />
                            <span>Excel</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dispatch Logs */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">Nhật ký điều động </h3>
              </div>
              <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">LĐĐ-BĐH</span>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold">
                    <th className="py-2">Thiết bị</th>
                    <th className="py-2">Hành trình điều phối</th>
                    <th className="py-2 text-right">Phí vận chuyển</th>
                    <th className="py-2 text-center">Lệnh</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700">
                  {dispatchLogs.map(log => {
                    return (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2.5">
                          <div className="font-bold text-slate-900 truncate max-w-[110px]" title={log.equipmentName}>{log.equipmentName}</div>
                          <div className="text-[9px] text-slate-400 font-mono">ID: {log.id} • {log.date}</div>
                        </td>
                        <td className="py-2.5 text-slate-500 text-[10px]">
                          <div className="flex flex-col">
                            <span className="text-slate-400 truncate max-w-[100px]" title={log.fromProjectName}>Từ: {log.fromProjectName}</span>
                            <span className="text-blue-600 font-bold truncate max-w-[100px]" title={log.toProjectName}>Đến: {log.toProjectName}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                          {log.cost.toLocaleString()} ₫
                        </td>
                        <td className="py-2.5 text-center">
                          <button
                            onClick={() => exportDispatchExcel(log)}
                            className="inline-flex items-center gap-1 px-1.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md transition-all font-bold text-[9px] cursor-pointer"
                            title="Xuất file Excel Lệnh điều động thiết bị"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-blue-600" />
                            <span>Lệnh</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'procurement' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto space-y-6 text-xs font-semibold">

          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-slate-800 font-black text-sm flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              Lập hồ sơ mua sắm & Thuê mướn dụng cụ thiết bị mới
            </h3>
            <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-1">
              Khởi tạo hồ sơ, kết nối trực tiếp với dòng tiền kế toán & Sổ cái Nhật ký chung
            </p>
          </div>

          <form onSubmit={handleProcure} className="space-y-4">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Phương thức sở hữu *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setProcureType('Purchase')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      procureType === 'Purchase' ? 'bg-slate-900 text-white border-slate-950' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Mua mới tài sản (TK 211 / 153)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProcureType('Rental')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      procureType === 'Rental' ? 'bg-slate-900 text-white border-slate-950' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Thuê ngoài (TK 627)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Phân cấp tài sản *</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setProcureCategory('Heavy')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      procureCategory === 'Heavy' ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cơ giới hạng nặng (Komatsu...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProcureCategory('Tool')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                      procureCategory === 'Tool' ? 'bg-blue-600 text-white border-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Công cụ dụng cụ (Bộ đàm, búa...)
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Mã thiết bị / Ký hiệu</label>
                <input
                  type="text"
                  placeholder="Ký hiệu (ví dụ: TB-001)"
                  value={procureCode}
                  onChange={(e) => setProcureCode(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tên máy móc / Công cụ dụng cụ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Máy hàn Jasic ZX7-250, xe nâng cẩu..."
                  value={procureName}
                  onChange={(e) => setProcureName(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Đơn vị cung cấp thiết bị</label>
                <input
                  type="text"
                  placeholder="e.g. Tổng kho cơ giới Nam Phát"
                  value={procureSupplier}
                  onChange={(e) => setProcureSupplier(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="text-slate-400 block mb-1">Dự án công trình tiếp nhận cấp phát *</label>
                <select
                  required
                  value={procureProject}
                  onChange={(e) => setProcureProject(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg"
                >
                  <option value="">-- Chọn công trình tiếp nhận --</option>
                  {projects.map(p => (
                    <option key={`proc-proj-${p.id}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Giá trị hợp đồng (VND) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50000000"
                  value={procureCost || ''}
                  onChange={(e) => setProcureCost(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-red-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">Phương thức thanh toán hạch toán *</label>
                <select
                  value={procurePaymentMethod}
                  onChange={(e) => setProcurePaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg"
                >
                  <option value="Bank">Chuyển khoản Ngân hàng (TK 1121)</option>
                  <option value="Cash">Tiền mặt tại quỹ (TK 1111)</option>
                  <option value="Debt">Mua chịu ghi nhận công nợ (TK 331)</option>
                </select>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="text-[10px] text-slate-500 leading-normal">
                  Hệ thống tự động thực hiện ghi Nợ TK {procureCategory === 'Heavy' ? '211' : '153'} (Tài sản) và Có TK {procurePaymentMethod === 'Bank' ? '1121' : (procurePaymentMethod === 'Cash' ? '1111' : '331')} trong Nhật ký chung!
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg shadow-sm"
              >
                GHI SỔ MUA SẮM & BÀN GIAO THIẾT BỊ
              </button>
            </div>

          </form>

        </div>
      )}

      {/* DISPATCH EQUIPMENT MODAL */}
      {showDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">

            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-400" />
                Lập lệnh điều động thiết bị cơ giới
              </h3>
              <button
                onClick={() => setShowDispatchModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDispatch} className="p-6 space-y-4 text-xs font-semibold">

              <div>
                <p className="text-[11px] text-slate-500 mb-3 bg-slate-50 p-2.5 rounded border border-slate-150 leading-relaxed">
                  Thiết bị được điều phối sẽ tự động cập nhật Vị trí dự án hiện hành, đồng thời ghi nhận một chi phí vận chuyển xe fooc nâng máy xúc vào nhật ký công trình tiếp nhận.
                </p>
                <label className="text-slate-400 block mb-1">Thiết bị được chỉ định</label>
                <input
                  type="text"
                  readOnly
                  value={selectedEquipmentDetail?.name || ''}
                  className="w-full p-2.5 border border-slate-100 rounded-lg bg-slate-50 font-bold text-slate-600"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Công trình tiếp nhận điều phối *</label>
                <select
                  required
                  value={dispatchTargetProjId}
                  onChange={(e) => setDispatchTargetProjId(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 bg-slate-50 rounded-lg"
                >
                  <option value="">-- Chọn công trình đích --</option>
                  {projects.filter(p => p.id !== selectedEquipmentDetail?.currentProjectId).map(p => (
                    <option key={`dis-dest-${p.id}`} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Chi phí kéo máy / vận tải (VND) *</label>
                <input
                  type="number"
                  required
                  value={dispatchSurcharge}
                  onChange={(e) => setDispatchSurcharge(Number(e.target.value))}
                  className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDispatchModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg shadow-sm"
                >
                  PHÁT LỆNH ĐIỀU ĐỘNG
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
