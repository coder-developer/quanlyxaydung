import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Search,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserCheck,
  ArrowRightLeft,
  Plus,
  Printer,
  Calculator,
  FileSpreadsheet,
  MapPin,
  Briefcase,
  ShieldAlert,
  Wallet,
  PenTool,
  Download,
  Edit3,
  Trash2,
  CheckSquare,
  QrCode,
  Eye
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Employee, Project, Timesheet, FinancialTransaction, LaborContract, ConstructionTask, CompanyConfig, UserRole } from '../types';
import { normalizeBusinessId } from '../lib/businessIds';

interface HRManagerProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  timesheets: Timesheet[];
  setTimesheets: React.Dispatch<React.SetStateAction<Timesheet[]>>;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  laborContracts: LaborContract[];
  setLaborContracts: React.Dispatch<React.SetStateAction<LaborContract[]>>;
  constructionTasks: ConstructionTask[];
  setConstructionTasks: React.Dispatch<React.SetStateAction<ConstructionTask[]>>;
  companyConfig?: CompanyConfig;
  globalSearchQuery?: string;
  userRole?: UserRole;
}

export default function HRManager({
  projects,
  setProjects,
  employees,
  setEmployees,
  timesheets,
  setTimesheets,
  transactions,
  setTransactions,
  laborContracts,
  setLaborContracts,
  constructionTasks,
  setConstructionTasks,
  companyConfig,
  globalSearchQuery,
  userRole
}: HRManagerProps) {
  // State managers
  const [hrSubTab, setHrSubTab] = useState<'employees' | 'attendance' | 'payroll' | 'contracts' | 'schedule'>('employees');
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize with global search query
  useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearchTerm(globalSearchQuery);
      if (globalSearchQuery) {
        setHrSubTab('employees');
      }
    }
  }, [globalSearchQuery]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal employee form state
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [newEmp, setNewEmp] = useState({
    code: '',
    name: '',
    role: '',
    type: 'Internal' as 'Internal' | 'Seasonal',
    projectId: projects[0]?.id || '',
    phone: '',
    baseSalary: 300000,
    active: true,
    citizenId: '',
    permanentAddress: ''
  });

  // Manual Check-in state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState({
    employeeId: '',
    projectId: projects[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '07:30',
    checkOutTime: '17:00',
    status: 'Present' as 'Present' | 'Late' | 'Absent' | 'Overtime',
    gpsStatus: 'In-Range' as 'In-Range' | 'Out-Of-Range',
    verifiedByFace: true
  });

  // Payroll state
  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedPayrollProj, setSelectedPayrollProj] = useState<string>(projects[0]?.id || 'all');
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<{
    id: string;
    employee: Employee;
    amount: number;
    type: 'Salary_Payment' | 'Salary_Advance';
    project: Project;
    date: string;
    note: string;
    preparedBy: string;
    isProcessed: boolean;
  } | null>(null);

  // --- LABOR CONTRACT STATES ---
  const [showContractModal, setShowContractModal] = useState(false);
  const [editingContract, setEditingContract] = useState<LaborContract | null>(null);
  const [newContract, setNewContract] = useState({
    employeeId: '',
    contractNumber: '',
    signDate: new Date().toISOString().split('T')[0],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    salaryType: 'Monthly' as 'Monthly' | 'Daily',
    salaryAmount: 15000000,
    allowance: 1000000,
    insurance: true,
    status: 'Active' as 'Active' | 'Expired' | 'Pending',
    signedByEmployee: true,
    signedByDirector: true
  });

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [signingContract, setSigningContract] = useState<LaborContract | null>(null);
  const [signatureRole, setSignatureRole] = useState<'Employee' | 'Director'>('Employee');
  const [signatureType, setSignatureType] = useState<'draw' | 'type' | 'stamp'>('type');
  const [typedSignature, setTypedSignature] = useState('');
  const [signatureCanvasValue, setSignatureCanvasValue] = useState(''); // Simulated SVG or status

  const [showContractPreviewModal, setShowContractPreviewModal] = useState(false);
  const [previewingContract, setPreviewingContract] = useState<LaborContract | null>(null);

  // --- EMPLOYEE DETAIL & QR CODE STATES ---
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<Employee | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailActiveTab, setDetailActiveTab] = useState<'info' | 'timesheet' | 'payroll'>('info');
  const [showQrScanModal, setShowQrScanModal] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);

  // Dynamic Attendance & Leave Violation Checker for selected employee detail
  const empViolations = useMemo(() => {
    if (!selectedEmpDetail) return null;
    const empTimes = timesheets.filter(t => t.employeeId === selectedEmpDetail.id);
    const lateDays = empTimes.filter(t => t.status === 'Late' || (t.checkInTime && t.checkInTime > '08:00')).length;
    const absentDays = empTimes.filter(t => t.status === 'Absent').length;
    const gpsViolations = empTimes.filter(t => t.gpsStatus === 'Out-Of-Range').length;

    const maxAllowedAbsents = 3;
    const maxAllowedLates = 3;

    const violations: string[] = [];
    if (absentDays > maxAllowedAbsents) {
      violations.push(`Nghỉ quá số ngày quy định: Tự ý vắng mặt ${absentDays} ngày (Quy định tối đa không quá ${maxAllowedAbsents} ngày/tháng).`);
    }
    if (lateDays > maxAllowedLates) {
      violations.push(`Đi muộn quá số ngày quy định: Đi muộn ${lateDays} lần (Quy định tối đa không quá ${maxAllowedLates} lần/tháng).`);
    }
    if (gpsViolations > 0) {
      violations.push(`Vi phạm kỷ luật vị trí: Phát hiện ${gpsViolations} lượt chấm công ngoài bán kính thiết lập của công trường .`);
    }

    const hasViolations = violations.length > 0;
    return {
      lateDays,
      absentDays,
      gpsViolations,
      violations,
      hasViolations
    };
  }, [selectedEmpDetail, timesheets]);

  // --- CONSTRUCTION SCHEDULE STATES ---
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<ConstructionTask | null>(null);
  const [selectedScheduleProject, setSelectedScheduleProject] = useState<string>('all');
  const [newTask, setNewTask] = useState({
    projectId: projects[0]?.id || '',
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    progress: 0,
    assignedTo: '',
    status: 'Not_Started' as 'Not_Started' | 'In_Progress' | 'Delayed' | 'Completed',
    priority: 'Medium' as 'Low' | 'Medium' | 'High',
    weight: 10,
    notes: ''
  });

  // Toast notifier helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Format currencies
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Helper names
  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || 'Trụ sở / Khác';
  };

  // Filter Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            emp.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProject = selectedProjectFilter === 'all' || emp.projectId === selectedProjectFilter;
      const matchesType = selectedTypeFilter === 'all' || emp.type === selectedTypeFilter;
      return matchesSearch && matchesProject && matchesType;
    });
  }, [employees, searchTerm, selectedProjectFilter, selectedTypeFilter]);

  // Handle Employee Add/Edit
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.role || !newEmp.phone) {
      showToast('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }
    const employeeCode = normalizeBusinessId(newEmp.code || `NV-${(employees.length + 1).toString().padStart(3, '0')}`, `NV-${(employees.length + 1).toString().padStart(3, '0')}`);
    if (employees.some(emp => emp.id !== editingEmp?.id && (emp.id === employeeCode || emp.code === employeeCode))) {
      showToast(`Mã nhân viên ${employeeCode} đã tồn tại.`);
      return;
    }

    if (editingEmp) {
      // Edit mode
      setEmployees(prev => prev.map(emp => emp.id === editingEmp.id ? { ...emp, ...newEmp, code: employeeCode } : emp));
      showToast(`Đã cập nhật thông tin nhân viên ${newEmp.name} thành công.`);
    } else {
      // Create mode
      const createdEmp: Employee = {
        id: employeeCode,
        ...newEmp,
        code: employeeCode
      };
      setEmployees(prev => [createdEmp, ...prev]);
      showToast(`Đã thêm mới nhân viên ${newEmp.name} (Mã số: ${employeeCode}) thành công.`);
    }

    setShowAddEmpModal(false);
    setEditingEmp(null);
    // Reset state
    setNewEmp({
      code: '',
      name: '',
      role: '',
      type: 'Internal',
      projectId: projects[0]?.id || '',
      phone: '',
      baseSalary: 350000,
      active: true,
      citizenId: '',
      permanentAddress: ''
    });
  };

  const handleEditEmpClick = (emp: Employee) => {
    setEditingEmp(emp);
    setNewEmp({
      code: emp.code || '',
      name: emp.name,
      role: emp.role,
      type: emp.type,
      projectId: emp.projectId,
      phone: emp.phone,
      baseSalary: emp.baseSalary,
      active: emp.active,
      citizenId: emp.citizenId || '',
      permanentAddress: emp.permanentAddress || ''
    });
    setShowAddEmpModal(true);
  };

  const handleDeleteEmployee = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhân sự ${name}? Thao tác này không thể hoàn tác.`)) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
      showToast(`Đã xóa nhân sự ${name} khỏi cơ sở dữ liệu.`);
    }
  };

  // Handle manual attendance check-in
  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCheckIn.employeeId) {
      showToast('Vui lòng chọn nhân viên cần chấm công.');
      return;
    }

    const createdTimesheet: Timesheet = {
      id: `timesheet-${Date.now()}`,
      employeeId: newCheckIn.employeeId,
      projectId: newCheckIn.projectId,
      date: newCheckIn.date,
      checkInTime: newCheckIn.checkInTime,
      checkOutTime: newCheckIn.checkOutTime || null,
      status: newCheckIn.status,
      latitude: 10.7769, // Mock GPS matching center range
      longitude: 106.6951,
      gpsStatus: newCheckIn.gpsStatus,
      verifiedByFace: newCheckIn.verifiedByFace
    };

    setTimesheets(prev => [createdTimesheet, ...prev]);
    showToast(`Đã ghi nhận chấm công thành công cho nhân sự ${employees.find(emp => emp.id === newCheckIn.employeeId)?.name}.`);
    setShowCheckInModal(false);
  };

  // Download QR helper
  const downloadQR = () => {
    const svgElement = document.getElementById("employee-qr-code");
    if (!svgElement) return;
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = `QR_Code_${selectedEmpDetail?.name || 'employee'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    showToast(`Đã tải mã QR cho nhân viên ${selectedEmpDetail?.name}.`);
  };

  // Individual employee calculation helper
  const getEmpPayrollDetails = (emp: Employee) => {
    // Find timesheets for this employee in specified month and year
    const empSheets = timesheets.filter(t => {
      if (t.employeeId !== emp.id) return false;
      const [tYear, tMonth] = t.date.split('-');
      return parseInt(tYear) === selectedYear && parseInt(tMonth) === selectedMonth;
    });

    const daysPresent = empSheets.filter(t => t.status === 'Present' || t.status === 'Late' || t.status === 'Overtime').length;
    const daysOvertime = empSheets.filter(t => t.status === 'Overtime').length;
    const daysLate = empSheets.filter(t => t.status === 'Late').length;
    const daysAbsent = empSheets.filter(t => t.status === 'Absent').length;

    // Base wage calculation
    let calculatedSalary = 0;
    let note = '';
    const isDailyWage = emp.baseSalary < 1500000;

    if (isDailyWage) {
      calculatedSalary = (daysPresent * emp.baseSalary) + (daysOvertime * emp.baseSalary * 0.5) - (daysLate * 30000);
      note = `Công nhật: ${formatVND(emp.baseSalary)}/ngày. Chấm công thực tế.`;
    } else {
      const fullWorkDays = 26;
      if (daysPresent >= 22) {
        calculatedSalary = emp.baseSalary + (daysOvertime * 450000) - (daysLate * 50000);
        note = `HĐ tháng cơ hữu. Đủ ngày công quy định.`;
      } else {
        const dailyProrated = emp.baseSalary / fullWorkDays;
        calculatedSalary = (daysPresent * dailyProrated) + (daysOvertime * 450000) - (daysLate * 50000);
        note = `HĐ tháng pro-rata (${daysPresent}/${fullWorkDays} ngày công).`;
      }
    }

    if (calculatedSalary < 0) calculatedSalary = 0;

    const advances = transactions
      .filter(tx => tx.projectId === emp.projectId &&
                    tx.category === 'Labor' &&
                    tx.description.toLowerCase().includes('tạm ứng') &&
                    tx.description.toLowerCase().includes(emp.name.toLowerCase()))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const salariesPaid = transactions
      .filter(tx => tx.projectId === emp.projectId &&
                    tx.category === 'Labor' &&
                    tx.description.toLowerCase().includes('chi lương') &&
                    tx.description.toLowerCase().includes(emp.name.toLowerCase()))
      .reduce((sum, tx) => sum + tx.amount, 0);

    const netSalaryPayable = calculatedSalary - advances - salariesPaid;

    return {
      daysPresent,
      daysOvertime,
      daysLate,
      daysAbsent,
      baseSalary: emp.baseSalary,
      totalEarned: Math.round(calculatedSalary),
      advances: Math.round(advances),
      salariesPaid: Math.round(salariesPaid),
      netSalaryPayable: Math.round(netSalaryPayable > 0 ? netSalaryPayable : 0),
      note,
      isDailyWage,
      empSheets
    };
  };

  // Export Individual Timesheet to Excel
  const handleExportIndividualTimesheetExcel = (emp: Employee, data: ReturnType<typeof getEmpPayrollDetails>) => {
    const filename = `Bang_cham_cong_${emp.name.replace(/\s+/g, '_')}_thang_${selectedMonth}_${selectedYear}.xls`;
    let tableRows = '';
    const sortedSheets = [...data.empSheets].sort((a, b) => a.date.localeCompare(b.date));

    sortedSheets.forEach((sheet, index) => {
      let statusVi = '';
      switch(sheet.status) {
        case 'Present': statusVi = 'Đúng giờ'; break;
        case 'Late': statusVi = 'Đi muộn'; break;
        case 'Overtime': statusVi = 'Tăng ca'; break;
        case 'Absent': statusVi = 'Vắng mặt'; break;
        default: statusVi = sheet.status;
      }

      tableRows += `
        <tr>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${index + 1}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${sheet.date}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${sheet.checkInTime || '-'}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${sheet.checkOutTime || '-'}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px; font-weight: bold;">${statusVi}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${sheet.verifiedByFace ? 'Có ảnh xác minh' : 'Không có ảnh'}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${sheet.gpsStatus === 'In-Range' ? 'Trong phạm vi' : 'Ngoài phạm vi'}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Chấm công ${emp.name}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 5px; color: #1e293b;">
          BẢNG CHẤM CÔNG CHI TIẾT NHÂN SỰ
        </div>
        <div style="font-size: 11pt; text-align: center; margin-bottom: 20px; color: #475569;">
          Tháng ${selectedMonth} Năm ${selectedYear}
        </div>

        <table style="margin-bottom: 15px; font-size: 10pt;">
          <tr>
            <td style="font-weight: bold; width: 120px;">Nhân sự:</td>
            <td>${emp.name}</td>
            <td style="font-weight: bold; width: 100px; padding-left: 50px;">Mã số:</td>
            <td style="font-family: monospace; font-weight: bold;">${emp.id}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Chức vụ:</td>
            <td>${emp.role}</td>
            <td style="font-weight: bold; padding-left: 50px;">Phân loại:</td>
            <td>${emp.type === 'Internal' ? 'Nhân viên Cơ hữu' : 'Lao động Thời vụ'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold;">Công trường:</td>
            <td colspan="3">${getProjectName(emp.projectId)}</td>
          </tr>
        </table>

        <table style="border-collapse: collapse; width: 100%; font-size: 10pt; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f5f9; border: 1px solid #cbd5e1; font-weight: bold;">
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 50px;">STT</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 100px;">Ngày</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 80px;">Giờ Vào</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 80px;">Giờ Ra</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 120px;">Trạng Thái</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 160px;">Ảnh xác minh</th>
              <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; width: 180px;">Định Vị GPS</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 ? tableRows : '<tr><td colspan="7" style="border: 1px solid #cbd5e1; text-align: center; padding: 12px; color: #64748b;">Chưa có dữ liệu chấm công cho tháng này</td></tr>'}
          </tbody>
        </table>

        <table style="margin-top: 15px; font-size: 10pt; border-collapse: collapse; border: 1px solid #cbd5e1; width: 100%; max-width: 400px;">
          <tr style="background-color: #f8fafc;">
            <td style="border: 1px solid #cbd5e1; padding: 6px; font-weight: bold;">Tổng số ngày công có mặt:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: #156534;">${data.daysPresent} ngày</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">Trong đó tăng ca:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: #7c3aed;">${data.daysOvertime} ngày</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">Đi muộn:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: #b45309;">${data.daysLate} ngày</td>
          </tr>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 6px;">Vắng mặt:</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-weight: bold; color: #c2410c;">${data.daysAbsent} ngày</td>
          </tr>
        </table>

        <div style="margin-top: 40px; text-align: right; font-size: 10pt; font-style: italic;">
          Xuất dữ liệu lúc: ${new Date().toLocaleString('vi-VN')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất bảng chấm công của ${emp.name} thành file Excel thành công.`);
  };

  // Export Individual Payroll/Payslip to Excel
  const handleExportIndividualPayrollExcel = (emp: Employee, data: ReturnType<typeof getEmpPayrollDetails>) => {
    const filename = `Phieu_luong_${emp.name.replace(/\s+/g, '_')}_thang_${selectedMonth}_${selectedYear}.xls`;
    const baseSalaryLabel = data.isDailyWage ? 'Lương theo ngày công' : 'Lương tháng cơ bản';
    const workDaysLabel = data.isDailyWage ? 'Số ngày công thực tế' : 'Số ngày công có mặt';

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Phiếu lương ${emp.name}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 5px; color: #1e293b;">
          PHIẾU THANH TOÁN LƯƠNG NHÂN VIÊN
        </div>
        <div style="font-size: 11pt; text-align: center; margin-bottom: 25px; color: #475569;">
          Tháng ${selectedMonth} Năm ${selectedYear}
        </div>

        <table style="margin-bottom: 20px; font-size: 10pt; width: 100%;">
          <tr>
            <td style="font-weight: bold; width: 120px; padding: 3px 0;">Nhân sự:</td>
            <td style="padding: 3px 0;">${emp.name}</td>
            <td style="font-weight: bold; width: 100px; padding-left: 50px; padding: 3px 0;">Mã NV:</td>
            <td style="font-family: monospace; font-weight: bold; padding: 3px 0;">${emp.id}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 3px 0;">Chức vụ:</td>
            <td style="padding: 3px 0;">${emp.role}</td>
            <td style="font-weight: bold; padding-left: 50px; padding: 3px 0;">Số CCCD:</td>
            <td style="font-family: monospace; padding: 3px 0;">${emp.citizenId || 'N/A'}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 3px 0;">Công trường:</td>
            <td style="padding: 3px 0;">${getProjectName(emp.projectId)}</td>
            <td style="font-weight: bold; padding-left: 50px; padding: 3px 0;">Loại hợp đồng:</td>
            <td style="padding: 3px 0;">${emp.type === 'Internal' ? 'Cơ hữu' : 'Thời vụ'}</td>
          </tr>
        </table>

        <table style="border-collapse: collapse; width: 100%; max-width: 600px; font-size: 10pt; margin-bottom: 25px;">
          <thead>
            <tr style="background-color: #1e293b; color: white; font-weight: bold;">
              <th style="border: 1px solid #1e293b; padding: 8px; text-align: left; width: 350px;">Khoản mục diễn giải</th>
              <th style="border: 1px solid #1e293b; padding: 8px; text-align: right; width: 150px;">Số tiền (VND)</th>
              <th style="border: 1px solid #1e293b; padding: 8px; text-align: center; width: 100px;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Mức lương gốc thỏa thuận (${baseSalaryLabel})</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; mso-number-format:'\\#\\,\\#\\#0'; font-weight: bold;">${emp.baseSalary}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">-</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">${workDaysLabel}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-weight: bold;">${data.daysPresent} ngày</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Chấm công thực tế</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Số ngày làm thêm giờ (tăng ca)</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-weight: bold;">${data.daysOvertime} ngày</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Hệ số phụ trội</td>
            </tr>
            <tr>
              <td style="border: 1px solid #cbd5e1; padding: 8px;">Số lần đi muộn / trễ công</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; font-weight: bold; color: #b45309;">${data.daysLate} ngày</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center;">Bị khấu trừ</td>
            </tr>
            <tr style="background-color: #faf5ff; font-weight: bold;">
              <td style="border: 1px solid #cbd5e1; padding: 8px; color: #6b21a8;">Tổng thu nhập phát sinh trong tháng (Gross)</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; mso-number-format:'\\#\\,\\#\\#0'; color: #6b21a8;">${data.totalEarned}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 8pt; color: #6b21a8;">${data.note}</td>
            </tr>
            <tr style="color: #b45309;">
              <td style="border: 1px solid #cbd5e1; padding: 8px; padding-left: 20px;">- Đã tạm ứng lương trước đó trong tháng</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; mso-number-format:'\\#\\,\\#\\#0'; font-weight: bold;">${data.advances}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 8pt;">Khấu trừ tạm ứng</td>
            </tr>
            <tr style="color: #1e40af;">
              <td style="border: 1px solid #cbd5e1; padding: 8px; padding-left: 20px;">- Đã hạch toán chi lương kỳ trước</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: right; mso-number-format:'\\#\\,\\#\\#0'; font-weight: bold;">${data.salariesPaid}</td>
              <td style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; font-size: 8pt;">Đã giải ngân</td>
            </tr>
            <tr style="background-color: #f0f9ff; font-weight: bold; font-size: 11pt; color: #166534;">
              <td style="border: 1px solid #cbd5e1; padding: 10px;">TIỀN LƯƠNG THỰC NHẬN CÒN LẠI (Net Payable)</td>
              <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: right; mso-number-format:'\\#\\,\\#\\#0';">${data.netSalaryPayable}</td>
              <td style="border: 1px solid #cbd5e1; padding: 10px; text-align: center; font-size: 9pt;">Thực trả cuối kỳ</td>
            </tr>
          </tbody>
        </table>

        <table style="width: 100%; max-width: 600px; font-size: 10pt; margin-top: 30px;">
          <tr>
            <td style="text-align: center; width: 50%; font-weight: bold;">NGƯỜI NHẬN LƯƠNG</td>
            <td style="text-align: center; width: 50%; font-weight: bold;">KẾ TOÁN TRƯỞNG</td>
          </tr>
          <tr>
            <td style="text-align: center; padding-top: 50px; font-style: italic; color: #94a3b8;">(Ký và ghi rõ họ tên)</td>
            <td style="text-align: center; padding-top: 50px; font-style: italic; color: #94a3b8;">(Ký và ghi rõ họ tên)</td>
          </tr>
          <tr>
            <td style="text-align: center; padding-top: 10px; font-weight: bold; color: #334155;">${emp.name}</td>
            <td style="text-align: center; padding-top: 10px; font-weight: bold; color: #334155;">Ban Kế Toán</td>
          </tr>
        </table>

        <div style="margin-top: 40px; text-align: right; font-size: 10pt; font-style: italic;">
          Xuất phiếu lương lúc: ${new Date().toLocaleString('vi-VN')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất phiếu lương cá nhân của ${emp.name} thành file Excel thành công.`);
  };

  // State for simulated QR check-in
  const [qrScanEmpId, setQrScanEmpId] = useState('');
  const [qrScanTime, setQrScanTime] = useState('07:30');
  const [qrScanOutTime, setQrScanOutTime] = useState('17:00');
  const [qrScanStatus, setQrScanStatus] = useState<'Present' | 'Late' | 'Overtime'>('Present');

  // Handle QR check-in confirmation
  const handleQrCheckInConfirm = () => {
    if (!qrScanEmpId) {
      showToast('Vui lòng chọn nhân viên giả lập quét mã QR.');
      return;
    }

    const emp = employees.find(e => e.id === qrScanEmpId);
    if (!emp) {
      showToast('Không tìm thấy nhân viên trong hệ thống.');
      return;
    }

    const todayStr = newCheckIn.date || new Date().toISOString().split('T')[0];

    // Check if employee has already checked in today
    const exists = timesheets.find(t => t.employeeId === emp.id && t.date === todayStr);
    if (exists) {
      showToast(`Nhân viên ${emp.name} đã được chấm công ngày hôm nay (${todayStr}) rồi.`);
      return;
    }

    const qrTimesheet: Timesheet = {
      id: `timesheet-qr-${Date.now()}`,
      employeeId: emp.id,
      projectId: emp.projectId,
      date: todayStr,
      checkInTime: qrScanTime,
      checkOutTime: qrScanOutTime || null,
      status: qrScanStatus,
      latitude: 10.7769,
      longitude: 106.6951,
      gpsStatus: 'In-Range',
      verifiedByFace: true
    };

    setTimesheets(prev => [qrTimesheet, ...prev]);
    showToast(`[QUÉT QR] Đã chấm công tự động qua QR thành công cho ${emp.name}!`);
    setShowQrScanModal(false);
    setScannedResult(null);
    setQrScanEmpId('');
  };

  // Quick action: auto check-in everyone for today to make it easy to prototype!
  const handleBatchCheckIn = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    // Check who hasn't checked in yet today
    const existingIdsToday = new Set(timesheets.filter(t => t.date === todayStr).map(t => t.employeeId));
    const activeEmps = employees.filter(emp => emp.active);
    const empsToCheckIn = activeEmps.filter(emp => !existingIdsToday.has(emp.id));

    if (empsToCheckIn.length === 0) {
      showToast('Tất cả nhân sự tích cực đã được chấm công ngày hôm nay.');
      return;
    }

    const statusOptions: ('Present' | 'Late')[] = ['Present', 'Present', 'Present', 'Late', 'Present'];
    const gpsOptions: ('In-Range' | 'Out-Of-Range')[] = ['In-Range', 'In-Range', 'In-Range', 'In-Range', 'Out-Of-Range'];

    const bulkSheets: Timesheet[] = empsToCheckIn.map((emp, index) => {
      const status = statusOptions[index % statusOptions.length];
      const gps = gpsOptions[index % gpsOptions.length];
      return {
        id: `timesheet-bulk-${index}-${Date.now()}`,
        employeeId: emp.id,
        projectId: emp.projectId,
        date: todayStr,
        checkInTime: status === 'Late' ? '08:15' : '07:25',
        checkOutTime: '17:00',
        status,
        latitude: 10.7769,
        longitude: 106.6951,
        gpsStatus: gps,
        verifiedByFace: Math.random() > 0.1
      };
    });

    setTimesheets(prev => [...bulkSheets, ...prev]);
    showToast(`Đã tự động chấm công đồng loạt thành công cho ${bulkSheets.length} nhân viên.`);
  };

  // Calculate stats for payroll for the selected month and year
  const payrollData = useMemo(() => {
    // Return calculate payload based on employees and their timesheets in selected month/year
    const activeProjEmps = employees.filter(emp => {
      const matchesProj = selectedPayrollProj === 'all' || emp.projectId === selectedPayrollProj;
      return matchesProj;
    });

    return activeProjEmps.map(emp => {
      // Find timesheets for this employee in specified month and year
      const empSheets = timesheets.filter(t => {
        if (t.employeeId !== emp.id) return false;
        const [tYear, tMonth] = t.date.split('-');
        return parseInt(tYear) === selectedYear && parseInt(tMonth) === selectedMonth;
      });

      const daysPresent = empSheets.filter(t => t.status === 'Present' || t.status === 'Late' || t.status === 'Overtime').length;
      const daysOvertime = empSheets.filter(t => t.status === 'Overtime').length;
      const daysLate = empSheets.filter(t => t.status === 'Late').length;
      const daysAbsent = empSheets.filter(t => t.status === 'Absent').length;

      // Base wage calculation
      let calculatedSalary = 0;
      let note = '';

      // Heuristic: If baseSalary < 1000000, it is daily wage. If >= 1000000, monthly contract.
      const isDailyWage = emp.baseSalary < 1500000;

      if (isDailyWage) {
        // Daily rate * days present + overtime bonuses
        calculatedSalary = (daysPresent * emp.baseSalary) + (daysOvertime * emp.baseSalary * 0.5) - (daysLate * 30000);
        note = `Công nhật: ${formatVND(emp.baseSalary)}/ngày. Chấm công thực tế.`;
      } else {
        // Monthly staff: full if >= 22 present, else pro-rated based on 26 days
        const fullWorkDays = 26;
        if (daysPresent >= 22) {
          calculatedSalary = emp.baseSalary + (daysOvertime * 450000) - (daysLate * 50000);
          note = `HĐ tháng cơ hữu. Đủ ngày công quy định.`;
        } else {
          const dailyProrated = emp.baseSalary / fullWorkDays;
          calculatedSalary = (daysPresent * dailyProrated) + (daysOvertime * 450000) - (daysLate * 50000);
          note = `HĐ tháng pro-rata (${daysPresent}/${fullWorkDays} ngày công).`;
        }
      }

      if (calculatedSalary < 0) calculatedSalary = 0;

      // Find cash advances already disbursed to this employee in this month
      const advances = transactions
        .filter(tx => tx.projectId === emp.projectId &&
                      tx.date.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`) &&
                      tx.category === 'Labor' &&
                      tx.description.toLowerCase().includes('tạm ứng') &&
                      tx.description.toLowerCase().includes(emp.name.toLowerCase()))
        .reduce((sum, tx) => sum + tx.amount, 0);

      // Paid salaries
      const salariesPaid = transactions
        .filter(tx => tx.projectId === emp.projectId &&
                      tx.date.startsWith(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`) &&
                      tx.category === 'Labor' &&
                      tx.description.toLowerCase().includes('chi lương') &&
                      tx.description.toLowerCase().includes(emp.name.toLowerCase()))
        .reduce((sum, tx) => sum + tx.amount, 0);

      const netSalaryPayable = calculatedSalary - advances - salariesPaid;

      return {
        employee: emp,
        daysPresent,
        daysOvertime,
        daysLate,
        daysAbsent,
        baseSalary: emp.baseSalary,
        totalEarned: Math.round(calculatedSalary),
        advances: Math.round(advances),
        salariesPaid: Math.round(salariesPaid),
        netSalaryPayable: Math.round(netSalaryPayable > 0 ? netSalaryPayable : 0),
        note,
        isDailyWage
      };
    });
  }, [employees, timesheets, selectedMonth, selectedYear, selectedPayrollProj, transactions]);

  // Aggregate Payroll Stats
  const payrollStats = useMemo(() => {
    let totalEarned = 0;
    let totalAdvancesPaid = 0;
    let totalSalariesPaid = 0;
    let totalNetPayable = 0;

    payrollData.forEach(item => {
      totalEarned += item.totalEarned;
      totalAdvancesPaid += item.advances;
      totalSalariesPaid += item.salariesPaid;
      totalNetPayable += item.netSalaryPayable;
    });

    return {
      totalEarned,
      totalAdvancesPaid,
      totalSalariesPaid,
      totalNetPayable
    };
  }, [payrollData]);

  // Handle Voucher Generation Open
  const handleOpenVoucherModal = (item: typeof payrollData[0], type: 'Salary_Payment' | 'Salary_Advance') => {
    const proj = projects.find(p => p.id === item.employee.projectId) || projects[0];
    const amountToDisburse = type === 'Salary_Advance' ? Math.round(item.baseSalary * 0.3) : item.netSalaryPayable;

    if (amountToDisburse <= 0 && type === 'Salary_Payment') {
      showToast(`Không có dư nợ lương cần thanh toán cho ${item.employee.name}.`);
      return;
    }

    setCurrentVoucher({
      id: `VC-${Date.now().toString().slice(-6)}`,
      employee: item.employee,
      amount: amountToDisburse,
      type,
      project: proj,
      date: new Date().toISOString().split('T')[0],
      note: type === 'Salary_Advance'
        ? `Tạm ứng 30% lương tháng ${selectedMonth}/${selectedYear} cho nhân sự ${item.employee.name}`
        : `Chi trả tiền lương thực nhận tháng ${selectedMonth}/${selectedYear} cho nhân sự ${item.employee.name}`,
      preparedBy: 'Kế toán Trưởng',
      isProcessed: false
    });
    setShowVoucherModal(true);
  };

  // Save Voucher & Execute Transaction Posting (Durable Ledger updates)
  const handlePostVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVoucher) return;

    const finalAmount = currentVoucher.amount;
    const pId = currentVoucher.project.id;

    // 1. Post to General Ledger as a real Expense -> Labor Transaction
    const newTx: FinancialTransaction = {
      id: `tx-labor-${Date.now()}`,
      projectId: pId,
      type: 'Expense',
      category: 'Labor',
      amount: finalAmount,
      description: `${currentVoucher.note} (Mã phiếu: ${currentVoucher.id})`,
      date: currentVoucher.date,
      referenceId: currentVoucher.id
    };

    setTransactions(prev => [newTx, ...prev]);

    // 2. Cascade update to project: add to project spent budget!
    setProjects(prevProjs =>
      prevProjs.map(p => {
        if (p.id === pId) {
          return {
            ...p,
            spent: p.spent + finalAmount
          };
        }
        return p;
      })
    );

    showToast(`Đã chi tiền thành công! Phiếu chi ${currentVoucher.id} số tiền ${formatVND(finalAmount)} đã được hạch toán và ghi sổ nhật ký chung.`);
    setShowVoucherModal(false);
  };

  // Export to Excel for payroll data with precise standard matching
  const handleExportPayrollExcel = () => {
    const filename = `Bang_luong_thang_${selectedMonth}_${selectedYear}.xls`;
    const reportDateStr = new Date().toLocaleString('vi-VN');

    let tableRows = '';
    payrollData.forEach((item, index) => {
      tableRows += `
        <tr>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${index + 1}</td>
          <td style="border: 1px solid #cbd5e1; font-weight: bold; padding: 6px; mso-number-format:'@';">${item.employee.id}</td>
          <td style="border: 1px solid #cbd5e1; font-weight: bold; padding: 6px;">${item.employee.name}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${item.employee.role}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${item.employee.type === 'Internal' ? 'Cơ hữu' : 'Thời vụ'}</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0';">${item.baseSalary}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${item.daysPresent}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${item.daysOvertime}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${item.daysLate}</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0'; background-color: #faf5ff; font-weight: bold;">${item.totalEarned}</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0'; color: #b45309;">${item.advances}</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0'; color: #1e40af;">${item.salariesPaid}</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0'; background-color: #f0f9ff; font-weight: bold; color: #166534;">${item.netSalaryPayable}</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Bang Luong Chi Tiet</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', Times, serif; }
          .title { font-size: 15pt; font-weight: bold; text-align: center; margin-top: 10px; text-transform: uppercase; }
          .table-header { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; }
        </style>
      </head>
      <body>
        <div style="font-weight: bold; text-transform: uppercase; font-size: 10pt;">${companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}</div>
        <div style="font-size: 9pt; color: #64748b;">Hệ thống Hạch toán Tiền lương & Chấm công </div>
        <br>
        <div class="title">BẢNG THANH TOÁN TIỀN LƯƠNG & CHẤM CÔNG NHÂN SỰ CHUNG</div>
        <div style="text-align: center; font-style: italic; font-size: 10pt; margin-bottom: 20px;">Tháng ${selectedMonth} năm ${selectedYear} &bull; Dự án: ${selectedPayrollProj === 'all' ? 'Tất cả công trường' : getProjectName(selectedPayrollProj)}</div>
        <br>
        <table style="border-collapse: collapse; width: 100%; font-size: 9.5pt;">
          <thead>
            <tr class="table-header">
              <th style="border: 1px solid #475569; padding: 8px;">STT</th>
              <th style="border: 1px solid #475569; padding: 8px;">Mã NV</th>
              <th style="border: 1px solid #475569; padding: 8px;">Họ và Tên</th>
              <th style="border: 1px solid #475569; padding: 8px;">Vị trí / Vai trò</th>
              <th style="border: 1px solid #475569; padding: 8px;">Phân loại</th>
              <th style="border: 1px solid #475569; padding: 8px;">Lương cơ bản (Ngày/Tháng)</th>
              <th style="border: 1px solid #475569; padding: 8px;">Ngày công</th>
              <th style="border: 1px solid #475569; padding: 8px;">Tăng ca</th>
              <th style="border: 1px solid #475569; padding: 8px;">Đi muộn</th>
              <th style="border: 1px solid #475569; padding: 8px; background-color: #4c1d95; color: white;">Tổng thu nhập (VND)</th>
              <th style="border: 1px solid #475569; padding: 8px;">Đã tạm ứng (VND)</th>
              <th style="border: 1px solid #475569; padding: 8px;">Đã thanh toán (VND)</th>
              <th style="border: 1px solid #475569; padding: 8px; background-color: #14532d; color: white;">Thực nhận còn lại (VND)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
            <tr style="font-weight: bold; background-color: #f1f5f9;">
              <td colspan="5" style="border: 1px solid #94a3b8; text-align: right; padding: 8px;">TỔNG CỘNG TIỀN LƯƠNG:</td>
              <td style="border: 1px solid #94a3b8;"></td>
              <td style="border: 1px solid #94a3b8;"></td>
              <td style="border: 1px solid #94a3b8;"></td>
              <td style="border: 1px solid #94a3b8;"></td>
              <td style="border: 1px solid #94a3b8; text-align: right; padding: 8px; mso-number-format:'\\#\\,\\#\\#0';">${payrollStats.totalEarned}</td>
              <td style="border: 1px solid #94a3b8; text-align: right; padding: 8px; mso-number-format:'\\#\\,\\#\\#0';">${payrollStats.totalAdvancesPaid}</td>
              <td style="border: 1px solid #94a3b8; text-align: right; padding: 8px; mso-number-format:'\\#\\,\\#\\#0';">${payrollStats.totalSalariesPaid}</td>
              <td style="border: 1px solid #94a3b8; text-align: right; padding: 8px; mso-number-format:'\\#\\,\\#\\#0';">${payrollStats.totalNetPayable}</td>
            </tr>
          </tbody>
        </table>
        <br>
        <div style="font-style: italic; font-size: 8.5pt;">Kết xuất ngày: ${reportDateStr} &bull; Chữ ký hạch toán đã được ghi nhận trên sổ cái ERP.</div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất báo cáo bảng lương thành công: ${filename}`);
  };

  // --- LABOR CONTRACT HANDLERS ---
  const handleSaveLaborContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContract.employeeId || !newContract.contractNumber) {
      showToast('Vui lòng nhập đầy đủ Nhân sự và Số hợp đồng.');
      return;
    }

    if (editingContract) {
      setLaborContracts(prev => prev.map(c => c.id === editingContract.id ? { ...c, ...newContract } : c));
      showToast(`Đã cập nhật hợp đồng lao động ${newContract.contractNumber} thành công.`);
    } else {
      const generatedId = `lc-${Date.now().toString().slice(-4)}`;
      const createdContract: LaborContract = {
        id: generatedId,
        ...newContract,
        endDate: newContract.endDate ? newContract.endDate : null
      };
      setLaborContracts(prev => [createdContract, ...prev]);
      showToast(`Đã khởi tạo hợp đồng lao động mới ${newContract.contractNumber} thành công.`);
    }

    setShowContractModal(false);
    setEditingContract(null);
  };

  const handleEditContractClick = (c: LaborContract) => {
    setEditingContract(c);
    setNewContract({
      employeeId: c.employeeId,
      contractNumber: c.contractNumber,
      signDate: c.signDate,
      startDate: c.startDate,
      endDate: c.endDate || '',
      salaryType: c.salaryType,
      salaryAmount: c.salaryAmount,
      allowance: c.allowance,
      insurance: c.insurance,
      status: c.status,
      signedByEmployee: c.signedByEmployee,
      signedByDirector: c.signedByDirector
    });
    setShowContractModal(true);
  };

  const handleDeleteLaborContract = (id: string, number: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa hợp đồng số ${number}?`)) {
      setLaborContracts(prev => prev.filter(c => c.id !== id));
      showToast(`Đã xóa hợp đồng số ${number} khỏi cơ sở dữ liệu.`);
    }
  };

  const handleOpenSignModal = (contract: LaborContract, role: 'Employee' | 'Director') => {
    setSigningContract(contract);
    setSignatureRole(role);
    setTypedSignature(role === 'Director' ? (companyConfig?.directorName || 'Vũ Đức Thành') : (employees.find(e => e.id === contract.employeeId)?.name || ''));
    setSignatureCanvasValue('');
    setShowSignatureModal(true);
  };

  const executeSignContract = () => {
    if (!signingContract) return;

    setLaborContracts(prev => prev.map(c => {
      if (c.id === signingContract.id) {
        if (signatureRole === 'Employee') {
          return { ...c, signedByEmployee: true };
        } else {
          return { ...c, signedByDirector: true };
        }
      }
      return c;
    }));

    showToast(`Đã thực hiện ký duyệt số điện tử thành công với vai trò ${signatureRole === 'Director' ? 'Đại diện Công ty (Giám đốc)' : 'Người lao động'}.`);
    setShowSignatureModal(false);
    setSigningContract(null);
  };

  const handleExportSalaryVoucherExcel = (voucher: typeof currentVoucher) => {
    if (!voucher) return;
    const filename = `Phieu_chi_luong_${voucher.id}.xls`;
    const reportDateStr = new Date().toLocaleString('vi-VN');
    const title = voucher.type === 'Salary_Advance' ? 'PHIẾU CHI TẠM ỨNG LƯƠNG' : 'PHIẾU CHI TRẢ LƯƠNG';

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Phieu Chi Luong</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', Times, serif; }
          .title { font-size: 16pt; font-weight: bold; text-align: center; margin-top: 10px; text-transform: uppercase; }
          .subtitle { font-size: 9pt; font-style: italic; text-align: center; margin-bottom: 20px; }
          .header-table { width: 100%; border: none; font-size: 10pt; }
          .data-table { border-collapse: collapse; width: 100%; font-size: 10pt; margin-top: 15px; }
          .data-table th { background-color: #f1f5f9; border: 1px solid #94a3b8; font-weight: bold; padding: 8px; text-align: center; }
          .data-table td { border: 1px solid #cbd5e1; padding: 8px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td colspan="3" style="font-weight: bold; text-transform: uppercase;">${companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}</td>
            <td colspan="3" style="text-align: right; font-weight: bold; font-family: monospace;">MÃ PHIẾU: ${voucher.id}</td>
          </tr>
          <tr>
            <td colspan="3">Ban Điều Hành Dự Án: ${voucher.project.name}</td>
            <td colspan="3" style="text-align: right;">Mẫu số: 02-TT (Ban hành theo TT 200/2014/TT-BTC)</td>
          </tr>
          <tr>
            <td colspan="3">Địa điểm công trường: ${companyConfig?.siteOffice || ' quốc lộ / Công trình cấp bách'}</td>
            <td colspan="3" style="text-align: right;">Ngày hạch toán: ${voucher.date}</td>
          </tr>
        </table>

        <br>
        <div class="title">${title}</div>
        <div class="subtitle">Nợ TK 334 (Phải trả người lao động) &bull; Có TK 111 (Tiền mặt)</div>

        <table class="header-table" style="margin-top: 15px; border-collapse: collapse;">
          <tr>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Họ và tên người nhận tiền:</strong></td>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold;">${voucher.employee.name}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Mã nhân sự & điện thoại:</strong></td>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0; font-family: monospace;">${voucher.employee.id} &bull; ${voucher.employee.phone}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Chức vụ / Vị trí công tác:</strong></td>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0;">${voucher.employee.role}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Dự án công trường liên quan:</strong></td>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0; font-weight: bold;">${voucher.project.name}</td>
          </tr>
          <tr>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0;"><strong>Lý do chi tiền:</strong></td>
            <td colspan="3" style="padding: 6px; border: 1px solid #e2e8f0; font-style: italic;">${voucher.note}</td>
          </tr>
          <tr style="background-color: #f0fdf4;">
            <td colspan="3" style="padding: 8px; border: 1px solid #bbf7d0; font-weight: bold; color: #166534;">SỐ TIỀN THANH TOÁN:</td>
            <td colspan="3" style="padding: 8px; border: 1px solid #bbf7d0; font-size: 11pt; font-weight: bold; color: #166534; font-family: monospace;">${voucher.amount}</td>
          </tr>
        </table>

        <br>
        <table style="width: 100%; border: none; margin-top: 25px; font-size: 10pt;">
          <tr>
            <td style="width: 33%; text-align: center; font-weight: bold; text-transform: uppercase; border: none;">Kế toán trưởng</td>
            <td style="width: 33%; text-align: center; font-weight: bold; text-transform: uppercase; border: none;">Thủ quỹ chi tiền</td>
            <td style="width: 34%; text-align: center; font-weight: bold; text-transform: uppercase; border: none;">Người nhận tiền</td>
          </tr>
          <tr>
            <td style="text-align: center; font-style: italic; color: #475569; font-size: 8.5pt; border: none;">(Ký duyệt định khoản)</td>
            <td style="text-align: center; font-style: italic; color: #475569; font-size: 8.5pt; border: none;">(Ký, đóng dấu phát tiền)</td>
            <td style="text-align: center; font-style: italic; color: #475569; font-size: 8.5pt; border: none;">(Ký và ghi rõ họ tên)</td>
          </tr>
          <tr>
            <td style="height: 60px; border: none;"></td>
            <td style="height: 60px; border: none;"></td>
            <td style="height: 60px; border: none;"></td>
          </tr>
          <tr style="font-weight: bold;">
            <td style="text-align: center; border: none;">.....................................</td>
            <td style="text-align: center; border: none;">.....................................</td>
            <td style="text-align: center; border: none;">.....................................</td>
          </tr>
        </table>

        <br><br>
        <div style="font-style: italic; font-size: 8.5pt; color: #64748b;">Hệ thống hạch toán nhân sự ${companyConfig?.appTitle || 'Quản Trị Doanh Nghiệp'} &bull; Ngày xuất file: ${reportDateStr}</div>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất phiếu chi tiền lương thành file Excel: ${filename}`);
  };

  const handleExportContractWord = () => {
    if (!previewingContract) return;

    const emp = employees.find(e => e.id === previewingContract.employeeId);
    const employeeName = emp ? emp.name : '.....................................';
    const proj = projects.find(p => p.id === previewingContract.projectId);

    const d = new Date();
    const dayStr = String(d.getDate()).padStart(2, '0');
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = d.getFullYear();

    const formatVNDLocal = (num: number) => {
      return num.toLocaleString('vi-VN') + ' VNĐ';
    };

    const formatContractDateLocal = (dateStr: string) => {
      if (!dateStr) return '';
      const part = dateStr.split('-');
      if (part.length === 3) return `${part[2]}/${part[1]}/${part[0]}`;
      return dateStr;
    };

    const birthYear = emp?.id ? 1980 + (parseInt(emp.id.replace(/\D/g, '') || '0') % 15) : 1990;
    const cccdVal = emp?.id ? `07909300${emp.id.replace(/\D/g, '').padStart(4, '0')}` : '079093005822';
    const addressVal = proj?.location || 'Số 12 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh';
    const empPhone = emp?.phone || 'Chưa cập nhật';
    const startDateFormatted = formatContractDateLocal(previewingContract.startDate);
    const endDateFormatted = previewingContract.endDate ? formatContractDateLocal(previewingContract.endDate) : 'Vô thời hạn';
    const salaryFormatted = formatVNDLocal(previewingContract.salaryAmount);
    const allowanceFormatted = formatVNDLocal(previewingContract.allowance);
    const isInternal = emp?.type === 'Internal';

    const filename = `Hop_dong_lao_dong_${previewingContract.contractNumber.replace(/\//g, '_')}.doc`;

    // Standard Styles for Office XML
    const pStyle = "margin-top:0cm;margin-right:0cm;margin-bottom:6.0pt;margin-left:0cm;text-align:justify;text-indent:1.25cm;line-height:1.3;font-size:13.0pt;font-family:'Times New Roman',serif;color:#000000;";
    const pNoIndentStyle = "margin-top:0cm;margin-right:0cm;margin-bottom:6.0pt;margin-left:0cm;text-align:justify;line-height:1.3;font-size:13.0pt;font-family:'Times New Roman',serif;color:#000000;";
    const pBulletStyle = "margin-top:0cm;margin-right:0cm;margin-bottom:4.0pt;margin-left:1.25cm;text-indent:-0.6cm;text-align:justify;line-height:1.3;font-size:13.0pt;font-family:'Times New Roman',serif;color:#000000;";
    const headingStyle = "margin-top:12.0pt;margin-right:0cm;margin-bottom:6.0pt;margin-left:0cm;font-weight:bold;font-size:13.0pt;font-family:'Times New Roman',serif;text-transform:uppercase;color:#000000;line-height:1.3;";

    // Construct full HTML file for Microsoft Word with strict Times New Roman overrides to ensure proper Vietnamese diacritics
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          @page Section1 {
            size: 21.0cm 29.7cm;
            margin: 2.0cm 1.5cm 2.0cm 3.0cm; /* Standard margins: Top 2cm, Right 1.5cm, Bottom 2cm, Left 3cm */
            mso-page-orientation: portrait;
            mso-header-margin: 36.0pt;
            mso-footer-margin: 36.0pt;
            mso-paper-source: 0;
          }
          div.Section1 {
            page: Section1;
          }
          * {
            font-family: 'Times New Roman', Times, serif !important;
          }
        </style>
      </head>
      <body style="font-family:'Times New Roman', Times, serif; font-size:13.0pt; line-height:1.3; margin:0; padding:0; color:#000000;">
        <div class="Section1">

          <!-- Standard 2-Column Administrative Header Table -->
          <table style="width:100%; border:none; border-collapse:collapse; margin-bottom:20.0pt; font-family:'Times New Roman',serif;">
            <tr>
              <td style="width:45%; text-align:center; vertical-align:top; padding:0;">
                <span style="font-weight:bold; text-transform:uppercase; font-size:11.0pt; display:block; line-height:1.2;">
                  ${companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}
                </span>
                <span style="font-size:11.0pt; display:block; margin-top:4.0pt;">
                  Số: ${previewingContract.contractNumber}
                </span>
              </td>
              <td style="width:55%; text-align:center; vertical-align:top; padding:0;">
                <span style="font-weight:bold; text-transform:uppercase; font-size:11.0pt; display:block; line-height:1.2;">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </span>
                <span style="font-weight:bold; font-size:12.0pt; display:block; margin-top:3.0pt;">
                  Độc lập – Tự do – Hạnh phúc
                </span>
                <div style="text-align:center; margin-top:2.0pt;">
                  <span style="display:inline-block; width:120px; border-bottom:1.5px solid black; height:1px;"></span>
                </div>
              </td>
            </tr>
          </table>

          <!-- Main Title -->
          <div style="text-align:center; margin-bottom:15.0pt; font-family:'Times New Roman',serif;">
            <p style="font-size:15.0pt; font-weight:bold; text-transform:uppercase; margin:0 0 10.0pt 0;">HỢP ĐỒNG LAO ĐỘNG</p>
            <p style="margin:2.0pt 0; font-style:italic; font-size:11.0pt; text-align:center;">- Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;</p>
            <p style="margin:2.0pt 0; font-style:italic; font-size:11.0pt; text-align:center;">- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</p>
            <p style="margin:2.0pt 0; font-style:italic; font-size:11.0pt; text-align:center;">- Căn cứ vào nhu cầu và khả năng của Các Bên.</p>
          </div>

          <!-- Opening sentence -->
          <p style="${pStyle}">
            Hôm nay, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}, tại văn phòng Ban Điều Hành Tổng Hợp ${companyConfig?.companyName || 'ERP Construction'}, chúng tôi gồm có các bên dưới đây ký kết hợp đồng này:
          </p>

          <!-- Party A Info -->
          <div style="margin-bottom:10.0pt;">
            <p style="${pNoIndentStyle}font-weight:bold; text-transform:uppercase;">
              MỖI BÊN A: NGƯỜI SỬ DỤNG LAO ĐỘNG
            </p>
            <table style="width:100%; border:none; border-collapse:collapse; margin-left:0.5cm;">
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - <strong>Tên Đơn Vị</strong>: ${companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Địa chỉ: ${companyConfig?.siteOffice || 'Số 12 Đại lộ Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh'}
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Mã số doanh nghiệp: 0317555888
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Người đại diện: Ông <strong>${companyConfig?.directorName || 'Vũ Đức Thành'}</strong> &nbsp;&nbsp;&nbsp;&nbsp;; Chức vụ: Giám Đốc Điều Hành (CEO)
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Số điện thoại: 0983.555.777 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;; Fax: (028) 3775.5588
                </td>
              </tr>
            </table>
            <p style="${pNoIndentStyle}font-style:italic; margin-top:4.0pt; margin-left:0.5cm;">
              (Sau đây gọi tắt là: “NSDLĐ” hoặc “Công ty”)
            </p>
          </div>

          <!-- Party B Info -->
          <div style="margin-bottom:10.0pt;">
            <p style="${pNoIndentStyle}font-weight:bold; text-transform:uppercase;">
              MỖI BÊN B: NGƯỜI LAO ĐỘNG
            </p>
            <table style="width:100%; border:none; border-collapse:collapse; margin-left:0.5cm;">
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Ông/Bà: <strong>${employeeName}</strong>
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Ngày sinh: 10/05/${birthYear}
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Số CCCD/CMND: ${cccdVal} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;; Ngày cấp: 15/06/2021 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;; Nơi cấp: Cục Cảnh sát QLHC về TTXH
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Hộ khẩu thường trú: Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Địa chỉ liên hệ: ${addressVal}
                </td>
              </tr>
              <tr>
                <td style="width:100%; padding:2.0pt 0; font-size:13.0pt;">
                  - Số điện thoại: ${empPhone}
                </td>
              </tr>
            </table>
            <p style="${pNoIndentStyle}font-style:italic; margin-top:4.0pt; margin-left:0.5cm;">
              (Sau đây gọi tắt là: “NLĐ” hoặc “Người lao động”)
            </p>
          </div>

          <!-- Statement -->
          <p style="${pStyle}">
            Người sử dụng lao động và Người lao động (sau đây gọi tắt là “hai Bên”) thỏa thuận ký kết hợp đồng lao động và cam kết thực đúng những điều khoản sau đây:
          </p>

          <!-- Terms -->
          <p style="${headingStyle}">Điều 1: Thời hạn và công việc hợp đồng</p>
          <p style="${pBulletStyle}">1.1. Loại hợp đồng lao động: ${isInternal ? 'Hợp đồng lao động xác định thời hạn (12 tháng)' : 'Hợp đồng lao động thời vụ / khoán ngày '}</p>
          <p style="${pBulletStyle}">1.2. Thời hạn từ ngày ${startDateFormatted} ${previewingContract.endDate ? `đến ngày ${endDateFormatted}` : 'cho đến khi hoàn thành bàn giao dự án xây dựng (Vô thời hạn)'}.</p>
          <p style="${pBulletStyle}">1.3. Đơn vị làm việc: ${companyConfig?.companyName || 'Công ty Cổ phần Đầu tư & Xây dựng Đất Việt'}</p>
          <p style="${pBulletStyle}">1.4. Địa điểm làm việc: ${proj?.name || 'Văn phòng Công ty và các Công trường Dự án trực thuộc'}</p>
          <p style="${pBulletStyle}">1.5. Chức vụ/chức danh chuyên môn: <strong>${emp?.role || 'Kỹ sư chuyên môn'}</strong></p>
          <p style="${pBulletStyle}">1.6. Nội dung công việc/Mô tả công việc chính:</p>
          <p style="${pBulletStyle}margin-left:2.0cm; text-indent:-0.6cm;">- Thực hiện công việc theo sự sắp xếp của lãnh đạo Công ty và các trưởng, phó bộ phận;</p>
          <p style="${pBulletStyle}margin-left:2.0cm; text-indent:-0.6cm;">- Thực hiện công tác chuyên môn theo bảng mô tả công việc vị trí chuyên môn; bảo đảm chất lượng, tiến độ và quy chuẩn kỹ thuật xây dựng hiện hành;</p>
          <p style="${pBulletStyle}margin-left:2.0cm; text-indent:-0.6cm;">- Người lao động đồng ý rằng Người sử dụng lao động có thể quyết định một cách hợp lý chức vụ của Người lao động và việc thuyên chuyển Người lao động trong các phòng ban của Công ty phù hợp với chuyên môn và năng lực thực tế;</p>
          <p style="${pBulletStyle}margin-left:2.0cm; text-indent:-0.6cm;">- Hoàn thành tốt công việc được giao theo định mức sản lượng, thời gian công nghệ và đạt chất lượng theo quy định – chấp hành tốt nội quy kỷ luật, quy trình an toàn lao động tại công trường.</p>

          <p style="${headingStyle}">Điều 2: Chế độ làm việc</p>
          <p style="${pBulletStyle}">2.1. Thời giờ làm việc: 8 tiếng/ngày. Buổi sáng: 8h00 – 12h00, Buổi chiều: 13h30 – 17h30. Làm việc từ thứ 2 đến hết sáng thứ 7 hàng tuần.</p>
          <p style="${pBulletStyle}">2.2. Do đặc thù công trình và hoạt động thi công, thời gian làm việc có thể linh hoạt theo ca do Chỉ huy trưởng công trường điều phối.</p>
          <p style="${pBulletStyle}">2.3. Thiết bị và công cụ làm việc chuyên dùng sẽ do Công ty cấp phát trực tiếp tại kho dự án.</p>
          <p style="${pBulletStyle}">2.4. Điều kiện bảo hộ và an toàn lao động tại nơi làm việc tuân thủ nghiêm ngặt Luật an toàn vệ sinh lao động.</p>

          <p style="${headingStyle}">Điều 3: Quyền lợi và nghĩa vụ của Người lao động</p>
          <p style="${pBulletStyle}font-weight:bold;">3.1. Quyền lợi:</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(i) Phương tiện đi lại: Người lao động tự túc.</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(ii) Mức lương chính thức: <strong>${salaryFormatted}</strong> (${previewingContract.salaryType === 'Monthly' ? 'đồng một tháng dương lịch' : 'đồng cho một ngày công làm việc thực tế hạch toán qua hệ thống chấm công'}).</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(iii) Các khoản phụ cấp: <strong>${allowanceFormatted}</strong> (phụ cấp theo quy chế lương và hoạt động của Công ty).</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(iv) Chế độ nâng lương: Đánh giá định kỳ theo hiệu quả KPI hoạt động cuối năm.</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(v) Chế độ Bảo hiểm: ${previewingContract.insurance ? 'Được đóng đầy đủ BHXH, BHYT, BHTN theo tỷ lệ quy định trích lập lương doanh nghiệp.' : 'Mức lương trên đã bao gồm phụ trội thay thế trực tiếp vào lương, người lao động tự túc đóng BHXH tự nguyện.'}</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(vi) Trang bị bảo hộ lao động: Cấp phát định kỳ 2 bộ quần áo bảo hộ, mũ và giày bảo hộ công trường.</p>

          <p style="${pBulletStyle}font-weight:bold;">3.2. Nghĩa vụ:</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(i) Hoàn thành những công việc theo thỏa thuận trong hợp đồng lao động này. Chấp hành nghiêm chỉnh nội quy lao động, quy trình kỹ thuật thi công;</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(ii) Bảo quản giữ gìn tài sản chung, máy móc trang bị của Công ty bàn giao;</p>
          <p style="${pBulletStyle}margin-left:1.5cm; text-indent:-0.6cm;">(iii) Giữ bí mật thông tin kinh doanh, bí mật công nghệ quản lý ERP của Công ty.</p>

          <p style="${headingStyle}">Điều 4: Quyền hạn và nghĩa vụ của Người sử dụng lao động</p>
          <p style="${pBulletStyle}">4.1. Có quyền điều động, phân công nhân sự luân chuyển công tác phù hợp với tiến độ dự án xây dựng và quy định của pháp luật lao động.</p>
          <p style="${pBulletStyle}">4.2. Bảo đảm việc làm, thanh toán đầy đủ và đúng hạn tiền lương cùng các chế độ đãi ngộ cho Người lao động đúng theo thỏa thuận.</p>

          <p style="${headingStyle}">Điều 5: Điều khoản thi hành</p>
          <p style="${pBulletStyle}">5.1. Hợp đồng lao động này có hiệu lực kể từ ngày ký.</p>
          <p style="${pBulletStyle}">5.2. Mọi sửa đổi, bổ sung nội dung hợp đồng phải được hai bên lập thành văn bản phụ lục đính kèm.</p>
          <p style="${pBulletStyle}">5.3. Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ một bản.</p>

          <!-- Standard Vietnam Physical Signing Table -->
          <table style="width:100%; border:none; margin-top:40px; font-size:13.0pt; font-family:'Times New Roman',serif; border-collapse:collapse;">
            <tr>
              <td style="width:50%; text-align:center; border:none; font-weight:bold; text-transform:uppercase; font-size:13.0pt; font-family:'Times New Roman',serif;">NGƯỜI LAO ĐỘNG (BÊN B)</td>
              <td style="width:50%; text-align:center; border:none; font-weight:bold; text-transform:uppercase; font-size:13.0pt; font-family:'Times New Roman',serif;">ĐẠI DIỆN CÔNG TY (BÊN A)</td>
            </tr>
            <tr>
              <td style="text-align:center; font-style:italic; color:#475569; font-size:11.0pt; border:none; font-family:'Times New Roman',serif;">(Ký và ghi rõ họ tên)</td>
              <td style="text-align:center; font-style:italic; color:#475569; font-size:11.0pt; border:none; font-family:'Times New Roman',serif;">(Ký tên, đóng dấu pháp nhân)</td>
            </tr>
            <tr style="height:90px;">
              <td style="border:none;"></td>
              <td style="border:none;"></td>
            </tr>
            <tr>
              <td style="text-align:center; border:none; font-weight:bold; font-size:13.0pt; font-family:'Times New Roman',serif;">${employeeName}</td>
              <td style="text-align:center; border:none; font-weight:bold; font-size:13.0pt; font-family:'Times New Roman',serif;">${companyConfig?.directorName || 'Vũ Đức Thành'}</td>
            </tr>
          </table>

        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất bản và tải xuống file Word thành công: ${filename}`);
  };

  // --- CONSTRUCTION SCHEDULE & TASKS HANDLERS ---
  const handleSaveConstructionTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.name || !newTask.projectId) {
      showToast('Vui lòng điền tên công việc và chọn dự án.');
      return;
    }

    let updatedTasksList: ConstructionTask[] = [];

    if (editingTask) {
      updatedTasksList = constructionTasks.map(t => t.id === editingTask.id ? { ...t, ...newTask } : t);
      setConstructionTasks(updatedTasksList);
      showToast(`Đã cập nhật công việc "${newTask.name}" thành công.`);
    } else {
      const generatedId = `task-${Date.now().toString().slice(-4)}`;
      const createdTask: ConstructionTask = {
        id: generatedId,
        ...newTask
      };
      updatedTasksList = [createdTask, ...constructionTasks];
      setConstructionTasks(updatedTasksList);
      showToast(`Đã thêm mới công việc "${newTask.name}" vào tiến độ.`);
    }

    // --- CASCADING UPDATE: Recalculate Project physical progress ---
    const targetProjId = newTask.projectId;
    const projectTasks = updatedTasksList.filter(t => t.projectId === targetProjId);
    const totalWeight = projectTasks.reduce((s, t) => s + t.weight, 0);
    const calculatedProgress = totalWeight > 0
      ? Math.round(projectTasks.reduce((s, t) => s + (t.progress * t.weight), 0) / totalWeight)
      : 0;

    setProjects(prevProjs => prevProjs.map(p => {
      if (p.id === targetProjId) {
        let newStatus = p.status;
        if (calculatedProgress === 100) {
          newStatus = 'Completed';
        } else if (calculatedProgress > 0 && p.status === 'Planning') {
          newStatus = 'Active';
        }
        return {
          ...p,
          progress: calculatedProgress,
          status: newStatus
        };
      }
      return p;
    }));

    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleEditTaskClick = (t: ConstructionTask) => {
    setEditingTask(t);
    setNewTask({
      projectId: t.projectId,
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      progress: t.progress,
      assignedTo: t.assignedTo,
      status: t.status,
      priority: t.priority,
      weight: t.weight,
      notes: t.notes || ''
    });
    setShowTaskModal(true);
  };

  const handleQuickUpdateTaskProgress = (t: ConstructionTask, newProgress: number) => {
    // Quick progress slider change handler
    let nextStatus = t.status;
    if (newProgress === 100) {
      nextStatus = 'Completed';
    } else if (newProgress > 0 && t.status === 'Not_Started') {
      nextStatus = 'In_Progress';
    } else if (newProgress === 0) {
      nextStatus = 'Not_Started';
    }

    const updatedTasksList = constructionTasks.map(item => {
      if (item.id === t.id) {
        return { ...item, progress: newProgress, status: nextStatus };
      }
      return item;
    });

    setConstructionTasks(updatedTasksList);

    // Recalculate Project physical progress
    const projectTasks = updatedTasksList.filter(item => item.projectId === t.projectId);
    const totalWeight = projectTasks.reduce((s, item) => s + item.weight, 0);
    const calculatedProgress = totalWeight > 0
      ? Math.round(projectTasks.reduce((s, item) => s + (item.progress * item.weight), 0) / totalWeight)
      : 0;

    setProjects(prevProjs => prevProjs.map(p => {
      if (p.id === t.projectId) {
        let newStatus = p.status;
        if (calculatedProgress === 100) {
          newStatus = 'Completed';
        } else if (calculatedProgress > 0 && p.status === 'Planning') {
          newStatus = 'Active';
        }
        return { ...p, progress: calculatedProgress, status: newStatus };
      }
      return p;
    }));
  };

  const handleDeleteConstructionTask = (id: string, name: string, projId: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa công việc "${name}"?`)) {
      const updatedTasksList = constructionTasks.filter(t => t.id !== id);
      setConstructionTasks(updatedTasksList);
      showToast(`Đã xóa công việc "${name}" khỏi tiến độ.`);

      // Recalculate Project progress
      const projectTasks = updatedTasksList.filter(item => item.projectId === projId);
      const totalWeight = projectTasks.reduce((s, item) => s + item.weight, 0);
      const calculatedProgress = totalWeight > 0
        ? Math.round(projectTasks.reduce((s, item) => s + (item.progress * item.weight), 0) / totalWeight)
        : 0;

      setProjects(prevProjs => prevProjs.map(p => {
        if (p.id === projId) {
          return { ...p, progress: calculatedProgress };
        }
        return p;
      }));
    }
  };

  return (
    <div className="bg-slate-50 min-h-[500px]" id="hr-payroll-section">
      {/* Mini tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-1 shadow-xs gap-4 mb-4">
        <button
          onClick={() => setHrSubTab('employees')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            hrSubTab === 'employees' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Danh Sách Nhân Sự</span>
          <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">{employees.length}</span>
        </button>

        <button
          onClick={() => setHrSubTab('attendance')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            hrSubTab === 'attendance' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Bảng Chấm Công Daily</span>
          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
            {timesheets.filter(t => t.date === new Date().toISOString().split('T')[0]).length} mới
          </span>
        </button>

        <button
          onClick={() => setHrSubTab('payroll')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            hrSubTab === 'payroll' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Hạch Toán Tiền Lương & Phiếu Chi</span>
        </button>

        <button
          onClick={() => setHrSubTab('contracts')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            hrSubTab === 'contracts' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Hợp Đồng Lao Động</span>
          <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">{laborContracts.length}</span>
        </button>

        <button
          onClick={() => setHrSubTab('schedule')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            hrSubTab === 'schedule' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Tiến Độ & Công Việc</span>
          <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">{constructionTasks.length}</span>
        </button>
      </div>

      {/* Main Toast Notifications */}
      {toastMessage && (
        <div className="mx-4 mb-4 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between text-xs font-semibold animate-fade-in border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 text-sm font-bold">×</button>
        </div>
      )}

      {/* SUB-TAB 1: EMPLOYEES DIRECTORY */}
      {hrSubTab === 'employees' && (
        <div className="p-4 space-y-4">
          {/* Header & Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              {/* Search Bar */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm nhân viên, chức vụ, mã..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 w-full"
                >
                  <option value="all">Tất cả công trình</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 w-full sm:w-auto"
              >
                <option value="all">Phân loại: Tất cả</option>
                <option value="Internal">Cơ hữu / Văn phòng</option>
                <option value="Seasonal">Thời vụ / Khoán ngày</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingEmp(null);
                setNewEmp({
                  name: '',
                  role: '',
                  type: 'Internal',
                  projectId: projects[0]?.id || '',
                  phone: '',
                  baseSalary: 15000000,
                  active: true,
                  citizenId: '',
                  permanentAddress: ''
                });
                setShowAddEmpModal(true);
              }}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Thêm Nhân Sự Mới</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">TỔNG NHÂN SỰ</span>
              <div className="text-lg font-black text-slate-800 font-mono mt-1">{employees.length}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-emerald-600 font-extrabold uppercase">ĐANG HOẠT ĐỘNG</span>
              <div className="text-lg font-black text-emerald-600 font-mono mt-1">
                {employees.filter(e => e.active).length}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-blue-600 font-extrabold uppercase">CƠ HỮU (INTERNAL)</span>
              <div className="text-lg font-black text-blue-600 font-mono mt-1">
                {employees.filter(e => e.type === 'Internal').length}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-amber-600 font-extrabold uppercase">THỜI VỤ (SEASONAL)</span>
              <div className="text-lg font-black text-amber-600 font-mono mt-1">
                {employees.filter(e => e.type === 'Seasonal').length}
              </div>
            </div>
          </div>

          {/* Table Directory */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="px-4 py-3">Mã Nhân Viên</th>
                    <th className="px-4 py-3">Họ và Tên</th>
                    <th className="px-4 py-3">Vị trí / Chức vụ</th>
                    <th className="px-4 py-3">Bố trí công trường</th>
                    <th className="px-4 py-3">Phân loại</th>
                    <th className="px-4 py-3">Điện thoại</th>
                    <th className="px-4 py-3 text-right">Mức lương cơ bản</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 bg-slate-50/50">{emp.code || emp.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{emp.name}</div>
                        {(emp.citizenId || emp.permanentAddress) && (
                          <div className="text-[10px] text-slate-400 mt-1 space-y-0.5 font-normal">
                            {emp.citizenId && (
                              <div>CCCD: <span className="font-mono text-slate-500 font-medium">{emp.citizenId}</span></div>
                            )}
                            {emp.permanentAddress && (
                              <div>HKTT: <span className="text-slate-500 font-medium">{emp.permanentAddress}</span></div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{emp.role}</td>
                      <td className="px-4 py-3 font-medium text-slate-700">{getProjectName(emp.projectId)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.type === 'Internal' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {emp.type === 'Internal' ? 'Cơ hữu' : 'Thời vụ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">{emp.phone}</td>
                      <td className="px-4 py-3 text-right font-semibold font-mono text-slate-800">
                        {formatVND(emp.baseSalary)}
                        <span className="text-[9px] text-slate-400 block font-normal">
                          {emp.baseSalary < 1500000 ? '/ngày công' : '/tháng'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                          emp.active ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${emp.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          {emp.active ? 'Hoạt động' : 'Tạm nghỉ'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedEmpDetail(emp);
                              setDetailActiveTab('info');
                              setShowDetailModal(true);
                            }}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md font-bold text-[10px] transition-all flex items-center gap-1"
                            title="Xem chi tiết hồ sơ & Mã QR check-in"
                          >
                            <QrCode className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>Chi tiết</span>
                          </button>
                          <button
                            onClick={() => handleEditEmpClick(emp)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[10px] transition-all"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md font-bold text-[10px] transition-all"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-400 font-medium italic">
                        Không tìm thấy nhân sự phù hợp với điều kiện lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ATTENDANCE TIMESHEET */}
      {hrSubTab === 'attendance' && (
        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full flex-1">
              {/* Filter Project */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                  className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 w-full"
                >
                  <option value="all">Tất cả công trình</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Date selection */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={newCheckIn.date}
                  onChange={(e) => setNewCheckIn(prev => ({ ...prev, date: e.target.value }))}
                  className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 w-full"
                />
              </div>
            </div>

            {/* Attendance Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={handleBatchCheckIn}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all"
                title="Tự động điểm danh nhanh mọi nhân viên ngày hôm nay"
              >
                <UserCheck className="w-4 h-4" />
                <span>Điểm danh nhanh hàng loạt</span>
              </button>

              <button
                onClick={() => {
                  setScannedResult(null);
                  setShowQrScanModal(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                title="Quét thẻ nhân viên tích hợp mã QR để ghi nhận chấm công nhanh"
              >
                <QrCode className="w-4 h-4 text-purple-200" />
                <span>Chấm công bằng QR</span>
              </button>

              <button
                onClick={() => {
                  setNewCheckIn({
                    employeeId: '',
                    projectId: projects[0]?.id || '',
                    date: new Date().toISOString().split('T')[0],
                    checkInTime: '07:30',
                    checkOutTime: '17:00',
                    status: 'Present',
                    gpsStatus: 'In-Range',
                    verifiedByFace: true
                  });
                  setShowCheckInModal(true);
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Khai báo thủ công</span>
              </button>
            </div>
          </div>

          {/* Timesheet Table List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Nhật Ký Điểm Danh Chấm Công Ngày {newCheckIn.date}
              </h4>
              <span className="text-[10px] font-bold text-slate-500 font-mono">
                Tổng cộng: {timesheets.filter(t => t.date === newCheckIn.date).length} lượt chấm công
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="px-4 py-2.5">Thời gian</th>
                    <th className="px-4 py-2.5">Mã NV</th>
                    <th className="px-4 py-2.5">Nhân viên</th>
                    <th className="px-4 py-2.5">Chức vụ</th>
                    <th className="px-4 py-2.5">Địa điểm</th>
                    <th className="px-4 py-2.5 text-center">Trạng thái</th>
                    <th className="px-4 py-2.5 text-center">GPS Tracker</th>
                    <th className="px-4 py-2.5 text-center">Ảnh xác minh chấm công</th>
                    <th className="px-4 py-2.5 text-center">Phê duyệt lúc về</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {timesheets
                    .filter(t => t.date === newCheckIn.date)
                    .map((t) => {
                      const emp = employees.find(e => e.id === t.employeeId);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-600">
                            {t.checkInTime} {t.checkOutTime ? `- ${t.checkOutTime}` : '(Chưa out)'}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-500">{t.employeeId}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">{emp?.name || 'Không rõ'}</td>
                          <td className="px-4 py-3 text-slate-500">{emp?.role || 'Khác'}</td>
                          <td className="px-4 py-3 text-slate-700">{getProjectName(t.projectId)}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-sm text-[9px] font-black uppercase ${
                              t.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              t.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              t.status === 'Overtime' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {t.status === 'Present' ? 'Đúng Giờ' :
                               t.status === 'Late' ? 'Đi Muộn' :
                               t.status === 'Overtime' ? 'Tăng Ca' : 'Vắng Mặt'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 font-bold ${
                              t.gpsStatus === 'In-Range' ? 'text-emerald-600' : 'text-rose-500'
                            }`}>
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="text-[10px] font-mono">{t.gpsStatus === 'In-Range' ? 'Hợp lệ' : 'Sai vị trí'}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                              t.verifiedByFace ? 'text-blue-600' : 'text-amber-500'
                            }`}>
                              {t.verifiedByFace ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span>Xác minh đạt 99.8%</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>Chấm công hộ?</span>
                                </>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {t.checkOutTime ? (
                              <span className="text-[10px] text-slate-400 font-semibold italic">Đã chốt ngày</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setTimesheets(prev => prev.map(item => item.id === t.id ? { ...item, checkOutTime: '17:00' } : item));
                                  showToast(`Đã checkout chốt ngày cho nhân viên ${emp?.name}`);
                                }}
                                className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[9px] font-bold"
                              >
                                Chốt Checkout
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                  {timesheets.filter(t => t.date === newCheckIn.date).length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400 italic">
                        Chưa có dữ liệu chấm công cho ngày {newCheckIn.date}. Nhấp nút "Điểm danh nhanh hàng loạt" để tạo dữ liệu điểm danh tự động.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: PAYROLL CALCULATION & PAYMENT VOUCHERS */}
      {hrSubTab === 'payroll' && (
        <div className="p-4 space-y-4">
          {/* Payroll filter & actions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              {/* Select Project to pay */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 shrink-0">Công trường:</span>
                <select
                  value={selectedPayrollProj}
                  onChange={(e) => setSelectedPayrollProj(e.target.value)}
                  className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 focus:outline-none"
                >
                  <option value="all">Tất cả công trường</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Month Selection */}
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-500 shrink-0">Tháng:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 focus:outline-none"
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 focus:outline-none"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <button
                onClick={handleExportPayrollExcel}
                className="flex-1 md:flex-none flex items-center justify-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel Bảng Lương</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">TỔNG QUỸ LƯƠNG PHÁT SINH</span>
                <Calculator className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-base lg:text-lg font-black font-mono mt-1 text-purple-300">
                {formatVND(payrollStats.totalEarned)}
              </div>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Dựa trên chấm công thực tế tháng {selectedMonth}</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-amber-600 font-extrabold uppercase">ĐÃ TẠM ỨNG TRONG THÁNG</span>
                <ArrowRightLeft className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-base lg:text-lg font-black font-mono mt-1 text-amber-600">
                {formatVND(payrollStats.totalAdvancesPaid)}
              </div>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Tiền mặt ứng tại công trường</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase">ĐÃ CHI TRẢ LƯƠNG</span>
                <CheckCircle2 className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-base lg:text-lg font-black font-mono mt-1 text-blue-600">
                {formatVND(payrollStats.totalSalariesPaid)}
              </div>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Đã hạch toán chi lương chính thức</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-rose-600 font-extrabold uppercase">THỰC NHẬN CÒN PHẢI CHI</span>
                <Wallet className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-base lg:text-lg font-black font-mono mt-1 text-rose-600">
                {formatVND(payrollStats.totalNetPayable)}
              </div>
              <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Dư nợ lương kế toán đang giữ</p>
            </div>
          </div>

          {/* Payroll calculation list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Bảng Thanh Toán Tiền Lương & Chấm Công Dự Án - Tháng {selectedMonth}/{selectedYear}
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="px-4 py-3">Mã NV</th>
                    <th className="px-4 py-3">Họ và Tên</th>
                    <th className="px-4 py-3">Vị trí / Vai trò</th>
                    <th className="px-4 py-3 text-center">Ngày Công</th>
                    <th className="px-4 py-3 text-center">Tăng Ca</th>
                    <th className="px-4 py-3 text-center">Đi Muộn</th>
                    <th className="px-4 py-3 text-right">Mức Lương Gốc</th>
                    <th className="px-4 py-3 text-right">Tổng Thu Nhập</th>
                    <th className="px-4 py-3 text-right">Đã Tạm Ứng</th>
                    <th className="px-4 py-3 text-right">Đã Thực Trả</th>
                    <th className="px-4 py-3 text-right text-emerald-700 bg-emerald-50">Dư nợ thực nhận</th>
                    <th className="px-4 py-3 text-center">Hành động kế toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {payrollData.map((item) => (
                    <tr key={item.employee.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-800 bg-slate-50/50">{item.employee.code || item.employee.id}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {item.employee.name}
                        <span className="text-[9px] text-slate-400 block font-normal">
                          {getProjectName(item.employee.projectId)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-normal">{item.employee.role}</td>
                      <td className="px-4 py-3 text-center text-slate-800 font-mono">{item.daysPresent} công</td>
                      <td className="px-4 py-3 text-center text-purple-600 font-mono">
                        {item.daysOvertime > 0 ? `+${item.daysOvertime} tăng ca` : '0'}
                      </td>
                      <td className="px-4 py-3 text-center text-rose-600 font-mono">
                        {item.daysLate > 0 ? `${item.daysLate} muộn` : '0'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-normal text-slate-500">
                        {formatVND(item.baseSalary)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {formatVND(item.totalEarned)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-amber-600">
                        {formatVND(item.advances)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-blue-600">
                        {formatVND(item.salariesPaid)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700 bg-emerald-50 font-black">
                        {formatVND(item.netSalaryPayable)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenVoucherModal(item, 'Salary_Advance')}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-md text-[10px] font-bold transition-all"
                            title="Tạm ứng nhanh 30% lương cho nhân sự"
                          >
                            Tạm Ứng
                          </button>
                          <button
                            onClick={() => handleOpenVoucherModal(item, 'Salary_Payment')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold transition-all shadow-xs"
                            disabled={item.netSalaryPayable <= 0}
                            title="Lập phiếu chi trả toàn bộ số dư nợ lương tháng"
                          >
                            Chi Lương
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {payrollData.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center py-10 text-slate-400 italic">
                        Không có nhân sự nào bố trí tại dự án được lựa chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT EMPLOYEE */}
      {showAddEmpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-400" />
                <span>{editingEmp ? 'Cập Nhật Hồ Sơ Nhân Sự' : 'Thêm Mới Hồ Sơ Nhân Sự'}</span>
              </h3>
              <button onClick={() => setShowAddEmpModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleSaveEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Mã nhân sự</label>
                  <input
                    type="text"
                    placeholder="Tự động (hoặc tự nhập)"
                    value={newEmp.code}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Họ và tên nhân sự *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn Hải"
                    value={newEmp.name}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Vị trí / Chức vụ *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Kỹ sư cơ điện"
                    value={newEmp.role}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 0912.xxx.xxx"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Số CCCD / CMND</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 079093xxxxxx"
                    value={newEmp.citizenId}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, citizenId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Nơi đăng ký HKTT / Thường trú</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Bến Nghé, Quận 1, TP.HCM"
                    value={newEmp.permanentAddress}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, permanentAddress: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Loại hợp đồng *</label>
                  <select
                    value={newEmp.type}
                    onChange={(e) => {
                      const typeVal = e.target.value as 'Internal' | 'Seasonal';
                      setNewEmp(prev => ({
                        ...prev,
                        type: typeVal,
                        baseSalary: typeVal === 'Internal' ? 15000000 : 350000
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="Internal">Cơ hữu (Trả tháng)</option>
                    <option value="Seasonal">Thời vụ (Trả công ngày)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Bố trí công trình *</label>
                  <select
                    value={newEmp.projectId}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase block">
                  Mức lương thỏa thuận (VND) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={newEmp.baseSalary}
                    onChange={(e) => setNewEmp(prev => ({ ...prev, baseSalary: parseInt(e.target.value) || 0 }))}
                    className="w-full pl-3 pr-20 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none text-right font-mono font-bold"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-bold text-slate-400">
                    {newEmp.type === 'Internal' ? 'VND / Tháng' : 'VND / Ngày'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="active-checkbox"
                  checked={newEmp.active}
                  onChange={(e) => setNewEmp(prev => ({ ...prev, active: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="active-checkbox" className="text-xs font-bold text-slate-700">
                  Nhân sự đang tích cực làm việc (Được phép chấm công)
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddEmpModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  {editingEmp ? 'Lưu cập nhật' : 'Xác nhận tạo mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL CHECK IN */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span>Khai Báo Điểm Danh Chấm Công Thủ Công</span>
              </h3>
              <button onClick={() => setShowCheckInModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Chọn nhân sự *</label>
                <select
                  required
                  value={newCheckIn.employeeId}
                  onChange={(e) => {
                    const empId = e.target.value;
                    const empObj = employees.find(item => item.id === empId);
                    setNewCheckIn(prev => ({
                      ...prev,
                      employeeId: empId,
                      projectId: empObj ? empObj.projectId : prev.projectId
                    }));
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Chọn nhân sự từ hệ thống --</option>
                  {employees.filter(e => e.active).map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role} - {getProjectName(emp.projectId)})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Ngày điểm danh *</label>
                  <input
                    type="date"
                    required
                    value={newCheckIn.date}
                    onChange={(e) => setNewCheckIn(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Địa điểm ghi nhận *</label>
                  <select
                    value={newCheckIn.projectId}
                    onChange={(e) => setNewCheckIn(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Giờ vào *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: 07:30"
                    value={newCheckIn.checkInTime}
                    onChange={(e) => setNewCheckIn(prev => ({ ...prev, checkInTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Giờ ra</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 17:00 (Để trống nếu chưa ra)"
                    value={newCheckIn.checkOutTime}
                    onChange={(e) => setNewCheckIn(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Trạng thái chấm công</label>
                  <select
                    value={newCheckIn.status}
                    onChange={(e) => setNewCheckIn(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="Present">Có mặt (Đúng giờ)</option>
                    <option value="Late">Đi muộn</option>
                    <option value="Overtime">Tăng ca</option>
                    <option value="Absent">Vắng mặt (Không phép/Có phép)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Tọa độ GPS công trường</label>
                  <select
                    value={newCheckIn.gpsStatus}
                    onChange={(e) => setNewCheckIn(prev => ({ ...prev, gpsStatus: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="In-Range">In-Range (Trong bán kính 200m)</option>
                    <option value="Out-Of-Range">Out-Of-Range (Ngoài tầm công trường)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="face-checked"
                  checked={newCheckIn.verifiedByFace}
                  onChange={(e) => setNewCheckIn(prev => ({ ...prev, verifiedByFace: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="face-checked" className="text-xs font-bold text-slate-700">
                  Có ảnh xác minh chấm công
                </label>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  Xác nhận lưu chấm công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACCOUNTING VOUCHER (PHIẾU THU / PHIẾU CHI) */}
      {showVoucherModal && currentVoucher && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden my-8 animate-scale-up">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white print:hidden">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <span>PHIẾU CHI TIỀN MẶT - ERP ACCOUNTING</span>
              </h3>
              <button onClick={() => setShowVoucherModal(false)} className="text-slate-400 hover:text-white text-lg font-bold">×</button>
            </div>

            {/* Voucher Printable Frame */}
            <div className="p-8 space-y-6 bg-amber-50/15" id="printable-payment-voucher">
              {/* Invoice Header */}
              <div className="flex items-start justify-between border-b-2 border-dashed border-slate-200 pb-4">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">{companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}</h4>
                  <p className="text-[9px] text-slate-400 font-medium">Hạch toán dòng chi tài chính công trình</p>
                  <p className="text-[9px] text-slate-500 mt-1">Dự án áp: {currentVoucher.project.name}</p>
                </div>
                <div className="text-right">
                  <h3 className="font-black text-slate-900 text-sm tracking-widest font-mono">{currentVoucher.id}</h3>
                  <p className="text-[9px] text-slate-400">Mẫu số: 02-TT-勞</p>
                  <p className="text-[10px] font-bold text-slate-500 font-mono">Ngày lập: {currentVoucher.date}</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  {currentVoucher.type === 'Salary_Advance' ? 'PHIẾU CHI TẠM ỨNG LƯƠNG' : 'PHIẾU CHI TRẢ LƯƠNG'}
                </h2>
                <p className="text-[9px] text-slate-500 font-semibold italic">Nợ TK 334 (Phải trả người lao động) &bull; Có TK 111 (Tiền mặt)</p>
              </div>

              {/* Body particulars */}
              <div className="text-xs space-y-3.5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Họ và tên người nhận tiền:</span>
                    <span className="font-bold text-slate-800 text-sm">{currentVoucher.employee.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Mã nhân sự & điện thoại:</span>
                    <span className="font-mono font-bold text-slate-700">{currentVoucher.employee.id} &bull; {currentVoucher.employee.phone}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Chức vụ / Vị trí công tác:</span>
                    <span className="font-semibold text-slate-700">{currentVoucher.employee.role}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Hạng mục chi phí P&L:</span>
                    <span className="font-bold text-rose-700">Chi phí Nhân công Hiện trường (Labor Expense)</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Lý do chi:</span>
                  <span className="font-medium text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 block">
                    {currentVoucher.note}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase block">Số tiền thanh toán:</span>
                  <div className="bg-emerald-50 px-3.5 py-2.5 rounded-xl border border-emerald-100 flex items-center justify-between mt-1">
                    <span className="text-lg font-black text-emerald-700 font-mono">
                      {formatVND(currentVoucher.amount)}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/50 px-2.5 py-0.5 rounded-full">
                      Hạch toán tiền mặt
                    </span>
                  </div>
                </div>
              </div>

              {/* Warning box */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-[10px] text-blue-700 font-semibold leading-relaxed flex items-start gap-2 print:hidden">
                <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-blue-800">CƠ CHẾ KẾ TOÁN ERP KHÉP KÍN:</p>
                  <p>Khi xác nhận chi tiền, hệ thống sẽ tự động trừ quỹ/hoặc tăng chi phí Spent của công trường <strong className="font-black text-slate-800">"{currentVoucher.project.name}"</strong>, đồng thời bổ sung 1 dòng Expense chi tiết vào Sổ cái Nhật ký chung (Ledger Transactions).</p>
                </div>
              </div>

              {/* Signatures - Left Blank for Manual Signing */}
              <div className="grid grid-cols-3 text-center text-xs pt-4 border-t border-dashed border-slate-200">
                <div className="space-y-1">
                  <span className="font-bold block text-slate-800">Thủ quỹ chi tiền</span>
                  <span className="text-[9px] text-slate-400 italic block">(Ký, đóng dấu phát tiền)</span>
                  <div className="h-12"></div>
                  <span className="font-bold text-slate-400 block mt-1">.......................</span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold block text-slate-800">Người nhận tiền</span>
                  <span className="text-[9px] text-slate-400 italic block">(Ký và ghi rõ họ tên)</span>
                  <div className="h-12"></div>
                  <span className="font-bold text-slate-400 block mt-1">.......................</span>
                </div>
                <div className="space-y-1">
                  <span className="font-bold block text-slate-800">Kế toán trưởng</span>
                  <span className="text-[9px] text-slate-400 italic block">(Ký duyệt định khoản)</span>
                  <div className="h-12"></div>
                  <span className="font-bold text-slate-400 block mt-1">.......................</span>
                </div>
              </div>
            </div>

            {/* Actions for Modal */}
            <div className="bg-slate-50 px-6 py-4 flex gap-2 justify-end border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
              >
                Hủy bỏ phiếu
              </button>

              <button
                type="button"
                onClick={() => handleExportSalaryVoucherExcel(currentVoucher)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                title="Xuất phiếu chi lương thành file Excel"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel Phiếu</span>
              </button>

              <button
                type="button"
                onClick={handlePostVoucher}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
              >
                Xác nhận chi tiền & Ghi sổ cái
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: LABOR CONTRACTS */}
      {/* ========================================================================= */}
      {hrSubTab === 'contracts' && (
        <div className="p-4 space-y-4">
          {/* Controls & Metric Summary */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-3 w-full">
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  placeholder="Tìm số HĐ, tên nhân sự, vị trí..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 w-full sm:w-auto font-semibold"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Active">Đang hiệu lực (Active)</option>
                <option value="Pending">Chờ ký duyệt (Pending)</option>
                <option value="Expired">Hết hiệu lực (Expired)</option>
              </select>
            </div>

            <button
              onClick={() => {
                setEditingContract(null);
                setNewContract({
                  employeeId: employees[0]?.id || '',
                  contractNumber: `HĐLĐ/${new Date().getFullYear()}/${(laborContracts.length + 1).toString().padStart(3, '0')}`,
                  signDate: new Date().toISOString().split('T')[0],
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: '',
                  salaryType: 'Monthly',
                  salaryAmount: 12000000,
                  allowance: 1500000,
                  insurance: true,
                  status: 'Pending',
                  signedByEmployee: false,
                  signedByDirector: false
                });
                setShowContractModal(true);
              }}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Khởi Tạo HĐLĐ Mới</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase">TỔNG HỢP ĐỒNG</span>
              <div className="text-lg font-black text-slate-800 font-mono mt-1">{laborContracts.length} HĐ</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-emerald-600 font-extrabold uppercase font-mono">ĐANG HIỆU LỰC (ACTIVE)</span>
              <div className="text-lg font-black text-emerald-600 font-mono mt-1">
                {laborContracts.filter(c => c.status === 'Active').length} HĐ
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-amber-600 font-extrabold uppercase">CHỜ SỐ KÝ DUYỆT (PENDING)</span>
              <div className="text-lg font-black text-amber-600 font-mono mt-1">
                {laborContracts.filter(c => !c.signedByEmployee || !c.signedByDirector).length} HĐ
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[10px] text-purple-600 font-extrabold uppercase">ĐÃ ĐỦ CHỮ KÝ SỐ</span>
              <div className="text-lg font-black text-purple-600 font-mono mt-1">
                {laborContracts.filter(c => c.signedByEmployee && c.signedByDirector).length} HĐ
              </div>
            </div>
          </div>

          {/* Contracts list table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="px-4 py-3">Số Hợp Đồng</th>
                    <th className="px-4 py-3">Người Lao Động</th>
                    <th className="px-4 py-3">Vị trí / Chức vụ</th>
                    <th className="px-4 py-3">Ngày bắt đầu / Kết thúc</th>
                    <th className="px-4 py-3 text-right">Lương & Phụ cấp</th>
                    <th className="px-4 py-3 text-center">Bảo hiểm</th>
                    <th className="px-4 py-3 text-center">Chữ ký người LĐ</th>
                    <th className="px-4 py-3 text-center">Chữ ký Giám đốc</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {laborContracts
                    .filter(c => {
                      const emp = employees.find(e => e.id === c.employeeId);
                      const matchesSearch = c.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (emp?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
                      const matchesStatus = selectedTypeFilter === 'all' || c.status === selectedTypeFilter;
                      return matchesSearch && matchesStatus;
                    })
                    .map((c) => {
                      const emp = employees.find(e => e.id === c.employeeId);
                      return (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-700">{c.contractNumber}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">{emp?.name || 'Không rõ'}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{c.employeeId}</div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{emp?.role || 'Khác'}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            <div>BĐ: {c.startDate}</div>
                            <div className="text-[10px] text-slate-400">{c.endDate ? `KT: ${c.endDate}` : 'Vô thời hạn'}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold font-mono">
                            <div className="text-slate-800">{formatVND(c.salaryAmount)}</div>
                            <div className="text-[9px] text-slate-400 font-normal">PC: +{formatVND(c.allowance)}</div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                              c.insurance ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-400 border border-slate-100'
                            }`}>
                              {c.insurance ? 'ĐÓNG BH' : 'KHÔNG'}
                            </span>
                          </td>
                          {/* Employee signature cell */}
                          <td className="px-4 py-3 text-center">
                            {c.signedByEmployee ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã Ký Số</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenSignModal(c, 'Employee')}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 px-2.5 py-0.5 rounded-md font-bold transition-all shadow-3xs"
                              >
                                <PenTool className="w-3 h-3" />
                                <span>Ký LĐ</span>
                              </button>
                            )}
                          </td>
                          {/* Director signature cell */}
                          <td className="px-4 py-3 text-center">
                            {c.signedByDirector ? (
                              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đã Duyệt</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenSignModal(c, 'Director')}
                                className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:text-white bg-purple-50 hover:bg-purple-600 border border-purple-200 px-2.5 py-0.5 rounded-md font-bold transition-all shadow-3xs"
                              >
                                <PenTool className="w-3 h-3" />
                                <span>Duyệt Ký</span>
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              c.status === 'Active' ? 'bg-emerald-50 text-emerald-700' :
                              c.status === 'Pending' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {c.status === 'Active' ? 'Hiệu Lực' :
                               c.status === 'Pending' ? 'Chờ Ký' : 'Hết Hạn'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setPreviewingContract(c);
                                  setShowContractPreviewModal(true);
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-md font-extrabold text-[10px] flex items-center gap-1 transition-all"
                                title="Xem văn bản hợp đồng chính thức và xuất bản để ký tươi"
                              >
                                <Printer className="w-3 h-3" />
                                <span>Xuất Bản Ký</span>
                              </button>
                              <button
                                onClick={() => handleEditContractClick(c)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold text-[10px] transition-all"
                              >
                                Sửa
                              </button>
                              <button
                                onClick={() => handleDeleteLaborContract(c.id, c.contractNumber)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md font-bold text-[10px] transition-all"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {laborContracts.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-400 font-medium italic">
                        Không tìm thấy hợp đồng lao động nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: CONSTRUCTION SCHEDULE & TASKS */}
      {/* ========================================================================= */}
      {hrSubTab === 'schedule' && (
        <div className="p-4 space-y-4">
          {/* Project Filtering and overall progress */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Công trường cần quản lý tiến độ:</span>
                <select
                  value={selectedScheduleProject}
                  onChange={(e) => setSelectedScheduleProject(e.target.value)}
                  className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50 focus:bg-white font-semibold focus:outline-none"
                >
                  <option value="all">Tất cả công trường (Tổng hợp)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setEditingTask(null);
                  setNewTask({
                    projectId: selectedScheduleProject === 'all' ? (projects[0]?.id || '') : selectedScheduleProject,
                    name: '',
                    startDate: new Date().toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0],
                    progress: 0,
                    assignedTo: '',
                    status: 'Not_Started',
                    priority: 'Medium',
                    weight: 10,
                    notes: ''
                  });
                  setShowTaskModal(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm Công Việc Thi Công</span>
              </button>
            </div>

            {/* Overall Physical Progress card inside selected project */}
            {selectedScheduleProject !== 'all' && (
              (() => {
                const proj = projects.find(p => p.id === selectedScheduleProject);
                if (!proj) return null;
                return (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="w-full md:w-2/3 space-y-2">
                      <div className="flex justify-between items-center text-xs font-black text-slate-700 uppercase">
                        <span>TIẾN ĐỘ THI CÔNG VẬT LÝ DỰ ÁN (WEIGHTED AVERAGE)</span>
                        <span className="font-mono text-blue-600 text-sm">{proj.progress}% HOÀN THÀNH</span>
                      </div>
                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden flex">
                        <div
                          className="bg-blue-600 h-full transition-all duration-500 ease-out rounded-full"
                          style={{ width: `${proj.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        * Tiến độ dự án được tự động hạch toán cascade theo trung bình cộng trọng số (% Weight) của từng hạng mục công việc bên dưới.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4 w-full md:w-auto text-center">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">NGÂN SÁCH</div>
                        <div className="text-xs font-extrabold text-slate-800 font-mono mt-0.5">{formatVND(proj.budget)}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">THỰC CHI</div>
                        <div className="text-xs font-extrabold text-emerald-600 font-mono mt-0.5">{formatVND(proj.spent)}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                        <div className="text-[9px] text-slate-400 font-bold uppercase">CÔNG VIỆC</div>
                        <div className="text-xs font-extrabold text-indigo-600 font-mono mt-0.5">
                          {constructionTasks.filter(t => t.projectId === proj.id).length} hạng mục
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            )}
          </div>

          {/* Graphical Progress Timeline Grid */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Biểu Đồ Tiến Độ & Trọng Số Hạng Mục Công Việc</span>
              </h3>

              <div className="space-y-4">
                {constructionTasks
                  .filter(t => selectedScheduleProject === 'all' || t.projectId === selectedScheduleProject)
                  .map((t) => {
                    const proj = projects.find(p => p.id === t.projectId);
                    return (
                      <div key={t.id} className="p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-lg space-y-2 transition-all">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 text-xs">{t.name}</span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
                              <span className="font-bold text-blue-600">{proj?.name}</span>
                              <span>&bull;</span>
                              <span>Đội phụ trách: <strong>{t.assignedTo}</strong></span>
                              <span>&bull;</span>
                              <span>Trọng số: <strong>{t.weight}%</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black ${
                              t.priority === 'High' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              t.priority === 'Medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                              'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              ƯU TIÊN: {t.priority === 'High' ? 'CAO' : t.priority === 'Medium' ? 'TRUNG BÌNH' : 'THẤP'}
                            </span>

                            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-black ${
                              t.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' :
                              t.status === 'In_Progress' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              t.status === 'Delayed' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {t.status === 'Completed' ? 'ĐÃ XONG' :
                               t.status === 'In_Progress' ? 'ĐANG CHẠY' :
                               t.status === 'Delayed' ? 'CHẬM TRỄ' : 'CHƯA BẮT ĐẦU'}
                            </span>
                          </div>
                        </div>

                        {/* Interactive progress Slider bar */}
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-slate-200 h-2.5 rounded-full overflow-hidden flex relative">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                t.status === 'Completed' ? 'bg-emerald-500' :
                                t.status === 'Delayed' ? 'bg-rose-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${t.progress}%` }}
                            ></div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-slate-500 font-bold min-w-[30px] text-right">{t.progress}%</span>

                            {/* Real-time slider controls directly in the UI */}
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={t.progress}
                              onChange={(e) => handleQuickUpdateTaskProgress(t, parseInt(e.target.value))}
                              className="w-20 accent-blue-600 cursor-pointer print:hidden"
                              title="Kéo để cập nhật tiến độ tức thì"
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0 print:hidden">
                            <button
                              onClick={() => handleEditTaskClick(t)}
                              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition-all"
                              title="Chỉnh sửa công việc"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteConstructionTask(t.id, t.name, t.projectId)}
                              className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                              title="Xóa công việc"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Notes and Date Schedule details */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-slate-400 font-semibold gap-1">
                          <div className="font-mono">
                            Khởi công: {t.startDate} &bull; Dự kiến hoàn thành: {t.endDate}
                          </div>
                          {t.notes && <div className="italic text-slate-500">Ghi chú: {t.notes}</div>}
                        </div>
                      </div>
                    );
                  })}

                {constructionTasks.filter(t => selectedScheduleProject === 'all' || t.projectId === selectedScheduleProject).length === 0 && (
                  <div className="text-center py-10 text-slate-400 italic">
                    Chưa có công việc thi công nào được lên lịch cho công trường này. Nhấp "Thêm Công Việc Thi Công" để bắt đầu lên kế hoạch tiến độ.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT LABOR CONTRACT */}
      {/* ========================================================================= */}
      {showContractModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-scale-up">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider">
                {editingContract ? `Sửa hợp đồng: ${editingContract.contractNumber}` : 'Khởi tạo hợp đồng lao động mới'}
              </h3>
              <button
                onClick={() => {
                  setShowContractModal(false);
                  setEditingContract(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveLaborContract} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-2 gap-4">
                {/* Contract Number */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Số hợp đồng lao động *</label>
                  <input
                    type="text"
                    required
                    value={newContract.contractNumber}
                    onChange={(e) => setNewContract(prev => ({ ...prev, contractNumber: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="HĐLĐ/2026/012-GR"
                  />
                </div>

                {/* Employee ID */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Chọn nhân sự *</label>
                  <select
                    required
                    value={newContract.employeeId}
                    onChange={(e) => setNewContract(prev => ({ ...prev, employeeId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Chọn nhân sự ký hợp đồng --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.id} - {emp.role})</option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Ngày có hiệu lực *</label>
                  <input
                    type="date"
                    required
                    value={newContract.startDate}
                    onChange={(e) => setNewContract(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Ngày hết hạn (Nếu có)</label>
                  <input
                    type="date"
                    value={newContract.endDate}
                    onChange={(e) => setNewContract(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                    placeholder="Bỏ trống nếu vô thời hạn"
                  />
                </div>

                {/* Sign Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Ngày ký hợp đồng</label>
                  <input
                    type="date"
                    value={newContract.signDate}
                    onChange={(e) => setNewContract(prev => ({ ...prev, signDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                  />
                </div>

                {/* Salary Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Hình thức tính lương</label>
                  <select
                    value={newContract.salaryType}
                    onChange={(e) => setNewContract(prev => ({ ...prev, salaryType: e.target.value as 'Monthly' | 'Daily' }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none"
                  >
                    <option value="Monthly">Lương tháng (Cơ hữu)</option>
                    <option value="Daily">Lương công nhật (Thời vụ / Khoán ngày)</option>
                  </select>
                </div>

                {/* Salary Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Mức lương cơ bản (VND) *</label>
                  <input
                    type="number"
                    required
                    value={newContract.salaryAmount}
                    onChange={(e) => setNewContract(prev => ({ ...prev, salaryAmount: parseInt(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-mono"
                  />
                </div>

                {/* Allowance */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Phụ cấp hàng tháng/ngày (VND)</label>
                  <input
                    type="number"
                    value={newContract.allowance}
                    onChange={(e) => setNewContract(prev => ({ ...prev, allowance: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-mono"
                  />
                </div>

                {/* Insurance Flag */}
                <div className="flex items-center gap-2 pt-4 col-span-2 sm:col-span-1">
                  <input
                    type="checkbox"
                    id="insurance-checkbox"
                    checked={newContract.insurance}
                    onChange={(e) => setNewContract(prev => ({ ...prev, insurance: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300"
                  />
                  <label htmlFor="insurance-checkbox" className="text-xs font-bold text-slate-600">Đóng bảo hiểm xã hội (BHXH)</label>
                </div>

                {/* Status Selection */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Trạng thái hợp đồng</label>
                  <select
                    value={newContract.status}
                    onChange={(e) => setNewContract(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:outline-none"
                  >
                    <option value="Active">Đang hiệu lực (Active)</option>
                    <option value="Pending">Chờ ký duyệt (Pending)</option>
                    <option value="Expired">Hết hiệu lực (Expired)</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowContractModal(false);
                    setEditingContract(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Lưu Hợp Đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD / EDIT CONSTRUCTION TASK */}
      {/* ========================================================================= */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col animate-scale-up">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider">
                {editingTask ? `Sửa hạng mục: ${editingTask.name}` : 'Thêm hạng mục công việc thi công mới'}
              </h3>
              <button
                onClick={() => {
                  setShowTaskModal(false);
                  setEditingTask(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveConstructionTask} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {/* Task Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">Tên hạng mục công việc thi công *</label>
                <input
                  type="text"
                  required
                  value={newTask.name}
                  onChange={(e) => setNewTask(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Ví dụ: Đổ bê tông dầm móng mố M1..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Associated Project */}
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Thuộc công trường/Dự án *</label>
                  <select
                    required
                    value={newTask.projectId}
                    onChange={(e) => setNewTask(prev => ({ ...prev, projectId: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Assigned To Team */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Tổ đội / Người phụ trách thi công *</label>
                  <input
                    type="text"
                    required
                    value={newTask.assignedTo}
                    onChange={(e) => setNewTask(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                    placeholder="Đội thi công bê tông Song Hành..."
                  />
                </div>

                {/* Task Weight */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Trọng số đóng góp dự án (% Weight) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="100"
                    value={newTask.weight}
                    onChange={(e) => setNewTask(prev => ({ ...prev, weight: parseInt(e.target.value) || 10 }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-mono"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Ngày bắt đầu</label>
                  <input
                    type="date"
                    required
                    value={newTask.startDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Ngày dự kiến hoàn thành</label>
                  <input
                    type="date"
                    required
                    value={newTask.endDate}
                    onChange={(e) => setNewTask(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                  />
                </div>

                {/* Progress */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Tiến độ thi công thực tế (% Progress)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTask.progress}
                    onChange={(e) => setNewTask(prev => ({ ...prev, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 font-mono"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Trạng thái hạng mục</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                  >
                    <option value="Not_Started">Chưa bắt đầu (Not Started)</option>
                    <option value="In_Progress">Đang thi công (In Progress)</option>
                    <option value="Delayed">Chậm tiến độ (Delayed)</option>
                    <option value="Completed">Đã nghiệm thu (Completed)</option>
                  </select>
                </div>

                {/* Priority */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase">Mức độ khẩn cấp / Quan trọng</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50"
                  >
                    <option value="Low">Thấp (Low)</option>
                    <option value="Medium">Trung bình (Medium)</option>
                    <option value="High">Cao (High)</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase">Ghi chú kỹ thuật thi công</label>
                <textarea
                  value={newTask.notes}
                  onChange={(e) => setNewTask(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg p-2 text-xs bg-slate-50 focus:bg-white focus:outline-none h-16 resize-none"
                  placeholder="Ghi chú thêm về vật tư hoặc khó khăn nếu có..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setEditingTask(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md"
                >
                  Lưu Tiến Độ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DIGITAL SIGNATURE PAD (KÝ SỐ) */}
      {/* ========================================================================= */}
      {showSignatureModal && signingContract && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col animate-scale-up">
            <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between text-white border-b border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-blue-400" />
                <span>KÝ SỐ ĐIỆN TỬ - ERP SECURE</span>
              </h3>
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  setSigningContract(null);
                }}
                className="text-slate-400 hover:text-white font-bold text-lg"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-[11px] text-blue-700 leading-relaxed font-semibold">
                <p className="font-bold text-blue-800 uppercase text-center mb-1">Xác Thực Chữ Ký Pháp Lý</p>
                Bằng việc thực hiện ký số này, bạn xác nhận đồng ý với mọi điều khoản lao động của hợp đồng số <strong className="font-mono text-slate-800">{signingContract.contractNumber}</strong> hạch toán tại CSDL chung ERP.
              </div>

              {/* Signature Options */}
              <div className="space-y-3">
                <div className="flex border-b border-slate-200 pb-1.5 gap-4">
                  <button
                    type="button"
                    onClick={() => setSignatureType('type')}
                    className={`text-[11px] font-bold pb-1 transition-all ${signatureType === 'type' ? 'border-b-2 border-blue-600 text-blue-600 font-extrabold' : 'text-slate-500'}`}
                  >
                    Ký bằng Tên (Typed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignatureType('draw')}
                    className={`text-[11px] font-bold pb-1 transition-all ${signatureType === 'draw' ? 'border-b-2 border-blue-600 text-blue-600 font-extrabold' : 'text-slate-500'}`}
                  >
                    Vẽ chữ ký (Scribble)
                  </button>
                  {signatureRole === 'Director' && (
                    <button
                      type="button"
                      onClick={() => setSignatureType('stamp')}
                      className={`text-[11px] font-bold pb-1 transition-all ${signatureType === 'stamp' ? 'border-b-2 border-blue-600 text-blue-600 font-extrabold' : 'text-slate-500'}`}
                    >
                      Kèm Con Dấu Đỏ
                    </button>
                  )}
                </div>

                {/* Form based on option */}
                {signatureType === 'type' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase">Nhập tên chữ ký của bạn</label>
                    <input
                      type="text"
                      value={typedSignature}
                      onChange={(e) => setTypedSignature(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-slate-50 font-serif italic text-slate-800 font-bold focus:bg-white focus:outline-none"
                    />
                    <div className="p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50/50 flex items-center justify-center min-h-[100px] select-none">
                      <span className="font-serif italic text-2xl font-bold tracking-wider text-blue-800 drop-shadow-sm select-none">
                        {typedSignature || 'Chưa nhập chữ ký'}
                      </span>
                    </div>
                  </div>
                )}

                {signatureType === 'draw' && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold text-slate-400 uppercase">Dùng chuột/ngón tay scribble vào khung bên dưới</label>
                    <div className="p-4 border border-slate-300 rounded-lg bg-slate-50/50 flex flex-col items-center justify-center min-h-[140px] select-none cursor-crosshair border-dashed relative">
                      {/* Simulated signature drawing */}
                      <svg className="w-full h-32 text-blue-700 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M 10 70 Q 25 30 40 80 T 70 30 T 90 60" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        <path d="M 30 50 L 80 50" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                      </svg>
                      <span className="absolute bottom-2 right-2 text-[9px] bg-slate-200 px-1 py-0.2 rounded font-bold text-slate-500">
                        SIMULATED SIGNATURE DRAW
                      </span>
                    </div>
                  </div>
                )}

                {signatureType === 'stamp' && (
                  <div className="space-y-1 flex flex-col items-center justify-center p-4 border border-dashed border-red-200 bg-red-50/20 rounded-lg">
                    <div className="w-24 h-24 rounded-full border-4 border-red-600 flex items-center justify-center text-center p-1 uppercase font-black tracking-tighter text-[8px] text-red-600 rotate-12 relative shadow-sm">
                      <div className="border border-red-600 rounded-full w-full h-full flex flex-col items-center justify-center p-1 font-sans">
                        <span>QUẢN TRỊ DOANH NGHIỆP</span>
                        <span className="font-extrabold text-[7px] my-0.5">&bull; ĐÃ PHÊ DUYỆT &bull;</span>
                        <span className="text-[6px] tracking-widest font-mono">2026-07-08</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-red-500 font-bold uppercase tracking-wider mt-3">
                      Đã gán dấu tròn đỏ công ty của Giám đốc
                    </span>
                  </div>
                )}
              </div>

              {/* Modal controls */}
              <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignatureModal(false);
                    setSigningContract(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeSignContract}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Xác Nhận Ký Số</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: VIETNAMESE STANDARD LABOR CONTRACT PREVIEW & EXPORT (XUẤT FILE KÝ) */}
      {/* ========================================================================= */}
      {showContractPreviewModal && previewingContract && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-3xl w-full overflow-hidden flex flex-col my-8 print:my-0 print:border-none print:shadow-none print:rounded-none animate-scale-up">
            {/* Header / toolbar for Modal */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800 print:hidden">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>XUẤT BẢN FILE KÝ HỢP ĐỒNG LAO ĐỘNG CHUẨN PHÁP LÝ</span>
              </h3>

              <div className="flex items-center gap-2">
                {/* Export to Word button */}
                <button
                  type="button"
                  onClick={handleExportContractWord}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                  title="Tải xuống tài liệu Microsoft Word để lưu và ký tay"
                >
                  <Download className="w-4 h-4" />
                  <span>Xuất file Word (.doc)</span>
                </button>

                {/* Print button */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>In / Lưu PDF</span>
                </button>

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowContractPreviewModal(false);
                    setPreviewingContract(null);
                  }}
                  className="text-slate-400 hover:text-white font-black text-xl px-2 py-1"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Instruction for editing */}
            <div className="bg-amber-50 px-6 py-2 border-b border-amber-100 text-[11px] text-amber-800 font-semibold flex items-center justify-between print:hidden">
              <span>💡 Bạn có thể bấm chuột trực tiếp vào bất kỳ dòng chữ nào bên dưới để chỉnh sửa nội dung hợp đồng trước khi in hoặc tải Word!</span>
              <span className="bg-amber-100 px-2 py-0.5 rounded font-black text-[9px]">CHẾ ĐỘ SOẠN THẢO TRỰC TIẾP CHUYÊN NGHIỆP</span>
            </div>

            {/* Document contents (Vietnam Labor Contract Standard layout) */}
            {(() => {
              const emp = employees.find(e => e.id === previewingContract.employeeId);
              const proj = projects.find(p => p.id === emp?.projectId);
              const [y, m, d] = previewingContract.signDate ? previewingContract.signDate.split('-') : ['', '', ''];
              const dayStr = d || '...';
              const monthStr = m || '...';
              const yearStr = y || '...';

              const formatContractDate = (dateStr: string | null) => {
                if (!dateStr) return '................';
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                  return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateStr;
              };

              // Inline styles for Word-compliant standard typography (13pt Times New Roman, line height 1.4, justified)
              const docPStyle = { margin: '0 0 10pt 0', textAlign: 'justify' as const, textIndent: '1.25cm', fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.4', color: '#000000' };
              const docPNoIndentStyle = { margin: '0 0 10pt 0', textAlign: 'justify' as const, fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.4', color: '#000000' };
              const docPBulletStyle = { margin: '0 0 8pt 0', paddingLeft: '1.25cm', textAlign: 'justify' as const, fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.4', color: '#000000' };
              const docHeadingStyle = { margin: '18pt 0 10pt 0', fontWeight: 'bold', fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.4', color: '#000000', textTransform: 'uppercase' as const };
              const docStrongBulletStyle = { margin: '0 0 10pt 0', paddingLeft: '0.6cm', textAlign: 'justify' as const, fontSize: '13pt', fontFamily: '"Times New Roman", Times, serif', lineHeight: '1.4', color: '#000000' };

              return (
                <div
                  id="printable-contract-doc-content"
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  className="p-10 md:p-14 overflow-y-auto max-h-[85vh] bg-white text-slate-950 font-serif leading-relaxed text-xs space-y-6 print:p-0 print:max-h-none print:overflow-visible focus:outline-none"
                >
                  {/* Vietnam Motto & Issuer Header - Standard 2-Column Administrative Table */}
                  <table style={{ width: '100%', border: 'none', borderCollapse: 'collapse', margin: '0 0 30px 0', fontFamily: 'Times New Roman, serif' }}>
                    <tbody>
                      <tr>
                        <td style={{ width: '45%', textAlign: 'center', verticalAlign: 'top', padding: '0' }}>
                          <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt', display: 'block', lineHeight: '1.3' }}>
                            {companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}
                          </span>
                          <div style={{ fontSize: '11pt', fontFamily: 'monospace', color: '#64748b', marginTop: '6px' }}>
                            Số: {previewingContract.contractNumber}
                          </div>
                        </td>
                        <td style={{ width: '55%', textAlign: 'center', verticalAlign: 'top', padding: '0' }}>
                          <span style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '11pt', display: 'block', lineHeight: '1.3' }}>
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </span>
                          <span style={{ fontWeight: 'bold', fontSize: '11.5pt', display: 'block', marginTop: '4px' }}>
                            Độc lập – Tự do – Hạnh phúc
                          </span>
                          <div style={{ textAlign: 'center', marginTop: '3px' }}>
                            <span style={{ display: 'inline-block', width: '120px', borderBottom: '1.5px solid black', height: '1px' }}></span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Title */}
                  <div style={{ textAlign: 'center', margin: '20pt 0 15pt 0', fontFamily: '"Times New Roman", Times, serif' }}>
                    <h2 style={{ fontSize: '15pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '0' }}>HỢP ĐỒNG LAO ĐỘNG</h2>
                    <div style={{ fontSize: '13pt', margin: '10pt 0', textAlign: 'center' }}>
                      <p style={{ margin: '3pt 0', fontStyle: 'italic', textIndent: '0' }}>- Bộ luật Lao động số 45/2019/QH14 ngày 20/11/2019;</p>
                      <p style={{ margin: '3pt 0', fontStyle: 'italic', textIndent: '0' }}>- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</p>
                      <p style={{ margin: '3pt 0', fontStyle: 'italic', textIndent: '0' }}>- Căn cứ vào nhu cầu và khả năng của Các Bên.</p>
                    </div>
                  </div>

                  {/* Introduction */}
                  <p style={docPStyle}>
                    Hôm nay, ngày {dayStr} tháng {monthStr} năm {yearStr}, tại văn phòng Ban Điều Hành Tổng Hợp {companyConfig?.companyName || 'ERP Construction'}, chúng tôi gồm có các bên dưới đây ký kết hợp đồng này:
                  </p>

                  {/* Party A: Employer */}
                  <div style={{ margin: '15pt 0 10pt 0', fontFamily: '"Times New Roman", Times, serif' }}>
                    <h4 style={{ fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                      Người sử dụng lao động: {companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}
                    </h4>
                    <div style={{ paddingLeft: '0.6cm', fontSize: '13pt' }}>
                      <p style={docPNoIndentStyle}>
                        Địa chỉ : {companyConfig?.siteOffice || 'Số 12 Đại lộ Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh'}
                      </p>
                      <p style={docPNoIndentStyle}>
                        Mã số doanh nghiệp : 0317555888
                      </p>
                      <p style={docPNoIndentStyle}>
                        Người đại diện : Ông <strong>{companyConfig?.directorName || 'Vũ Đức Thành'}</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;; Chức vụ : Giám Đốc Điều Hành (CEO)
                      </p>
                      <p style={docPNoIndentStyle}>
                        Số điện thoại : 0983.555.777 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;; Fax : (028) 3775.5588
                      </p>
                      <p style={{ ...docPNoIndentStyle, fontStyle: 'italic', marginTop: '4pt' }}>
                        (Sau đây gọi tắt là: “NSDLĐ” hoặc “Công ty”)
                      </p>
                    </div>
                  </div>

                  {/* Party B: Employee */}
                  <div style={{ margin: '15pt 0 10pt 0', fontFamily: '"Times New Roman", Times, serif' }}>
                    <h4 style={{ fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase', margin: '0 0 6px 0' }}>
                      Người lao động : Ông/Bà <strong>{emp?.name || 'Không rõ'}</strong>
                    </h4>
                    <div style={{ paddingLeft: '0.6cm', fontSize: '13pt' }}>
                      <p style={docPNoIndentStyle}>
                        Ngày sinh : {emp?.id ? `10/05/${1980 + (parseInt(emp.id.replace(/\D/g, '') || '0') % 15)}` : '10/05/1990'}
                      </p>
                      <p style={docPNoIndentStyle}>
                        Số CCCD / CMND : {emp?.citizenId || (emp?.id ? `07909300${emp.id.replace(/\D/g, '').padStart(4, '0')}` : '079093005822')} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;; Ngày cấp: 15/06/2021 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;; Nơi cấp: Cục Cảnh sát QLHC về TTXH
                      </p>
                      <p style={docPNoIndentStyle}>
                        Nơi đăng ký hộ khẩu thường trú: {emp?.permanentAddress || 'Cát Lái, TP. Thủ Đức, TP. Hồ Chí Minh'}
                      </p>
                      <p style={docPNoIndentStyle}>
                        Địa chỉ liên hệ : {proj?.location || 'Số 12 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh'}
                      </p>
                      <p style={docPNoIndentStyle}>
                        Số điện thoại : {emp?.phone || 'Chưa cập nhật'}
                      </p>
                      <p style={{ ...docPNoIndentStyle, fontStyle: 'italic', marginTop: '4pt' }}>
                        (Sau đây gọi tắt là: “NLĐ”)
                      </p>
                    </div>
                  </div>

                  {/* Transition paragraph */}
                  <p style={docPStyle}>
                    Người sử dụng lao động và Người lao động (sau đây gọi tắt là “hai Bên” hoặc “các Bên”) thỏa thuận ký kết hợp đồng lao động và cam kết thực đúng những điều khoản sau đây:
                  </p>

                  {/* Terms of contract */}
                  <div style={{ margin: '10pt 0', fontFamily: '"Times New Roman", Times, serif' }}>
                    <h4 style={docHeadingStyle}>Điều 1: Thời hạn và công việc hợp đồng</h4>
                    <p style={docStrongBulletStyle}>
                      1.1. Loại hợp đồng lao động: {emp?.type === 'Internal' ? 'Hợp đồng lao động xác định thời hạn (12 tháng)' : 'Hợp đồng lao động thời vụ / khoán ngày '}
                    </p>
                    <p style={docStrongBulletStyle}>
                      1.2. Thời hạn từ ngày {formatContractDate(previewingContract.startDate)} {previewingContract.endDate ? `đến ngày ${formatContractDate(previewingContract.endDate)}` : 'cho đến khi hoàn thành bàn giao dự án xây dựng (Vô thời hạn)'}.
                    </p>
                    <p style={docStrongBulletStyle}>
                      1.3. Đơn vị làm việc: {companyConfig?.companyName || 'Công ty Cổ phần Đầu tư & Xây dựng Đất Việt'}
                    </p>
                    <p style={docStrongBulletStyle}>
                      1.4. Địa điểm làm việc: {proj?.name || 'Văn phòng Công ty và các Công trường Dự án trực thuộc'}
                    </p>
                    <p style={docStrongBulletStyle}>
                      1.5. Chức vụ/chức danh (nếu có): <strong>{emp?.role || 'Kỹ sư chuyên môn'}</strong>
                    </p>
                    <p style={docStrongBulletStyle}>
                      1.6. Nội dung công việc/Mô tả công việc:
                    </p>
                    <p style={docPBulletStyle}>
                      (i) Thực hiện công việc theo sự sắp xếp của lãnh đạo Công ty và các trưởng, phó bộ phận;
                    </p>
                    <p style={docPBulletStyle}>
                      (ii) Thực hiện công tác chuyên môn theo bảng mô tả công việc vị trí {emp?.role || 'Nhân viên'}; bảo đảm chất lượng, tiến độ và quy chuẩn kỹ thuật xây dựng;
                    </p>
                    <p style={docPBulletStyle}>
                      (iii) Người lao động đồng ý rằng Người sử dụng lao động có thể quyết định một cách hợp lý chức vụ của Người lao động và việc thuyên chuyển Người lao động trong các phòng ban của Công ty phù hợp với chuyên môn và năng lực của Người lao động.
                    </p>
                    <p style={docPBulletStyle}>
                      (iv) Hoàn thành tốt công việc được giao theo định mức sản lượng, thời gian công nghệ và đạt chất lượng theo quy định – chấp hành tốt nội quy kỷ luật, chấp hành nghiêm chỉnh quy trình vận hành, quy trình thao tác công nghệ, bảo quản thiết bị, quy trình an toàn lao động.
                    </p>

                    <h4 style={docHeadingStyle}>Điều 2: Chế độ làm việc.</h4>
                    <p style={docStrongBulletStyle}>
                      2.1. Thời giờ làm việc: 8 tiếng/ngày, Buổi sáng: 8h00 – 12h00, Buổi chiều: 13h30 – 17h30; Ngày làm việc: từ ngày thứ 2 đến hết buổi sáng ngày thứ 7.
                    </p>
                    <p style={docStrongBulletStyle}>
                      2.2. Do tính chất công việc, yêu cầu của tổ chức/bộ phận hoặc yêu cầu của khách hàng, Công ty có thể cho áp dụng thời gian làm việc linh hoạt. Những nhân viên được áp dụng thời gian làm việc linh hoạt có thể không tuân thủ lịch làm việc cố định bình thường mà làm theo thời gian cụ thể của công việc, nhưng vẫn phải đảm bảo đủ số giờ làm việc theo quy định.
                    </p>
                    <p style={docStrongBulletStyle}>
                      2.3. Thiết bị và công cụ làm việc có thể được Công ty cấp phát (nếu cần thiết) tùy theo nhu cầu của công việc.
                    </p>
                    <p style={docStrongBulletStyle}>
                      2.4. Điều kiện an toàn và vệ sinh lao động tại nơi làm việc theo quy định của pháp luật hiện hành.
                    </p>
                    <p style={docStrongBulletStyle}>
                      2.5. Ngày nghỉ lễ, Tết, ngày nghỉ hưởng nguyên lương: Theo quy định của luật lao động và theo quy chế lương của Công ty.
                    </p>

                    <h4 style={docHeadingStyle}>Điều 3: Quyền lợi và nghĩa vụ của Người lao động</h4>
                    <p style={{ ...docStrongBulletStyle, fontWeight: 'bold' }}>
                      3.1. Quyền lợi
                    </p>
                    <p style={docPBulletStyle}>
                      (i) Phương tiện đi lại làm việc: Người lao động tự túc.
                    </p>
                    <p style={docPBulletStyle}>
                      (ii) Mức lương chính thức: <strong>{formatVND(previewingContract.salaryAmount)}</strong> ({previewingContract.salaryType === 'Monthly' ? 'đồng một tháng dương lịch' : 'đồng cho một ngày công làm việc thực tế hạch toán qua hệ thống chấm công'}).
                    </p>
                    <p style={docPBulletStyle}>
                      (iii) Các khoản phụ cấp: <strong>{formatVND(previewingContract.allowance)}</strong> ({previewingContract.salaryType === 'Monthly' ? 'phụ cấp tháng điện thoại, xăng xe' : 'phụ cấp tiền ăn ca /ngày'}).
                    </p>
                    <p style={docPBulletStyle}>
                      (iv) Chế độ nâng lương: Theo quy định của pháp luật và Quy chế tiền lương của Công ty;
                    </p>
                    <p style={docPBulletStyle}>
                      (v) Thưởng: Do Công ty quyết định tùy theo hiệu quả công việc và tình hình kinh doanh của Công ty;
                    </p>
                    <p style={docPBulletStyle}>
                      (vi) Chế độ nghỉ ngơi (nghỉ hàng tuần, phép năm, lễ tết...): Theo Nội quy lao động của Công ty và quy định của pháp luật hiện hành;
                    </p>
                    <p style={docPBulletStyle}>
                      (vii) Chế độ Bảo hiểm: {previewingContract.insurance ? 'Được đóng đầy đủ BHXH, BHYT, BHTN theo tỷ lệ quy định trích lập lương doanh nghiệp.' : 'Mức lương trên đã bao gồm phụ trội thay thế trực tiếp vào lương, người lao động tự túc đóng BHXH tự nguyện.'}
                    </p>
                    <p style={docPBulletStyle}>
                      (viii) Chế độ đào tạo : Theo quy định của Công ty;
                    </p>
                    <p style={docPBulletStyle}>
                      (ix) Tiền lương làm thêm giờ: được tính theo quy định của Công ty hoặc theo quy định chung của Nhà nước;
                    </p>
                    <p style={docPBulletStyle}>
                      (x) Được trang bị bảo hộ lao động gồm: Theo quy định của Công ty (nếu có).
                    </p>

                    <p style={{ ...docStrongBulletStyle, fontWeight: 'bold', marginTop: '10pt' }}>
                      3.2. Nghĩa vụ
                    </p>
                    <p style={docPBulletStyle}>
                      (i) Hoàn thành những công việc theo Hợp đồng lao động này. Tuân thủ sự phân công, bố trí, sắp xếp, điều hành, điều động, điều chuyển, phân cấp, ủy quyền của cán bộ quản lý trực tiếp, và/hoặc Ban điều hành Công ty (nếu có);
                    </p>
                    <p style={docPBulletStyle}>
                      (ii) Chấp hành lệnh điều hành sản xuất kinh doanh, nội quy kỷ luật lao động, an toàn lao động và các quy định khác do Người sử dụng lao động ban hành tại từng thời điểm;
                    </p>
                    <p style={docPBulletStyle}>
                      (iii) Giữ bí mật các thông tin được tiếp cận trong quá trình làm việc theo quy định tại Thỏa thuận bảo mật thông tin đính kèm Hợp đồng này;
                    </p>
                    <p style={docPBulletStyle}>
                      (iv) Giữ gìn, bảo vệ tài sản của công ty, báo cáo kịp thời cho người có thẩm quyền khi phát hiện hành vi hủy hoại, trộm cắp hoặc chiếm dụng tài sản của Công ty;
                    </p>
                    <p style={docPBulletStyle}>
                      (v) Kỷ luật lao động và trách nhiệm vật chất: Người sử dụng lao động có quyền xử lý kỷ luật và yêu cầu trách nhiệm vật chất theo quy định của Nội quy lao động và pháp luật lao động;
                    </p>
                    <p style={docPBulletStyle}>
                      (vi) Trường hợp Người lao động đơn phương chấm dứt Hợp đồng lao động này phải báo trước bằng văn bản (Đơn xin nghỉ việc) cho Người sử dụng lao động, tuân thủ thời hạn báo trước theo quy định pháp luật. Người lao động có trách nhiệm bàn giao giấy tờ, văn bản, công việc cho người kế nhiệm hoặc người quản lý; có trách nhiệm cùng Người sử dụng lao động giải quyết các vấn đề vướng mắc trong quá trình chờ giải quyết chế độ nghỉ việc (nếu có);
                    </p>
                    <p style={docPBulletStyle}>
                      (vii) Khi đơn phương chấm dứt hợp đồng trái pháp luật, người lao động không được trợ cấp thôi việc và phải bồi thường cho người sử dụng lao động nửa tháng tiền lương theo hợp đồng lao động. Nếu vi phạm về thời hạn báo trước, thì phải bồi thường cho người sử dụng lao động một khoản tiền tương ứng với tiền lương của người lao động trong những ngày không báo trước;
                    </p>
                    <p style={docPBulletStyle}>
                      (viii) Tham dự đầy đủ, nhiệt tình các buổi huấn luyện, đào tạo, hội thảo do Bộ phận hoặc Công ty tổ chức;
                    </p>
                    <p style={docPBulletStyle}>
                      (ix) Hoàn trả toàn bộ chi phí đào tạo theo Hợp đồng đào tạo (nếu có ký kết) cho Người sử dụng lao động khi đơn phương chấm dứt hợp đồng trái pháp luật; hoặc trường hợp Người lao động vi phạm bất kỳ điều khoản nào của Hợp đồng, Nội quy lao động, quy định, chính sách và/hoặc quy tắc của Công ty (đã được sửa đổi theo thời gian) dẫn đến việc Người lao động bị kỷ luật sa thải trong thời gian làm việc cho Người sử dụng lao động;
                    </p>
                    <p style={docPBulletStyle}>
                      (x) Thực hiện công việc với sự tận tâm, tận lực và mẫn cán, đảm bảo hoàn thành công việc với hiệu quả cao nhất theo sự phân công, điều hành (bằng văn bản hoặc bằng miệng) của Ban Giám đốc trong Công ty (và các cá nhân được Ban Giám đốc bổ nhiệm hoặc ủy quyền phụ trách);
                    </p>
                    <p style={docPBulletStyle}>
                      (xi) Thực hiện các nghĩa vụ về thuế; bảo hiểm xã hội và nghĩa vụ tài chính khác theo quy định pháp luật.
                    </p>

                    <h4 style={docHeadingStyle}>Điều 4: Quyền hạn và nghĩa vụ của Người sử dụng lao động</h4>
                    <p style={{ ...docStrongBulletStyle, fontWeight: 'bold' }}>
                      4.1. Quyền hạn
                    </p>
                    <p style={docPBulletStyle}>
                      (i) Điều động người lao động hoàn thành công việc theo hợp đồng (bố trí, điều chuyển, tạm ngừng việc ...);
                    </p>
                    <p style={docPBulletStyle}>
                      (ii) Kiểm tra, giám sát, đánh giá hiệu quả thực hiện công việc của Người lao động phù hợp với từng vị trí làm việc và quyết định việc tăng lương theo tình hình sản xuất, kinh doanh thực tế của Công ty trên cơ sở quy định của pháp luật, nội quy lao động;
                    </p>
                    <p style={docPBulletStyle}>
                      (iii) Có quyền áp dụng các hình thức xử lý kỷ luật lao động, yêu cầu bồi thường thiệt hại đối với Người lao động theo quy chế công ty và phù hợp quy định pháp luật;
                    </p>
                    <p style={docPBulletStyle}>
                      (iv) Thực hiện các hành động, biện pháp nhằm ngăn chặn, hạn chế tối thiểu những rủi ro, thiệt hại từ các hành vi cố ý hủy hoại của Người lao động đến quyền lợi chính đáng của Người sử dụng lao động trong phạm vi quyền hạn và quy định pháp luật;
                    </p>
                    <p style={docPBulletStyle}>
                      (v) Cung cấp đầy đủ điều kiện làm việc cho người lao động phù hợp với vị trí công việc được giao;
                    </p>
                    <p style={docPBulletStyle}>
                      (vi) Tạm hoãn, chấm dứt hợp đồng lao động, kỷ luật người lao động theo quy định của pháp luật, thỏa ước lao động tập thể (nếu có) và nội quy lao động của doanh nghiệp.
                    </p>

                    <p style={{ ...docStrongBulletStyle, fontWeight: 'bold', marginTop: '10pt' }}>
                      4.2. Nghĩa vụ
                    </p>
                    <p style={docPBulletStyle}>
                      (i) Bảo đảm việc làm và thực hiện đầy đủ những điều đã cam kết trong hợp đồng lao động;
                    </p>
                    <p style={docPBulletStyle}>
                      (ii) Thanh toán đầy đủ, đúng thời hạn các chế độ và quyền lợi cho người lao động theo hợp đồng lao động, thỏa ước lao động tập thể (nếu có).
                    </p>

                    <h4 style={docHeadingStyle}>Điều 5: Điều khoản thi hành</h4>
                    <p style={docStrongBulletStyle}>
                      5.1. Hai Bên cam kết hoàn toàn tự nguyện khi ký kết và thực hiện nghiêm túc Hợp đồng lao động này. Mọi sự thay đổi, bổ sung chỉ có giá trị khi được sự đồng ý bằng văn bản của cả hai Bên.
                    </p>
                    <p style={docStrongBulletStyle}>
                      5.2. Những vấn đề về lao động không ghi trong hợp đồng lao động này thì áp dụng quy định của Nội quy lao động, thỏa ước lao động tập thể, trường hợp thỏa ước lao động tập thể, nội quy lao động chưa có quy định thì áp dụng quy định của pháp luật lao động.
                    </p>
                    <p style={docStrongBulletStyle}>
                      5.3. Thỏa thuận bảo mật và các phụ lục hợp đồng, (nếu có) là một bộ phận không thể tách rời của Hợp đồng này, có giá trị pháp lý ràng buộc các Bên liên quan.
                    </p>
                    <p style={docStrongBulletStyle}>
                      5.4. Mọi tranh chấp phát sinh từ Hợp đồng này được giải quyết trên cơ sở thương lượng, thỏa thuận giữa hai bên. Trong trường hợp không thể thương lượng, thỏa thuận, các Bên có quyền yêu cầu Tòa án có thẩm quyền giải quyết theo quy định của pháp luật.
                    </p>
                    <p style={docStrongBulletStyle}>
                      5.5. Hợp đồng này được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ một bản và có hiệu lực từ ngày ký.
                    </p>
                  </div>

                  {/* Signatures & Seal Overlay */}
                  <div id="contract-signatures-wrapper" className="grid grid-cols-2 pt-6 text-center text-xs leading-normal font-sans border-t border-slate-200 relative min-h-[160px]" style={{ marginTop: '30px' }}>
                    {/* Employee signature column */}
                    <div className="space-y-1 z-10">
                      <span className="font-extrabold block text-slate-900 uppercase">NGƯỜI LAO ĐỘNG (BÊN B)</span>
                      <span className="text-[9px] text-slate-400 italic block">(Ký số ERP và ghi rõ họ tên)</span>

                      <div className="h-20 flex items-center justify-center relative">
                        {previewingContract.signedByEmployee ? (
                          <div className="text-center font-serif italic text-blue-800 text-lg font-bold select-none rotate-3">
                            <p className="text-[8px] font-sans font-black uppercase text-emerald-600 tracking-wider bg-emerald-50 px-1.5 py-0.2 rounded-sm mb-1">
                              ĐÃ KÝ SỐ ERP SECURE
                            </p>
                            {emp?.name}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa thực hiện ký chữ ký điện tử</span>
                        )}
                      </div>
                      <span className="font-bold text-slate-800">
                        {emp?.name || 'Không rõ'}
                      </span>
                    </div>

                    {/* Director signature column with redondo red stamp overlay */}
                    <div className="space-y-1 z-10 relative">
                      <span className="font-extrabold block text-slate-900 uppercase">ĐẠI DIỆN CÔNG TY (BÊN A)</span>
                      <span className="text-[9px] text-slate-400 italic block">(Ký tên, đóng dấu pháp nhân)</span>

                      <div className="h-20 flex items-center justify-center relative">
                        {previewingContract.signedByDirector ? (
                          <div className="relative flex items-center justify-center">
                            {/* Red round seal stamp */}
                            <div className="absolute w-24 h-24 rounded-full border-4 border-red-600/75 flex items-center justify-center text-center p-1 uppercase font-black tracking-tighter text-[7.5px] text-red-600/75 rotate-12 select-none z-0">
                              <div className="border border-red-600/75 rounded-full w-full h-full flex flex-col items-center justify-center p-1">
                                <span>{(companyConfig?.companyName || 'QUẢN TRỊ DOANH NGHIỆP').substring(0, 15).toUpperCase()}</span>
                                <span className="font-extrabold text-[6.5px] my-0.5">&bull; ĐÃ DUYỆT BÊN A &bull;</span>
                                <span className="text-[5.5px] tracking-widest font-mono">{previewingContract.signDate}</span>
                              </div>
                            </div>

                            {/* Cursive signature */}
                            <div className="font-serif italic text-red-800 text-base font-extrabold select-none rotate-[-6deg] z-10 mix-blend-multiply pr-6 pt-4">
                              {(companyConfig?.directorName || 'Vũ Đức Thành').split(' ').pop()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Chưa phê duyệt chữ ký số đại diện</span>
                        )}
                      </div>
                      <span className="font-bold text-slate-800">CEO {companyConfig?.directorName || 'Vũ Đức Thành'}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Actions Footer inside modal */}
            <div className="bg-slate-50 px-6 py-4 flex gap-2 justify-end border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => {
                  setShowContractPreviewModal(false);
                  setPreviewingContract(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
              >
                Đóng xem thử
              </button>

              <button
                type="button"
                onClick={handleExportContractWord}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Xuất file Word (.doc)</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Xuất file ký tươi (In)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EMPLOYEE DETAIL & QR CODE */}
      {showDetailModal && selectedEmpDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl shadow-xl border border-slate-200 w-full overflow-hidden animate-scale-up transition-all duration-300 ${
            detailActiveTab === 'info' ? 'max-w-2xl' : 'max-w-4xl'
          }`}>

            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <span>Chi Tiết Hồ Sơ Nhân Sự & Hạch Toán</span>
              </h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEmpDetail(null);
                }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="bg-slate-100 border-b border-slate-200 px-6 flex gap-4">
              <button
                type="button"
                onClick={() => setDetailActiveTab('info')}
                className={`py-3 px-1 text-xs font-bold transition-all border-b-2 ${
                  detailActiveTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Hồ Sơ & Thẻ QR
              </button>
              <button
                type="button"
                onClick={() => setDetailActiveTab('timesheet')}
                className={`py-3 px-1 text-xs font-bold transition-all border-b-2 ${
                  detailActiveTab === 'timesheet'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Bảng Chấm Công (T{selectedMonth}/{selectedYear})
              </button>
              <button
                type="button"
                onClick={() => setDetailActiveTab('payroll')}
                className={`py-3 px-1 text-xs font-bold transition-all border-b-2 ${
                  detailActiveTab === 'payroll'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Bảng Tính & Phiếu Lương
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 max-h-[75vh] overflow-y-auto space-y-4">
              {empViolations && empViolations.hasViolations && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex gap-3 text-rose-950 border-l-4 border-l-rose-600 shadow-xs" id="employee-attendance-violation-alert">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-rose-800 block">
                      ⚠️ CẢNH BÁO VI PHẠM KỶ LUẬT & CHUYÊN CẦN
                    </span>
                    <ul className="list-disc pl-4 space-y-1 font-semibold text-rose-700 leading-relaxed">
                      {empViolations.violations.map((v, idx) => (
                        <li key={idx}>{v}</li>
                      ))}
                    </ul>
                    <p className="text-[9.5px] text-rose-500 font-medium italic mt-1.5">
                      * Ghi chú: Các vi phạm chấm công trên hệ thống ERP ảnh hưởng trực tiếp đến công tác hạch toán chi phí lương cuối tháng.
                    </p>
                  </div>
                </div>
              )}

              {detailActiveTab === 'info' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Column: Detailed Profile Info */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mã Nhân Viên</span>
                      <span className="font-mono text-base font-black text-slate-800">{selectedEmpDetail.id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Họ và Tên</span>
                        <span className="text-sm font-bold text-slate-800">{selectedEmpDetail.name}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Chức vụ / Vai trò</span>
                        <span className="text-sm font-bold text-slate-700">{selectedEmpDetail.role}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số điện thoại</span>
                        <span className="text-sm font-semibold text-slate-700 font-mono">{selectedEmpDetail.phone || 'Chưa cập nhật'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Loại hình nhân sự</span>
                        <span className={`inline-flex px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold ${
                          selectedEmpDetail.type === 'Internal' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {selectedEmpDetail.type === 'Internal' ? 'Nhân viên Cơ hữu' : 'Lao động Thời vụ'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Số CCCD / CMND</span>
                        <span className="text-sm font-mono text-slate-800 font-bold">
                          {selectedEmpDetail.citizenId ? selectedEmpDetail.citizenId : (
                            <span className="text-rose-500 font-normal italic text-xs">Chưa cập nhật CCCD</span>
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Lương cơ sở</span>
                        <span className="text-sm font-bold text-slate-800 font-mono">
                          {formatVND(selectedEmpDetail.baseSalary)}
                          <span className="text-[10px] text-slate-400 font-normal">
                            {selectedEmpDetail.baseSalary < 1500000 ? '/ngày công' : '/tháng'}
                          </span>
                        </span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Đăng ký HKTT (Thường trú)</span>
                      <span className="text-sm text-slate-700">
                        {selectedEmpDetail.permanentAddress || (
                          <span className="text-slate-400 italic text-xs">Chưa cập nhật nơi thường trú</span>
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Bố trí công trình</span>
                      <span className="text-sm font-bold text-slate-800">
                        {getProjectName(selectedEmpDetail.projectId)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Trạng thái công tác</span>
                      <span className={`inline-flex items-center gap-1.5 mt-1.5 text-xs font-bold ${
                        selectedEmpDetail.active ? 'text-emerald-600' : 'text-slate-400'
                      }`}>
                        <span className={`w-2 h-2 rounded-full ${selectedEmpDetail.active ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        {selectedEmpDetail.active ? 'Đang hoạt động (Tại công trường)' : 'Tạm nghỉ / Đã chuyển'}
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Virtual ID Badge & Scannable QR Code */}
                  <div className="md:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-between text-center space-y-4">

                    {/* Badge Header */}
                    <div className="w-full">
                      <div className="text-[11px] font-black tracking-widest text-slate-400 uppercase">THẺ NHÂN SỰ RA VÀO</div>
                      <div className="text-xs font-extrabold text-blue-600 uppercase mt-0.5">
                        {companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}
                      </div>
                    </div>

                    {/* Simulated Photo Avatar & Name */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xl border-2 border-white shadow-md">
                        {selectedEmpDetail.name.split(' ').pop()?.charAt(0) || 'U'}
                      </div>
                      <h4 className="text-sm font-black text-slate-800 mt-2">{selectedEmpDetail.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold">{selectedEmpDetail.role}</p>
                    </div>

                    {/* QR Code Container */}
                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center justify-center relative group">
                      <QRCodeSVG
                        id="employee-qr-code"
                        value={JSON.stringify({
                          id: selectedEmpDetail.id,
                          name: selectedEmpDetail.name,
                          citizenId: selectedEmpDetail.citizenId || ''
                        })}
                        size={130}
                        level={"H"}
                        includeMargin={true}
                      />
                    </div>

                    {/* Badge Info Footer */}
                    <div className="w-full text-left bg-white p-2.5 rounded-lg border border-slate-100 text-[10px] font-mono space-y-1">
                      <div><span className="text-slate-400 font-bold">MÃ:</span> <span className="text-slate-700 font-black">{selectedEmpDetail.id}</span></div>
                      <div><span className="text-slate-400 font-bold">CCCD:</span> <span className="text-slate-700 font-black">{selectedEmpDetail.citizenId || 'N/A'}</span></div>
                    </div>

                    {/* Actions */}
                    <div className="w-full flex gap-2">
                      <button
                        type="button"
                        onClick={downloadQR}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Tải mã QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Thẻ Nhân Viên - ${selectedEmpDetail.name}</title>
                                  <style>
                                    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f1f5f9; }
                                    .badge { width: 300px; padding: 24px; background: white; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; text-align: center; }
                                    .title { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px; }
                                    .company { font-size: 14px; font-weight: 900; color: #2563eb; text-transform: uppercase; margin-bottom: 20px; }
                                    .avatar { width: 80px; height: 80px; border-radius: 50%; background-color: #dbeafe; color: #1d4ed8; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; margin: 0 auto 16px; border: 2px solid #fff; box-shadow: 0 2px 4px rgb(0 0 0 / 0.1); }
                                    .name { font-size: 18px; font-weight: 900; color: #1e293b; margin: 0 0 4px; }
                                    .role { font-size: 12px; font-weight: 700; color: #64748b; margin-bottom: 24px; }
                                    .qr-container { padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; display: inline-block; margin-bottom: 24px; }
                                    .info-box { background-color: #f8fafc; border-radius: 8px; padding: 12px; text-align: left; font-family: monospace; font-size: 11px; color: #334155; }
                                    .info-item { margin-bottom: 4px; }
                                    .info-item:last-child { margin-bottom: 0; }
                                    .info-label { color: #94a3b8; font-weight: bold; }
                                    .info-val { font-weight: 800; }
                                    @media print {
                                      body { background: white; }
                                      .badge { box-shadow: none; border: 1px solid #000; }
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="badge">
                                    <div class="title">THẺ NHÂN SỰ RA VÀO</div>
                                    <div class="company">${companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}</div>
                                    <div class="avatar">${selectedEmpDetail.name.split(' ').pop()?.charAt(0) || 'U'}</div>
                                    <h1 class="name">${selectedEmpDetail.name}</h1>
                                    <div class="role">${selectedEmpDetail.role}</div>
                                    <div class="qr-container">
                                      ${document.getElementById("employee-qr-code")?.outerHTML || ''}
                                    </div>
                                    <div class="info-box">
                                      <div class="info-item"><span class="info-label">MÃ:</span> <span class="info-val">${selectedEmpDetail.id}</span></div>
                                      <div class="info-item"><span class="info-label">CCCD:</span> <span class="info-val">${selectedEmpDetail.citizenId || 'N/A'}</span></div>
                                      <div class="info-item"><span class="info-label">DỰ ÁN:</span> <span class="info-val">${getProjectName(selectedEmpDetail.projectId)}</span></div>
                                    </div>
                                  </div>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                            setTimeout(() => printWindow.print(), 250);
                          }
                        }}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>In thẻ badge</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {detailActiveTab === 'timesheet' && (() => {
                const data = getEmpPayrollDetails(selectedEmpDetail);
                const sortedSheets = [...data.empSheets].sort((a, b) => a.date.localeCompare(b.date));

                return (
                  <div className="space-y-6">
                    {/* Upper Export Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200 rounded-lg p-3 gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-800">
                          Bảng Chấm Công - {selectedEmpDetail.name}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Hạch toán thực tế trong tháng {selectedMonth}/{selectedYear} qua ảnh xác minh & tọa độ GPS
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleExportIndividualTimesheetExcel(selectedEmpDetail, data)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Xuất Excel Chấm Công</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              const sortedRows = sortedSheets.map((sheet, idx) => {
                                let statusVi = '';
                                switch(sheet.status) {
                                  case 'Present': statusVi = 'Đúng giờ'; break;
                                  case 'Late': statusVi = 'Đi muộn'; break;
                                  case 'Overtime': statusVi = 'Tăng ca'; break;
                                  case 'Absent': statusVi = 'Vắng mặt'; break;
                                  default: statusVi = sheet.status;
                                }
                                return `
                                  <tr>
                                    <td>${idx + 1}</td>
                                    <td>${sheet.date}</td>
                                    <td>${sheet.checkInTime || '-'}</td>
                                    <td>${sheet.checkOutTime || '-'}</td>
                                    <td style="font-weight: bold;">${statusVi}</td>
                                    <td>${sheet.verifiedByFace ? 'Có ảnh xác minh' : 'Không có ảnh'}</td>
                                    <td>${sheet.gpsStatus === 'In-Range' ? 'Hợp lệ' : 'Ngoài phạm vi'}</td>
                                  </tr>
                                `;
                              }).join('');

                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Bảng chấm công - ${selectedEmpDetail.name}</title>
                                    <style>
                                      body { font-family: "Segoe UI", sans-serif; padding: 30px; color: #1e293b; }
                                      .header { text-align: center; margin-bottom: 25px; }
                                      .title { font-size: 20px; font-weight: 800; }
                                      .subtitle { font-size: 14px; color: #64748b; margin-top: 5px; }
                                      .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
                                      .info-table td { padding: 4px 8px; }
                                      .info-label { font-weight: bold; color: #475569; width: 120px; }
                                      .data-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 15px; }
                                      .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 8px; text-align: center; }
                                      .data-table th { background-color: #f8fafc; font-weight: bold; }
                                      .summary-box { margin-top: 20px; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; width: 300px; font-size: 13px; }
                                      .summary-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <div class="title">BẢNG CHẤM CÔNG CHI TIẾT CÁ NHÂN</div>
                                      <div class="subtitle">Tháng ${selectedMonth}/${selectedYear}</div>
                                    </div>
                                    <table class="info-table">
                                      <tr>
                                        <td class="info-label">Nhân sự:</td>
                                        <td>${selectedEmpDetail.name}</td>
                                        <td class="info-label">Mã NV:</td>
                                        <td><strong>${selectedEmpDetail.id}</strong></td>
                                      </tr>
                                      <tr>
                                        <td class="info-label">Chức vụ:</td>
                                        <td>${selectedEmpDetail.role}</td>
                                        <td class="info-label">Phân loại:</td>
                                        <td>${selectedEmpDetail.type === 'Internal' ? 'Cơ hữu' : 'Thời vụ'}</td>
                                      </tr>
                                      <tr>
                                        <td class="info-label">Dự án:</td>
                                        <td colspan="3">${getProjectName(selectedEmpDetail.projectId)}</td>
                                      </tr>
                                    </table>
                                    <table class="data-table">
                                      <thead>
                                        <tr>
                                          <th>STT</th>
                                          <th>Ngày</th>
                                          <th>Giờ Vào</th>
                                          <th>Giờ Ra</th>
                                          <th>Trạng Thái</th>
                                          <th>Ảnh xác minh</th>
                                          <th>Định Vị GPS</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        ${sortedRows || '<tr><td colspan="7">Không có dữ liệu</td></tr>'}
                                      </tbody>
                                    </table>
                                    <div class="summary-box">
                                      <div class="summary-row"><span>Số ngày công có mặt:</span><strong>${data.daysPresent} ngày</strong></div>
                                      <div class="summary-row"><span>Trong đó tăng ca:</span><strong>${data.daysOvertime} ngày</strong></div>
                                      <div class="summary-row"><span>Đi muộn:</span><strong>${data.daysLate} ngày</strong></div>
                                      <div class="summary-row"><span>Vắng mặt:</span><strong>${data.daysAbsent} ngày</strong></div>
                                    </div>
                                  </body>
                                </html>
                              `);
                              printWindow.document.close();
                              setTimeout(() => printWindow.print(), 250);
                            }
                          }}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In Bảng Công</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        <span className="text-[9px] text-emerald-700 font-extrabold uppercase">CÓ MẶT / TÍNH CÔNG</span>
                        <div className="text-base font-black text-emerald-800 mt-1 font-mono">{data.daysPresent} ngày</div>
                      </div>
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                        <span className="text-[9px] text-purple-700 font-extrabold uppercase">TĂNG CA / PHỤ TRỘI</span>
                        <div className="text-base font-black text-purple-800 mt-1 font-mono">{data.daysOvertime} ngày</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <span className="text-[9px] text-amber-700 font-extrabold uppercase">ĐI MUỘN / TRỄ GIỜ</span>
                        <div className="text-base font-black text-amber-800 mt-1 font-mono">{data.daysLate} ngày</div>
                      </div>
                      <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                        <span className="text-[9px] text-rose-700 font-extrabold uppercase">VẮNG MẶT</span>
                        <div className="text-base font-black text-rose-800 mt-1 font-mono">{data.daysAbsent} ngày</div>
                      </div>
                    </div>

                    {/* Checkins list table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-black uppercase">Nhật Ký Chấm Công Chi Tiết</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">Tổng cộng: {sortedSheets.length} ngày công ghi nhận</span>
                      </div>
                      <div className="max-h-[35vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                              <th className="px-4 py-2 text-center w-12">STT</th>
                              <th className="px-4 py-2 text-center w-28">Ngày</th>
                              <th className="px-4 py-2 text-center">Giờ Vào</th>
                              <th className="px-4 py-2 text-center">Giờ Ra</th>
                              <th className="px-4 py-2 text-center">Trạng Thái</th>
                              <th className="px-4 py-2 text-center">Ảnh xác minh</th>
                              <th className="px-4 py-2 text-center">Định Vị GPS</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                            {sortedSheets.length > 0 ? (
                              sortedSheets.map((sheet, idx) => (
                                <tr key={sheet.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-2.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                                  <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700">{sheet.date}</td>
                                  <td className="px-4 py-2.5 text-center font-mono text-slate-800 font-bold">{sheet.checkInTime || '-'}</td>
                                  <td className="px-4 py-2.5 text-center font-mono text-slate-800 font-bold">{sheet.checkOutTime || '-'}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                      sheet.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                      sheet.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                      sheet.status === 'Overtime' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                      'bg-rose-50 text-rose-700 border border-rose-100'
                                    }`}>
                                      {sheet.status === 'Present' ? 'Đúng giờ' :
                                       sheet.status === 'Late' ? 'Đi muộn' :
                                       sheet.status === 'Overtime' ? 'Tăng ca' : 'Vắng mặt'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                      sheet.verifiedByFace ? 'text-emerald-600' : 'text-slate-400'
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${sheet.verifiedByFace ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                                      {sheet.verifiedByFace ? 'Có ảnh' : 'Không có ảnh'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-extrabold ${
                                      sheet.gpsStatus === 'In-Range' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {sheet.gpsStatus === 'In-Range' ? 'Hợp lệ' : 'Ngoài khu vực'}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colspan="7" className="px-4 py-8 text-center text-slate-400 italic font-normal">
                                  Không tìm thấy lịch sử chấm công nào của nhân sự trong tháng này.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {detailActiveTab === 'payroll' && (() => {
                const data = getEmpPayrollDetails(selectedEmpDetail);
                const baseSalaryLabel = data.isDailyWage ? 'Lương ngày gốc' : 'Lương cơ bản tháng';
                const workDaysLabel = data.isDailyWage ? 'Số ngày công thực tế' : 'Số ngày công có mặt';

                return (
                  <div className="space-y-6">
                    {/* Upper Export Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-200 rounded-lg p-3 gap-3">
                      <div>
                        <div className="text-xs font-black text-slate-800">
                          Phiếu Hạch Toán Lương & Thanh Toán - {selectedEmpDetail.name}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Bảng tổng kết thu nhập gộp, các khoản giảm trừ và dư nợ lương thực lĩnh còn lại.
                        </p>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => handleExportIndividualPayrollExcel(selectedEmpDetail, data)}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Xuất Excel Phiếu Lương</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (printWindow) {
                              const bSalaryLabel = data.isDailyWage ? 'Lương ngày công gốc' : 'Lương cơ bản tháng';
                              const wDaysLabel = data.isDailyWage ? 'Số ngày công thực tế' : 'Số ngày công có mặt';

                              printWindow.document.write(`
                                <html>
                                  <head>
                                    <title>Phiếu lương - ${selectedEmpDetail.name}</title>
                                    <style>
                                      body { font-family: "Segoe UI", sans-serif; padding: 40px; color: #1e293b; }
                                      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #cbd5e1; padding-bottom: 15px; }
                                      .title { font-size: 20px; font-weight: 800; text-transform: uppercase; }
                                      .subtitle { font-size: 13px; color: #64748b; margin-top: 5px; }
                                      .info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
                                      .info-table td { padding: 5px 8px; }
                                      .info-label { font-weight: bold; color: #475569; width: 130px; }
                                      .payslip-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                                      .payslip-table th, .payslip-table td { border: 1px solid #cbd5e1; padding: 10px; }
                                      .payslip-table th { background-color: #0f172a; color: white; text-align: left; }
                                      .payslip-table td.amount { text-align: right; font-family: monospace; font-weight: bold; }
                                      .total-row { background-color: #f8fafc; font-weight: bold; }
                                      .net-row { background-color: #f0f9ff; font-weight: bold; color: #156534; }
                                      .signatures { display: flex; justify-content: space-between; margin-top: 60px; font-size: 13px; }
                                      .sig { text-align: center; width: 45%; }
                                    </style>
                                  </head>
                                  <body>
                                    <div class="header">
                                      <div class="title">PHIẾU THANH TOÁN TIỀN LƯƠNG NHÂN SỰ</div>
                                      <div class="subtitle">Tháng ${selectedMonth}/${selectedYear}</div>
                                    </div>
                                    <table class="info-table">
                                      <tr><td>Họ và tên:</td><td><strong>${selectedEmpDetail.name}</strong></td><td>Mã nhân viên:</td><td><strong>${selectedEmpDetail.id}</strong></td></tr>
                                      <tr><td>Chức vụ:</td><td>${selectedEmpDetail.role}</td><td>CCCD:</td><td>${selectedEmpDetail.citizenId || 'N/A'}</td></tr>
                                      <tr><td>Công trường:</td><td>${getProjectName(selectedEmpDetail.projectId)}</td><td>Hợp đồng:</td><td>${selectedEmpDetail.type === 'Internal' ? 'Cơ hữu' : 'Thời vụ'}</td></tr>
                                    </table>
                                    <table class="payslip-table">
                                      <thead><tr><th>Khoản mục chi tiết</th><th style="text-align: right; width: 150px;">Số tiền (VND)</th><th>Ghi chú</th></tr></thead>
                                      <tbody>
                                        <tr><td>Mức lương thỏa thuận hợp đồng (${bSalaryLabel})</td><td class="amount">${selectedEmpDetail.baseSalary.toLocaleString('vi-VN')}</td><td>Mức lương gốc</td></tr>
                                        <tr><td>${wDaysLabel}</td><td class="amount">${data.daysPresent} ngày</td><td>Chấm công ghi nhận</td></tr>
                                        <tr><td>Số ngày làm thêm giờ (tăng ca)</td><td class="amount">${data.daysOvertime} ngày</td><td>Tính hệ số phụ trội</td></tr>
                                        <tr><td>Khấu trừ đi muộn</td><td class="amount" style="color: #b45309;">${data.daysLate} ngày</td><td>Khấu trừ kỷ luật chuyên cần</td></tr>
                                        <tr class="total-row"><td>Tổng lương phát sinh tháng (Gross)</td><td class="amount">${data.totalEarned.toLocaleString('vi-VN')}</td><td>${data.note}</td></tr>
                                        <tr style="color: #b45309;"><td>- Khấu trừ lương đã tạm ứng trước</td><td class="amount">${data.advances.toLocaleString('vi-VN')}</td><td>Đã nhận tạm ứng</td></tr>
                                        <tr style="color: #1e40af;"><td>- Đã thanh toán lương đợt 1</td><td class="amount">${data.salariesPaid.toLocaleString('vi-VN')}</td><td>Đã thanh toán trước đó</td></tr>
                                        <tr class="net-row"><td>THỰC LĨNH CÒN LẠI (Net Salary)</td><td class="amount">${data.netSalaryPayable.toLocaleString('vi-VN')}</td><td>Thực nhận cuối kỳ</td></tr>
                                      </tbody>
                                    </table>
                                    <div class="signatures">
                                      <div class="sig"><p><strong>NGƯỜI NHẬN LƯƠNG</strong></p><p style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</p><br/><br/><br/><p>${selectedEmpDetail.name}</p></div>
                                      <div class="sig"><p><strong>KẾ TOÁN TRƯỞNG</strong></p><p style="font-size: 11px; font-style: italic;">(Ký và ghi rõ họ tên)</p><br/><br/><br/><p>Ban Tài Chính Kế Toán</p></div>
                                    </div>
                                  </body>
                                </html>
                              `);
                            }
                          }}
                          className="flex-1 sm:flex-none px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-[10px] font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>In Phiếu Lương</span>
                        </button>
                      </div>
                    </div>

                    {/* Stats Panel */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase">TỔNG LƯƠNG PHÁT SINH</span>
                        <div className="text-sm font-black text-slate-800 mt-1 font-mono">{formatVND(data.totalEarned)}</div>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                        <span className="text-[9px] text-amber-700 font-extrabold uppercase">ĐÃ TẠM ỨNG TRƯỚC</span>
                        <div className="text-sm font-black text-amber-700 mt-1 font-mono">{formatVND(data.advances)}</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                        <span className="text-[9px] text-blue-700 font-extrabold uppercase">ĐÃ THANH TOÁN ĐỢT 1</span>
                        <div className="text-sm font-black text-blue-700 mt-1 font-mono">{formatVND(data.salariesPaid)}</div>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        <span className="text-[9px] text-emerald-700 font-extrabold uppercase">THỰC NHẬN CÒN LẠI</span>
                        <div className="text-sm font-black text-emerald-700 mt-1 font-mono">{formatVND(data.netSalaryPayable)}</div>
                      </div>
                    </div>

                    {/* Breakdown Ledger Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <span className="text-[10px] text-slate-500 font-black uppercase">Bảng Kê Hạch Toán Lương Chi Tiết</span>
                      </div>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-200 text-[10px] text-slate-400 font-black uppercase tracking-wider">
                            <th className="px-4 py-3">Khoản Mục Thu Nhập / Diễn Giải</th>
                            <th className="px-4 py-3 text-right">Mức Hạch Toán (VND)</th>
                            <th className="px-4 py-3 text-right">Thực Nhận Tháng T{selectedMonth}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {/* Row: Base salary */}
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-semibold">{baseSalaryLabel}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">Mức lương thỏa thuận quy định trên hợp đồng</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-500">
                              {formatVND(selectedEmpDetail.baseSalary)}
                              <span className="text-[9px] font-normal text-slate-400">/{data.isDailyWage ? 'ngày' : 'tháng'}</span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-400">-</td>
                          </tr>

                          {/* Row: Main Days Present */}
                          <tr className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-semibold">{workDaysLabel}</div>
                              <div className="text-[9px] text-slate-400 mt-0.5">Số ngày công thực tế ghi nhận trên hệ thống</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-500">
                              {data.daysPresent} ngày
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">
                              {data.isDailyWage
                                ? formatVND(data.daysPresent * selectedEmpDetail.baseSalary)
                                : formatVND(data.totalEarned - (data.daysOvertime * 450000) + (data.daysLate * 50000))
                              }
                            </td>
                          </tr>

                          {/* Row: Overtime */}
                          {data.daysOvertime > 0 && (
                            <tr className="hover:bg-slate-50/50">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-purple-700">Phụ trội làm thêm giờ (Tăng ca)</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">Cộng thưởng thêm cho ngày công có ca tối/tăng cường</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-500">
                                {data.isDailyWage ? 'Hệ số 1.5x' : '+450.000đ/ngày'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-purple-700">
                                +{formatVND(data.daysOvertime * (data.isDailyWage ? selectedEmpDetail.baseSalary * 0.5 : 450000))}
                              </td>
                            </tr>
                          )}

                          {/* Row: Late */}
                          {data.daysLate > 0 && (
                            <tr className="hover:bg-slate-50/50 text-amber-700">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-amber-700">Khấu trừ chuyên cần (Đi muộn)</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">Trừ chuyên cần đối với các ngày check-in muộn quá giờ quy định</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-slate-400">
                                {data.isDailyWage ? '-30.000đ/ngày' : '-50.000đ/ngày'}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold">
                                -{formatVND(data.daysLate * (data.isDailyWage ? 30000 : 50000))}
                              </td>
                            </tr>
                          )}

                          {/* Row: Gross Total */}
                          <tr className="bg-slate-50 font-bold text-slate-800">
                            <td className="px-4 py-3">
                              <div className="font-bold text-slate-800">Tổng thu nhập phát sinh (Gross)</div>
                              <div className="text-[9px] text-slate-400 font-normal mt-0.5">{data.note}</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">-</td>
                            <td className="px-4 py-3 text-right font-mono font-extrabold text-blue-700">
                              {formatVND(data.totalEarned)}
                            </td>
                          </tr>

                          {/* Row: Advances */}
                          {data.advances > 0 && (
                            <tr className="hover:bg-slate-50/50 text-amber-800">
                              <td className="px-4 py-3">
                                <div className="font-semibold">Đã tạm ứng trước</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">Các khoản tiền mặt / chuyển khoản tạm ứng giữa tháng</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono">-</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                                -{formatVND(data.advances)}
                              </td>
                            </tr>
                          )}

                          {/* Row: Paid already */}
                          {data.salariesPaid > 0 && (
                            <tr className="hover:bg-slate-50/50 text-blue-800">
                              <td className="px-4 py-3">
                                <div className="font-semibold">Đã thanh toán trước đó</div>
                                <div className="text-[9px] text-slate-400 mt-0.5">Hạch toán giải ngân một phần lương của kỳ hạch toán</div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono">-</td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">
                                -{formatVND(data.salariesPaid)}
                              </td>
                            </tr>
                          )}

                          {/* Row: Net Salary Payable */}
                          <tr className="bg-emerald-50/80 font-bold text-emerald-800 text-sm">
                            <td className="px-4 py-3">
                              <div className="font-black">THỰC LĨNH CÒN LẠI (Net Payable)</div>
                              <div className="text-[9px] text-emerald-600 font-normal mt-0.5">Kế toán thanh toán hết dư nợ lương khi lập phiếu chi cuối tháng</div>
                            </td>
                            <td className="px-4 py-3 text-right font-mono">-</td>
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">
                              {formatVND(data.netSalaryPayable)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEmpDetail(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE ATTENDANCE SCANNER SYSTEM */}
      {showQrScanModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden animate-scale-up">

            {/* Header */}
            <div className="bg-purple-900 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <QrCode className="w-5 h-5 text-purple-400" />
                <span>Hệ Thống Quét Mã QR Điểm Danh Chấm Công</span>
              </h3>
              <button
                onClick={() => {
                  setShowQrScanModal(false);
                  setScannedResult(null);
                  setQrScanEmpId('');
                }}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">

              {/* Virtual Scanner Viewfinder */}
              <div className="h-44 bg-slate-950 rounded-xl overflow-hidden flex flex-col items-center justify-center border-2 border-slate-800 relative shadow-inner">
                {/* Scanner Laser beam simulation */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 animate-bounce shadow-[0_0_10px_rgba(239,68,68,1)]"></div>

                {/* Scanning overlay framing */}
                <div className="w-32 h-32 border-2 border-purple-500/30 rounded-lg flex items-center justify-center relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500"></div>
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500"></div>
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500"></div>
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500"></div>

                  {scannedResult ? (
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 animate-pulse" />
                  ) : (
                    <QrCode className="w-12 h-12 text-slate-700 animate-pulse" />
                  )}
                </div>

                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase mt-2">
                  {scannedResult ? 'QUÉT THÀNH CÔNG (READY)' : 'ĐANG CHỜ ĐỌC MÃ QR CODE...'}
                </span>
              </div>

              {/* Selector to Simulate scanning */}
              <div className="space-y-1.5 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wide block">
                  Giả Lập Thiết Bị Đọc Thẻ QR Nhân Viên
                </label>
                <div className="flex gap-2">
                  <select
                    value={qrScanEmpId}
                    onChange={(e) => {
                      const empId = e.target.value;
                      setQrScanEmpId(empId);
                      const selectedEmp = employees.find(emp => emp.id === empId);
                      if (selectedEmp) {
                        setScannedResult(JSON.stringify({
                          id: selectedEmp.id,
                          name: selectedEmp.name,
                          citizenId: selectedEmp.citizenId || ''
                        }));
                      } else {
                        setScannedResult(null);
                      }
                    }}
                    className="flex-1 border border-slate-300 rounded-lg text-xs py-2 px-3 bg-white font-medium shadow-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="">-- Chọn nhân viên để quét thẻ --</option>
                    {employees.filter(e => e.active).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.id} - {emp.name} ({emp.role}) - {emp.citizenId ? `CCCD: ${emp.citizenId}` : 'Chưa có CCCD'}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * Hệ thống sẽ tự động chuyển đổi thông tin thẻ của nhân viên đã chọn thành mã quét QR tại cổng bảo vệ.
                </p>
              </div>

              {/* Scanned Decoded Result Area */}
              {scannedResult && (
                (() => {
                  const emp = employees.find(e => e.id === qrScanEmpId);
                  if (!emp) return null;
                  return (
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                      {/* Decoded Header */}
                      <div className="bg-emerald-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-emerald-800">
                        <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Dữ Liệu Thẻ Giải Mã Hợp Lệ</span>
                        </span>
                        <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
                          {emp.id}
                        </span>
                      </div>

                      {/* Decoded Body */}
                      <div className="p-4 grid grid-cols-2 gap-4 text-xs font-semibold">
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Họ và Tên</span>
                          <span className="text-slate-800 text-sm font-bold">{emp.name}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Số CCCD / CMND</span>
                          <span className="text-slate-800 font-mono font-bold">{emp.citizenId || 'Không có dữ liệu'}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Chức vụ / Công việc</span>
                          <span className="text-slate-700">{emp.role}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Đơn vị công trường</span>
                          <span className="text-slate-700 truncate">{getProjectName(emp.projectId)}</span>
                        </div>
                      </div>

                      {/* Check-In Controls for Scanning Simulation */}
                      <div className="border-t border-slate-100 p-4 bg-slate-50/50 grid grid-cols-3 gap-2.5">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Giờ Vào Chợt</label>
                          <input
                            type="time"
                            value={qrScanTime}
                            onChange={(e) => setQrScanTime(e.target.value)}
                            className="w-full border border-slate-200 rounded px-2 py-1 bg-white text-xs text-center font-bold font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Giờ Ra Chợt</label>
                          <input
                            type="time"
                            value={qrScanOutTime}
                            onChange={(e) => setQrScanOutTime(e.target.value)}
                            className="w-full border border-slate-200 rounded px-2 py-1 bg-white text-xs text-center font-bold font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">Phân loại</label>
                          <select
                            value={qrScanStatus}
                            onChange={(e) => setQrScanStatus(e.target.value as any)}
                            className="w-full border border-slate-200 rounded px-2 py-1 bg-white text-xs text-center font-bold"
                          >
                            <option value="Present">Đúng Giờ</option>
                            <option value="Late">Đi Muộn</option>
                            <option value="Overtime">Tăng Ca</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}

            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 flex gap-2 justify-end border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowQrScanModal(false);
                  setScannedResult(null);
                  setQrScanEmpId('');
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
              >
                Hủy bỏ
              </button>

              {scannedResult && (
                <button
                  type="button"
                  onClick={handleQrCheckInConfirm}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-200 animate-pulse-once"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận & Chấm công</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
