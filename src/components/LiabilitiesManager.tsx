/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Project, Contractor, Contract, FinancialTransaction, CompanyConfig, UserRole } from '../types';
import { normalizeBusinessId } from '../lib/businessIds';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Building2,
  Handshake,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  FileText,
  Check,
  AlertCircle,
  Filter,
  DollarSign,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Briefcase,
  Users,
  Printer,
  Download,
  Trash2,
  Eye
} from 'lucide-react';

export interface AccountingVoucher {
  id: string;
  type: 'Receipt' | 'Payment'; // Receipt = Phiếu Thu, Payment = Phiếu Chi
  templateType: string; // "Thông tư 200/2014/TT-BTC" or "Thông tư 99/2025/TT-BTC"
  unitName: string; // Đơn vị
  unitAddress: string; // Địa chỉ đơn vị
  bookNo: string; // Quyển số
  voucherNo: string; // Số phiếu
  debitAccount: string; // Nợ
  creditAccount: string; // Có
  date: string; // Ngày hạch toán (e.g. 2026-07-08)
  personName: string; // Họ và tên người nộp/nhận tiền
  personAddress: string; // Địa chỉ người nộp/nhận
  reason: string; // Lý do nộp/chi
  amount: number; // Số tiền (number)
  amountWords: string; // Viết bằng chữ
  attachmentsCount: string; // Kèm theo chứng từ
  attachmentsDetail: string; // Chứng từ gốc
  receivedWords: string; // Đã nhận đủ số tiền (viết bằng chữ)
  exchangeRateDetail: string; // Tỷ giá ngoại tệ (vàng bạc, đá quý)
  convertedAmount: string; // Số tiền quy đổi
  projectRelated?: string; // Tên dự án liên quan (để hiển thị)
}

export function convertNumberToVietnameseWords(amount: number): string {
  if (amount === 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup3(n: number, showZeroHundred: boolean): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    let res = '';

    if (h > 0 || showZeroHundred) {
      res += digits[h] + ' trăm ';
    }

    if (t > 1) {
      res += digits[t] + ' mươi ';
    } else if (t === 1) {
      res += 'mười ';
    } else if (t === 0 && u > 0 && (h > 0 || showZeroHundred)) {
      res += 'lẻ ';
    }

    if (u === 5 && t > 0) {
      res += 'lăm';
    } else if (u === 1 && t > 1) {
      res += 'mốt';
    } else if (u > 0 || (h === 0 && t === 0)) {
      if (u > 0) res += digits[u];
    }

    return res.trim();
  }

  let strAmount = Math.floor(amount).toString();
  let groups: number[] = [];
  while (strAmount.length > 0) {
    const len = strAmount.length;
    const part = strAmount.substring(Math.max(0, len - 3), len);
    groups.push(parseInt(part));
    strAmount = strAmount.substring(0, Math.max(0, len - 3));
  }

  let res = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const showZero = i < groups.length - 1;
      const groupStr = readGroup3(g, showZero);
      res += groupStr + ' ' + units[i] + ' ';
    }
  }

  res = res.trim();
  if (res.endsWith(' lẻ')) {
    res = res.substring(0, res.length - 3);
  }
  res = res.trim() + ' đồng';
  return res.charAt(0).toUpperCase() + res.slice(1);
}

interface LiabilitiesManagerProps {
  projects: Project[];
  contractors: Contractor[];
  setContractors: React.Dispatch<React.SetStateAction<Contractor[]>>;
  contracts: Contract[];
  setContracts: React.Dispatch<React.SetStateAction<Contract[]>>;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  companyConfig?: CompanyConfig;
  userRole?: UserRole;
}

