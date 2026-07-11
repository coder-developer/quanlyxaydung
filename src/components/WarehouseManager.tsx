import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, 
  ArrowDownLeft, 
  ArrowUpRight, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Plus, 
  Building2, 
  ClipboardList, 
  FileSpreadsheet, 
  Activity, 
  ShieldCheck, 
  Boxes,
  HelpCircle,
  TrendingDown,
  Printer,
  Download,
  FileText
} from 'lucide-react';
import { InventoryItem, InventoryLedger, MaterialLimit, Project, FinancialTransaction, CompanyConfig, UserRole } from '../types';

interface WarehouseManagerProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  inventoryItems: InventoryItem[];
  setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  inventoryLedger: InventoryLedger[];
  setInventoryLedger: React.Dispatch<React.SetStateAction<InventoryLedger[]>>;
  materialLimits: MaterialLimit[];
  setMaterialLimits: React.Dispatch<React.SetStateAction<MaterialLimit[]>>;
  transactions: FinancialTransaction[];
  setTransactions: React.Dispatch<React.SetStateAction<FinancialTransaction[]>>;
  globalSearchQuery?: string;
  companyConfig?: CompanyConfig;
  userRole?: UserRole;
}

export default function WarehouseManager({
  projects,
  setProjects,
  inventoryItems,
  setInventoryItems,
  inventoryLedger,
  setInventoryLedger,
  materialLimits,
  setMaterialLimits,
  transactions,
  setTransactions,
  globalSearchQuery,
  companyConfig,
  userRole
}: WarehouseManagerProps) {
  const [warehouseTab, setWarehouseTab] = useState<'stock' | 'transaction' | 'ledger'>('stock');
  const [searchTerm, setSearchTerm] = useState('');

  // Synchronize with global search query
  useEffect(() => {
    if (globalSearchQuery !== undefined) {
      setSearchTerm(globalSearchQuery);
      if (globalSearchQuery) {
        setWarehouseTab('stock');
      }
    }
  }, [globalSearchQuery]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [selectedItemFilter, setSelectedItemFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New item modal state
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    unit: '',
    avgCost: 100000,
    initialQty: 0
  });

  // Voucher state
  const [voucher, setVoucher] = useState({
    projectId: projects[0]?.id || '',
    itemId: inventoryItems[0]?.id || '',
    type: 'Receipt' as 'Receipt' | 'Issue',
    quantity: 10,
    unitPrice: 0,
    sourceOrDestination: '',
    approvedBy: 'Kế toán kho',
    autoAccounting: true // Checkbox to automatically post payment/expense to P&L
  });

  // Ledger printable voucher state
  const [selectedLedgerVoucher, setSelectedLedgerVoucher] = useState<InventoryLedger | null>(null);
  const [showLedgerVoucherModal, setShowLedgerVoucherModal] = useState(false);

  // Toast notifier
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const getProjectName = (id: string) => {
    return projects.find(p => p.id === id)?.name || 'Kho trung tâm';
  };

  const getItemName = (id: string) => {
    return inventoryItems.find(item => item.id === id)?.name || 'Vật tư không rõ';
  };

  // Add new material stock catalog item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.unit) {
      showToast('Vui lòng điền tên và đơn vị tính.');
      return;
    }

    const generatedId = `item-${Date.now().toString().slice(-4)}`;
    const generatedCode = newItem.code || `VT-${(inventoryItems.length + 1).toString().padStart(3, '0')}`;
    const createdItem: InventoryItem = {
      id: generatedId,
      code: generatedCode,
      name: newItem.name,
      unit: newItem.unit,
      totalReceived: newItem.initialQty,
      totalIssued: 0,
      onHand: newItem.initialQty,
      avgCost: newItem.avgCost
    };

    setInventoryItems(prev => [...prev, createdItem]);
    setVoucher(prev => ({ ...prev, itemId: generatedId })); // Auto-select the newly registered item
    showToast(`Đã thêm mã vật tư mới thành công: ${newItem.name} (${generatedCode})`);
    setShowAddItemModal(false);
    setNewItem({ code: '', name: '', unit: '', avgCost: 100000, initialQty: 0 });
  };

  // Export Warehouse Voucher to Excel (Blank signatures)
  const handleExportVoucherExcel = (voucher: InventoryLedger | null) => {
    if (!voucher) return;
    const filename = `Phieu_${voucher.type === 'Receipt' ? 'nhap' : 'xuat'}_kho_${voucher.id}.xls`;
    const reportDateStr = new Date().toLocaleString('vi-VN');
    const itemName = getItemName(voucher.itemId);
    const itemUnit = inventoryItems.find(i => i.id === voucher.itemId)?.unit || 'Đơn vị';
    const totalAmount = voucher.quantity * voucher.unitPrice;

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Chung tu kho</x:Name>
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
          .subtitle { font-size: 10pt; font-style: italic; text-align: center; margin-bottom: 20px; }
          .header-table { width: 100%; border: none; font-size: 10pt; }
          .data-table { border-collapse: collapse; width: 100%; font-size: 10pt; margin-top: 15px; }
          .data-table th { background-color: #f1f5f9; border: 1px solid #94a3b8; font-weight: bold; padding: 8px; text-align: center; }
          .data-table td { border: 1px solid #cbd5e1; padding: 8px; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td colspan="4" style="font-weight: bold; text-transform: uppercase;">${companyConfig?.companyName || 'CÔNG TY CP XÂY DỰNG & QUẢN LÝ DỰ ÁN CONSTRUCT-OS ERP'}</td>
            <td colspan="3" style="text-align: right; font-weight: bold; font-family: monospace;">SỐ PHIẾU: ${voucher.id}</td>
          </tr>
          <tr>
            <td colspan="4">Ban Điều Hành Dự Án: ${getProjectName(voucher.projectId)}</td>
            <td colspan="3" style="text-align: right;">Mẫu số: ${voucher.type === 'Receipt' ? '01-VT' : '02-VT'} (TT 200/2014/TT-BTC)</td>
          </tr>
          <tr>
            <td colspan="4">Địa điểm công trường: ${companyConfig?.siteOffice || 'Dã chiến quốc lộ / Công trình cấp bách'}</td>
            <td colspan="3" style="text-align: right;">Ngày lập: ${voucher.date}</td>
          </tr>
        </table>

        <br>
        <div class="title">${voucher.type === 'Receipt' ? 'PHIẾU NHẬP KHO VẬT TƯ' : 'PHIẾU XUẤT KHO CẤP PHÁT'}</div>
        <div class="subtitle">
          ${voucher.type === 'Receipt' 
            ? 'Nợ TK 152 (Nguyên liệu, vật liệu) &bull; Có TK 331 / 111' 
            : 'Nợ TK 621 (Chi phí NVL trực tiếp) &bull; Có TK 152 (Vật liệu)'}
        </div>

        <table class="header-table" style="margin-top: 10px;">
          <tr>
            <td colspan="3"><strong>${voucher.type === 'Receipt' ? 'Họ tên người giao:' : 'Họ tên người nhận:'}</strong> ${voucher.sourceOrDestination.split(' (')[0] || 'Đối tác cấp phát dã chiến'}</td>
            <td colspan="4"><strong>Nơi giao / Nơi nhận hạch toán:</strong> ${voucher.sourceOrDestination}</td>
          </tr>
          <tr>
            <td colspan="3"><strong>Căn cứ lệnh điều động / Hóa đơn:</strong> LĐĐ-${voucher.id.slice(-5)} &bull; ${voucher.date}</td>
            <td colspan="4"><strong>Chỉ huy trưởng phê duyệt:</strong> ${voucher.approvedBy}</td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên, nhãn hiệu quy cách vật tư thiết bị</th>
              <th>Mã số</th>
              <th>Đơn vị tính</th>
              <th>Số lượng</th>
              <th>Đơn giá hạch toán (VND)</th>
              <th>Thành tiền (VND)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center;">1</td>
              <td style="font-weight: bold;">${itemName}</td>
              <td style="text-align: center; mso-number-format:'@';">${voucher.itemId}</td>
              <td style="text-align: center;">${itemUnit}</td>
              <td style="text-align: right; mso-number-format:'\\#\\,\\#\\#0'; font-weight: bold;">${voucher.quantity}</td>
              <td style="text-align: right; mso-number-format:'\\#\\,\\#\\#0';">${voucher.unitPrice}</td>
              <td style="text-align: right; mso-number-format:'\\#\\,\\#\\#0'; font-weight: bold;">${totalAmount}</td>
            </tr>
            <tr style="font-weight: bold; background-color: #f8fafc;">
              <td colspan="4" style="text-align: right; text-transform: uppercase;">TỔNG CỘNG GIÁ TRỊ:</td>
              <td style="text-align: right; mso-number-format:'\\#\\,\\#\\#0';">${voucher.quantity}</td>
              <td></td>
              <td style="text-align: right; mso-number-format:'\\#\\,\\#\\#0';">${totalAmount}</td>
            </tr>
          </tbody>
        </table>

        <br>
        <table style="width: 100%; border: none; margin-top: 30px; font-size: 10pt;">
          <tr>
            <td style="width: 25%; text-align: center; font-weight: bold; text-transform: uppercase; border: none;">Người lập phiếu</td>
            <td style="width: 25%; text-align: center; font-weight: bold; text-transform: uppercase; border: none;">Người giao / nhận</td>
            <td style="width: 25%; text-align: center; font-weight: bold; text-transform: uppercase; border: none;">Thủ kho dã chiến</td>
            <td style="width: 25%; text-align: center; font-weight: bold; text-transform: uppercase; border: none;">Chỉ huy trưởng / Duyệt</td>
          </tr>
          <tr>
            <td style="text-align: center; font-style: italic; color: #475569; font-size: 8.5pt; border: none;">(Ký, họ tên)</td>
            <td style="text-align: center; font-style: italic; color: #475569; font-size: 8.5pt; border: none;">(Ký, họ tên)</td>
            <td style="text-align: center; font-style: italic; color: #475569; font-size: 8.5pt; border: none;">(Ký, ghi rõ họ tên)</td>
            <td style="text-align: center; font-style: italic; color: #475569; font-size: 8.5pt; border: none;">(Ký, đóng dấu tròn)</td>
          </tr>
          <tr>
            <td style="height: 60px; border: none;"></td>
            <td style="height: 60px; border: none;"></td>
            <td style="height: 60px; border: none;"></td>
            <td style="height: 60px; border: none;"></td>
          </tr>
          <tr style="font-weight: bold;">
            <td style="text-align: center; border: none;">.....................................</td>
            <td style="text-align: center; border: none;">.....................................</td>
            <td style="text-align: center; border: none;">.....................................</td>
            <td style="text-align: center; border: none;">.....................................</td>
          </tr>
        </table>

        <br><br>
        <div style="font-style: italic; font-size: 8.5pt; color: #64748b;">Hệ thống hạch toán dã chiến ${companyConfig?.appTitle || 'Construct-OS'} &bull; Ngày xuất báo cáo: ${reportDateStr}</div>
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
    showToast(`Đã xuất chứng từ kho thành file Excel: ${filename}`);
  };

  // Post Receipt / Issue Voucher
  const handlePostVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventoryItems.find(i => i.id === voucher.itemId);
    if (!item) {
      showToast('Vật tư không hợp lệ.');
      return;
    }

    const qty = voucher.quantity;
    if (qty <= 0) {
      showToast('Số lượng xuất nhập phải lớn hơn 0.');
      return;
    }

    const selectedPrice = voucher.unitPrice || item.avgCost;

    // Validation: if Issue, check physical stock on Hand
    if (voucher.type === 'Issue' && item.onHand < qty) {
      showToast(`Không thể xuất kho! Số lượng tồn kho thực tế của "${item.name}" chỉ còn ${item.onHand} ${item.unit}.`);
      return;
    }

    // Validation: if Issue, check project material limits budget
    let overBudget = false;
    let limitObj = materialLimits.find(l => l.projectId === voucher.projectId && l.itemId === voucher.itemId);
    if (voucher.type === 'Issue' && limitObj) {
      const remainingLimit = limitObj.plannedQty - limitObj.actualIssuedQty;
      if (qty > remainingLimit) {
        overBudget = true;
        const confirmForce = window.confirm(
          `CẢNH BÁO VƯỢT ĐỊNH MỨC KỸ THUẬT!\n\n` +
          `- Vật tư: ${item.name}\n` +
          `- Định mức thiết kế còn lại: ${remainingLimit} ${item.unit}\n` +
          `- Số lượng đề xuất xuất kho: ${qty} ${item.unit}\n\n` +
          `Lượng xuất vượt dự toán định mức thiết kế là ${qty - remainingLimit} ${item.unit}.\n` +
          `Hệ thống sẽ ghi nhận cờ "VƯỢT ĐỊNH MỨC" và cảnh báo trong bảng báo cáo. Bạn có đồng ý xuất kho không?`
        );
        if (!confirmForce) return;
      }
    }

    const generatedLedgerId = `ledger-${Date.now()}`;
    const dateStr = new Date().toISOString().split('T')[0];

    // 1. Create Ledger entry
    const newLedger: InventoryLedger = {
      id: generatedLedgerId,
      itemId: voucher.itemId,
      projectId: voucher.projectId,
      type: voucher.type,
      quantity: qty,
      unitPrice: selectedPrice,
      sourceOrDestination: voucher.sourceOrDestination || (voucher.type === 'Receipt' ? 'Nhà cung cấp dã chiến' : 'Tổ thi công hiện trường'),
      date: dateStr,
      approvedBy: voucher.approvedBy
    };

    setInventoryLedger(prev => [newLedger, ...prev]);

    // 2. Update physical inventory items catalog
    setInventoryItems(prevItems => 
      prevItems.map(i => {
        if (i.id === voucher.itemId) {
          const newReceived = voucher.type === 'Receipt' ? i.totalReceived + qty : i.totalReceived;
          const newIssued = voucher.type === 'Issue' ? i.totalIssued + qty : i.totalIssued;
          const newOnHand = voucher.type === 'Receipt' ? i.onHand + qty : i.onHand - qty;
          
          // Re-calculate weighted average cost if it is a new receipt
          let newAvgCost = i.avgCost;
          if (voucher.type === 'Receipt') {
            const oldTotalVal = i.onHand * i.avgCost;
            const newReceiptVal = qty * selectedPrice;
            newAvgCost = Math.round((oldTotalVal + newReceiptVal) / (i.onHand + qty));
          }

          return {
            ...i,
            totalReceived: newReceived,
            totalIssued: newIssued,
            onHand: newOnHand,
            avgCost: newAvgCost
          };
        }
        return i;
      })
    );

    // 3. Update Project Material budget limit tracker
    if (voucher.type === 'Issue') {
      setMaterialLimits(prevLimits => {
        const exists = prevLimits.some(l => l.projectId === voucher.projectId && l.itemId === voucher.itemId);
        if (exists) {
          return prevLimits.map(l => {
            if (l.projectId === voucher.projectId && l.itemId === voucher.itemId) {
              return { ...l, actualIssuedQty: l.actualIssuedQty + qty };
            }
            return l;
          });
        } else {
          // If no design limit is set yet, dynamically create one
          return [...prevLimits, { projectId: voucher.projectId, itemId: voucher.itemId, plannedQty: qty, actualIssuedQty: qty }];
        }
      });
    }

    // 4. Auto accounting integration: if checked, buy actions create cash outflow P&L transaction!
    if (voucher.autoAccounting) {
      const totalCost = qty * selectedPrice;
      
      const newTx: FinancialTransaction = {
        id: `tx-mat-${Date.now()}`,
        projectId: voucher.projectId,
        type: voucher.type === 'Receipt' ? 'Expense' : 'Expense', // Material receipt is payment, issue is construction allocation
        category: 'Material',
        amount: totalCost,
        description: voucher.type === 'Receipt' 
          ? `Thanh toán mua vật tư hàng hóa "${item.name}" - ${qty} ${item.unit} (Phiếu: ${generatedLedgerId})`
          : `Phân bổ chi phí xuất kho thi công "${item.name}" - ${qty} ${item.unit} (Phiếu: ${generatedLedgerId})`,
        date: dateStr,
        referenceId: generatedLedgerId
      };

      // Only add to expense if receipt is an actual purchase (Receipt), or if issue represents direct project cost matching
      // We post directly to project transactions!
      setTransactions(prev => [newTx, ...prev]);

      // Cascade update: increase spent budget of the project
      setProjects(prevProjs => 
        prevProjs.map(p => {
          if (p.id === voucher.projectId) {
            return {
              ...p,
              spent: p.spent + totalCost
            };
          }
          return p;
        })
      );
    }

    showToast(`Đã ghi sổ kho thành công! Phiếu ${voucher.type === 'Receipt' ? 'Nhập' : 'Xuất'} ${generatedLedgerId} đã được đồng bộ hóa với hệ thống Kế toán.`);
    setVoucher(prev => ({
      ...prev,
      quantity: 10,
      unitPrice: 0,
      sourceOrDestination: ''
    }));
  };

  // Export Inventory ledger history to beautiful standard Excel worksheet HTML
  const handleExportWarehouseLedgerExcel = () => {
    const filename = `Nhat_ky_nhap_xuat_kho_vat_tu_${Date.now()}.xls`;
    const reportDateStr = new Date().toLocaleString('vi-VN');

    let rowsHtml = '';
    let receiptSum = 0;
    let issueSum = 0;

    const filteredLedgers = inventoryLedger.filter(l => {
      const matchesProj = selectedProjectFilter === 'all' || l.projectId === selectedProjectFilter;
      const matchesItem = selectedItemFilter === 'all' || l.itemId === selectedItemFilter;
      return matchesProj && matchesItem;
    });

    filteredLedgers.forEach((l, idx) => {
      const item = inventoryItems.find(i => i.id === l.itemId);
      const totalValue = l.quantity * l.unitPrice;
      if (l.type === 'Receipt') receiptSum += totalValue;
      else issueSum += totalValue;

      rowsHtml += `
        <tr>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; font-weight: bold; padding: 6px; mso-number-format:'@';">${l.id}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${l.date}</td>
          <td style="border: 1px solid #cbd5e1; font-weight: bold; padding: 6px;">${item?.name || 'Vật tư'}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px;">${item?.unit || ''}</td>
          <td style="border: 1px solid #cbd5e1; text-align: center; padding: 6px; font-weight: bold; color: ${l.type === 'Receipt' ? '#166534' : '#e11d48'}">
            ${l.type === 'Receipt' ? 'NHẬP KHO' : 'XUẤT KHO'}
          </td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0';">${l.quantity}</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0';">${l.unitPrice}</td>
          <td style="border: 1px solid #cbd5e1; text-align: right; padding: 6px; mso-number-format:'\\#\\,\\#\\#0'; font-weight: bold; background-color: #f8fafc;">${totalValue}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${getProjectName(l.projectId)}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px;">${l.sourceOrDestination}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center;">${l.approvedBy}</td>
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
                <x:Name>Nhat Ky Nhap Xuat</x:Name>
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
        <div style="font-weight: bold; text-transform: uppercase; font-size: 10pt;">${companyConfig?.companyName || 'CONSTRUCT-OS ERP CONSTRUCTION'}</div>
        <div style="font-size: 9pt; color: #64748b;">Hệ thống Kiểm soát Chống thất thoát vật tư - ${companyConfig?.appTitle || 'Construct-OS'}</div>
        <br>
        <div class="title">SỔ ĐỐI CHIẾU & NHẬT KÝ CHI TIẾT NHẬP XUẤT KHO VẬT TƯ</div>
        <div style="text-align: center; font-style: italic; font-size: 10pt; margin-bottom: 20px;">Thời điểm kết xuất: ${reportDateStr}</div>
        <br>
        <table style="border-collapse: collapse; width: 100%; font-size: 9.5pt;">
          <thead>
            <tr class="table-header">
              <th style="border: 1px solid #475569; padding: 8px;">STT</th>
              <th style="border: 1px solid #475569; padding: 8px;">Số chứng từ</th>
              <th style="border: 1px solid #475569; padding: 8px;">Ngày lập</th>
              <th style="border: 1px solid #475569; padding: 8px;">Tên vật tư hàng hóa</th>
              <th style="border: 1px solid #475569; padding: 8px;">ĐVT</th>
              <th style="border: 1px solid #475569; padding: 8px;">Loại phiếu</th>
              <th style="border: 1px solid #475569; padding: 8px;">Số lượng</th>
              <th style="border: 1px solid #475569; padding: 8px;">Đơn giá bình quân (VND)</th>
              <th style="border: 1px solid #475569; padding: 8px;">Thành tiền (VND)</th>
              <th style="border: 1px solid #475569; padding: 8px;">Công trình công trường</th>
              <th style="border: 1px solid #475569; padding: 8px;">Nguồn cung / Nơi tiêu thụ</th>
              <th style="border: 1px solid #475569; padding: 8px;">Người duyệt chốt</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
            <tr style="font-weight: bold; background-color: #f8fafc;">
              <td colspan="6" style="border: 1px solid #94a3b8; text-align: right; padding: 8px;">TỔNG GIÁ TRỊ NHẬP KHO:</td>
              <td colspan="3" style="border: 1px solid #94a3b8; text-align: right; padding: 8px; mso-number-format:'\\#\\,\\#\\#0'; color: #166534;">${receiptSum}</td>
              <td colspan="3" style="border: 1px solid #94a3b8;"></td>
            </tr>
            <tr style="font-weight: bold; background-color: #f8fafc;">
              <td colspan="6" style="border: 1px solid #94a3b8; text-align: right; padding: 8px;">TỔNG GIÁ TRỊ XUẤT THI CÔNG:</td>
              <td colspan="3" style="border: 1px solid #94a3b8; text-align: right; padding: 8px; mso-number-format:'\\#\\,\\#\\#0'; color: #e11d48;">${issueSum}</td>
              <td colspan="3" style="border: 1px solid #94a3b8;"></td>
            </tr>
          </tbody>
        </table>
        <br>
        <div style="font-style: italic; font-size: 8.5pt;">Tài liệu ban hành nội bộ chuẩn phòng kế toán hậu cần.</div>
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
    showToast(`Đã xuất nhật ký nhập xuất thành công: ${filename}`);
  };

  return (
    <div className="bg-slate-50 min-h-[500px]" id="warehouse-logistics-section">
      {/* Role-Based Info Banner */}
      {(userRole === 'Auditor' || userRole === 'SiteManager') && (
        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-[11px] flex items-center justify-between gap-3 text-amber-850">
          <div className="flex items-center gap-2">
            <span className="font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-xs uppercase tracking-wider text-[9px] shrink-0">
              {userRole === 'Auditor' ? 'Thanh tra / Khách' : 'Chỉ Huy Trưởng'}
            </span>
            <span>
              {userRole === 'Auditor' 
                ? 'Bạn đang ở chế độ xem báo cáo dã chiến. Các thao tác lập phiếu nhập/xuất kho hoặc thay đổi định mức dự toán bị khóa.'
                : 'Bạn đang quản lý công trường dã chiến. Bạn có thể xuất kho vật tư dã chiến cho tổ thi công, nhưng quyền chỉnh sửa danh mục vật tư gốc và thay đổi định mức kế hoạch thuộc về CEO/Kế toán.'}
            </span>
          </div>
        </div>
      )}

      {/* Mini tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 pt-1 shadow-xs gap-4 mb-4">
        <button
          onClick={() => setWarehouseTab('stock')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            warehouseTab === 'stock' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Tồn Kho Vật Tư & Định Mức Dự Toán</span>
          <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">{inventoryItems.length} loại</span>
        </button>

        <button
          onClick={() => setWarehouseTab('transaction')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            warehouseTab === 'transaction' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Lập Phiếu Nhập / Xuất Kho</span>
        </button>

        <button
          onClick={() => setWarehouseTab('ledger')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            warehouseTab === 'ledger' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Nhật Ký Giao Dịch Kho</span>
          <span className="bg-slate-100 text-slate-700 text-[10px] px-1.5 py-0.2 rounded-full font-bold">{inventoryLedger.length} dòng</span>
        </button>
      </div>

      {/* Toast message */}
      {toastMessage && (
        <div className="mx-4 mb-4 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between text-xs font-semibold border-l-4 border-l-emerald-500 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white ml-2 text-sm font-bold">×</button>
        </div>
      )}

      {/* TAB 1: STOCK & DESIGN LIMITS */}
      {warehouseTab === 'stock' && (
        <div className="p-4 space-y-6">
          {/* Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm vật tư thiết bị..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => setShowAddItemModal(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Đăng Ký Mã Vật Tư</span>
            </button>
          </div>

          {/* Catalog items list */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Danh mục hàng hóa tồn kho thực tế dã chiến</h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="px-4 py-3">Mã hàng</th>
                    <th className="px-4 py-3">Tên vật tư, vật liệu xây dựng</th>
                    <th className="px-4 py-3 text-center">Đơn vị</th>
                    <th className="px-4 py-3 text-right">Lũy kế nhập</th>
                    <th className="px-4 py-3 text-right">Lũy kế xuất thi công</th>
                    <th className="px-4 py-3 text-right bg-blue-50/50 text-blue-900">TỒN KHO THỰC TẾ</th>
                    <th className="px-4 py-3 text-right">Đơn giá mua bình quân</th>
                    <th className="px-4 py-3 text-right">Tổng giá trị tồn kho</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {inventoryItems
                    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 font-semibold">
                        <td className="px-4 py-3 font-mono font-bold text-slate-800 bg-slate-50/50">{item.code || item.id}</td>
                        <td className="px-4 py-3 text-slate-800">{item.name}</td>
                        <td className="px-4 py-3 text-center font-normal text-slate-600">{item.unit}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600">+{item.totalReceived}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600">-{item.totalIssued}</td>
                        <td className="px-4 py-3 text-right font-mono bg-blue-50/50 text-blue-700 font-black text-sm">
                          {item.onHand}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-500 font-normal">{formatVND(item.avgCost)}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-800 font-bold">
                          {formatVND(item.onHand * item.avgCost)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Project material limit comparisons (ĐỊNH MỨC DỰ TOÁN VS THỰC TẾ) */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h4 className="text-xs font-black text-rose-800 uppercase tracking-wider">
                Bảng đối chiếu định mức hao hụt vật tư theo công trường (Chống thất thoát)
              </h4>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="px-4 py-3">Công trường công trình</th>
                    <th className="px-4 py-3">Hạng mục Vật tư</th>
                    <th className="px-4 py-3 text-center">Đơn vị</th>
                    <th className="px-4 py-3 text-right">Định mức thiết kế (Dự toán)</th>
                    <th className="px-4 py-3 text-right text-rose-600">Thực xuất công trường</th>
                    <th className="px-4 py-3 text-right">Dự toán còn lại</th>
                    <th className="px-4 py-3 text-center">Trực quan tỷ lệ hao hụt</th>
                    <th className="px-4 py-3 text-center">Cảnh báo hệ thống</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {materialLimits.map((l, index) => {
                    const item = inventoryItems.find(i => i.id === l.itemId);
                    const remaining = l.plannedQty - l.actualIssuedQty;
                    const pct = Math.min(100, Math.round((l.actualIssuedQty / l.plannedQty) * 100));
                    
                    const isOver = l.actualIssuedQty > l.plannedQty;
                    const isWarning = !isOver && l.actualIssuedQty >= l.plannedQty * 0.9;

                    return (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-800">{getProjectName(l.projectId)}</td>
                        <td className="px-4 py-3 font-bold text-slate-700">{item?.name || 'Vật tư'}</td>
                        <td className="px-4 py-3 text-center text-slate-500 font-normal">{item?.unit}</td>
                        <td className="px-4 py-3 text-right font-mono">{l.plannedQty}</td>
                        <td className="px-4 py-3 text-right font-mono text-rose-600">{l.actualIssuedQty}</td>
                        <td className={`px-4 py-3 text-right font-mono ${remaining < 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                          {remaining}
                        </td>
                        <td className="px-4 py-3 text-center w-40">
                          <div className="flex items-center gap-2">
                            <div className="w-full bg-slate-100 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  isOver ? 'bg-rose-600' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-mono font-bold w-10 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isOver ? (
                            <span className="inline-flex px-2 py-0.5 rounded-sm bg-rose-100 text-rose-800 text-[9px] font-black uppercase border border-rose-200">
                              Báo Động: Vượt Định Mức!
                            </span>
                          ) : isWarning ? (
                            <span className="inline-flex px-2 py-0.5 rounded-sm bg-amber-100 text-amber-800 text-[9px] font-black uppercase border border-amber-200 animate-pulse">
                              Cận định mức
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase border border-emerald-200">
                              Trong phạm vi an toàn
                            </span>
                          )}
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

      {/* TAB 2: POST RECIEPT / ISSUE VOUCHERS */}
      {warehouseTab === 'transaction' && (
        <div className="p-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-md">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-400" />
                <span>Khai báo lập phiếu xuất nhập kho dã chiến</span>
              </h3>
            </div>

            <form onSubmit={handlePostVoucher} className="p-6 space-y-5">
              {/* Select project */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Công trường xử lý *</label>
                <select
                  required
                  value={voucher.projectId}
                  onChange={(e) => setVoucher(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Select Type and Material */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Loại phiếu *</label>
                  <select
                    value={voucher.type}
                    onChange={(e) => setVoucher(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="Receipt">Nhập kho (Receipt - Mua hàng về kho)</option>
                    <option value="Issue">Xuất kho (Issue - Cấp phát thi công)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Chọn loại vật liệu *</label>
                    <button
                      type="button"
                      onClick={() => setShowAddItemModal(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-extrabold flex items-center gap-1 focus:outline-none cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Đăng ký mã mới</span>
                    </button>
                  </div>
                  <select
                    required
                    value={voucher.itemId}
                    onChange={(e) => setVoucher(prev => ({ ...prev, itemId: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    {inventoryItems.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.name} (Tồn hiện tại: {i.onHand} {i.unit})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quantity and Price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Số lượng xuất/nhập *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={voucher.quantity}
                    onChange={(e) => setVoucher(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono font-bold text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Đơn giá định khoản (VND)</label>
                  <input
                    type="number"
                    placeholder="Để 0 để áp giá bình quân gia quyền"
                    value={voucher.unitPrice}
                    onChange={(e) => setVoucher(prev => ({ ...prev, unitPrice: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono text-right"
                  />
                </div>
              </div>

              {/* Source/Destination */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Nguồn cung cấp / Đơn vị tiếp nhận tiêu thụ *</label>
                <input
                  type="text"
                  required
                  placeholder={voucher.type === 'Receipt' ? 'Ví dụ: NPP Thép Việt, hoặc Nhà máy xi măng' : 'Ví dụ: Tổ bê tông móng mố M1'}
                  value={voucher.sourceOrDestination}
                  onChange={(e) => setVoucher(prev => ({ ...prev, sourceOrDestination: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Supervisor Approved */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase">Cán bộ bàn giao / Giám sát hiện trường duyệt ký *</label>
                <input
                  type="text"
                  required
                  value={voucher.approvedBy}
                  onChange={(e) => setVoucher(prev => ({ ...prev, approvedBy: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                />
              </div>

              {/* Auto general ledger accounting checkbox */}
              <div className="flex items-start gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="auto-accounting-chk"
                  checked={voucher.autoAccounting}
                  onChange={(e) => setVoucher(prev => ({ ...prev, autoAccounting: e.target.checked }))}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 mt-0.5"
                />
                <div className="text-xs">
                  <label htmlFor="auto-accounting-chk" className="font-extrabold text-slate-700 block">
                    Đồng bộ hóa hạch toán dòng chi tài chính (Material Expense)
                  </label>
                  <p className="text-slate-400 text-[10px] font-medium leading-relaxed">
                    Khi chốt phiếu, hệ thống sẽ tự sinh 1 dòng chi phí mua/phân bổ vật tư dã hiện trực tiếp vào Sổ Cái Kế Toán, làm thay đổi ngân sách thực chi (spent) của dự án.
                  </p>
                </div>
              </div>

              {/* Submit button */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>XÁC NHẬN CHỐT PHIẾU & GHI SỔ ERP</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: LEDGER GIAO DỊCH KHO */}
      {warehouseTab === 'ledger' && (
        <div className="p-4 space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Selected project */}
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50"
              >
                <option value="all">Tất cả công trường</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* Selected material item */}
              <select
                value={selectedItemFilter}
                onChange={(e) => setSelectedItemFilter(e.target.value)}
                className="border border-slate-200 rounded-lg text-xs py-1.5 px-3 bg-slate-50"
              >
                <option value="all">Tất cả vật liệu</option>
                {inventoryItems.map(i => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportWarehouseLedgerExcel}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all shadow-xs"
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
              <span>Xuất Sổ Kho Ra Excel</span>
            </button>
          </div>

          {/* Ledger Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-extrabold tracking-wider uppercase">
                    <th className="px-4 py-3">Số chứng từ</th>
                    <th className="px-4 py-3">Ngày lập</th>
                    <th className="px-4 py-3">Tên vật tư</th>
                    <th className="px-4 py-3 text-center">Đơn vị</th>
                    <th className="px-4 py-3 text-center">Loại phiếu</th>
                    <th className="px-4 py-3 text-right">Số lượng</th>
                    <th className="px-4 py-3 text-right">Đơn giá hạch toán</th>
                    <th className="px-4 py-3 text-right">Thành tiền</th>
                    <th className="px-4 py-3">Địa điểm công trình</th>
                    <th className="px-4 py-3">Nơi giao / Nơi nhận</th>
                    <th className="px-4 py-3 text-center">Người duyệt ký</th>
                    <th className="px-4 py-3 text-center print:hidden">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {inventoryLedger
                    .filter(l => {
                      const matchesProj = selectedProjectFilter === 'all' || l.projectId === selectedProjectFilter;
                      const matchesItem = selectedItemFilter === 'all' || l.itemId === selectedItemFilter;
                      return matchesProj && matchesItem;
                    })
                    .map((l) => {
                      const item = inventoryItems.find(i => i.id === l.itemId);
                      return (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono font-bold text-slate-500">{l.id}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">{l.date}</td>
                          <td className="px-4 py-3 font-black text-slate-800">{item?.name || 'Không rõ'}</td>
                          <td className="px-4 py-3 text-center text-slate-500 font-normal">{item?.unit}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex px-2 py-0.5 rounded-sm text-[9px] font-black uppercase ${
                              l.type === 'Receipt' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {l.type === 'Receipt' ? 'Nhập Kho' : 'Xuất Kho'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-800">{l.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-500 font-normal">{formatVND(l.unitPrice)}</td>
                          <td className="px-4 py-3 text-right font-mono text-slate-800">{formatVND(l.quantity * l.unitPrice)}</td>
                          <td className="px-4 py-3 text-slate-600 font-normal">{getProjectName(l.projectId)}</td>
                          <td className="px-4 py-3 text-slate-700 font-normal">{l.sourceOrDestination}</td>
                          <td className="px-4 py-3 text-center font-normal text-slate-500">{l.approvedBy}</td>
                          <td className="px-4 py-3 text-center print:hidden">
                            <button
                              onClick={() => {
                                setSelectedLedgerVoucher(l);
                                setShowLedgerVoucherModal(true);
                              }}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded font-bold text-[10px] flex items-center gap-1 transition-all mx-auto"
                              title="Xem chi tiết phiếu nhập/xuất kho chuẩn và in/tải PDF"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>In Phiếu / PDF</span>
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

      {/* MODAL: ĐĂNG KÝ MÃ VẬT TƯ MỚI */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Boxes className="w-5 h-5 text-blue-400" />
                <span>Đăng Ký Mã Vật Tư Mới</span>
              </h3>
              <button 
                onClick={() => setShowAddItemModal(false)} 
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

             <form onSubmit={handleAddItem} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Mã vật tư</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: VT-01"
                    value={newItem.code}
                    onChange={(e) => setNewItem(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Tên vật tư, vật liệu xây dựng *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Xi măng Vicem PCB40"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Đơn vị tính *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Tấn, Bao, m3..."
                    value={newItem.unit}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase">Tồn dã chiến đầu kỳ *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newItem.initialQty}
                    onChange={(e) => setNewItem(prev => ({ ...prev, initialQty: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono text-right"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase block">
                  Đơn giá bình quân dự kiến (VND) *
                </label>
                <input
                  type="number"
                  required
                  value={newItem.avgCost}
                  onChange={(e) => setNewItem(prev => ({ ...prev, avgCost: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none font-mono text-right text-slate-800 font-bold"
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddItemModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  Xác nhận đăng ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IN PHIẾU NHẬP KHO / PHIẾU XUẤT KHO CHUẨN BỘ TÀI CHÍNH (ĐỂ KÝ SỐ/KÝ TAY) */}
      {showLedgerVoucherModal && selectedLedgerVoucher && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto print:p-0 print:bg-white">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 max-w-2xl w-full overflow-hidden flex flex-col my-8 print:my-0 print:border-none print:shadow-none print:rounded-none animate-scale-up">
            {/* Toolbar header */}
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800 print:hidden">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Xuất Bản Chứng Từ Kho (Excel Lưu Ký)</span>
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportVoucherExcel(selectedLedgerVoucher)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel Ký</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowLedgerVoucherModal(false);
                    setSelectedLedgerVoucher(null);
                  }}
                  className="text-slate-400 hover:text-white font-black text-xl px-2 py-1"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Printable Frame */}
            <div className="p-8 space-y-6 bg-amber-50/10 overflow-y-auto max-h-[80vh] print:p-0 print:bg-white print:max-h-none print:overflow-visible font-serif" id="printable-warehouse-voucher-doc">
              {/* Document Letterhead */}
              <div className="flex items-start justify-between border-b border-dashed border-slate-300 pb-4">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-[11px] text-slate-850 uppercase tracking-tight font-sans">
                    {companyConfig?.companyName || 'CÔNG TY CP XÂY DỰNG & QUẢN LÝ DỰ ÁN CONSTRUCT-OS ERP'}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-sans">Ban Điều Hành Dự Án: <span className="font-bold text-slate-700">{getProjectName(selectedLedgerVoucher.projectId)}</span></p>
                  <p className="text-[9px] text-slate-500 font-sans">Địa điểm công trường: Dã chiến quốc lộ / Công trình cấp bách</p>
                </div>
                
                <div className="text-right space-y-0.5 font-sans">
                  <h3 className="font-black text-slate-900 text-xs tracking-widest font-mono">{selectedLedgerVoucher.id}</h3>
                  <p className="text-[8.5px] text-slate-400">Ban hành theo TT 200/2014/TT-BTC</p>
                  <p className="text-[9px] text-slate-400">Mẫu số: <span className="font-bold">{selectedLedgerVoucher.type === 'Receipt' ? '01-VT' : '02-VT'}</span></p>
                  <p className="text-[9.5px] font-bold text-slate-500 font-mono">Ngày lập: {selectedLedgerVoucher.date}</p>
                </div>
              </div>

              {/* Title */}
              <div className="text-center space-y-1">
                <h2 className="text-base font-black text-slate-900 uppercase tracking-wider">
                  {selectedLedgerVoucher.type === 'Receipt' ? 'PHIẾU NHẬP KHO VẬT TƯ' : 'PHIẾU XUẤX KHO CẤP PHÁT'}
                </h2>
                <p className="text-[9.5px] text-slate-500 font-sans italic">
                  {selectedLedgerVoucher.type === 'Receipt' 
                    ? 'Nợ TK 152 (Nguyên liệu, vật liệu) &bull; Có TK 331 / 111' 
                    : 'Nợ TK 621 (Chi phí NVL trực tiếp) &bull; Có TK 152 (Vật liệu)'}
                </p>
              </div>

              {/* Body particulars */}
              <div className="text-[11px] space-y-3 font-sans">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">
                      {selectedLedgerVoucher.type === 'Receipt' ? 'Họ tên người giao vật tư:' : 'Họ tên người nhận vật tư:'}
                    </span>
                    <span className="font-bold text-slate-800">{selectedLedgerVoucher.sourceOrDestination.split(' (')[0] || 'Đối tác cấp phát dã chiến'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Nơi giao / Nơi nhận hạch toán:</span>
                    <span className="font-semibold text-slate-700">{selectedLedgerVoucher.sourceOrDestination}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Căn cứ lệnh điều động / Hóa đơn:</span>
                    <span className="font-mono text-slate-700">LĐĐ-{selectedLedgerVoucher.id.slice(-5)} &bull; {selectedLedgerVoucher.date}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase block">Người phê duyệt / Chỉ huy trưởng:</span>
                    <span className="font-bold text-slate-800">{selectedLedgerVoucher.approvedBy}</span>
                  </div>
                </div>
              </div>

              {/* Material Details Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse font-sans text-[10.5px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                      <th className="px-3 py-2 text-center w-10">STT</th>
                      <th className="px-3 py-2">Tên, nhãn hiệu quy cách vật tư thiết bị</th>
                      <th className="px-3 py-2 text-center w-16">Mã số</th>
                      <th className="px-3 py-2 text-center w-16">ĐVT</th>
                      <th className="px-3 py-2 text-right w-20">Số lượng</th>
                      <th className="px-3 py-2 text-right w-28">Đơn giá hạch toán</th>
                      <th className="px-3 py-2 text-right w-32">Thành tiền (VND)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="px-3 py-2.5 text-center font-mono">1</td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-800">{getItemName(selectedLedgerVoucher.itemId)}</div>
                        <div className="text-[8.5px] text-slate-400 font-sans">Đảm bảo quy chuẩn kỹ thuật thiết kế xây lắp công trình</div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-500">{selectedLedgerVoucher.itemId}</td>
                      <td className="px-3 py-2.5 text-center font-mono text-slate-600">{inventoryItems.find(i => i.id === selectedLedgerVoucher.itemId)?.unit || 'Đvị'}</td>
                      <td className="px-3 py-2.5 text-right font-bold font-mono">{selectedLedgerVoucher.quantity}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-600">{formatVND(selectedLedgerVoucher.unitPrice)}</td>
                      <td className="px-3 py-2.5 text-right font-bold font-mono text-slate-900">{formatVND(selectedLedgerVoucher.quantity * selectedLedgerVoucher.unitPrice)}</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-800">
                      <td colSpan={4} className="px-3 py-2.5 text-right uppercase tracking-wider text-[9px]">Tổng cộng giá trị hạch toán kho:</td>
                      <td className="px-3 py-2.5 text-right font-mono">{selectedLedgerVoucher.quantity}</td>
                      <td className="px-3 py-2.5"></td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-950 text-xs">{formatVND(selectedLedgerVoucher.quantity * selectedLedgerVoucher.unitPrice)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Verbal amount summary */}
              <p className="text-[10px] italic text-slate-500 font-sans mt-2">
                * Lũy kế giá trị hạch toán thành công và ghi nhận tại sổ nhật ký chung ERP.
              </p>

              {/* Signatures & Stamps Section - Left Blank for Manual Signing */}
              <div className="grid grid-cols-4 gap-2 pt-6 text-center text-[9px] leading-relaxed font-sans border-t border-slate-200 relative min-h-[140px]">
                {/* 1 */}
                <div className="space-y-0.5">
                  <span className="font-extrabold block text-slate-900 uppercase">Người lập phiếu</span>
                  <span className="text-[8px] text-slate-400 italic block">(Ký, họ tên)</span>
                  <div className="h-12 flex items-end justify-center">
                    <span className="text-slate-300">.......................</span>
                  </div>
                  <span className="font-bold text-slate-400 block mt-1">.......................</span>
                </div>

                {/* 2 */}
                <div className="space-y-0.5">
                  <span className="font-extrabold block text-slate-900 uppercase">Người giao / nhận</span>
                  <span className="text-[8px] text-slate-400 italic block">(Ký, họ tên)</span>
                  <div className="h-12 flex items-end justify-center">
                    <span className="text-slate-300">.......................</span>
                  </div>
                  <span className="font-bold text-slate-400 block mt-1">.......................</span>
                </div>

                {/* 3 */}
                <div className="space-y-0.5">
                  <span className="font-extrabold block text-slate-900 uppercase">Thủ kho dã chiến</span>
                  <span className="text-[8px] text-slate-400 italic block">(Ký, ghi rõ họ tên)</span>
                  <div className="h-12 flex items-end justify-center">
                    <span className="text-slate-300">.......................</span>
                  </div>
                  <span className="font-bold text-slate-400 block mt-1">.......................</span>
                </div>

                {/* 4 */}
                <div className="space-y-0.5 relative">
                  <span className="font-extrabold block text-slate-900 uppercase">Chỉ huy trưởng / Duyệt</span>
                  <span className="text-[8px] text-slate-400 italic block">(Ký, đóng dấu tròn)</span>
                  <div className="h-12 flex items-end justify-center">
                    <span className="text-slate-300">.......................</span>
                  </div>
                  <span className="font-bold text-slate-400 block mt-1">.......................</span>
                </div>
              </div>
            </div>

            {/* Actions Footer inside modal */}
            <div className="bg-slate-50 px-6 py-4 flex gap-2 justify-end border-t border-slate-200 print:hidden">
              <button
                type="button"
                onClick={() => {
                  setShowLedgerVoucherModal(false);
                  setSelectedLedgerVoucher(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all"
              >
                Đóng lại
              </button>
              
              <button
                type="button"
                onClick={() => handleExportVoucherExcel(selectedLedgerVoucher)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Xuất Excel Phiếu</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
