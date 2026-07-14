import React, { useState, useMemo } from 'react';
import { Project, FinancialTransaction, InventoryLedger, Timesheet, Equipment, CompanyConfig, UserRole } from '../types';
import {
  BookOpen, Search, Filter, Calendar, PlusCircle, ArrowUpDown,
  Download, RefreshCw, FileSpreadsheet, CheckCircle2, TrendingUp,
  TrendingDown, Coins, AlertCircle
} from 'lucide-react';

// Vietnamese Standard Chart of Accounts (Hệ thống tài khoản Thông tư 200)
export const CHART_OF_ACCOUNTS: Record<string, string> = {
  '1111': 'Tiền mặt tại quỹ (VND)',
  '1121': 'Tiền gửi Ngân hàng (VND)',
  '131': 'Phải thu của khách hàng (Chủ đầu tư)',
  '141': 'Tạm ứng cho nhân viên công trường',
  '152': 'Nguyên vật liệu (Sắt, thép, xi măng, cát, đá...)',
  '153': 'Công cụ, dụng cụ (máy khoan, búa, đồ bảo hộ...)',
  '211': 'Tài sản cố định hữu hình (Cần cẩu, máy xúc xích...)',
  '2141': 'Hao mòn tài sản cố định hữu hình (Khấu hao)',
  '331': 'Phải trả cho người bán (Nhà thầu phụ/Nhà cung cấp)',
  '334': 'Phải trả người lao động (Lương nhân sự)',
  '338': 'Phải trả khác (BHXH, BHYT công trường)',
  '511': 'Doanh thu bán hàng và cung cấp dịch vụ (Doanh thu xây lắp)',
  '621': 'Chi phí nguyên liệu, vật liệu trực tiếp (Định mức móng/thân)',
  '622': 'Chi phí nhân công trực tiếp (Lương đội thợ nề/cốt thép)',
  '627': 'Chi phí sản xuất chung (Thuê máy, xăng dầu, thầu phụ)',
  '642': 'Chi phí quản lý doanh nghiệp (Ban điều hành/Khấu hao văn phòng)'
};

export interface JournalRow {
  id: string;
  postingDate: string; // Ngày hạch toán
  voucherNo: string; // Số chứng từ
  voucherDate: string; // Ngày chứng từ
  description: string; // Diễn giải
  debitAccount: string; // TK Nợ
  creditAccount: string; // TK Có
  amount: number; // Số tiền
  projectName?: string; // Tên công trình
  sourceModule: 'Warehouse' | 'HR' | 'Liabilities' | 'Equipment' | 'Manual';
  referenceId?: string;
}

interface JournalManagerProps {
  projects: Project[];
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  inventoryLedger?: InventoryLedger[];
  timesheets?: Timesheet[];
  equipment?: Equipment[];
  companyConfig?: CompanyConfig;
  userRole?: UserRole;
}