interface Client {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export default function LiabilitiesManager({
  projects,
  contractors,
  setContractors,
  contracts,
  setContracts,
  transactions,
  setTransactions,
  setProjects,
  companyConfig,
  userRole
}: LiabilitiesManagerProps) {
  // --- SUB-TABS within Liabilities Manager ---
  const [subTab, setSubTab] = useState<'clients' | 'subcontractors' | 'partners' | 'vouchers'>('clients');

  // --- ACCOUNTING VOUCHERS STATE ---
  const [vouchersList, setVouchersList] = useState<AccountingVoucher[]>([
    {
      id: 'PT-001',
      type: 'Receipt',
      templateType: 'Thông tư 200/2014/TT-BTC',
      unitName: 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT',
      unitAddress: 'Số 12 Đại lộ Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
      bookNo: 'Q-01',
      voucherNo: 'PT-001',
      debitAccount: '1111 (Tiền mặt)',
      creditAccount: '131 (Phải thu KH)',
      date: '2026-07-08',
      personName: 'Nguyễn Văn Hải',
      personAddress: 'Đại diện Tập đoàn BĐS Sông Xanh',
      reason: 'Thu hồi tạm ứng đợt 1 khởi công HĐ HD-CDT-GREENRIVER',
      amount: 15000000000,
      amountWords: 'Mười lăm tỷ đồng',
      attachmentsCount: '02',
      attachmentsDetail: 'Hồ sơ nghiệm thu đợt 1 & Hóa đơn GTGT số 00452',
      receivedWords: 'Mười lăm tỷ đồng',
      exchangeRateDetail: 'Không có',
      convertedAmount: '15.000.000.000 ₫',
      projectRelated: 'Chung cư cao cấp Green River'
    },
    {
      id: 'PC-001',
      type: 'Payment',
      templateType: 'Thông tư 99/2025/TT-BTC',
      unitName: 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT',
      unitAddress: 'Số 12 Đại lộ Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
      bookNo: 'Q-01',
      voucherNo: 'PC-001',
      debitAccount: '331 (Phải trả NCC)',
      creditAccount: '1111 (Tiền mặt)',
      date: '2026-07-08',
      personName: 'Hoàng Thị Thảo',
      personAddress: 'Đại diện Nhà phân phối Sắt Thép Việt',
      reason: 'Thanh toán tiền mua sắt thép dầm mố M1',
      amount: 450000000,
      amountWords: 'Bốn trăm năm mươi triệu đồng',
      attachmentsCount: '01',
      attachmentsDetail: 'Biên bản nghiệm thu bàn giao vật tư thép',
      receivedWords: 'Bốn trăm năm mươi triệu đồng',
      exchangeRateDetail: 'Không có',
      convertedAmount: '450.000.000 ₫',
      projectRelated: 'Cầu vượt nút giao Tân Sơn Nhất'
    },
    {
      id: 'PT-002',
      type: 'Receipt',
      templateType: 'Thông tư 200/2014/TT-BTC',
      unitName: 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT',
      unitAddress: 'Số 12 Đại lộ Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
      bookNo: 'Q-01',
      voucherNo: 'PT-002',
      debitAccount: '1111 (Tiền mặt)',
      creditAccount: '131 (Phải thu KH)',
      date: '2026-07-05',
      personName: 'Lê Minh Trí',
      personAddress: 'Đại diện Công ty CP Đầu tư TechHub',
      reason: 'Thu hồi công nợ nghiệm thu khối lượng dầm sàn tầng 5',
      amount: 1200000000,
      amountWords: 'Một tỷ hai trăm triệu đồng',
      attachmentsCount: '03',
      attachmentsDetail: 'Biên bản nghiệm thu khối lượng & Đề nghị thanh toán',
      receivedWords: 'Một tỷ hai trăm triệu đồng',
      exchangeRateDetail: 'Không có',
      convertedAmount: '1.200.000.000 ₫',
      projectRelated: 'Tòa nhà văn phòng TechHub Tower'
    }
  ]);

  const [selectedVoucher, setSelectedVoucher] = useState<AccountingVoucher | null>(null);
  const [showCreateVoucherModal, setShowCreateVoucherModal] = useState(false);

  // Form states for creating voucher
  const [newVoucherType, setNewVoucherType] = useState<'Receipt' | 'Payment'>('Receipt');
  const [newVoucherTemplate, setNewVoucherTemplate] = useState<string>('Thông tư 200/2014/TT-BTC');
  const [newVoucherUnitName, setNewVoucherUnitName] = useState<string>(companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT');
  const [newVoucherUnitAddress, setNewVoucherUnitAddress] = useState<string>(companyConfig?.siteOffice || 'Số 12 Đại lộ Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh');

  useEffect(() => {
    if (companyConfig) {
      setNewVoucherUnitName(companyConfig.companyName);
      setNewVoucherUnitAddress(companyConfig.siteOffice);
      setVouchersList(items => items.map(item => ({ ...item, unitName: companyConfig.companyName, unitAddress: companyConfig.siteOffice })));
      setSelectedVoucher(item => item ? ({ ...item, unitName: companyConfig.companyName, unitAddress: companyConfig.siteOffice }) : item);
    }
  }, [companyConfig]);
  const [newVoucherBookNo, setNewVoucherBookNo] = useState<string>('Q-01');
  const [newVoucherNo, setNewVoucherNo] = useState<string>('');
  const [newVoucherDebit, setNewVoucherDebit] = useState<string>('1111 (Tiền mặt)');
  const [newVoucherCredit, setNewVoucherCredit] = useState<string>('131 (Phải thu KH)');
  const [newVoucherDate, setNewVoucherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newVoucherPersonName, setNewVoucherPersonName] = useState<string>('');
  const [newVoucherPersonAddress, setNewVoucherPersonAddress] = useState<string>('');
  const [newVoucherReason, setNewVoucherReason] = useState<string>('');
  const [newVoucherAmount, setNewVoucherAmount] = useState<number>(0);
  const [newVoucherAmountWords, setNewVoucherAmountWords] = useState<string>('');
  const [newVoucherAttachmentsCount, setNewVoucherAttachmentsCount] = useState<string>('01');
  const [newVoucherAttachmentsDetail, setNewVoucherAttachmentsDetail] = useState<string>('');
  const [newVoucherExchangeRate, setNewVoucherExchangeRate] = useState<string>('Không có');
  const [newVoucherConvertedAmount, setNewVoucherConvertedAmount] = useState<string>('');
  const [newVoucherProject, setNewVoucherProject] = useState<string>('');

  useEffect(() => {
    if (vouchersList.length > 0 && !selectedVoucher) {
      setSelectedVoucher(vouchersList[0]);
    }
  }, [vouchersList, selectedVoucher]);

  const handleNewVoucherTypeChange = (type: 'Receipt' | 'Payment') => {
    setNewVoucherType(type);
    if (type === 'Receipt') {
      setNewVoucherTemplate('Thông tư 200/2014/TT-BTC');
      setNewVoucherDebit('1111 (Tiền mặt)');
      setNewVoucherCredit('131 (Phải thu KH)');
    } else {
      setNewVoucherTemplate('Thông tư 99/2025/TT-BTC');
      setNewVoucherDebit('331 (Phải trả NCC)');
      setNewVoucherCredit('1111 (Tiền mặt)');
    }
  };

  const handleNewVoucherAmountChange = (amount: number) => {
    setNewVoucherAmount(amount);
    const words = convertNumberToVietnameseWords(amount);
    setNewVoucherAmountWords(words);
    setNewVoucherConvertedAmount(amount.toLocaleString('vi-VN') + ' ₫');
  };

  // --- INTERNAL CLIENTS STATE ---
  const [clients, setClients] = useState<Client[]>([
    { id: 'client-gr', name: 'Tập đoàn BĐS Sông Xanh', contactPerson: 'Nguyễn Văn Hải', phone: '0905.111.222', email: 'contact@songxanhland.vn' },
    { id: 'client-sg-gt', name: 'Sở Giao thông Vận tải TP.HCM', contactPerson: 'Phòng QLDA 1', phone: '028.3829.1422', email: 'sgtvt@tphcm.gov.vn' },
    { id: 'client-techhub', name: 'Công ty CP Đầu tư TechHub', contactPerson: 'Lê Minh Trí', phone: '0918.444.555', email: 'tri.lm@techhubtower.com' },
    { id: 'client-ecoland', name: 'Tập đoàn Địa ốc EcoLand', contactPerson: 'Phạm Hoàng Nam', phone: '0982.555.777', email: 'info@ecoland.com.vn' },
    { id: 'client-vinasemi', name: 'Tập đoàn Công nghệ VinaSemi', contactPerson: 'Trần Anh Tuấn', phone: '0903.666.888', email: 'tuan.ta@vinasemi.vn' }
  ]);

  // --- FILTERS & SEARCHES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- MODAL / FORM STATES ---
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [showAddContractModal, setShowAddContractModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [showRecordVolumeModal, setShowRecordVolumeModal] = useState(false);

  // New Partner Form
  const [newPartnerCode, setNewPartnerCode] = useState('');
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerType, setNewPartnerType] = useState<'Subcontractor' | 'Supplier' | 'Client'>('Subcontractor');
  const [newPartnerContact, setNewPartnerContact] = useState('');
  const [newPartnerPhone, setNewPartnerPhone] = useState('');
  const [newPartnerEmail, setNewPartnerEmail] = useState('');

  // New Contract Form
  const [newContractNo, setNewContractNo] = useState('');
  const [newContractTitle, setNewContractTitle] = useState('');
  const [newContractProjectId, setNewContractProjectId] = useState('');
  const [newContractPartnerType, setNewContractPartnerType] = useState<'Client' | 'Contractor'>('Contractor');
  const [newContractPartnerId, setNewContractPartnerId] = useState('');
  const [newContractValue, setNewContractValue] = useState(0);
  const [newContractAdvance, setNewContractAdvance] = useState(0);

  // Record Payment / Collection Form
  const [selectedContractId, setSelectedContractId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentType, setPaymentType] = useState<'Collection' | 'Payment'>('Collection'); // Collection (Chủ đầu tư trả ta) / Payment (Ta trả thầu phụ)
  const [paymentNote, setPaymentNote] = useState('');

  // Record Work Volume Acceptance (Nghiệm thu khối lượng)
  const [acceptanceContractId, setAcceptanceContractId] = useState('');
  const [acceptanceValue, setAcceptanceValue] = useState(0);
  const [acceptanceNote, setAcceptanceNote] = useState('');

  // Toast indicator for success
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // --- HELPER FORMATTING MONEY ---
  const formatVND = (value: number) => {
    return (Number(value) || 0).toLocaleString('vi-VN') + ' ₫';
  };

  // Resolve Project name
  const getProjectName = (projId: string) => {
    const p = projects.find(item => item.id === projId);
    return p ? p.name : 'Dự án không rõ';
  };

  // Resolve Partner name (Client or Contractor)
  const getPartnerName = (partnerId: string, type: 'Client' | 'Contractor') => {
    if (type === 'Client') {
      const c = clients.find(item => item.id === partnerId);
      return c ? c.name : 'Chủ đầu tư không rõ';
    } else {
      const contr = contractors.find(item => item.id === partnerId);
      return contr ? contr.name : 'Nhà thầu phụ/Cung ứng không rõ';
    }
  };

  // --- STATS COMPUTATIONS ---
  const stats = useMemo(() => {
    let clientTotalValue = 0;
    let clientTotalPaid = 0; // Already collected from client
    let clientTotalAccepted = 0;

    let subTotalValue = 0;
    let subTotalPaid = 0; // Already paid to subcontractor
    let subTotalAccepted = 0;

    contracts.forEach(c => {
      if (c.partnerType === 'Client') {
        clientTotalValue += Number(c.value) || 0;
        clientTotalPaid += Number(c.paidValue) || 0;
        clientTotalAccepted += Number(c.acceptedValue) || 0;
      } else {
        subTotalValue += Number(c.value) || 0;
        subTotalPaid += Number(c.paidValue) || 0;
        subTotalAccepted += Number(c.acceptedValue) || 0;
      }
    });

    return {
      // Receivables (Từ chủ đầu tư)
      clientTotalValue,
      clientTotalPaid,
      clientTotalAccepted,
      clientOutstandingContract: clientTotalValue - clientTotalPaid, // Nợ theo Hợp đồng chưa thu
      clientOutstandingAccepted: clientTotalAccepted - clientTotalPaid, // Nợ thực tế đã nghiệm thu nhưng chưa thu tiền

      // Payables (Cho thầu phụ / cung ứng)
      subTotalValue,
      subTotalPaid,
      subTotalAccepted,
      subOutstandingContract: subTotalValue - subTotalPaid, // Nợ theo Hợp đồng chưa trả
      subOutstandingAccepted: subTotalAccepted - subTotalPaid // Nợ thực tế đã nghiệm thu nhưng chưa trả tiền
    };
  }, [contracts]);

  // --- FILTERED DATASETS ---
  const filteredClientContracts = useMemo(() => {
    return contracts.filter(c => {
      if (c.partnerType !== 'Client') return false;
      const partnerName = getPartnerName(c.partnerId, 'Client').toLowerCase();
      const title = c.title.toLowerCase();
      const num = c.contractNumber.toLowerCase();
      const matchesSearch = partnerName.includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase()) || num.includes(searchQuery.toLowerCase());

      const matchesProject = projectFilter === 'all' || c.projectId === projectFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [contracts, searchQuery, projectFilter, statusFilter, clients]);

  const filteredSubContracts = useMemo(() => {
    return contracts.filter(c => {
      if (c.partnerType !== 'Contractor') return false;
      const partnerName = getPartnerName(c.partnerId, 'Contractor').toLowerCase();
      const title = c.title.toLowerCase();
      const num = c.contractNumber.toLowerCase();
      const matchesSearch = partnerName.includes(searchQuery.toLowerCase()) || title.includes(searchQuery.toLowerCase()) || num.includes(searchQuery.toLowerCase());

      const matchesProject = projectFilter === 'all' || c.projectId === projectFilter;
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;

      return matchesSearch && matchesProject && matchesStatus;
    });
  }, [contracts, searchQuery, projectFilter, statusFilter, contractors]);

  // --- ACTIONS ---

  // Export to Excel Function with Office/Accounting Template Standard
  const handleExportExcel = (type: 'clients' | 'subcontractors' | 'partners') => {
    let filename = '';
    let sheetTitle = '';
    let tableHeadersHtml = '';
    let tableRowsHtml = '';
    let summaryHtml = '';

    const reportDateStr = new Date().toLocaleString('vi-VN');

    if (type === 'clients') {
      filename = `Bao_cao_Cong_no_Chu_dau_tu_${Date.now()}.xls`;
      sheetTitle = 'BÁO CÁO TỔNG HỢP CÔNG NỢ CHỦ ĐẦU TƯ';

      tableHeadersHtml = `
        <tr>
          <th style="width: 50px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">STT</th>
          <th style="width: 120px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Số hợp đồng</th>
          <th style="width: 250px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Tên hợp đồng</th>
          <th style="width: 180px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Công trình / Dự án</th>
          <th style="width: 200px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Chủ đầu tư</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Tổng giá trị HĐ</th>
          <th style="width: 120px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Tạm ứng ban đầu</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Nghiệm thu lũy kế</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Thực thu lũy kế</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Dư nợ HĐ còn lại (1-4)</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Nợ nghiệm thu chưa thu (3-4)</th>
          <th style="width: 100px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Trạng thái</th>
        </tr>
      `;

      let totalValue = 0;
      let totalAdvance = 0;
      let totalAccepted = 0;
      let totalPaid = 0;
      let totalOutstandingContract = 0;
      let totalOutstandingAccepted = 0;

      filteredClientContracts.forEach((c, idx) => {
        const projName = getProjectName(c.projectId);
        const partnerName = getPartnerName(c.partnerId, 'Client');
        const outstandingContract = c.value - c.paidValue;
        const outstandingAccepted = c.acceptedValue - c.paidValue;

        totalValue += c.value;
        totalAdvance += c.advancePayment;
        totalAccepted += c.acceptedValue;
        totalPaid += c.paidValue;
        totalOutstandingContract += outstandingContract;
        totalOutstandingAccepted += outstandingAccepted;

        tableRowsHtml += `
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${idx + 1}</td>
            <td style="mso-number-format:'@'; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.contractNumber}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${c.title}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${projName}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${partnerName}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.value}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.advancePayment}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.acceptedValue}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; background-color: #f0f9ff;">${c.paidValue}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${outstandingContract}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: ${outstandingAccepted > 0 ? 'bold' : 'normal'}; background-color: #fffbeb; color: ${outstandingAccepted > 0 ? '#b45309' : '#000000'};">${outstandingAccepted}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;"><span class="${c.status === 'Active' ? 'status-active' : 'status-completed'}">${c.status}</span></td>
          </tr>
        `;
      });

      summaryHtml = `
        <tr class="total-row">
          <td colspan="5" style="text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">TỔNG CỘNG:</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalValue}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalAdvance}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalAccepted}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalPaid}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalOutstandingContract}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalOutstandingAccepted}</td>
          <td style="background-color: #f1f5f9; border: 1px solid #94a3b8;"></td>
        </tr>
      `;

    } else if (type === 'subcontractors') {
      filename = `Bao_cao_Cong_no_Nha_thau_phu_${Date.now()}.xls`;
      sheetTitle = 'BÁO CÁO TỔNG HỢP CÔNG NỢ NHÀ THẦU PHỤ & CUNG ỨNG';

      tableHeadersHtml = `
        <tr>
          <th style="width: 50px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">STT</th>
          <th style="width: 120px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Số hợp đồng</th>
          <th style="width: 250px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Tên hợp đồng thầu phụ</th>
          <th style="width: 180px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Công trình thi công</th>
          <th style="width: 200px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Nhà thầu phụ / NCC</th>
          <th style="width: 100px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Phân loại</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Tổng giá trị HĐ</th>
          <th style="width: 120px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Tạm ứng lũy kế</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Nghiệm thu khối lượng</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Đã thanh toán lũy kế</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Con phải thanh toán HĐ</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Nợ nghiệm thu chưa trả</th>
          <th style="width: 100px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Trạng thái</th>
        </tr>
      `;

      let totalValue = 0;
      let totalAdvance = 0;
      let totalAccepted = 0;
      let totalPaid = 0;
      let totalOutstandingContract = 0;
      let totalOutstandingAccepted = 0;

      filteredSubContracts.forEach((c, idx) => {
        const projName = getProjectName(c.projectId);
        const partnerName = getPartnerName(c.partnerId, 'Contractor');
        const contrObj = contractors.find(item => item.id === c.partnerId);
        const contrType = contrObj ? (contrObj.type === 'Subcontractor' ? 'Thầu phụ' : 'Cung ứng') : 'Chưa rõ';
        const outstandingContract = c.value - c.paidValue;
        const outstandingAccepted = c.acceptedValue - c.paidValue;

        totalValue += c.value;
        totalAdvance += c.advancePayment;
        totalAccepted += c.acceptedValue;
        totalPaid += c.paidValue;
        totalOutstandingContract += outstandingContract;
        totalOutstandingAccepted += outstandingAccepted;

        tableRowsHtml += `
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${idx + 1}</td>
            <td style="mso-number-format:'@'; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.contractNumber}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${c.title}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${projName}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${partnerName}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${contrType}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.value}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.advancePayment}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${c.acceptedValue}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; background-color: #faf5ff;">${c.paidValue}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px;">${outstandingContract}</td>
            <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: ${outstandingAccepted > 0 ? 'bold' : 'normal'}; background-color: #fff1f2; color: ${outstandingAccepted > 0 ? '#e11d48' : '#000000'};">${outstandingAccepted}</td>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;"><span class="${c.status === 'Active' ? 'status-active' : 'status-completed'}">${c.status}</span></td>
          </tr>
        `;
      });

      summaryHtml = `
        <tr class="total-row">
          <td colspan="6" style="text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">TỔNG CỘNG:</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalValue}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalAdvance}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalAccepted}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalPaid}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalOutstandingContract}</td>
          <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right; font-weight: bold; background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px 6px;">${totalOutstandingAccepted}</td>
          <td style="background-color: #f1f5f9; border: 1px solid #94a3b8;"></td>
        </tr>
      `;

    } else {
      filename = `Danh_sach_Doi_tac_Chung_${Date.now()}.xls`;
      sheetTitle = 'DANH SÁCH ĐỐI TÁC KHÁCH HÀNG & DOANH NGHIỆP LIÊN KẾT';

      tableHeadersHtml = `
        <tr>
          <th style="width: 50px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">STT</th>
          <th style="width: 120px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Mã đối tác</th>
          <th style="width: 250px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Tên đơn vị đối tác</th>
          <th style="width: 150px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Phân loại / Vai trò</th>
          <th style="width: 180px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Người đại diện liên hệ</th>
          <th style="width: 120px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Số điện thoại</th>
          <th style="width: 220px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Hòm thư điện tử (Email)</th>
          <th style="width: 100px; background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; padding: 8px 6px;">Hợp đồng liên kết</th>
        </tr>
      `;

      let stt = 1;

      // Clients
      clients.forEach((cli) => {
        const contractCount = contracts.filter(c => c.partnerId === cli.id).length;
        tableRowsHtml += `
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${stt++}</td>
            <td style="mso-number-format:'@'; font-weight: bold; color: #1d4ed8; border: 1px solid #cbd5e1; padding: 6px 8px;">${cli.id}</td>
            <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px;">${cli.name}</td>
            <td style="color: #1d4ed8; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; background-color: #eff6ff;">CHỦ ĐẦU TƯ</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${cli.contactPerson}</td>
            <td style="mso-number-format:'@'; border: 1px solid #cbd5e1; padding: 6px 8px;">${cli.phone}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${cli.email}</td>
            <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px;">${contractCount} HĐ</td>
          </tr>
        `;
      });

      // Contractors
      contractors.forEach((ctr) => {
        const contractCount = contracts.filter(c => c.partnerId === ctr.id).length;
        tableRowsHtml += `
          <tr>
            <td style="text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px;">${stt++}</td>
            <td style="mso-number-format:'@'; font-weight: bold; color: #b45309; border: 1px solid #cbd5e1; padding: 6px 8px;">${ctr.code || ctr.id}</td>
            <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px;">${ctr.name}</td>
            <td style="color: #d97706; font-weight: bold; text-align: center; border: 1px solid #cbd5e1; padding: 6px 8px; background-color: #fffbeb;">${ctr.type === 'Subcontractor' ? 'THẦU PHỤ' : 'CUNG CẤP VẬT TƯ'}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${ctr.contactPerson}</td>
            <td style="mso-number-format:'@'; border: 1px solid #cbd5e1; padding: 6px 8px;">${ctr.phone}</td>
            <td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${ctr.email}</td>
            <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px;">${contractCount} HĐ</td>
          </tr>
        `;
      });
    }

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Bao Cao Cong No</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Times New Roman', Times, serif; margin: 15px; }
          .header-table { width: 100%; border: none; margin-bottom: 20px; }
          .header-table td { border: none; font-size: 10pt; }
          .company-title { font-weight: bold; text-transform: uppercase; color: #1e3a8a; font-size: 11pt; }
          .report-title { font-size: 16pt; font-weight: bold; text-align: center; color: #0f172a; text-transform: uppercase; padding: 15px 0 5px 0; }
          .report-subtitle { font-size: 10pt; font-style: italic; text-align: center; color: #64748b; margin-bottom: 25px; }
          .data-table { border-collapse: collapse; width: 100%; font-size: 9.5pt; }
          .data-table th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center; padding: 8px 6px; }
          .data-table td { border: 1px solid #cbd5e1; padding: 6px 8px; vertical-align: middle; }
          .total-row td { background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #1e3a8a; border-bottom: 2px double #1e3a8a; }
          .status-active { color: #166534; font-weight: bold; }
          .status-completed { color: #1e40af; font-weight: bold; }
          .signature-table { width: 100%; margin-top: 40px; border: none; font-size: 10pt; }
          .signature-table td { border: none; text-align: center; width: 33%; vertical-align: top; }
          .signature-title { font-weight: bold; padding-bottom: 80px; }
          .signature-name { font-weight: bold; }
        </style>
      </head>
      <body>
        <table class="header-table" style="width: 100%; border: none; margin-bottom: 20px;">
          <tr>
            <td style="width: 50%; font-family: 'Times New Roman';">
              <span class="company-title"><strong>${companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}</strong></span><br>
              <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${companyConfig?.siteOffice || 'Hệ thống Quản lý Live Operations & Financial P&L'}</span>
            </td>
            <td style="text-align: right; width: 50%; font-style: italic; font-family: 'Times New Roman'; font-size: 10pt;">
              Mẫu báo cáo số: OS-FIN-${type.toUpperCase()}-01<br>
              Ban hành ngày: 08/07/2026
            </td>
          </tr>
        </table>

        <div class="report-title" style="font-family: 'Times New Roman'; font-size: 16pt; font-weight: bold; text-align: center; text-transform: uppercase;">${sheetTitle}</div>
        <div class="report-subtitle" style="font-family: 'Times New Roman'; font-size: 10pt; font-style: italic; text-align: center; color: #64748b; margin-bottom: 25px;">
          Thời điểm kết xuất: ${reportDateStr} &bull; Người lập biểu: ${clients[0]?.email || 'Hệ thống Kế toán'}
        </div>

        <table class="data-table" style="border-collapse: collapse; width: 100%; font-size: 9.5pt; font-family: 'Times New Roman';">
          <thead>
            ${tableHeadersHtml}
          </thead>
          <tbody>
            ${tableRowsHtml}
            ${summaryHtml}
          </tbody>
        </table>

        <table class="signature-table" style="width: 100%; margin-top: 40px; border: none; font-size: 10pt; font-family: 'Times New Roman';">
          <tr>
            <td style="text-align: center; width: 33%;">
              <span class="signature-title">NGƯỜI LẬP BIỂU</span><br>
              <span style="font-style: italic; font-size: 8.5pt;">(Ký, ghi rõ họ tên)</span>
              <div style="height: 60px;"></div>
              <span class="signature-name">${clients[0]?.contactPerson || companyConfig?.treasurerName || 'Nguyễn Văn Hải'}</span>
            </td>
            <td style="text-align: center; width: 33%;">
              <span class="signature-title">KẾ TOÁN TRƯỞNG</span><br>
              <span style="font-style: italic; font-size: 8.5pt;">(Ký, duyệt đối chiếu)</span>
              <div style="height: 60px;"></div>
              <span class="signature-name">${companyConfig?.chiefAccountantName || 'Phạm Hoàng Nam'}</span>
            </td>
            <td style="text-align: center; width: 33%;">
              <span class="signature-title">GIÁM ĐỐC PHÊ DUYỆT</span><br>
              <span style="font-style: italic; font-size: 8.5pt;">(Ký, đóng dấu công ty)</span>
              <div style="height: 60px;"></div>
              <span class="signature-name">${companyConfig?.directorName || 'Ban Giám Đốc'}</span>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Đã xuất bảng tính Excel chuẩn báo cáo tài chính ${filename}!`);
  };

  // --- HANDLERS FOR VOUCHER SYSTEM ---
  const handlePrintVoucher = (v: AccountingVoucher) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup trình duyệt để sử dụng tính năng in!');
      return;
    }

    const d = new Date(v.date);
    const companyName = (companyConfig?.companyName || v.unitName).trim();
    const companyAddress = (companyConfig?.siteOffice || v.unitAddress).trim();
    const director = companyConfig?.directorName || '';
    const accountant = companyConfig?.chiefAccountantName || '';
    const treasurer = companyConfig?.treasurerName || '';
    const voucherTitle = v.type === 'Receipt' ? 'PHIẾU THU' : 'PHIẾU CHI';
    const payerLabel = v.type === 'Receipt' ? 'nộp' : 'nhận';

    printWindow.document.write(`
      <!doctype html><html lang="vi">
        <head>
          <meta charset="utf-8">
          <title>${v.type === 'Receipt' ? 'Phieu_Thu' : 'Phieu_Chi'}_${v.voucherNo}</title>
          <style>
            @page { size: A4 portrait; margin: 14mm 16mm 14mm 16mm; }
            * { box-sizing: border-box; }
            html, body { width: 100%; margin: 0; padding: 0; background: #fff; color: #000; }
            body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.35; }
            .sheet { width: 100%; max-width: 178mm; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            td { vertical-align: top; padding: 1.5mm 1mm; overflow-wrap: anywhere; }
            .head-left { width: 56%; text-align: center; }
            .head-right { width: 44%; text-align: center; font-size: 9.5pt; }
            .company { font-weight: 700; text-transform: uppercase; font-size: 11pt; }
            .address { font-size: 9.5pt; font-style: italic; margin-top: 1mm; }
            h1 { margin: 7mm 0 1mm; text-align: center; font-size: 18pt; line-height: 1.1; }
            .date { text-align: center; font-style: italic; margin-bottom: 3mm; }
            .meta { width: 39%; margin-left: auto; font-size: 10.5pt; }
            .line { margin: 2.2mm 0; }
            .dots { border-bottom: .3mm dotted #333; padding: 0 1.5mm 1mm; }
            .amount { font-weight: 700; white-space: nowrap; }
            .signatures { margin-top: 6mm; page-break-inside: avoid; }
            .signatures td { width: 20%; text-align: center; font-size: 9.5pt; padding: 1mm; }
            .sign-title { font-weight: 700; text-transform: uppercase; min-height: 9mm; }
            .sign-note { font-size: 8pt; font-style: italic; }
            .sign-space { height: 24mm; }
            .sign-name { font-weight: 700; min-height: 7mm; }
            .footer-lines { margin-top: 5mm; font-size: 10pt; page-break-inside: avoid; }
            @media print { .sheet { max-width: none; } }
          </style>
        </head>
        <body>
          <main class="sheet">
            <table><tr><td class="head-left"><div class="company">${companyName}</div><div class="address">Địa chỉ: ${companyAddress}</div></td><td class="head-right"><strong>${v.type === 'Receipt' ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT'}</strong><br><em>(Ban hành theo chế độ kế toán doanh nghiệp hiện hành)</em></td></tr></table>
            <h1>${voucherTitle}</h1>
            <div class="date">Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</div>
            <table class="meta"><tr><td><strong>Quyển số:</strong> ${v.bookNo}<br><strong>Số:</strong> ${v.voucherNo}<br>Nợ: ${v.debitAccount}<br>Có: ${v.creditAccount}</td></tr></table>
            <div class="line"><strong>Họ và tên người ${payerLabel} tiền:</strong> <span class="dots">${v.personName}</span></div>
            <div class="line"><strong>Địa chỉ:</strong> <span class="dots">${v.personAddress}</span></div>
            <div class="line"><strong>Lý do ${v.type === 'Receipt' ? 'nộp' : 'chi'}:</strong> <span class="dots">${v.reason}</span></div>
            <div class="line"><strong>Số tiền:</strong> <span class="amount">${v.amount.toLocaleString('vi-VN')} đồng</span></div>
            <div class="line"><strong>Viết bằng chữ:</strong> <span class="dots"><em>${v.amountWords}</em></span></div>
            <div class="line"><strong>Kèm theo:</strong> ${v.attachmentsCount} chứng từ gốc - ${v.attachmentsDetail}</div>
            <div class="date" style="text-align:right;margin-top:5mm">Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}</div>
            <table class="signatures"><tr><td><div class="sign-title">Giám đốc</div><div class="sign-note">(Ký, họ tên, đóng dấu)</div><div class="sign-space"></div><div class="sign-name">${director}</div></td><td><div class="sign-title">Kế toán trưởng</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div><div class="sign-name">${accountant}</div></td><td><div class="sign-title">Người lập phiếu</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div><div class="sign-name">${treasurer}</div></td><td><div class="sign-title">${v.type === 'Receipt' ? 'Người nộp tiền' : 'Người nhận tiền'}</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div><div class="sign-name">${v.personName}</div></td><td><div class="sign-title">Thủ quỹ</div><div class="sign-note">(Ký, họ tên)</div><div class="sign-space"></div><div class="sign-name">${treasurer}</div></td></tr></table>
            <div class="footer-lines"><div><strong>Đã nhận đủ số tiền (viết bằng chữ):</strong> ${v.receivedWords || v.amountWords}</div><div><strong>Tỷ giá ngoại tệ:</strong> ${v.exchangeRateDetail}</div><div><strong>Số tiền quy đổi:</strong> ${v.convertedAmount}</div></div>
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const handleExportVoucherExcel = (v: AccountingVoucher) => {
    const filename = `${v.type === 'Receipt' ? 'Phieu_Thu' : 'Phieu_Chi'}_${v.voucherNo}.xls`;
    const d = new Date(v.date);
    const exportCompanyName = (companyConfig?.companyName || v.unitName).trim();
    const exportCompanyAddress = (companyConfig?.siteOffice || v.unitAddress).trim();

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${v.type === 'Receipt' ? 'Phieu Thu' : 'Phieu Chi'}</x:Name>
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
          td { font-family: 'Times New Roman', Times, serif; }
        </style>
      </head>
      <body>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td colspan="3" style="font-weight: bold; text-align: left; font-size: 11pt;">ĐƠN VỊ: ${exportCompanyName.toUpperCase()}</td>
            <td colspan="3" style="font-weight: bold; text-align: center; font-size: 11pt;">${v.type === 'Receipt' ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT'}</td>
          </tr>
          <tr>
            <td colspan="3" style="text-align: left; font-size: 9.5pt; font-style: italic; color: #475569;">Địa chỉ: ${exportCompanyAddress}</td>
            <td colspan="3" style="text-align: center; font-size: 9.5pt; font-style: italic; color: #475569;">
              ${v.type === 'Receipt' ? '(Ban hành theo Thông tư số 200/2014/TT-BTC<br>Ngày 22/12/2014 của Bộ Tài chính)' : '(Kèm theo Thông tư số 99/2025/TT-BTC<br>ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)'}
            </td>
          </tr>

          <tr><td colspan="6" style="height: 15px;"></td></tr>

          <tr>
            <td colspan="4" style="font-size: 16pt; font-weight: bold; text-align: center; text-transform: uppercase;">
              ${v.type === 'Receipt' ? 'PHIẾU THU' : 'PHIẾU CHI'}
            </td>
            <td colspan="2" style="font-size: 10pt; font-weight: bold;">Quyển số: ${v.bookNo}</td>
          </tr>
          <tr>
            <td colspan="4" style="font-size: 10pt; font-style: italic; text-align: center;">
              Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}
            </td>
            <td colspan="2" style="font-size: 10pt; font-weight: bold;">Số: ${v.voucherNo}</td>
          </tr>
          <tr>
            <td colspan="4"></td>
            <td colspan="2" style="font-size: 10pt;">Nợ: ${v.debitAccount}</td>
          </tr>
          <tr>
            <td colspan="4"></td>
            <td colspan="2" style="font-size: 10pt;">Có: ${v.creditAccount}</td>
          </tr>

          <tr><td colspan="6" style="height: 15px;"></td></tr>

          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>Họ và tên người ${v.type === 'Receipt' ? 'nộp' : 'nhận'} tiền:</strong> ${v.personName}
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>Địa chỉ:</strong> ${v.personAddress}
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>Lý do ${v.type === 'Receipt' ? 'nộp' : 'chi'}:</strong> ${v.reason}
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>Số tiền:</strong> <span style="font-weight: bold; font-size: 11.5pt;">${v.amount.toLocaleString('vi-VN')} ₫</span> &nbsp;&nbsp;&nbsp;&nbsp; <strong>(Viết bằng chữ):</strong> <span style="font-style: italic;">${v.amountWords}</span>
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>Kèm theo:</strong> ${v.attachmentsCount} Chứng từ gốc &nbsp;&nbsp;&nbsp;&nbsp; <strong>Chứng từ gốc:</strong> ${v.attachmentsDetail}
            </td>
          </tr>

          <tr><td colspan="6" style="height: 15px;"></td></tr>

          <tr>
            <td colspan="3"></td>
            <td colspan="3" style="text-align: center; font-style: italic; font-size: 10.5pt;">
              Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}
            </td>
          </tr>

          <tr><td colspan="6" style="height: 10px;"></td></tr>

          <tr>
            <td style="width: 20%; font-weight: bold; text-align: center; font-size: 10.5pt; vertical-align: top;">Giám đốc</td>
            <td style="width: 20%; font-weight: bold; text-align: center; font-size: 10.5pt; vertical-align: top;">Kế toán trưởng</td>
            <td style="width: 20%; font-weight: bold; text-align: center; font-size: 10.5pt; vertical-align: top;">${v.type === 'Receipt' ? 'Người nộp tiền' : 'Thủ quỹ'}</td>
            <td style="width: 20%; font-weight: bold; text-align: center; font-size: 10.5pt; vertical-align: top;">Người lập phiếu</td>
            <td style="width: 20%; font-weight: bold; text-align: center; font-size: 10.5pt; vertical-align: top;">${v.type === 'Receipt' ? 'Thủ quỹ' : 'Người nhận tiền'}</td>
          </tr>
          <tr>
            <td style="text-align: center; font-style: italic; font-size: 8.5pt; color: #475569;">(Ký, họ tên, đóng dấu)</td>
            <td style="text-align: center; font-style: italic; font-size: 8.5pt; color: #475569;">(Ký, họ tên)</td>
            <td style="text-align: center; font-style: italic; font-size: 8.5pt; color: #475569;">(Ký, họ tên)</td>
            <td style="text-align: center; font-style: italic; font-size: 8.5pt; color: #475569;">(Ký, họ tên)</td>
            <td style="text-align: center; font-style: italic; font-size: 8.5pt; color: #475569;">(Ký, họ tên)</td>
          </tr>
          <tr>
            <td style="height: 55px;"></td>
            <td style="height: 55px;"></td>
            <td style="height: 55px;"></td>
            <td style="height: 55px;"></td>
            <td style="height: 55px;"></td>
          </tr>
          <tr style="font-weight: bold;">
            <td style="text-align: center; font-size: 10.5pt;">${companyConfig?.directorName || 'Vũ Đức Thành'}</td>
            <td style="text-align: center; font-size: 10.5pt;">${companyConfig?.chiefAccountantName || 'Mai Thị Xuân'}</td>
            <td style="text-align: center; font-size: 10.5pt;">${v.type === 'Receipt' ? v.personName : (companyConfig?.treasurerName || 'Trần Quốc Bảo')}</td>
            <td style="text-align: center; font-size: 10.5pt;">${companyConfig?.treasurerName || 'Nguyễn Văn Hải'}</td>
            <td style="text-align: center; font-size: 10.5pt;">${v.type === 'Receipt' ? (companyConfig?.treasurerName || 'Trần Quốc Bảo') : v.personName}</td>
          </tr>

          <tr><td colspan="6" style="height: 20px;"></td></tr>

          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>Đã nhận đủ số tiền (viết bằng chữ):</strong> ${v.receivedWords || v.amountWords}
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>+ Tỷ giá ngoại tệ (vàng bạc, đá quý):</strong> ${v.exchangeRateDetail}
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 11pt; padding: 4px 0;">
              <strong>+ Số tiền quy đổi:</strong> ${v.convertedAmount}
            </td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 9.5pt; font-style: italic; padding: 4px 0; color: #475569;">
              (Liên gửi ra ngoài phải đóng dấu)
            </td>
          </tr>
          ${v.type === 'Payment' ? `
          <tr>
            <td colspan="6" style="font-size: 8.5pt; font-style: italic; padding: 4px 0; color: #64748b; line-height: 1.3;">
              <strong>Ghi chú:</strong> Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình, doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.
            </td>
          </tr>
          ` : ''}
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã xuất ${v.type === 'Receipt' ? 'Phiếu Thu' : 'Phiếu Chi'} thành công dưới dạng file Excel!`);
  };

  const handleExportVoucherWord = (v: AccountingVoucher) => {
    const filename = `${v.type === 'Receipt' ? 'Phieu_Thu' : 'Phieu_Chi'}_${v.voucherNo}.doc`;
    const d = new Date(v.date);
    const exportCompanyName = (companyConfig?.companyName || v.unitName).trim();
    const exportCompanyAddress = (companyConfig?.siteOffice || v.unitAddress).trim();

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
          @page {
            size: 21cm 29.7cm;
            margin: 2.0cm 2.0cm 2.0cm 2.0cm;
          }
          * {
            font-family: 'Times New Roman', Times, serif !important;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #000000;
          }
          .title {
            text-align: center;
            font-weight: bold;
            font-size: 15pt;
            margin-top: 15pt;
            margin-bottom: 5pt;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          td {
            vertical-align: top;
            padding: 3px 0;
          }
        </style>
      </head>
      <body>
        <table style="width:100%;">
          <tr>
            <td style="width: 55%; font-weight: bold;">
              ĐƠN VỊ: ${exportCompanyName.toUpperCase()}<br>
              <span style="font-weight: normal; font-style: italic;">Địa chỉ: ${exportCompanyAddress}</span>
            </td>
            <td style="width: 45%; text-align: center;">
              <strong>${v.type === 'Receipt' ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT'}</strong><br>
              <span style="font-style: italic; font-size: 9.5pt;">
                ${v.type === 'Receipt' ? '(Ban hành theo Thông tư số 200/2014/TT-BTC<br>Ngày 22/12/2014 của Bộ Tài chính)' : '(Kèm theo Thông tư số 99/2025/TT-BTC<br>ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)'}
              </span>
            </td>
          </tr>
        </table>

        <div class="title">${v.type === 'Receipt' ? 'PHIẾU THU' : 'PHIẾU CHI'}</div>
        <div style="text-align: center; font-style: italic; margin-bottom: 10px;">
          Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}
        </div>

        <table style="width: 100%; margin-bottom: 15px;">
          <tr>
            <td style="width: 60%;"></td>
            <td style="width: 40%; font-weight: bold;">
              Quyển số: ${v.bookNo}<br>
              Số: ${v.voucherNo}<br>
              <span style="font-weight: normal;">Nợ: ${v.debitAccount}</span><br>
              <span style="font-weight: normal;">Có: ${v.creditAccount}</span>
            </td>
          </tr>
        </table>

        <p><strong>Họ và tên người ${v.type === 'Receipt' ? 'nộp' : 'nhận'} tiền:</strong> ${v.personName}</p>
        <p><strong>Địa chỉ:</strong> ${v.personAddress}</p>
        <p><strong>Lý do ${v.type === 'Receipt' ? 'nộp' : 'chi'}:</strong> ${v.reason}</p>
        <p><strong>Số tiền:</strong> <strong>${v.amount.toLocaleString('vi-VN')} ₫</strong> &nbsp;&nbsp;&nbsp;&nbsp; <em>(Viết bằng chữ):</em> <em>${v.amountWords}</em></p>
        <p><strong>Kèm theo:</strong> ${v.attachmentsCount} Chứng từ gốc &nbsp;&nbsp;&nbsp;&nbsp; <em>Chứng từ gốc:</em> ${v.attachmentsDetail}</p>

        <p style="text-align: right; font-style: italic; margin-top: 15px; margin-right: 20px;">
          Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}
        </p>

        <table style="width: 100%; margin-top: 10px; margin-bottom: 50px; text-align: center;">
          <tr style="font-weight: bold;">
            <td>Giám đốc</td>
            <td>Kế toán trưởng</td>
            <td>${v.type === 'Receipt' ? 'Người nộp tiền' : 'Thủ quỹ'}</td>
            <td>Người lập phiếu</td>
            <td>${v.type === 'Receipt' ? 'Thủ quỹ' : 'Người nhận tiền'}</td>
          </tr>
          <tr style="font-style: italic; font-size: 9pt; color: #555555;">
            <td>(Ký, họ tên, đóng dấu)</td>
            <td>(Ký, họ tên)</td>
            <td>(Ký, họ tên)</td>
            <td>(Ký, họ tên)</td>
            <td>(Ký, họ tên)</td>
          </tr>
          <tr style="height: 65px;"><td colspan="5"></td></tr>
          <tr style="font-weight: bold;">
            <td>${companyConfig?.directorName || 'Vũ Đức Thành'}</td>
            <td>${companyConfig?.chiefAccountantName || 'Mai Thị Xuân'}</td>
            <td>${v.type === 'Receipt' ? v.personName : (companyConfig?.treasurerName || 'Trần Quốc Bảo')}</td>
            <td>${companyConfig?.treasurerName || 'Nguyễn Văn Hải'}</td>
            <td>${v.type === 'Receipt' ? (companyConfig?.treasurerName || 'Trần Quốc Bảo') : v.personName}</td>
          </tr>
        </table>

        <p><strong>Đã nhận đủ số tiền (viết bằng chữ):</strong> ${v.receivedWords || v.amountWords}</p>
        <p><strong>+ Tỷ giá ngoại tệ (vàng bạc, đá quý):</strong> ${v.exchangeRateDetail}</p>
        <p><strong>+ Số tiền quy đổi:</strong> ${v.convertedAmount}</p>
        <p style="font-style: italic; font-size: 9.5pt; margin-top: 5px;">(Liên gửi ra ngoài phải đóng dấu)</p>
        ${v.type === 'Payment' ? `
        <p style="font-style: italic; font-size: 8.5pt; color: #555555; margin-top: 20px; line-height: 1.3;">
          <strong>Ghi chú:</strong> Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình, doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.
        </p>
        ` : ''}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], { type: 'application/msword;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Đã tải xuống file Word thành công cho ${v.type === 'Receipt' ? 'Phiếu Thu' : 'Phiếu Chi'}!`);
  };

  const handleSaveNewVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoucherNo || !newVoucherPersonName || newVoucherAmount <= 0 || !newVoucherReason) {
      alert('Vui lòng điền đầy đủ các thông tin cần thiết: Số phiếu, Người nộp/nhận, Số tiền và Lý do!');
      return;
    }

    const createdVoucher: AccountingVoucher = {
      id: newVoucherNo,
      type: newVoucherType,
      templateType: newVoucherTemplate,
      unitName: newVoucherUnitName,
      unitAddress: newVoucherUnitAddress,
      bookNo: newVoucherBookNo,
      voucherNo: newVoucherNo,
      debitAccount: newVoucherDebit,
      creditAccount: newVoucherCredit,
      date: newVoucherDate,
      personName: newVoucherPersonName,
      personAddress: newVoucherPersonAddress || 'Không có',
      reason: newVoucherReason,
      amount: newVoucherAmount,
      amountWords: newVoucherAmountWords || convertNumberToVietnameseWords(newVoucherAmount),
      attachmentsCount: newVoucherAttachmentsCount || '0',
      attachmentsDetail: newVoucherAttachmentsDetail || 'Chứng từ nội bộ',
      receivedWords: newVoucherAmountWords || convertNumberToVietnameseWords(newVoucherAmount),
      exchangeRateDetail: newVoucherExchangeRate || 'Không có',
      convertedAmount: newVoucherConvertedAmount || (newVoucherAmount.toLocaleString('vi-VN') + ' ₫'),
      projectRelated: newVoucherProject || 'Chi phí chung'
    };

    setVouchersList(prev => [createdVoucher, ...prev]);
    setSelectedVoucher(createdVoucher);
    setShowCreateVoucherModal(false);
    showToast(`Đã lập thành công ${newVoucherType === 'Receipt' ? 'Phiếu Thu' : 'Phiếu Chi'} số ${newVoucherNo}!`);

    // Optionally write to central transactions
    const isRevenue = newVoucherType === 'Receipt';
    const tx: FinancialTransaction = {
      id: `tx-vou-${Date.now()}`,
      projectId: 'proj-1', // Default to proj-1 or matching project
      type: isRevenue ? 'Revenue' : 'Expense',
      category: isRevenue ? 'Client_Billing' : 'Overhead',
      amount: newVoucherAmount,
      description: `${newVoucherType === 'Receipt' ? 'Thu' : 'Chi'} theo phiếu số ${newVoucherNo}: ${newVoucherReason}`,
      date: newVoucherDate,
      referenceId: newVoucherNo
    };
    setTransactions(prev => [tx, ...prev]);

    // Reset Form states
    setNewVoucherNo('');
    setNewVoucherPersonName('');
    setNewVoucherPersonAddress('');
    setNewVoucherReason('');
    setNewVoucherAmount(0);
    setNewVoucherAmountWords('');
    setNewVoucherAttachmentsDetail('');
  };

  const handleDeleteVoucher = (id: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa chứng từ số ${id}?`)) {
      setVouchersList(prev => prev.filter(v => v.id !== id));
      if (selectedVoucher?.id === id) {
        setSelectedVoucher(null);
      }
      showToast(`Đã xóa chứng từ số ${id} thành công.`);
    }
  };

  // Add Partner handler
  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerCode.trim() || !newPartnerName.trim() || !newPartnerContact.trim() || !newPartnerPhone.trim()) {
      alert('Vui lòng điền đầy đủ các trường thông tin đối tác!');
      return;
    }

    const newId = normalizeBusinessId(newPartnerCode, `DT-${String(contractors.length + 1).padStart(3, '0')}`);
    if (contractors.some(item => item.id === newId || item.code === newId) || clients.some(item => item.id === newId)) {
      alert(`Mã đối tác ${newId} đã tồn tại.`);
      return;
    }
    if (newPartnerType === 'Client') {
      const newClientObj: Client = {
        id: newId,
        name: newPartnerName,
        contactPerson: newPartnerContact,
        phone: newPartnerPhone,
        email: newPartnerEmail || `${newId}@enterprise.com`
      };
      setClients(prev => [...prev, newClientObj]);
      showToast(`Đã thêm mới Chủ đầu tư: ${newPartnerName}`);
    } else {
      const newContractorObj: Contractor = {
        id: newId,
        code: newId,
        name: newPartnerName,
        type: newPartnerType,
        contactPerson: newPartnerContact,
        phone: newPartnerPhone,
        email: newPartnerEmail || `${newId}@subcontractor.com`,
        rating: 5.0
      };
      setContractors(prev => [...prev, newContractorObj]);
      showToast(`Đã thêm mới Đối tác ${newPartnerType === 'Subcontractor' ? 'Thầu phụ' : 'Nhà cung cấp'}: ${newPartnerName}`);
    }

    // Reset Form
    setNewPartnerCode('');
    setNewPartnerName('');
    setNewPartnerContact('');
    setNewPartnerPhone('');
    setNewPartnerEmail('');
    setShowAddPartnerModal(false);
  };

  // Add Contract handler
  const handleAddContract = (e: React.FormEvent) => {
    e.preventDefault();
    if (userRole !== 'CEO') {
      alert('Chỉ Giám đốc được lập hợp đồng mới. Kế toán được theo dõi và cập nhật nghiệp vụ trên hợp đồng hiện có.');
      setShowAddContractModal(false);
      return;
    }
    if (!newContractNo.trim() || !newContractTitle.trim() || !newContractProjectId || !newContractPartnerId || newContractValue <= 0) {
      alert('Vui lòng điền đầy đủ các thông tin hợp đồng và giá trị lớn hơn 0!');
      return;
    }

    const contractBusinessId = normalizeBusinessId(newContractNo, `HD-${Date.now()}`);
    if (contracts.some(item => item.id === contractBusinessId || item.contractNumber === contractBusinessId)) {
      alert(`Số hợp đồng ${contractBusinessId} đã tồn tại.`);
      return;
    }
    const newContract: Contract = {
      id: contractBusinessId,
      contractNumber: contractBusinessId,
      title: newContractTitle,
      projectId: newContractProjectId,
      partnerId: newContractPartnerId,
      partnerType: newContractPartnerType,
      value: newContractValue,
      advancePayment: newContractAdvance,
      acceptedValue: 0,
      paidValue: newContractAdvance, // initially paid is the advance payment
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      status: 'Active'
    };

    setContracts(prev => [newContract, ...prev]);

    // If there is an advance payment, record it as a transaction as well!
    if (newContractAdvance > 0) {
      const isClient = newContractPartnerType === 'Client';
      const tx: FinancialTransaction = {
        id: `tx-adv-${Date.now()}`,
        projectId: newContractProjectId,
        type: isClient ? 'Revenue' : 'Expense',
        category: isClient ? 'Client_Billing' : (newContractPartnerType === 'Contractor' ? 'Subcontractor' : 'Overhead'),
        amount: newContractAdvance,
        description: `${isClient ? 'Thu hồi tạm ứng' : 'Tạm ứng hợp đồng thầu phụ'} khởi công HĐ ${newContractNo}`,
        date: new Date().toISOString().split('T')[0],
        referenceId: newContract.id
      };
      setTransactions(prev => [tx, ...prev]);

      // If it's subcontractor expense, update project spent
      if (!isClient) {
        setProjects(prevProjs =>
          prevProjs.map(proj => {
            if (proj.id === newContractProjectId) {
              return { ...proj, spent: proj.spent + newContractAdvance };
            }
            return proj;
          })
        );
      }
    }

    showToast(`Đã ký thành công hợp đồng ${newContractNo}!`);

    // Reset Form
    setNewContractNo('');
    setNewContractTitle('');
    setNewContractProjectId('');
    setNewContractPartnerId('');
    setNewContractValue(0);
    setNewContractAdvance(0);
    setShowAddContractModal(false);
  };

  // Record Payment / Collection handler
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractId || paymentAmount <= 0) {
      alert('Vui lòng chọn hợp đồng và nhập số tiền thanh toán hợp lệ!');
      return;
    }

    const targetContract = contracts.find(c => c.id === selectedContractId);
    if (!targetContract) return;

    // 1. Update Contract's accumulated paidValue
    setContracts(prev => prev.map(c => {
      if (c.id === selectedContractId) {
        return {
          ...c,
          paidValue: c.paidValue + paymentAmount,
          // Auto complete contract if it reaches total value
          status: c.paidValue + paymentAmount >= c.value ? 'Completed' : c.status
        };
      }
      return c;
    }));

    // 2. Add Financial Transaction
    const isClient = targetContract.partnerType === 'Client';
    const newTx: FinancialTransaction = {
      id: `tx-pay-${Date.now()}`,
      projectId: targetContract.projectId,
      type: isClient ? 'Revenue' : 'Expense',
      category: isClient ? 'Client_Billing' : 'Subcontractor',
      amount: paymentAmount,
      description: paymentNote || `${isClient ? 'Thu hồi công nợ nghiệm thu' : 'Chi trả tiền nghiệm thu khối lượng'} HĐ #${targetContract.contractNumber}`,
      date: new Date().toISOString().split('T')[0],
      referenceId: targetContract.id
    };

    setTransactions(prev => [newTx, ...prev]);

    // 3. Update Project Spent if paying subcontractor
    if (!isClient) {
      setProjects(prevProjs =>
        prevProjs.map(proj => {
          if (proj.id === targetContract.projectId) {
            return {
              ...proj,
              spent: proj.spent + paymentAmount
            };
          }
          return proj;
        })
      );
    }

    showToast(`Đã ghi nhận bút toán ${isClient ? 'Thực thu' : 'Thực trả'}: +${formatVND(paymentAmount)}`);

    // Reset form
    setSelectedContractId('');
    setPaymentAmount(0);
    setPaymentNote('');
    setShowRecordPaymentModal(false);
  };

  // Record Work Volume Acceptance (Nghiệm thu khối lượng)
  const handleRecordAcceptance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptanceContractId || acceptanceValue <= 0) {
      alert('Vui lòng chọn hợp đồng và nhập giá trị nghiệm thu!');
      return;
    }

    const targetContract = contracts.find(c => c.id === acceptanceContractId);
    if (!targetContract) return;

    // Update accepted value in contract
    setContracts(prev => prev.map(c => {
      if (c.id === acceptanceContractId) {
        return {
          ...c,
          acceptedValue: c.acceptedValue + acceptanceValue
        };
      }
      return c;
    }));

    showToast(`Đã nghiệm thu thành công khối lượng đợt: +${formatVND(acceptanceValue)} cho HĐ #${targetContract.contractNumber}`);

    // Reset Form
    setAcceptanceContractId('');
    setAcceptanceValue(0);
    setAcceptanceNote('');
    setShowRecordVolumeModal(false);
  };

  return (
    <div className="space-y-6" id="liabilities-manager-root">

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-slate-900 border border-emerald-500 text-white px-5 py-3 rounded-lg shadow-xl animate-bounce">
          <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold font-sans">{toastMessage}</span>
        </div>
      )}

      {/* Main Liabilities Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Receivables summary from clients */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">CÔNG NỢ CHỦ ĐẦU TƯ (RECEIVABLES)</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Tiền thi công cần thu hồi từ Chủ đầu tư</p>
              </div>
            </div>
            <ArrowDownLeft className="w-5 h-5 text-emerald-500 bg-emerald-50 p-1 rounded-full shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ĐÃ NGHIỆM THU</span>
              <div className="text-sm font-black text-slate-800 font-mono">{formatVND(stats.clientTotalAccepted)}</div>
              <span className="text-[9px] text-slate-400 block font-semibold">Khối lượng hoàn thành</span>
            </div>
            <div className="space-y-0.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">THỰC THU LŨY KẾ</span>
              <div className="text-sm font-black text-blue-600 font-mono">{formatVND(stats.clientTotalPaid)}</div>
              <span className="text-[9px] text-slate-400 block font-semibold">Đã thu hồi tiền mặt</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
            <div className="text-slate-500">
              Chưa Thu Nghiệm Thu (Nợ dồn thực tế):
            </div>
            <div className={`font-mono font-bold px-2 py-0.5 rounded ${stats.clientOutstandingAccepted > 0 ? 'text-amber-700 bg-amber-50' : 'text-slate-500'}`}>
              {formatVND(stats.clientOutstandingAccepted)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="text-slate-500">
              Nợ còn lại theo Hợp đồng:
            </div>
            <div className="font-mono text-slate-900">
              {formatVND(stats.clientOutstandingContract)}
            </div>
          </div>
        </div>

        {/* Payables summary to subcontractors */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">CÔNG NỢ THẦU PHỤ & CUNG ỨNG (PAYABLES)</h3>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Tiền phải trả thầu phụ và nhà cung cấp vật tư</p>
              </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-rose-500 bg-rose-50 p-1 rounded-full shrink-0" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ĐÃ NGHIỆM THU</span>
              <div className="text-sm font-black text-slate-800 font-mono">{formatVND(stats.subTotalAccepted)}</div>
              <span className="text-[9px] text-slate-400 block font-semibold">Khối lượng thầu phụ bàn giao</span>
            </div>
            <div className="space-y-0.5 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">ĐÃ TRẢ LŨY KẾ</span>
              <div className="text-sm font-black text-purple-600 font-mono">{formatVND(stats.subTotalPaid)}</div>
              <span className="text-[9px] text-slate-400 block font-semibold">Đã giải ngân tiền mặt</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
            <div className="text-slate-500">
              Nợ đọng nghiệm thu chưa trả:
            </div>
            <div className={`font-mono font-bold px-2 py-0.5 rounded ${stats.subOutstandingAccepted > 0 ? 'text-rose-700 bg-rose-50 animate-pulse' : 'text-slate-500'}`}>
              {formatVND(stats.subOutstandingAccepted)}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="text-slate-500">
              Dự nợ thầu phụ theo Hợp đồng:
            </div>
            <div className="font-mono text-slate-900">
              {formatVND(stats.subOutstandingContract)}
            </div>
          </div>
        </div>

      </div>

      {/* Control Actions & Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">

        {/* Navigation for Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-start">
          <button
            onClick={() => { setSubTab('clients'); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'clients' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Công nợ Chủ đầu tư ({filteredClientContracts.length})
          </button>
          <button
            onClick={() => { setSubTab('subcontractors'); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'subcontractors' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            Công nợ Thầu phụ ({filteredSubContracts.length})
          </button>
          <button
            onClick={() => { setSubTab('partners'); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'partners' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Danh sách Đối tác ({contractors.length + clients.length})
          </button>
          <button
            onClick={() => { setSubTab('vouchers'); setSearchQuery(''); }}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === 'vouchers' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            Phiếu Thu / Chi Bộ Tài Chính ({vouchersList.length})
          </button>
        </div>

        {/* Quick Operations Button Grid */}
        <div className="flex flex-wrap items-center gap-2">

          {/* Export Excel Button */}
          <button
            onClick={() => handleExportExcel(subTab)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-colors"
            title="Xuất Excel/CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>

          {/* Record Acceptance Button */}
          <button
            onClick={() => setShowRecordVolumeModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
          >
            <Layers className="w-4 h-4" />
            <span>Nghiệm thu Khối lượng</span>
          </button>

          {/* Record Collections / Disbursements */}
          <button
            onClick={() => {
              setPaymentType(subTab === 'clients' ? 'Collection' : 'Payment');
              setShowRecordPaymentModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
          >
            <Coins className="w-4 h-4" />
            <span>Ghi nhận Thu/Trả nợ</span>
          </button>

          {/* New Contract */}
          {userRole === 'CEO' && (
            <button
              onClick={() => setShowAddContractModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ký HĐ Mới</span>
            </button>
          )}

          {/* New Partner */}
          <button
            onClick={() => {
              setNewPartnerType(subTab === 'clients' ? 'Client' : 'Subcontractor');
              setShowAddPartnerModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Đối tác</span>
          </button>
        </div>
      </div>

      {/* Grid Filter Bar */}
      {subTab !== 'partners' && subTab !== 'vouchers' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo số hợp đồng, tiêu đề hoặc tên đối tác..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none"
            >
              <option value="all">Tất cả dự án</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-1.5 px-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:outline-none"
            >
              <option value="all">Tất cả trạng thái HĐ</option>
              <option value="Active">Đang chạy (Active)</option>
              <option value="Completed">Hoàn thành (Completed)</option>
              <option value="Draft">Bản nháp (Draft)</option>
            </select>
          </div>
        </div>
      )}

      {/* Data Table Area */}
      {subTab !== 'vouchers' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {subTab === 'clients' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Số hợp đồng</th>
                  <th className="px-4 py-3 text-left">Chủ đầu tư & Tên Hợp đồng</th>
                  <th className="px-4 py-3 text-left">Dự án công trình</th>
                  <th className="px-4 py-3 text-right">Tổng Giá trị (1)</th>
                  <th className="px-4 py-3 text-right">Khối lượng nghiệm thu (2)</th>
                  <th className="px-4 py-3 text-right text-blue-700 font-bold">Thực Thu Lũy Kế (3)</th>
                  <th className="px-4 py-3 text-right text-amber-900 font-bold">Công nợ nghiệm thu (2-3)</th>
                  <th className="px-4 py-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredClientContracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">Không tìm thấy hợp đồng nào phù hợp bộ lọc!</td>
                  </tr>
                ) : (
                  filteredClientContracts.map(c => {
                    const outstandingContract = c.value - c.paidValue;
                    const outstandingAccepted = c.acceptedValue - c.paidValue;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.contractNumber}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900 font-bold text-xs">{getPartnerName(c.partnerId, 'Client')}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{c.title}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-semibold">{getProjectName(c.projectId)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">{formatVND(c.value)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{formatVND(c.acceptedValue)}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-700 font-bold bg-blue-50/10">{formatVND(c.paidValue)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold bg-amber-50/20 ${outstandingAccepted > 0 ? 'text-amber-700 font-extrabold' : 'text-slate-400 font-normal'}`}>
                          {outstandingAccepted > 0 ? formatVND(outstandingAccepted) : '0 ₫'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            c.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            c.status === 'Completed' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'subcontractors' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Số hợp đồng</th>
                  <th className="px-4 py-3 text-left">Thầu phụ & Tên Hợp đồng</th>
                  <th className="px-4 py-3 text-left">Công trình thi công</th>
                  <th className="px-4 py-3 text-right">Tổng Giá trị (1)</th>
                  <th className="px-4 py-3 text-right">Khối lượng nghiệm thu (2)</th>
                  <th className="px-4 py-3 text-right text-purple-700 font-bold">Đã Thanh Toán (3)</th>
                  <th className="px-4 py-3 text-right text-rose-900 font-bold">Nợ cần chi trả (2-3)</th>
                  <th className="px-4 py-3 text-center">Phân loại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredSubContracts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">Không tìm thấy hợp đồng nào phù hợp bộ lọc!</td>
                  </tr>
                ) : (
                  filteredSubContracts.map(c => {
                    const outstandingContract = c.value - c.paidValue;
                    const outstandingAccepted = c.acceptedValue - c.paidValue;
                    const contrObj = contractors.find(item => item.id === c.partnerId);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/40">
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{c.contractNumber}</td>
                        <td className="px-4 py-3">
                          <div className="text-slate-900 font-bold text-xs">{getPartnerName(c.partnerId, 'Contractor')}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{c.title}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-semibold">{getProjectName(c.projectId)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-900">{formatVND(c.value)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700">{formatVND(c.acceptedValue)}</td>
                        <td className="px-4 py-3 text-right font-mono text-purple-700 font-bold bg-purple-50/10">{formatVND(c.paidValue)}</td>
                        <td className={`px-4 py-3 text-right font-mono font-bold bg-rose-50/20 ${outstandingAccepted > 0 ? 'text-rose-600 font-extrabold animate-pulse' : 'text-slate-400 font-normal'}`}>
                          {outstandingAccepted > 0 ? formatVND(outstandingAccepted) : '0 ₫'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            contrObj?.type === 'Subcontractor' ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {contrObj?.type === 'Subcontractor' ? 'Thầu phụ' : 'Cung ứng'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {subTab === 'partners' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-150 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Mã đối tác</th>
                  <th className="px-4 py-3 text-left">Tên đơn vị đối tác</th>
                  <th className="px-4 py-3 text-left">Vai trò / Phân nhóm</th>
                  <th className="px-4 py-3 text-left">Người đại diện liên hệ</th>
                  <th className="px-4 py-3 text-left">Số điện thoại</th>
                  <th className="px-4 py-3 text-left">Thư điện tử (Email)</th>
                  <th className="px-4 py-3 text-center">Liên kết hợp đồng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {/* 1. Render Clients */}
                {clients.map(cli => {
                  const contractCount = contracts.filter(c => c.partnerId === cli.id).length;
                  return (
                    <tr key={cli.id} className="hover:bg-slate-50/40 bg-blue-50/5">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-500">{cli.id}</td>
                      <td className="px-4 py-3 text-slate-900 font-bold flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{cli.name}</span>
                      </td>
                      <td className="px-4 py-3 text-blue-700 font-bold uppercase text-[9px] tracking-wider">Chủ Đầu Tư</td>
                      <td className="px-4 py-3 text-slate-700">{cli.contactPerson}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{cli.phone}</td>
                      <td className="px-4 py-3 text-slate-500">{cli.email}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">{contractCount} Hợp đồng</td>
                    </tr>
                  );
                })}

                {/* 2. Render Contractors */}
                {contractors.map(ctr => {
                  const contractCount = contracts.filter(c => c.partnerId === ctr.id).length;
                  return (
                    <tr key={ctr.id} className="hover:bg-slate-50/40">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-500">{ctr.code || ctr.id}</td>
                      <td className="px-4 py-3 text-slate-900 font-bold flex items-center gap-2">
                        <Handshake className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                        <span>{ctr.name}</span>
                      </td>
                      <td className="px-4 py-3 text-orange-700 font-bold uppercase text-[9px] tracking-wider">
                        {ctr.type === 'Subcontractor' ? 'Thầu phụ thi công' : 'Cung cấp vật tư'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{ctr.contactPerson}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{ctr.phone}</td>
                      <td className="px-4 py-3 text-slate-500">{ctr.email}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-slate-800">{contractCount} Hợp đồng</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Vouchers Section */}
      {subTab === 'vouchers' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-1">
          {/* LEFT COLUMN: VOUCHERS LIST */}
          <div className="xl:col-span-5 space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Sổ Quản Lý Chứng Từ Thu / Chi
                </h4>
                <button
                  onClick={() => {
                    setNewVoucherNo(`PT-00${vouchersList.length + 1}`);
                    setNewVoucherType('Receipt');
                    setNewVoucherDebit('1111 (Tiền mặt)');
                    setNewVoucherCredit('131 (Phải thu KH)');
                    setNewVoucherDate(new Date().toISOString().split('T')[0]);
                    setShowCreateVoucherModal(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-md shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Lập Phiếu Mới
                </button>
              </div>

              {/* Filter and Search inside list */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo Số phiếu, người nộp/nhận..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 bg-white border border-slate-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {vouchersList
                .filter(v =>
                  v.voucherNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  v.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  v.reason.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(v => {
                  const isReceipt = v.type === 'Receipt';
                  const isSelected = selectedVoucher?.id === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVoucher(v)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-blue-50/50 border-blue-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${
                        isReceipt ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {isReceipt ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {v.voucherNo}
                            <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-sans font-bold uppercase tracking-wider ${
                              isReceipt ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {isReceipt ? 'Phiếu Thu' : 'Phiếu Chi'}
                            </span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono font-medium">{v.date}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 truncate">{v.personName}</p>
                        <p className="text-[10px] text-slate-500 truncate italic">{v.reason}</p>
                        {v.projectRelated && (
                          <p className="text-[9px] text-blue-600 font-semibold uppercase tracking-wider mt-1">{v.projectRelated}</p>
                        )}
                      </div>
                      <div className="text-right flex flex-col justify-between h-full space-y-3">
                        <span className={`font-mono text-xs font-extrabold ${isReceipt ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isReceipt ? '+' : '-'}{v.amount.toLocaleString('vi-VN')} ₫
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVoucher(v.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors self-end"
                          title="Xóa chứng từ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* RIGHT COLUMN: DETAILED PRINT PREVIEW */}
          <div className="xl:col-span-7">
            {selectedVoucher ? (
              <div className="space-y-4">
                {/* Toolbar Actions */}
                <div className="bg-slate-900 text-white p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                      <Printer className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-[11px] font-black uppercase tracking-wider">Xem thử bản in chứng từ</h4>
                      <p className="text-[9px] text-slate-300 font-sans font-medium">Nhấp vào chữ bất kỳ trên phiếu để sửa trực tiếp • Tải file chuẩn</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrintVoucher(selectedVoucher)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      In Phiếu / PDF
                    </button>
                    <button
                      onClick={() => handleExportVoucherExcel(selectedVoucher)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Mẫu Excel (.XLS)
                    </button>
                    <button
                      onClick={() => handleExportVoucherWord(selectedVoucher)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Mẫu Word (.DOC)
                    </button>
                  </div>
                </div>

                {/* Physical Paper layout */}
                <div className="bg-yellow-50/5 border border-amber-200/25 p-1 rounded-xl shadow-inner bg-slate-50 flex justify-center">
                  <div
                    id={`printable-paper-voucher-${selectedVoucher.id}`}
                    className="bg-white shadow-lg border border-slate-200 p-8 md:p-10 text-black max-w-[700px] w-full min-h-[850px] flex flex-col justify-between select-text"
                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                  >
                    {/* Top Row: Unit details & Form code */}
                    <div className="flex justify-between items-start text-xs border-b border-dashed border-slate-100 pb-4">
                      <div className="w-[55%] space-y-1.5">
                        <div className="font-extrabold uppercase leading-tight text-[11px]">
                          Đơn vị: <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const val = e.target.innerText;
                              setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, unitName: val } : v));
                            }}
                            className="hover:bg-amber-50 focus:bg-amber-50 focus:outline-none p-0.5 rounded cursor-pointer border-b border-slate-200"
                          >
                            {companyConfig?.companyName || selectedVoucher.unitName}
                          </span>
                        </div>
                        <div className="text-[10px] leading-relaxed text-slate-700">
                          Địa chỉ: <span
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => {
                              const val = e.target.innerText;
                              setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, unitAddress: val } : v));
                            }}
                            className="hover:bg-amber-50 focus:bg-amber-50 focus:outline-none p-0.5 rounded cursor-pointer border-b border-slate-200"
                          >
                            {companyConfig?.siteOffice || selectedVoucher.unitAddress}
                          </span>
                        </div>
                      </div>

                      <div className="w-[45%] text-center space-y-1">
                        <div className="font-extrabold text-[12px] uppercase">
                          {selectedVoucher.type === 'Receipt' ? 'Mẫu số 01 - TT' : 'Mẫu số 02 - TT'}
                        </div>
                        <div className="text-[9.5px] italic leading-tight text-slate-600">
                          {selectedVoucher.type === 'Receipt' ? (
                            <span>(Ban hành theo Thông tư số 200/2014/TT-BTC<br />Ngày 22/12/2014 của Bộ Tài chính)</span>
                          ) : (
                            <span>(Kèm theo Thông tư số 99/2025/TT-BTC<br />ngày 27 tháng 10 năm 2025 của Bộ trưởng Bộ Tài chính)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Main Title section */}
                    <div className="text-center my-6 space-y-1.5">
                      <h2 className="text-2xl font-black tracking-widest text-black uppercase">
                        {selectedVoucher.type === 'Receipt' ? 'PHIẾU THU' : 'PHIẾU CHI'}
                      </h2>
                      <div className="text-[11px] italic text-slate-700">
                        Ngày {new Date(selectedVoucher.date).getDate()} tháng {new Date(selectedVoucher.date).getMonth() + 1} năm {new Date(selectedVoucher.date).getFullYear()}
                      </div>
                    </div>

                    {/* Code / Accounts details */}
                    <div className="flex justify-end text-xs font-semibold mb-6 pr-4">
                      <div className="space-y-1 min-w-[150px]">
                        <div>Quyển số: <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, bookNo: val } : v));
                          }}
                          className="font-bold border-b border-slate-300 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.bookNo}</span></div>

                        <div>Số phiếu: <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, voucherNo: val } : v));
                          }}
                          className="font-bold text-red-600 border-b border-slate-300 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.voucherNo}</span></div>

                        <div>Nợ TK: <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, debitAccount: val } : v));
                          }}
                          className="font-mono border-b border-slate-300 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.debitAccount}</span></div>

                        <div>Có TK: <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, creditAccount: val } : v));
                          }}
                          className="font-mono border-b border-slate-300 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.creditAccount}</span></div>
                      </div>
                    </div>

                    {/* Content Rows */}
                    <div className="space-y-4 text-[12.5px] leading-relaxed flex-1">
                      <div className="flex items-baseline">
                        <span className="font-bold shrink-0">Họ và tên người {selectedVoucher.type === 'Receipt' ? 'nộp' : 'nhận'} tiền:</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, personName: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 font-bold px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.personName}</span>
                      </div>

                      <div className="flex items-baseline">
                        <span className="font-bold shrink-0">Địa chỉ:</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, personAddress: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.personAddress}</span>
                      </div>

                      <div className="flex items-baseline">
                        <span className="font-bold shrink-0">Lý do {selectedVoucher.type === 'Receipt' ? 'nộp' : 'chi'}:</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, reason: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.reason}</span>
                      </div>

                      <div className="flex flex-wrap items-baseline gap-y-2">
                        <span className="font-bold shrink-0">Số tiền:</span>
                        <span className="ml-2 font-mono font-bold text-[13.5px] border-b border-dotted border-slate-400 px-1">
                          {selectedVoucher.amount.toLocaleString('vi-VN')} ₫
                        </span>
                        <span className="font-bold ml-4 shrink-0">(Viết bằng chữ):</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, amountWords: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 italic px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.amountWords}</span>
                      </div>

                      <div className="flex items-baseline">
                        <span className="font-bold shrink-0">Kèm theo:</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, attachmentsCount: val } : v));
                          }}
                          className="w-16 mx-2 border-b border-dotted border-slate-400 text-center font-bold focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.attachmentsCount}</span>
                        <span className="font-bold shrink-0">Chứng từ gốc:</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, attachmentsDetail: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.attachmentsDetail}</span>
                      </div>
                    </div>

                    {/* Date & Signatures Grid */}
                    <div className="mt-8 space-y-4">
                      <div className="text-right italic text-[11px] pr-8">
                        Ngày {new Date(selectedVoucher.date).getDate()} tháng {new Date(selectedVoucher.date).getMonth() + 1} năm {new Date(selectedVoucher.date).getFullYear()}
                      </div>

                      <div className="grid grid-cols-5 text-center text-[10px] gap-1 font-sans">
                        <div>
                          <div className="font-bold text-slate-800">Giám đốc</div>
                          <div className="italic text-[8px] text-slate-500">(Ký, họ tên, đóng dấu)</div>
                          <div className="h-12"></div>
                          <div className="font-bold text-slate-800">{companyConfig?.directorName || 'Vũ Đức Thành'}</div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Kế toán trưởng</div>
                          <div className="italic text-[8px] text-slate-500">(Ký, họ tên)</div>
                          <div className="h-12"></div>
                          <div className="font-bold text-slate-800">{companyConfig?.chiefAccountantName || 'Mai Thị Xuân'}</div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{selectedVoucher.type === 'Receipt' ? 'Người nộp tiền' : 'Thủ quỹ'}</div>
                          <div className="italic text-[8px] text-slate-500">(Ký, họ tên)</div>
                          <div className="h-12"></div>
                          <div className="font-bold text-slate-800 truncate" title={selectedVoucher.personName}>
                            {selectedVoucher.type === 'Receipt' ? selectedVoucher.personName : (companyConfig?.treasurerName || 'Trần Quốc Bảo')}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Người lập phiếu</div>
                          <div className="italic text-[8px] text-slate-500">(Ký, họ tên)</div>
                          <div className="h-12"></div>
                          <div className="font-bold text-slate-800">{companyConfig?.treasurerName || 'Nguyễn Văn Hải'}</div>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{selectedVoucher.type === 'Receipt' ? 'Thủ quỹ' : 'Người nhận tiền'}</div>
                          <div className="italic text-[8px] text-slate-500">(Ký, họ tên)</div>
                          <div className="h-12"></div>
                          <div className="font-bold text-slate-800 truncate" title={selectedVoucher.personName}>
                            {selectedVoucher.type === 'Receipt' ? (companyConfig?.treasurerName || 'Trần Quốc Bảo') : selectedVoucher.personName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom notes */}
                    <div className="mt-8 pt-4 border-t border-dashed border-slate-200 space-y-2 text-[11px] text-slate-800">
                      <div className="flex items-baseline">
                        <span className="font-bold shrink-0">Đã nhận đủ số tiền (viết bằng chữ):</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, receivedWords: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 italic px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.receivedWords || selectedVoucher.amountWords}</span>
                      </div>

                      <div className="flex items-baseline">
                        <span className="font-bold shrink-0">+ Tỷ giá ngoại tệ (vàng bạc, đá quý):</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, exchangeRateDetail: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.exchangeRateDetail}</span>
                      </div>

                      <div className="flex items-baseline">
                        <span className="font-bold shrink-0">+ Số tiền quy đổi:</span>
                        <span
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const val = e.target.innerText;
                            setVouchersList(prev => prev.map(v => v.id === selectedVoucher.id ? { ...v, convertedAmount: val } : v));
                          }}
                          className="flex-1 ml-2 border-b border-dotted border-slate-400 font-bold px-1 focus:outline-none hover:bg-amber-50"
                        >{selectedVoucher.convertedAmount}</span>
                      </div>

                      <div className="text-[10px] italic text-slate-500 mt-2 text-center font-serif">
                        (Liên gửi ra ngoài phải đóng dấu)
                      </div>

                      {selectedVoucher.type === 'Payment' && (
                        <div className="text-[9px] text-slate-400 leading-tight border-l-2 border-slate-200 pl-2 mt-4 italic font-sans">
                          <strong>Ghi chú:</strong> Tùy theo đặc điểm hoạt động sản xuất kinh doanh và yêu cầu quản lý của đơn vị mình, doanh nghiệp được xây dựng, thiết kế biểu mẫu chứng từ kế toán.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-xs font-bold font-sans">Vui lòng chọn hoặc lập chứng từ mới từ danh sách bên trái để hiển thị</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- MODAL: THÊM ĐỐI TÁC -------------------- */}
      {showAddPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Thêm đối tác doanh nghiệp mới
              </h3>
              <button
                onClick={() => setShowAddPartnerModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddPartner} className="p-5 space-y-4 text-xs font-semibold">
              <div>
                <label className="text-slate-400 block mb-1">Mã đối tác = ID nội bộ *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: DT-006"
                  value={newPartnerCode}
                  onChange={(e) => setNewPartnerCode(e.target.value.toUpperCase())}
                  className="w-full p-2 border border-slate-200 rounded-lg font-bold uppercase"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Tên Đơn vị Đối tác *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Công ty TNHH Sắt Thép Việt Nam"
                  value={newPartnerName}
                  onChange={(e) => setNewPartnerName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Phân loại Vai trò *</label>
                <select
                  value={newPartnerType}
                  onChange={(e) => setNewPartnerType(e.target.value as any)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="Subcontractor">Thầu phụ thi công (Subcontractor)</option>
                  <option value="Supplier">Nhà phân phối vật tư (Supplier)</option>
                  <option value="Client">Chủ đầu tư dự án (Client/Owner)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Người đại diện liên hệ *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nguyễn Văn A"
                    value={newPartnerContact}
                    onChange={(e) => setNewPartnerContact(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Số điện thoại *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 0909.888.xxx"
                    value={newPartnerPhone}
                    onChange={(e) => setNewPartnerPhone(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Hòm thư điện tử (Email)</label>
                <input
                  type="email"
                  placeholder="e.g. contact@domain.vn"
                  value={newPartnerEmail}
                  onChange={(e) => setNewPartnerEmail(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddPartnerModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-sm"
                >
                  Lưu đối tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: KÝ HỢP ĐỒNG MỚI -------------------- */}
      {showAddContractModal && userRole === 'CEO' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Đăng ký ký kết hợp đồng thi công mới
              </h3>
              <button
                onClick={() => setShowAddContractModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddContract} className="p-5 space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Mã Số Hợp Đồng *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HD-SUB-CONSTRUCTION"
                    value={newContractNo}
                    onChange={(e) => setNewContractNo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Liên kết Dự án Công trình *</label>
                  <select
                    required
                    value={newContractProjectId}
                    onChange={(e) => setNewContractProjectId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="">-- Chọn công trình --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tiêu đề hợp đồng / Nội dung thi công chính *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hợp đồng nguyên tắc cung cấp cáp điện ngầm dầm móng"
                  value={newContractTitle}
                  onChange={(e) => setNewContractTitle(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Phân hệ hợp đồng *</label>
                  <select
                    value={newContractPartnerType}
                    onChange={(e) => {
                      setNewContractPartnerType(e.target.value as any);
                      setNewContractPartnerId('');
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="Contractor">Đầu ra - HĐ với Thầu phụ/Cung ứng</option>
                    <option value="Client">Đầu vào - HĐ với Chủ đầu tư</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Đơn vị liên kết ký kết *</label>
                  <select
                    required
                    value={newContractPartnerId}
                    onChange={(e) => setNewContractPartnerId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {newContractPartnerType === 'Client' ? (
                      clients.map(cli => (
                        <option key={cli.id} value={cli.id}>{cli.name} (Chủ đầu tư)</option>
                      ))
                    ) : (
                      contractors.map(ctr => (
                        <option key={ctr.id} value={ctr.id}>{ctr.name} ({ctr.type === 'Subcontractor' ? 'Thầu phụ' : 'Cung ứng'})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Tổng Giá Trị Hợp Đồng (VND) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 5000000000"
                    value={newContractValue || ''}
                    onChange={(e) => setNewContractValue(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Số tiền Đã Tạm Ứng khởi công (VND)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1000000000"
                    value={newContractAdvance || ''}
                    onChange={(e) => setNewContractAdvance(Number(e.target.value))}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-slate-800"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddContractModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg shadow-sm"
                >
                  Ký kết hợp đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: GHI NHẬN THU THU / CHI TRẢ TIỀN -------------------- */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400 animate-spin" />
                Ghi nhận bút toán dòng tiền & thanh toán nợ
              </h3>
              <button
                onClick={() => setShowRecordPaymentModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-5 space-y-4 text-xs font-semibold">

              <div>
                <label className="text-slate-400 block mb-1">Loại Nghiệp Vụ Dòng Tiền *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('Collection');
                      setSelectedContractId('');
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      paymentType === 'Collection'
                        ? 'bg-blue-50 border-blue-300 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Thu hồi nợ Chủ đầu tư
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentType('Payment');
                      setSelectedContractId('');
                    }}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      paymentType === 'Payment'
                        ? 'bg-purple-50 border-purple-300 text-purple-700 font-bold'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Chi trả nợ Thầu phụ / NPP
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Chọn Hợp Đồng cần hạch toán *</label>
                <select
                  required
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-xs font-bold"
                >
                  <option value="">-- Chọn hợp đồng --</option>
                  {contracts
                    .filter(c => c.partnerType === (paymentType === 'Collection' ? 'Client' : 'Contractor'))
                    .map(c => {
                      const outstanding = c.acceptedValue - c.paidValue;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.contractNumber} - {getPartnerName(c.partnerId, c.partnerType)} (Thực nợ dồn: {formatVND(outstanding)})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Số tiền thanh toán thực tế (VND) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500000000"
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Ghi chú / Diễn giải thanh toán</label>
                <input
                  type="text"
                  placeholder="e.g. Thu hồi tiền nghiệm thu đợt 3 móng hầm"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRecordPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Hạch toán bút toán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: NGHIỆM THU KHỐI LƯỢNG THI CÔNG -------------------- */}
      {showRecordVolumeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Ghi nhận khối lượng nghiệm thu thực tế (A-B)
              </h3>
              <button
                onClick={() => setShowRecordVolumeModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleRecordAcceptance} className="p-5 space-y-4 text-xs font-semibold">

              <div>
                <label className="text-slate-400 block mb-1">Chọn Hợp Đồng cần Nghiệm thu *</label>
                <select
                  required
                  value={acceptanceContractId}
                  onChange={(e) => setAcceptanceContractId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-mono text-xs font-bold"
                >
                  <option value="">-- Chọn hợp đồng --</option>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.partnerType === 'Client' ? 'Đầu vào' : 'Đầu ra'}] {c.contractNumber} - {getPartnerName(c.partnerId, c.partnerType)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Giá trị Khối lượng nghiệm thu đợt này (VND) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 1500000000"
                  value={acceptanceValue || ''}
                  onChange={(e) => setAcceptanceValue(Number(e.target.value))}
                  className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Biên bản nghiệm thu liên quan / Ghi chú</label>
                <input
                  type="text"
                  placeholder="e.g. Nghiệm thu hoàn thành đổ bê tông dầm nhịp chính số 2"
                  value={acceptanceNote}
                  onChange={(e) => setAcceptanceNote(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowRecordVolumeModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Xác nhận nghiệm thu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* -------------------- MODAL: LẬP CHỨNG TỪ THU / CHI BỘ TÀI CHÍNH -------------------- */}
      {showCreateVoucherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Lập chứng từ hạch toán kế toán mới (Thông tư BTC)
              </h3>
              <button
                onClick={() => setShowCreateVoucherModal(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewVoucher} className="p-6 space-y-4 text-xs font-semibold">

              {/* Type and Template selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Loại Chứng Từ *</label>
                  <select
                    value={newVoucherType}
                    onChange={(e) => {
                      const val = e.target.value as 'Receipt' | 'Payment';
                      setNewVoucherType(val);
                      const prefix = val === 'Receipt' ? 'PT' : 'PC';
                      setNewVoucherNo(`${prefix}-00${vouchersList.length + 1}`);
                      if (val === 'Receipt') {
                        setNewVoucherDebit('1111 (Tiền mặt)');
                        setNewVoucherCredit('131 (Phải thu KH)');
                      } else {
                        setNewVoucherDebit('331 (Phải trả NCC)');
                        setNewVoucherCredit('1111 (Tiền mặt)');
                      }
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 font-bold"
                  >
                    <option value="Receipt">Phiếu Thu (Mẫu 01-TT)</option>
                    <option value="Payment">Phiếu Chi (Mẫu 02-TT)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Số Phiếu *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PT-001"
                    value={newVoucherNo}
                    onChange={(e) => setNewVoucherNo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-red-600 font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Quyển số</label>
                  <input
                    type="text"
                    placeholder="e.g. Q-01"
                    value={newVoucherBookNo}
                    onChange={(e) => setNewVoucherBookNo(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Accounts & Date */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Tài khoản Nợ *</label>
                  <input
                    type="text"
                    required
                    value={newVoucherDebit}
                    onChange={(e) => setNewVoucherDebit(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Tài khoản Có *</label>
                  <input
                    type="text"
                    required
                    value={newVoucherCredit}
                    onChange={(e) => setNewVoucherCredit(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Ngày lập phiếu *</label>
                  <input
                    type="date"
                    required
                    value={newVoucherDate}
                    onChange={(e) => setNewVoucherDate(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono"
                  />
                </div>
              </div>

              {/* Recipient / Submitter details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">
                    {newVoucherType === 'Receipt' ? 'Họ và tên người nộp tiền *' : 'Họ và tên người nhận tiền *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nguyễn Văn A"
                    value={newVoucherPersonName}
                    onChange={(e) => setNewVoucherPersonName(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-bold"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Địa chỉ người nộp/nhận</label>
                  <input
                    type="text"
                    placeholder="e.g. Cầu Giấy, Hà Nội"
                    value={newVoucherPersonAddress}
                    onChange={(e) => setNewVoucherPersonAddress(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Reason & Amount */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-slate-400 block mb-1">Lý do nộp / chi *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Thu hồi công nợ đợt 2 theo hợp đồng móng hầm"
                    value={newVoucherReason}
                    onChange={(e) => setNewVoucherReason(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Số tiền (VND) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50000000"
                    value={newVoucherAmount || ''}
                    onChange={(e) => {
                      const amt = Number(e.target.value);
                      setNewVoucherAmount(amt);
                      setNewVoucherAmountWords(convertNumberToVietnameseWords(amt));
                    }}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Read Only Auto Word Translation */}
              <div>
                <label className="text-slate-400 block mb-1">Viết bằng chữ (Tự động dịch)</label>
                <input
                  type="text"
                  readOnly
                  value={newVoucherAmountWords}
                  className="w-full p-2 border border-slate-100 rounded-lg bg-slate-50 italic text-slate-600 font-serif"
                />
              </div>

              {/* Attachments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Số chứng từ gốc đính kèm</label>
                  <input
                    type="text"
                    placeholder="e.g. 02"
                    value={newVoucherAttachmentsCount}
                    onChange={(e) => setNewVoucherAttachmentsCount(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg font-mono text-center"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-slate-400 block mb-1">Chi tiết danh mục chứng từ gốc</label>
                  <input
                    type="text"
                    placeholder="e.g. Hóa đơn GTGT số 00213 và biên bản nghiệm thu"
                    value={newVoucherAttachmentsDetail}
                    onChange={(e) => setNewVoucherAttachmentsDetail(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Project reference */}
              <div>
                <label className="text-slate-400 block mb-1">Hạch toán cho Dự án công trình</label>
                <select
                  value={newVoucherProject}
                  onChange={(e) => setNewVoucherProject(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50"
                >
                  <option value="">Không liên kết dự án (Chi phí chung)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-150 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateVoucherModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Ghi sổ & Lập phiếu
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
