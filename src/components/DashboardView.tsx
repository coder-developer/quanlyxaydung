/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { Project, Employee, Contractor, Contract, InventoryItem, MaterialLimit, Equipment, FinancialTransaction, CompanyConfig } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Wallet, Users, Package, AlertTriangle, Hammer, CheckCircle, Clock, MapPin, Gauge, Building2 } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  employees: Employee[];
  contractors: Contractor[];
  contracts: Contract[];
  inventoryItems: InventoryItem[];
  materialLimits: MaterialLimit[];
  equipment: Equipment[];
  transactions: FinancialTransaction[];
  globalSearchQuery?: string;
  companyConfig?: CompanyConfig;
}

export default function DashboardView({
  projects,
  employees,
  contractors,
  contracts,
  inventoryItems,
  materialLimits,
  equipment,
  transactions,
  globalSearchQuery,
  companyConfig
}: DashboardProps) {

  // --- FILTERED LISTS BASED ON GLOBAL SEARCH ---
  const filteredContracts = useMemo(() => {
    if (!globalSearchQuery) return contracts;
    const query = globalSearchQuery.toLowerCase().trim();
    return contracts.filter(contract => {
      const proj = projects.find(p => p.id === contract.projectId);
      const partnerName = contract.partnerType === 'Client'
        ? 'Chủ Đầu Tư'
        : (contractors.find(c => c.id === contract.partnerId)?.name || 'Thầu phụ');
      return contract.title.toLowerCase().includes(query) ||
             contract.contractNumber.toLowerCase().includes(query) ||
             partnerName.toLowerCase().includes(query) ||
             (proj && proj.name.toLowerCase().includes(query)) ||
             (proj && proj.manager.toLowerCase().includes(query));
    });
  }, [contracts, globalSearchQuery, projects, contractors]);

  const filteredMaterialLimits = useMemo(() => {
    if (!globalSearchQuery) return materialLimits;
    const query = globalSearchQuery.toLowerCase().trim();
    return materialLimits.filter(limit => {
      const proj = projects.find(p => p.id === limit.projectId);
      const item = inventoryItems.find(i => i.id === limit.itemId);
      return (proj && proj.name.toLowerCase().includes(query)) ||
             (item && item.name.toLowerCase().includes(query));
    });
  }, [materialLimits, globalSearchQuery, projects, inventoryItems]);

  const filteredEquipment = useMemo(() => {
    if (!globalSearchQuery) return equipment;
    const query = globalSearchQuery.toLowerCase().trim();
    return equipment.filter(eq => {
      const proj = projects.find(p => p.id === eq.currentProjectId);
      return eq.name.toLowerCase().includes(query) ||
             (proj && proj.name.toLowerCase().includes(query)) ||
             eq.status.toLowerCase().includes(query);
    });
  }, [equipment, globalSearchQuery, projects]);

  // --- KPI CALCULATIONS ---
  const totalBudget = useMemo(() => projects.reduce((sum, p) => sum + p.budget, 0), [projects]);
  const totalSpent = useMemo(() => projects.reduce((sum, p) => sum + p.spent, 0), [projects]);

  const activeWorkersCount = useMemo(() => employees.filter(e => e.active && e.role !== 'Chỉ huy trưởng' && e.role !== 'Kế toán công trường').length, [employees]);
  const activeStaffCount = useMemo(() => employees.filter(e => e.active).length, [employees]);

  // Material Warnings Count (where actualIssuedQty > plannedQty)
  const materialWarningsCount = useMemo(() => {
    return materialLimits.filter(limit => limit.actualIssuedQty > limit.plannedQty).length;
  }, [materialLimits]);

  // P&L Chart Data
  const chartData = useMemo(() => {
    return projects.map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 18) + '...' : p.name,
      'Ngân sách': p.budget / 1000000000, // Convert to Billion VND
      'Thực chi': p.spent / 1000000000,
      'Tiến độ (%)': p.progress
    }));
  }, [projects]);

  // Cost Category Pie Chart Data
  const pieData = useMemo(() => {
    const categories: Record<string, number> = {
      'Vật tư': 0,
      'Nhân công': 0,
      'Thầu phụ': 0,
      'Máy móc': 0,
      'Quản lý': 0
    };

    transactions.forEach(tx => {
      if (tx.type === 'Expense') {
        if (tx.category === 'Material') categories['Vật tư'] += tx.amount;
        else if (tx.category === 'Labor') categories['Nhân công'] += tx.amount;
        else if (tx.category === 'Subcontractor') categories['Thầu phụ'] += tx.amount;
        else if (tx.category === 'Equipment') categories['Máy móc'] += tx.amount;
        else categories['Quản lý'] += tx.amount; // Overhead
      }
    });

    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: Math.round(value / 1000000000 * 10) / 10 // to Billions
    })).filter(item => item.value > 0);
  }, [transactions]);

  const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Helper formatting money to VND
  const formatVND = (value: number) => {
    value = Number(value) || 0;
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + ' tỷ';
    }
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + ' triệu';
    }
    return value.toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className="space-y-6" id="dashboard-view-root">

      {/* Dynamic Corporate Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 rounded-2xl border border-slate-850 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-400" />
            <span className="text-[10px] font-black tracking-widest uppercase text-blue-450">TRUNG TÂM ĐIỀU HÀNH ERP DOANH NGHIỆP</span>
          </div>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight uppercase leading-none text-white mt-1">
            {companyConfig?.companyName || 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'}
          </h1>
          <p className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{companyConfig?.siteOffice || 'Ban điều hành '}</span>
          </p>
          <p className="text-[10px] text-slate-400">Văn phòng: {companyConfig?.officeAddress || companyConfig?.siteOffice || 'Chưa cập nhật'} • MST: {companyConfig?.taxCode || 'Chưa cập nhật'}</p>
        </div>
        <div className="flex flex-col md:items-end font-mono text-[10px] bg-slate-950/40 p-3 rounded-xl border border-slate-850 shrink-0 gap-1 text-slate-300">
          <div>ỨNG DỤNG: <strong className="text-blue-450 uppercase">{companyConfig?.appTitle || 'Quản trị doanh nghiệp'}</strong></div>
          <div>PHIÊN BẢN: <strong className="text-slate-200">1.0 STANDARD</strong></div>
          <div>NGƯỜI KÝ DUYỆT CHÍNH: <strong className="text-emerald-400">{companyConfig?.directorName || 'Đỗ Minh Tuấn'}</strong></div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Budget */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng Ngân Sách Dự Án</span>
            <div className="text-base font-extrabold text-slate-900 font-mono">{formatVND(totalBudget)}</div>
            <div className="text-[10px] text-slate-500">5 dự án đang thi công</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng Chi Thực Tế (Spent)</span>
            <div className="text-base font-extrabold text-slate-900 font-mono">{formatVND(totalSpent)}</div>
            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
              Hiệu suất chi: {((totalSpent / totalBudget) * 100).toFixed(1)}% ngân sách
            </div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600 shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Total Workers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Tổng Nhân Sự Đang Chạy</span>
            <div className="text-base font-extrabold text-slate-900 font-mono">{activeStaffCount} nhân sự</div>
            <div className="text-[10px] text-slate-500">
              {activeWorkersCount} công nhân | {activeStaffCount - activeWorkersCount} quản lý
            </div>
          </div>
          <div className="p-3 bg-sky-50 rounded-lg text-sky-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Inventory On Hand */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Vật Tư Tồn Kho Tổng</span>
            <div className="text-base font-extrabold text-slate-900 font-mono">
              {inventoryItems.reduce((sum, item) => sum + (Number(item.onHand) || 0), 0).toLocaleString()} Đvị
            </div>
            <div className="text-[10px] text-slate-500">5 danh mục vật tư chính</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-purple-600 shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Anomaly Alerts */}
        <div className={`p-4 rounded-xl border shadow-sm flex items-center justify-between transition-all ${
          materialWarningsCount > 0
            ? 'bg-rose-50 border-rose-200 text-rose-950 animate-pulse'
            : 'bg-white border-slate-200 text-slate-900'
        }`}>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cảnh Báo Định Mức</span>
            <div className={`text-base font-extrabold font-mono ${materialWarningsCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {materialWarningsCount} Cảnh Báo Đỏ
            </div>
            <div className="text-[10px] text-slate-500">Phát hiện xuất vượt định toán</div>
          </div>
          <div className={`p-3 rounded-lg shrink-0 ${
            materialWarningsCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Project Financial P&L Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-[350px]">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Cân đối Ngân Sách vs Thực Chi (Đơn vị: Tỷ VND)
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                <Tooltip
                  formatter={(value) => [`${value} tỷ VND`, '']}
                  contentStyle={{ fontSize: '11px', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Ngân sách" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Thực chi" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Category breakdown Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-[350px]">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" />
            Phân Rã Chi Phí Doanh Nghiệp (Tỷ VND)
          </h3>
          <div className="flex-1 min-h-0 flex items-center justify-center relative">
            <div className="w-full h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} tỷ VND`, '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Custom Legend for Pie */}
            <div className="absolute bottom-0 left-0 right-0 grid grid-cols-3 gap-1.5 text-[10px] text-slate-500 font-medium px-2">
              {pieData.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  <span className="truncate">{item.name} ({item.value}T)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Contract & Payables Ledger */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-600" />
          Hợp Đồng & Thanh Toán Thu/Trả thực tế
        </h3>

        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="min-w-full divide-y divide-slate-250 text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Số Hợp Đồng</th>
                <th className="px-4 py-3 text-left">Tên Hợp Đồng</th>
                <th className="px-4 py-3 text-left">Đối Tác</th>
                <th className="px-4 py-3 text-right">Giá Trị Gốc</th>
                <th className="px-4 py-3 text-right">Đã Tạm Ứng (Đã ứng)</th>
                <th className="px-4 py-3 text-right">Khối Lượng Nghiệm Thu</th>
                <th className="px-4 py-3 text-right">Thực Thu/Thực Trả</th>
                <th className="px-4 py-3 text-right text-amber-900 font-bold">Dư Nợ Còn Lại</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-150 font-medium">
              {filteredContracts.map((contract) => {
                // Find project and partner name
                const proj = projects.find(p => p.id === contract.projectId);
                const partnerName = contract.partnerType === 'Client'
                  ? 'Chủ Đầu Tư'
                  : (contractors.find(c => c.id === contract.partnerId)?.name || 'Thầu phụ');

                const outstanding = contract.value - contract.paidValue;

                return (
                  <tr key={contract.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{contract.contractNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{contract.title}</div>
                      <div className="text-[10px] text-slate-400">{proj?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        contract.partnerType === 'Client' ? 'bg-sky-50 text-sky-800' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {partnerName}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatVND(contract.value)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{formatVND(contract.advancePayment)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-800">{formatVND(contract.acceptedValue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-indigo-900">{formatVND(contract.paidValue)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${outstanding > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {formatVND(outstanding)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Materials Limits vs Real Issuance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Materials Tracker & Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4.5 h-4.5 text-emerald-600" />
              Định Mức Dự Toán Vật Tư Theo Công Trình
            </h3>
            <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              Kiểm soát thất thoát
            </span>
          </div>

          <div className="space-y-4">
            {filteredMaterialLimits.map((limit, idx) => {
              const proj = projects.find(p => p.id === limit.projectId);
              const item = inventoryItems.find(i => i.id === limit.itemId);
              if (!proj || !item) return null;

              const percentUsed = (limit.actualIssuedQty / limit.plannedQty) * 100;
              const isOver = limit.actualIssuedQty > limit.plannedQty;

              return (
                <div key={idx} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{item.name}</span>
                      <span className="text-[10px] text-slate-400 block">{proj.name}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900">{limit.actualIssuedQty}</span> / <span className="text-slate-500">{limit.plannedQty} {item.unit}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="relative w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver ? 'bg-rose-600' : percentUsed > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-500">Đã tiêu thụ: {percentUsed.toFixed(1)}% định toán</span>
                    {isOver ? (
                      <span className="font-bold text-rose-600 uppercase flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded">
                        ⚠️ ĐÃ VƯỢT ĐỊNH MỨC (+{(limit.actualIssuedQty - limit.plannedQty).toFixed(1)} {item.unit})
                      </span>
                    ) : percentUsed > 85 ? (
                      <span className="font-bold text-amber-600 uppercase bg-amber-50 px-1.5 py-0.5 rounded">
                        ⚠️ SẮP VƯỢT HẠN MỨC (Chạm ngưỡng)
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">Hợp lệ</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Equipment Heavy Machinery Dispatch Tracker */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Hammer className="w-4.5 h-4.5 text-emerald-600" />
            Luân Chuyển Thiết Bị & Tiêu Hao Nhiên Liệu
          </h3>

          <div className="space-y-4">
            {filteredEquipment.map((eq) => {
              const proj = projects.find(p => p.id === eq.currentProjectId);
              return (
                <div key={eq.id} className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800">{eq.name}</h4>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-xs font-semibold ${
                        eq.status === 'In-Use' ? 'bg-emerald-100 text-emerald-800' :
                        eq.status === 'Available' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {eq.status === 'In-Use' ? 'Đang chạy máy' : eq.status === 'Available' ? 'Đang rảnh' : 'Đang bảo dưỡng'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{proj ? proj.name : 'Kho tổng doanh nghiệp'}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 pt-1.5 text-[10px] text-slate-400">
                      <div>Định mức: <span className="font-semibold text-slate-700">{eq.fuelConsumptionRate}</span></div>
                      <div>Phụ tùng bảo dưỡng: <span className="font-semibold text-slate-700">{eq.nextMaintenance}</span></div>
                    </div>
                  </div>

                  {/* Fuel cost month */}
                  <div className="text-right shrink-0">
                    <span className="text-[9px] text-slate-400 uppercase block font-bold">Xăng dầu tháng này</span>
                    <span className="text-xs font-extrabold text-slate-900 font-mono block mt-0.5">{formatVND(eq.fuelCostThisMonth)}</span>
                    <span className="text-[9px] text-slate-400 italic block mt-0.5">Lũy kế máy chạy</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