export default function JournalManager({
  projects,
  transactions,
  setTransactions,
  inventoryLedger = [],
  companyConfig,
  userRole
}: JournalManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Manual extra journal entries state to support adding direct double-entries
  const [manualEntries, setManualEntries] = useState<JournalRow[]>([
    {
      id: 'me-1',
      postingDate: '2026-07-01',
      voucherNo: 'PKH-001',
      voucherDate: '2026-07-01',
      description: 'Khấu hao định kỳ tháng 6 máy xúc Komatsu PC200',
      debitAccount: '627',
      creditAccount: '2141',
      amount: 4500000,
      projectName: 'Chung cư cao cấp Green River',
      sourceModule: 'Equipment',
    },
    {
      id: 'me-2',
      postingDate: '2026-07-02',
      voucherNo: 'PC-088',
      voucherDate: '2026-07-02',
      description: 'Mua bổ sung 10 bộ đàm cầm tay Kenwood cho ban chỉ huy',
      debitAccount: '153',
      creditAccount: '1111',
      amount: 6500000,
      projectName: 'Cầu vượt nút giao Tân Sơn Nhất',
      sourceModule: 'Equipment',
    }
  ]);

  // Form states for manual double entry modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPostingDate, setNewPostingDate] = useState(new Date().toISOString().split('T')[0]);
  const [newVoucherNo, setNewVoucherNo] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDebitAcc, setNewDebitAcc] = useState('621');
  const [newCreditAcc, setNewCreditAcc] = useState('1111');
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newProject, setNewProject] = useState('');

  // Toast alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Auto-generate accounting journal entries dynamically from central business transactions!
  // This maintains absolute single source of truth (ACID Compliance)
  const derivedJournalRows = useMemo(() => {
    const rows: JournalRow[] = [];

    // Map Financial Transactions (Revenue & Expenses)
    transactions.forEach(tx => {
      const proj = projects.find(p => p.id === tx.projectId);
      const projName = proj ? proj.name : 'Chi phí chung';

      if (tx.type === 'Revenue') {
        // Revenue Double Entry:
        // Nợ TK 1121 (Tiền ngân hàng) / Có TK 511 (Doanh thu xây lắp)
        rows.push({
          id: `row-dr-${tx.id}`,
          postingDate: tx.date,
          voucherNo: tx.referenceId || `PT-${tx.id.replace(/\D/g, '') || '091'}`,
          voucherDate: tx.date,
          description: tx.description,
          debitAccount: '1121',
          creditAccount: '511',
          amount: tx.amount,
          projectName: projName,
          sourceModule: 'Liabilities',
          referenceId: tx.id
        });
      } else {
        // Expense Double Entries based on categories
        let debit = '627'; // Default production overhead
        let credit = '331'; // Default Phải trả NCC/Thầu phụ

        if (tx.category === 'Material') {
          debit = '621'; // Chi phí NVL trực tiếp
          credit = '331';
        } else if (tx.category === 'Labor') {
          debit = '622'; // Chi phí nhân công trực tiếp
          credit = '334'; // Lương nhân công
        } else if (tx.category === 'Equipment') {
          debit = '627'; // Máy thi công
          credit = '1111'; // Thanh toán tiền mặt/xăng dầu
        } else if (tx.category === 'Subcontractor') {
          debit = '627'; // Chi phí thầu phụ
          credit = '331'; // Phải trả thầu phụ
        } else if (tx.category === 'Overhead') {
          debit = '642'; // Chi phí quản lý chung công trường
          credit = '1111';
        }

        rows.push({
          id: `row-cr-${tx.id}`,
          postingDate: tx.date,
          voucherNo: tx.referenceId || `PC-${tx.id.replace(/\D/g, '') || '012'}`,
          voucherDate: tx.date,
          description: tx.description,
          debitAccount: debit,
          creditAccount: credit,
          amount: tx.amount,
          projectName: projName,
          sourceModule: tx.category === 'Material' ? 'Warehouse' : (tx.category === 'Labor' ? 'HR' : 'Liabilities'),
          referenceId: tx.id
        });
      }
    });

    // Map Warehouse Stock Ledgers that don't have matching direct cash payment (like internal construction issue)
    // Internal warehouse issues represent: Nợ 621 (Chi phí NVL trực tiếp) / Có 152 (Nguyên vật liệu)
    inventoryLedger.forEach(ledger => {
      if (ledger.type === 'Issue') {
        const proj = projects.find(p => p.id === ledger.projectId);
        const projName = proj ? proj.name : 'Ban ';
        const rawItemName = ledger.sourceOrDestination || 'Cấp phát vật tư';

        rows.push({
          id: `row-ledger-${ledger.id}`,
          postingDate: ledger.date,
          voucherNo: `PXK-${ledger.id.replace(/\D/g, '').substring(0, 5) || '921'}`,
          voucherDate: ledger.date,
          description: `Xuất kho nguyên vật liệu cho công trình: ${rawItemName}`,
          debitAccount: '621',
          creditAccount: '152',
          amount: ledger.quantity * ledger.unitPrice,
          projectName: projName,
          sourceModule: 'Warehouse',
          referenceId: ledger.id
        });
      } else if (ledger.type === 'Receipt' && !ledger.sourceOrDestination.includes('Sau phê duyệt')) {
        // Direct warehouse receipt (not from approved PO triggers already mapped in transactions)
        // Nợ 152 (Nguyên vật liệu) / Có 331 (Phải trả nhà cung cấp)
        const proj = projects.find(p => p.id === ledger.projectId);
        const projName = proj ? proj.name : 'Kho ';

        rows.push({
          id: `row-ledger-rec-${ledger.id}`,
          postingDate: ledger.date,
          voucherNo: `PNK-${ledger.id.replace(/\D/g, '').substring(0, 5) || '714'}`,
          voucherDate: ledger.date,
          description: `Nhập kho nguyên vật liệu từ ${ledger.sourceOrDestination}`,
          debitAccount: '152',
          creditAccount: '331',
          amount: ledger.quantity * ledger.unitPrice,
          projectName: projName,
          sourceModule: 'Warehouse',
          referenceId: ledger.id
        });
      }
    });

    // Combine derived rows and user's manual rows
    return [...rows, ...manualEntries].sort((a, b) => new Date(b.postingDate).getTime() - new Date(a.postingDate).getTime());
  }, [transactions, inventoryLedger, manualEntries, projects]);

  // Handle saving direct manual accounting entry (Bút toán kép)
  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherNo || !newDescription || newAmount <= 0) {
      alert('Vui lòng điền đầy đủ Số chứng từ, Diễn giải và Số tiền lớn hơn 0!');
      return;
    }

    const uniqueId = `me-${Date.now()}`;
    const newRow: JournalRow = {
      id: uniqueId,
      postingDate: newPostingDate,
      voucherNo: newVoucherNo.toUpperCase(),
      voucherDate: newPostingDate,
      description: newDescription,
      debitAccount: newDebitAcc,
      creditAccount: newCreditAcc,
      amount: newAmount,
      projectName: newProject || 'Chi phí dùng chung',
      sourceModule: 'Manual',
    };

    // Add to journal entries list
    setManualEntries(prev => [newRow, ...prev]);

    // Integrate with central transactions to update P&L dashboard dynamically!
    // If we debit an expense account (621, 622, 627, 642), write as central "Expense"
    // If we credit 511, write as central "Revenue"
    const isExpense = ['621', '622', '627', '642'].includes(newDebitAcc);
    const isRevenue = newCreditAcc === '511';

    if (isExpense || isRevenue) {
      const matchProjObj = projects.find(p => p.name === newProject);
      const newTx: FinancialTransaction = {
        id: `tx-me-${Date.now()}`,
        projectId: matchProjObj ? matchProjObj.id : 'proj-1', // Fallback
        type: isRevenue ? 'Revenue' : 'Expense',
        category: newDebitAcc === '621' ? 'Material' : (newDebitAcc === '622' ? 'Labor' : (newDebitAcc === '627' ? 'Equipment' : 'Overhead')),
        amount: newAmount,
        description: `Bút toán ${newVoucherNo}: ${newDescription}`,
        date: newPostingDate,
        referenceId: newVoucherNo
      };
      setTransactions(prev => [newTx, ...prev]);
    }

    setShowAddModal(false);
    showToast(`Đã hạch toán thành công bút toán kép ${newVoucherNo}!`);

    // Reset Form
    setNewVoucherNo('');
    setNewDescription('');
    setNewAmount(0);
    setNewProject('');
  };

  // Export to simple CSV file
  const handleExportCSV = () => {
    const headers = ['Ngày Hạch Toán', 'Số Chứng Từ', 'Diễn Giải', 'Tài Khoản Nợ', 'Tài Khoản Có', 'Số Tiền (VND)', 'Công Trình Liên Kết', 'Nghiệp Vụ'];
    const csvRows = filteredRows.map(row => [
      row.postingDate,
      row.voucherNo,
      `"${row.description.replace(/"/g, '""')}"`,
      row.debitAccount,
      row.creditAccount,
      row.amount,
      `"${row.projectName || ''}"`,
      row.sourceModule
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF'
      + [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `So_Nhat_Ky_Chung_Ke_Toan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Xuất thành công sổ Nhật ký chung ra định dạng CSV!');
  };

  // Export to beautifully styled Excel (S03a-DN Thông tư 200 format)
  const handleExportExcel = () => {
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    const periodStr = startDate && endDate
      ? `Từ ngày ${startDate.split('-').reverse().join('/')} đến ngày ${endDate.split('-').reverse().join('/')}`
      : `Kỳ báo cáo: Năm ${today.getFullYear()}`;

    const cName = companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT';
    const sOffice = companyConfig?.siteOffice || 'Ban điều hành - Dự án cao tốc Bắc Nam';
    const jTitle = companyConfig?.journalTitle || 'SỔ NHẬT KÝ CHUNG';
    const treasurerName = companyConfig?.treasurerName || 'Kế toán viên ';
    const chiefAccountant = companyConfig?.chiefAccountantName || 'Nguyễn Thị Thanh Hà';
    const directorName = companyConfig?.directorName || 'Giám đốc Đỗ Minh Tuấn';

    // Header metadata and titles in HTML Excel Spreadsheet format
    let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
<!--[if gte mso 9]>
<xml>
 <x:ExcelWorkbook>
  <x:ExcelWorksheets>
   <x:ExcelWorksheet>
    <x:Name>Sổ Nhật Ký Chung (S03a-DN)</x:Name>
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
  .org-addr { font-size: 10pt; font-weight: normal; color: #475569; }
  .form-code { font-size: 10pt; font-weight: bold; text-align: right; }
  .form-regulation { font-size: 8.5pt; font-style: italic; font-weight: normal; text-align: right; }
  .title { font-size: 16pt; font-weight: bold; text-align: center; margin-top: 15px; text-transform: uppercase; }
  .period { font-size: 11pt; font-style: italic; text-align: center; margin-bottom: 20px; }
  .currency { font-size: 10pt; font-style: italic; text-align: right; margin-bottom: 5px; }

  table { border-collapse: collapse; width: 100%; margin-top: 5px; }
  th { border: 1px solid #000000; padding: 8px 4px; font-size: 10pt; font-weight: bold; text-align: center; background-color: #cbd5e1; }
  td { border: 1px solid #000000; padding: 6px 4px; font-size: 10pt; }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .text-left { text-align: left; }
  .font-bold { font-weight: bold; }
  .font-italic { font-style: italic; }
  .bg-total { background-color: #f1f5f9; font-weight: bold; }

  .signature-table { width: 100%; margin-top: 40px; border: none; }
  .signature-table td { border: none; text-align: center; font-size: 10.5pt; padding-top: 5px; }
  .sig-title { font-weight: bold; }
  .sig-sub { font-style: italic; font-size: 9pt; color: #475569; }
  .sig-space { height: 75px; }
</style>
</head>
<body>

<table style="width:100%; border:none; border-collapse:collapse; margin-bottom: 10px;">
  <tr style="border:none;">
    <td style="width:60%; border:none;" class="text-left">
      <div class="org-name">${cName}</div>
      <div class="org-addr">${sOffice}</div>
    </td>
    <td style="width:40%; border:none;" class="text-right">
      <div class="form-code">Mẫu số S03a-DN</div>
      <div class="form-regulation">(Ban hành theo Thông tư số 200/2014/TT-BTC<br/>ngày 22/12/2014 của Bộ Tài chính)</div>
    </td>
  </tr>
</table>

<div class="title">${jTitle}</div>
<div class="period">${periodStr}</div>
<div class="currency">Đơn vị tiền tệ: Đồng Việt Nam (VND)</div>

<table>
  <thead>
    <tr>
      <th rowspan="2" style="width: 80px;">Ngày ghi sổ</th>
      <th colspan="2">Chứng từ</th>
      <th rowspan="2" style="width: 280px;">Diễn giải nghiệp vụ</th>
      <th rowspan="2" style="width: 80px;">Đã ghi Sổ Cái</th>
      <th rowspan="2" style="width: 60px;">STT dòng</th>
      <th rowspan="2" style="width: 80px;">Số hiệu tài khoản</th>
      <th colspan="2">Số phát sinh (VND)</th>
      <th rowspan="2" style="width: 140px;">Công trình liên kết</th>
      <th rowspan="2" style="width: 90px;">Phân hệ gốc</th>
    </tr>
    <tr>
      <th style="width: 80px;">Số hiệu</th>
      <th style="width: 80px;">Ngày</th>
      <th style="width: 100px;">Nợ</th>
      <th style="width: 100px;">Có</th>
    </tr>
    <tr class="bg-total text-center" style="font-size: 9pt;">
      <td>A</td>
      <td>B</td>
      <td>C</td>
      <td>D</td>
      <td>E</td>
      <td>F</td>
      <td>G</td>
      <td>1</td>
      <td>2</td>
      <td>H</td>
      <td>I</td>
    </tr>
  </thead>
  <tbody>
`;

    let runningIndex = 1;
    let sumDebit = 0;
    let sumCredit = 0;

    filteredRows.forEach((row) => {
      const formattedPostDate = row.postingDate.split('-').reverse().join('/');
      const formattedVoucherDate = row.voucherDate.split('-').reverse().join('/');

      // Debit Row
      html += `
    <tr>
      <td class="text-center">${formattedPostDate}</td>
      <td class="text-center font-bold">${row.voucherNo}</td>
      <td class="text-center">${formattedVoucherDate}</td>
      <td>${row.description}</td>
      <td class="text-center">x</td>
      <td class="text-center font-mono">${runningIndex}</td>
      <td class="text-center font-bold">${row.debitAccount}</td>
      <td class="text-right font-bold">${row.amount.toLocaleString('vi-VN')}</td>
      <td class="text-right font-mono" style="color:#94a3b8;">-</td>
      <td>${row.projectName || 'Chi phí chung'}</td>
      <td class="text-center font-italic" style="font-size: 9pt;">${row.sourceModule}</td>
    </tr>
      `;
      runningIndex++;

      // Credit Row
      html += `
    <tr>
      <td class="text-center" style="color:#94a3b8;">${formattedPostDate}</td>
      <td class="text-center font-bold" style="color:#94a3b8;">${row.voucherNo}</td>
      <td class="text-center" style="color:#94a3b8;">${formattedVoucherDate}</td>
      <td style="padding-left: 20px;" class="font-italic text-slate-500">${row.description} (Ghi Có)</td>
      <td class="text-center">x</td>
      <td class="text-center font-mono">${runningIndex}</td>
      <td class="text-center font-bold" style="padding-left: 15px;">${row.creditAccount}</td>
      <td class="text-right font-mono" style="color:#94a3b8;">-</td>
      <td class="text-right font-bold">${row.amount.toLocaleString('vi-VN')}</td>
      <td>${row.projectName || 'Chi phí chung'}</td>
      <td class="text-center font-italic" style="font-size: 9pt;">${row.sourceModule}</td>
    </tr>
      `;
      runningIndex++;

      sumDebit += row.amount;
      sumCredit += row.amount;
    });

    // Subtotal Row
    html += `
    <tr class="bg-total">
      <td colspan="5" class="text-right font-bold" style="font-size: 10pt; text-transform: uppercase;">Tổng cộng phát sinh tháng này:</td>
      <td class="text-center font-mono">${runningIndex - 1}</td>
      <td></td>
      <td class="text-right font-bold" style="border-bottom: 3px double #000;">${sumDebit.toLocaleString('vi-VN')}</td>
      <td class="text-right font-bold" style="border-bottom: 3px double #000;">${sumCredit.toLocaleString('vi-VN')}</td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>

<table class="signature-table" style="width:100%; border:none; margin-top:30px;">
  <tr style="border:none;">
    <td colspan="4" style="border:none;"></td>
    <td colspan="7" class="font-italic text-center" style="border:none; padding-bottom: 10px;">Lập ngày ${dateStr} tại Ban điều hành </td>
  </tr>
  <tr style="border:none;">
    <td colspan="3" style="border:none; text-align:center; width:25%;">
      <div class="sig-title">Người lập biểu</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div class="font-bold">${treasurerName}</div>
    </td>
    <td colspan="4" style="border:none; text-align:center; width:35%;">
      <div class="sig-title">Kế toán trưởng</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-space"></div>
      <div class="font-bold">${chiefAccountant}</div>
    </td>
    <td colspan="4" style="border:none; text-align:center; width:40%;">
      <div class="sig-title">Chỉ huy trưởng công trường</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên, đóng dấu)</div>
      <div class="sig-space"></div>
      <div class="font-bold">${directorName}</div>
    </td>
  </tr>
</table>

</body>
</html>
    `;

    // Convert string to blob with UTF-8 encoding
    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `So_Nhat_Ky_Chung_S03a-DN_Thong_Tu_200_${today.getFullYear()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất thành công Sổ Nhật ký chung chuẩn Mẫu S03a-DN (.xls)!');
  };

  // Filtering Rows based on user inputs
  const filteredRows = useMemo(() => {
    return derivedJournalRows.filter(row => {
      // Search Box Filter
      const searchLower = searchQuery.toLowerCase();
      const matchSearch =
        row.description.toLowerCase().includes(searchLower) ||
        row.voucherNo.toLowerCase().includes(searchLower) ||
        row.debitAccount.includes(searchQuery) ||
        row.creditAccount.includes(searchQuery);

      // Project Filter
      const matchProject = selectedProject === 'all' || row.projectName === selectedProject;

      // Module Source Filter
      const matchModule = selectedModule === 'all' || row.sourceModule === selectedModule;

      // Account Filter
      const matchAccount = selectedAccount === 'all' || row.debitAccount === selectedAccount || row.creditAccount === selectedAccount;

      // Date Range Filter
      const matchStart = !startDate || new Date(row.postingDate) >= new Date(startDate);
      const matchEnd = !endDate || new Date(row.postingDate) <= new Date(endDate);

      return matchSearch && matchProject && matchModule && matchAccount && matchStart && matchEnd;
    });
  }, [derivedJournalRows, searchQuery, selectedProject, selectedModule, selectedAccount, startDate, endDate]);

  // Aggregate Key stats from ledger
  const journalStats = useMemo(() => {
    let totalDebitAmt = 0;
    let totalCreditAmt = 0;
    let materialExpense = 0;
    let laborExpense = 0;
    let constructionOverhead = 0;

    filteredRows.forEach(row => {
      totalDebitAmt += row.amount;
      totalCreditAmt += row.amount; // Balance check always matches in double-entry!

      if (row.debitAccount === '621') materialExpense += row.amount;
      if (row.debitAccount === '622') laborExpense += row.amount;
      if (row.debitAccount === '627') constructionOverhead += row.amount;
    });

    return {
      totalDebitAmt,
      totalCreditAmt,
      materialExpense,
      laborExpense,
      constructionOverhead
    };
  }, [filteredRows]);

  return (
    <div className="space-y-6" id="journal-manager-root">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-xl font-bold flex items-center gap-2 text-xs border border-emerald-500 animate-slide-in">
          <CheckCircle2 className="w-4 h-4 text-white" />
          {toastMessage}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-3 right-3 opacity-10">
            <BookOpen className="w-16 h-16" />
          </div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">TỔNG PHÁT SINH NỢ / CÓ</p>
          <h2 className="text-xl font-black font-mono text-blue-400 mt-2">
            {journalStats.totalDebitAmt.toLocaleString('vi-VN')} ₫
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-extrabold mt-3">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span>KẾT TOÁN CÂN ĐỐI (DỰ PHÒNG CHỐNG THẤT THOÁT)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">TK 621 • CHI PHÍ VẬT TƯ TT</p>
          <h2 className="text-xl font-black font-mono text-slate-800 mt-2">
            {journalStats.materialExpense.toLocaleString('vi-VN')} ₫
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] text-rose-500 font-semibold mt-3">
            <TrendingUp className="w-3 h-3 text-rose-500" />
            <span>Chi phí hạch toán thực tế </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">TK 622 • CHI PHÍ NHÂN CÔNG</p>
          <h2 className="text-xl font-black font-mono text-slate-800 mt-2">
            {journalStats.laborExpense.toLocaleString('vi-VN')} ₫
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-semibold mt-3">
            <Coins className="w-3 h-3 text-emerald-600" />
            <span>Chi lương công nhân & thợ hồ</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">TK 627 • SẢN XUẤT CHUNG (MÁY / THẦU)</p>
          <h2 className="text-xl font-black font-mono text-slate-800 mt-2">
            {journalStats.constructionOverhead.toLocaleString('vi-VN')} ₫
          </h2>
          <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-semibold mt-3">
            <TrendingDown className="w-3 h-3 text-indigo-600" />
            <span>Phân bổ chi phí máy thi công / bảo dưỡng</span>
          </div>
        </div>

      </div>

      {/* Filter Toolbar Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">

          {/* Left search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm chứng từ, diễn giải, số TK (ví dụ: PC-001, 1111, Sắt thép)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder:text-slate-400"
            />
          </div>

          {/* Right action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow-sm transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-blue-100" />
              LẬP BÚT TOÁN THỦ CÔNG
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black shadow-sm transition-colors cursor-pointer"
              title="Xuất Sổ Nhật Ký Chung chuẩn Mẫu S03a-DN ban hành theo Thông tư 200"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              XUẤT SỔ KẾ TOÁN CHUẨN (EXCEL)
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Xuất bảng hạch toán dạng phẳng (.CSV)"
            >
              <Download className="w-4 h-4 text-slate-400" />
              DỮ LIỆU PHẲNG (.CSV)
            </button>
          </div>

        </div>

        {/* Detailed Dropdown Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-3 border-t border-slate-100 text-[10px] font-bold text-slate-500">

          <div>
            <label className="block mb-1.5 text-slate-400 uppercase tracking-widest">Dự án công trình</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              <option value="all">-- Tất cả công trình --</option>
              {projects.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400 uppercase tracking-widest">Nghiệp vụ gốc</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              <option value="all">-- Tất cả nghiệp vụ --</option>
              <option value="Warehouse">Vật tư & Kho bãi (Warehouse)</option>
              <option value="HR">Nhân sự & Chấm công (HR)</option>
              <option value="Liabilities">Công nợ & Thầu phụ (Liabilities)</option>
              <option value="Equipment">Thiết bị & Dụng cụ (Equipment)</option>
              <option value="Manual">Bút toán thủ công (Manual)</option>
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400 uppercase tracking-widest">Lọc theo số TK</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold"
            >
              <option value="all">-- Tất cả tài khoản --</option>
              {Object.keys(CHART_OF_ACCOUNTS).map(acc => (
                <option key={acc} value={acc}>{acc} - {CHART_OF_ACCOUNTS[acc]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-slate-400 uppercase tracking-widest">Từ ngày hạch toán</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold"
            />
          </div>

          <div className="col-span-2 md:col-span-1">
            <label className="block mb-1.5 text-slate-400 uppercase tracking-widest">Đến ngày hạch toán</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 text-xs font-semibold"
            />
          </div>

        </div>

      </div>

      {/* Sổ Nhật Ký Chung Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Table Title and Metadata */}
        <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-black uppercase tracking-wider">
              Sổ Nhật Ký Chung Kế Toán • Thông Tư 200/2014/TT-BTC
            </h3>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1 rounded text-[10px] font-extrabold text-blue-400 uppercase tracking-wider">
            <span>Hiển thị {filteredRows.length} dòng định khoản</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 w-28">Ngày hạch toán</th>
                <th className="py-3 px-4 w-28">Số chứng từ</th>
                <th className="py-3 px-4 w-24">Ngày chứng từ</th>
                <th className="py-3 px-4 min-w-[200px]">Diễn giải nghiệp vụ</th>
                <th className="py-3 px-3 text-center w-20">Nợ TK</th>
                <th className="py-3 px-3 text-center w-20">Có TK</th>
                <th className="py-3 px-4 text-right w-36">Số tiền phát sinh</th>
                <th className="py-3 px-4 w-44">Công trình liên kết</th>
                <th className="py-3 px-3 text-center w-24">Nghiệp vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-medium">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Không tìm thấy dữ liệu hạch toán kế toán nào thỏa mãn điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  let badgeColor = 'bg-slate-100 text-slate-700';
                  if (row.sourceModule === 'Warehouse') badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                  if (row.sourceModule === 'HR') badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                  if (row.sourceModule === 'Liabilities') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                  if (row.sourceModule === 'Equipment') badgeColor = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                  if (row.sourceModule === 'Manual') badgeColor = 'bg-purple-50 text-purple-700 border border-purple-200';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {row.postingDate}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-red-600 whitespace-nowrap">
                        {row.voucherNo}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {row.voucherDate}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-medium max-w-sm truncate" title={row.description}>
                        {row.description}
                      </td>

                      {/* Debit Account */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className="font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700 cursor-help"
                          title={CHART_OF_ACCOUNTS[row.debitAccount] || 'Tài khoản chưa định nghĩa'}
                        >
                          {row.debitAccount}
                        </span>
                      </td>

                      {/* Credit Account */}
                      <td className="py-3.5 px-3 text-center">
                        <span
                          className="font-mono px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700 cursor-help"
                          title={CHART_OF_ACCOUNTS[row.creditAccount] || 'Tài khoản chưa định nghĩa'}
                        >
                          {row.creditAccount}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-black text-slate-950">
                        {row.amount.toLocaleString('vi-VN')} ₫
                      </td>

                      {/* Project Link */}
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={row.projectName}>
                        {row.projectName}
                      </td>

                      {/* Module Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                          {row.sourceModule === 'Manual' ? 'Thủ công' : (row.sourceModule === 'Warehouse' ? 'Kho bãi' : (row.sourceModule === 'HR' ? 'Nhân sự' : (row.sourceModule === 'Liabilities' ? 'Công nợ' : 'Thiết bị')))}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MODAL: ADD MANUAL DOUBLE ENTRY */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-400" />
                Hạch toán bút toán kép thủ công mới (Thông tư 200)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveManualEntry} className="p-6 space-y-4 text-xs font-semibold">

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Mã chứng từ *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PKH-003, PC-099"
                    value={newVoucherNo}
                    onChange={(e) => setNewVoucherNo(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono text-red-600 font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Ngày hạch toán *</label>
                  <input
                    type="date"
                    required
                    value={newPostingDate}
                    onChange={(e) => setNewPostingDate(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Diễn giải nội dung nghiệp vụ *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Trích lập chi phí chung bảo dưỡng máy móc tháng 6"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Hạch toán Nợ (Debit Account) *</label>
                  <select
                    value={newDebitAcc}
                    onChange={(e) => setNewDebitAcc(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  >
                    {Object.keys(CHART_OF_ACCOUNTS).map(acc => (
                      <option key={`deb-${acc}`} value={acc}>{acc} - {CHART_OF_ACCOUNTS[acc]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Hạch toán Có (Credit Account) *</label>
                  <select
                    value={newCreditAcc}
                    onChange={(e) => setNewCreditAcc(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 font-mono font-bold"
                  >
                    {Object.keys(CHART_OF_ACCOUNTS).map(acc => (
                      <option key={`cred-${acc}`} value={acc}>{acc} - {CHART_OF_ACCOUNTS[acc]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Số tiền (VND) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15000000"
                    value={newAmount || ''}
                    onChange={(e) => setNewAmount(Number(e.target.value))}
                    className="w-full p-2.5 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Dự án áp chi phí</label>
                  <select
                    value={newProject}
                    onChange={(e) => setNewProject(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="">Không phân bổ (Chi phí chung)</option>
                    {projects.map(p => (
                      <option key={`proj-opt-${p.id}`} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg shadow-sm"
                >
                  GHI SỔ HẠCH TOÁN
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
