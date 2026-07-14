import React, { useState, useRef } from 'react';
import { CompanyConfig, UserRole } from '../types';
import {
  Building2, Save, FileText, CheckCircle2, RefreshCw,
  Printer, AlertCircle, Database, Download, Upload,
  Trash2, ToggleLeft, ToggleRight, Laptop,
  Cloud, Clock, Lock, Shield, Sliders, Check, Activity, AlertTriangle
} from 'lucide-react';

interface CompanyConfigViewProps {
  companyConfig: CompanyConfig;
  setCompanyConfig: React.Dispatch<React.SetStateAction<CompanyConfig>>;

  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  onImportBackup: (backup: any) => string | null;
  onExportBackup: () => void;
  onResetData: () => void;
  userRole?: UserRole;

  cloudSyncStatus?: 'idle' | 'syncing' | 'success' | 'error' | 'offline';
  lastSyncedTime?: string;
  cloudDbSyncEnabled?: boolean;
  setCloudDbSyncEnabled?: (enabled: boolean) => void;
  onPushToCloud?: () => Promise<string>;
  onPullFromCloud?: () => Promise<string>;
}

export default function CompanyConfigView({
  companyConfig,
  setCompanyConfig,
  autoSaveEnabled,
  setAutoSaveEnabled,
  onImportBackup,
  onExportBackup,
  onResetData,
  userRole,
  cloudSyncStatus = 'idle',
  lastSyncedTime = 'Chưa đồng bộ',
  cloudDbSyncEnabled = false,
  setCloudDbSyncEnabled,
  onPushToCloud,
  onPullFromCloud
}: CompanyConfigViewProps) {
  // Local state to manage edits before saving
  const [formConfig, setFormConfig] = useState<CompanyConfig>({
    ...companyConfig,
    appTitle: companyConfig.appTitle || 'Quản Trị Doanh Nghiệp'
  });
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleChange = (field: keyof CompanyConfig, value: any) => {
    setFormConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setCompanyConfig(formConfig);
    showToast('Đã đồng bộ thông tin doanh nghiệp & giao diện ERP lên toàn hệ thống!');
  };

  const handleResetToDefault = () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục thông tin doanh nghiệp về mặc định ban đầu không?')) {
      const defaults: CompanyConfig = {
        companyName: 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT',
        siteOffice: 'Ban điều hành - Dự án cao tốc Bắc Nam',
        directorName: 'Đỗ Minh Tuấn',
        chiefAccountantName: 'Nguyễn Thị Thanh Hà',
        treasurerName: 'Lê Thị Thu',
        technicianName: 'Trần Hải Nam',
        journalTitle: 'SỔ NHẬT KÝ CHUNG',
        dispatchTitle: 'LỆNH ĐIỀU ĐỘNG THIẾT BỊ CƠ GIỚI',
        fuelTitle: 'PHIẾU CẤP PHÁT XĂNG DẦU - NHIÊN LIỆU',
        maintenanceTitle: 'BIÊN BẢN NGHIỆM THU & BÀN GIAO SỬA CHỮA THIẾT BỊ',
        appTitle: 'Quản Trị Doanh Nghiệp',
      };
      setFormConfig(defaults);
      setCompanyConfig(defaults);
      showToast('Đã khôi phục cấu hình thông tin mặc định!');
    }
  };

  const handleFullResetDatabase = () => {
    if (userRole !== 'CEO') {
      showToast('Hành động khôi phục dữ liệu gốc hệ thống yêu cầu đặc quyền tối cao của Giám Đốc (CEO).', 'error');
      return;
    }
    if (window.confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ dữ liệu hiện tại trong bộ nhớ trình duyệt và tải lại dữ liệu mô phỏng gốc. Bạn có chắc chắn muốn tiếp tục?')) {
      onResetData();
      setFormConfig({
        companyName: 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT',
        siteOffice: 'Ban điều hành - Dự án cao tốc Bắc Nam',
        directorName: 'Đỗ Minh Tuấn',
        chiefAccountantName: 'Nguyễn Thị Thanh Hà',
        treasurerName: 'Lê Thị Thu',
        technicianName: 'Trần Hải Nam',
        journalTitle: 'SỔ NHẬT KÝ CHUNG',
        dispatchTitle: 'LỆNH ĐIỀU ĐỘNG THIẾT BỊ CƠ GIỚI',
        fuelTitle: 'PHIẾU CẤP PHÁT XĂNG DẦU - NHIÊN LIỆU',
        maintenanceTitle: 'BIÊN BẢN NGHIỆM THU & BÀN GIAO SỬA CHỮA THIẾT BỊ',
        appTitle: 'Quản Trị Doanh Nghiệp',
      });
      showToast('Đã reset toàn bộ cơ sở dữ liệu ERP về mặc định gốc thành công!', 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const error = onImportBackup(json);
        if (error) {
          showToast(`Lỗi nhập liệu: ${error}`, 'error');
        } else {
          // Update local edit form state as well
          setFormConfig({
            ...json.companyConfig,
            appTitle: json.companyConfig.appTitle || 'Quản Trị Doanh Nghiệp'
          });
          showToast('Đã đồng bộ và khôi phục toàn bộ cơ sở dữ liệu từ file backup thành công!', 'success');
        }
      } catch (err) {
        showToast('File backup không hợp lệ hoặc bị lỗi cú pháp JSON.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6" id="company-config-view">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed top-4 right-4 z-50 border px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-bounce ${
          toastMessage.type === 'success'
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-rose-900 border-rose-800 text-white'
        }`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Side: Form Controls */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider">Cấu hình thông tin doanh nghiệp & App ERP</h2>
                <p className="text-[10px] text-slate-400 mt-0.5">Tùy chỉnh thương hiệu, pháp nhân và cấu trúc tiêu đề mẫu in đồng bộ</p>
              </div>
            </div>

            <button
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors cursor-pointer"
              title="Khôi phục mặc định"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Mặc định</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Section A: Brand & App Title */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-blue-600 mb-3 border-b border-blue-50 pb-1.5 flex items-center gap-1.5">
                <Laptop className="w-4 h-4" />
                <span>I. Tên Giao diện Ứng dụng & Thương hiệu</span>
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tên hiển thị giao diện chính (App Name Banner)
                  </label>
                  <input
                    type="text"
                    value={formConfig.appTitle}
                    onChange={(e) => handleChange('appTitle', e.target.value)}
                    className="w-full text-xs font-black px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-blue-700 uppercase"
                    placeholder="Nhập tên hiển thị app..."
                    required
                  />
                  <p className="text-[9px] text-slate-400 mt-1 italic">Thay đổi này sẽ lập tức đổi chữ thương hiệu trên thanh Menu Sidebar dải trái.</p>
                </div>
              </div>
            </div>

            {/* Section 1: Thông tin pháp nhân */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1.5">
                II. Thông tin Doanh nghiệp
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tên Doanh nghiệp / Đơn vị chủ quản
                  </label>
                  <input
                    type="text"
                    value={formConfig.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="Nhập tên công ty..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Ban điều hành / Văn phòng công trường
                  </label>
                  <input
                    type="text"
                    value={formConfig.siteOffice}
                    onChange={(e) => handleChange('siteOffice', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="Nhập địa chỉ/BĐH dự án..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Nhân sự ký duyệt */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1.5">
                III. Danh sách Nhân sự ký duyệt tài liệu
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Chỉ huy trưởng / Giám đốc
                  </label>
                  <input
                    type="text"
                    value={formConfig.directorName}
                    onChange={(e) => handleChange('directorName', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="Tên Giám đốc..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Kế toán trưởng / Kiểm soát tài chính
                  </label>
                  <input
                    type="text"
                    value={formConfig.chiefAccountantName}
                    onChange={(e) => handleChange('chiefAccountantName', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="Tên Kế toán trưởng..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Thủ quỹ / Người lập phiếu chi
                  </label>
                  <input
                    type="text"
                    value={formConfig.treasurerName}
                    onChange={(e) => handleChange('treasurerName', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="Tên Thủ quỹ..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Trưởng tổ cơ giới / Kỹ sư thiết bị
                  </label>
                  <input
                    type="text"
                    value={formConfig.technicianName}
                    onChange={(e) => handleChange('technicianName', e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="Tên Kỹ sư cơ giới..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Tiêu đề các phiếu in */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1.5">
                IV. Tiêu đề các Phiếu in & Mẫu xuất Excel
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tiêu đề Sổ Nhật ký chung
                  </label>
                  <input
                    type="text"
                    value={formConfig.journalTitle}
                    onChange={(e) => handleChange('journalTitle', e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="SỔ NHẬT KÝ CHUNG..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tiêu đề Lệnh điều động cơ giới
                  </label>
                  <input
                    type="text"
                    value={formConfig.dispatchTitle}
                    onChange={(e) => handleChange('dispatchTitle', e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="LỆNH ĐIỀU ĐỘNG..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tiêu đề Phiếu cấp phát nhiên liệu
                  </label>
                  <input
                    type="text"
                    value={formConfig.fuelTitle}
                    onChange={(e) => handleChange('fuelTitle', e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="PHIẾU CẤP PHÁT NHIÊN LIỆU..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tiêu đề Biên bản nghiệm thu sửa chữa
                  </label>
                  <input
                    type="text"
                    value={formConfig.maintenanceTitle}
                    onChange={(e) => handleChange('maintenanceTitle', e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="BIÊN BẢN NGHIỆM THU SỬA CHỮA..."
                    required
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Quản trị Doanh nghiệp & Kiểm soát Nội bộ */}
            <div>
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>V. Chính sách Quản trị Doanh nghiệp & Kiểm soát nội bộ</span>
              </h3>

              <div className="space-y-4">
                {/* Spending Limits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    <Sliders className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hạn mức phê duyệt chi tiêu </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Hạn mức phê duyệt Chỉ huy trưởng (VND)
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type="number"
                        value={formConfig.siteManagerApprovalLimit || 50000000}
                        onChange={(e) => handleChange('siteManagerApprovalLimit', Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-800 pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-bold text-slate-400">VND</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block italic">
                      Quy đổi: {((formConfig.siteManagerApprovalLimit || 50000000) / 1000000).toLocaleString('vi-VN')} triệu VND
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Hạn mức phê duyệt Kế toán trưởng (VND)
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type="number"
                        value={formConfig.accountantApprovalLimit || 200000000}
                        onChange={(e) => handleChange('accountantApprovalLimit', Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-800 pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-bold text-slate-400">VND</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block italic">
                      Quy đổi: {((formConfig.accountantApprovalLimit || 200000000) / 1000000).toLocaleString('vi-VN')} triệu VND
                    </span>
                  </div>

                  {/* Double Approval Toggle */}
                  <div className="col-span-1 md:col-span-2 flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200/60 mt-1">
                    <div className="space-y-0.5 pr-4">
                      <span className="text-[10px] font-bold text-slate-700 block">Yêu cầu Phê duyệt Kép (CEO + Kế toán)</span>
                      <p className="text-[9px] text-slate-400 leading-normal">
                        Bắt buộc phê duyệt đồng thời từ cả Kế toán trưởng và Giám đốc cho các bút toán thanh toán vượt hạn mức của Kế toán trưởng.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleChange('requireDoubleApproval', !formConfig.requireDoubleApproval)}
                      className="text-blue-500 hover:text-blue-600 transition-colors shrink-0 cursor-pointer"
                    >
                      {formConfig.requireDoubleApproval ? (
                        <ToggleRight className="w-10 h-10 text-blue-500" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Technical Control Limits Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="col-span-1 md:col-span-2 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                    <Activity className="w-3.5 h-3.5 text-slate-400" />
                    <span>Hạn mức kỹ thuật & Điều hành công trường</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Ngưỡng cảnh báo hao hụt xăng dầu (%)
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type="number"
                        value={formConfig.fuelVarianceThreshold || 5}
                        onChange={(e) => handleChange('fuelVarianceThreshold', Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-800 pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        max="100"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-bold text-slate-400">%</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block italic">
                      Hao hụt nhiên liệu thực tế vượt ngưỡng này so với định mức máy sẽ cảnh báo đỏ.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Số giờ công tối đa cho phép/ngày (Giờ)
                    </label>
                    <div className="relative rounded-lg shadow-xs">
                      <input
                        type="number"
                        value={formConfig.maxDailyWorkHours || 12}
                        onChange={(e) => handleChange('maxDailyWorkHours', Number(e.target.value))}
                        className="w-full text-xs font-bold text-slate-800 pl-3 pr-10 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        max="24"
                        required
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[10px] font-bold text-slate-400">Giờ</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 mt-1 block italic">
                      Cảnh báo rủi ro về sức khỏe an toàn lao động nếu nhân sự chấm công quá số giờ này.
                    </span>
                  </div>
                </div>

                {/* Beautiful Static Role Permission Matrix */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-blue-400" />
                      Ma trận phân quyền & Chức năng Hệ thống
                    </span>
                    <span className="text-[8px] bg-blue-500/20 text-blue-300 font-mono font-bold px-2 py-0.5 rounded border border-blue-500/30">
                      TIÊU CHUẨN ISO 27001
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <th className="px-4 py-2 font-black">Vai trò điều hành</th>
                          <th className="px-3 py-2 text-center">Bảng Kế Toán</th>
                          <th className="px-3 py-2 text-center">Sổ Nhật Ký</th>
                          <th className="px-3 py-2 text-center">Quản Lý Kho</th>
                          <th className="px-3 py-2 text-center">Thiết Bị</th>
                          <th className="px-3 py-2 text-center">Nhân Sự (HR)</th>
                          <th className="px-3 py-2 text-center">Xóa/Reset DB</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Giám đốc (CEO)
                          </td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Full / Duyệt</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Toàn quyền</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Xem/Duyệt</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Xem/Duyệt</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Toàn quyền</td>
                          <td className="px-3 py-2.5 text-center text-rose-600 font-bold flex items-center justify-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Có (CEO)
                          </td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Kế toán trưởng
                          </td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Duyệt &lt;= 200M</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Ghi sổ / Sửa</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Xem báo cáo</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Xem khấu hao</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Xem lương</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">Không</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            Chỉ huy trưởng
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-400">Không có quyền</td>
                          <td className="px-3 py-2.5 text-center text-amber-600 font-bold">Ghi nhật ký</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Duyệt &lt;= 50M</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Điều động máy</td>
                          <td className="px-3 py-2.5 text-center text-emerald-600 font-bold">Chấm công</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">Không</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Kiểm toán (Auditor)
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Xem lịch sử</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Chỉ xem</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Chỉ xem</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Chỉ xem</td>
                          <td className="px-3 py-2.5 text-center text-slate-500">Chỉ xem</td>
                          <td className="px-3 py-2.5 text-center text-slate-400">Không</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-slate-50 px-4 py-2 flex gap-1.5 items-center text-[9px] text-slate-500 border-t border-slate-150">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>
                      Các vai trò được xác thực tại cổng đăng nhập dựa trên đặc quyền bảo mật đã thiết lập. Hành động không hợp lệ sẽ bị kiểm duyệt ghi vết (Audit Trail).
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Áp dụng & Đồng bộ</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: Storage Configuration & Backup Panel */}
        <div className="lg:col-span-5 space-y-6">

          {/* Storage Config Box */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md p-6 text-white space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Database className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-emerald-400">Cấu hình Lưu trữ Hệ thống</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Quản lý cơ chế lưu trữ dữ liệu ERP</p>
              </div>
            </div>

            {/* Auto Save Toggle */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider block text-slate-200">
                  Tự động lưu Local Storage
                </span>
                <p className="text-[9.5px] text-slate-400 leading-normal">
                  Lưu trữ trực tiếp mọi thao tác dữ liệu (Nhân sự, Kho, Kế toán, Máy móc) vào trình duyệt của bạn để tránh mất mát.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className="text-emerald-400 hover:text-emerald-300 transition-colors shrink-0"
              >
                {autoSaveEnabled ? (
                  <ToggleRight className="w-12 h-12 text-emerald-500" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-slate-600" />
                )}
              </button>
            </div>

            {/* Status Line */}
            <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950 px-3 py-2 rounded border border-slate-850">
              <span className="text-slate-400">TRẠNG THÁI DATABASE:</span>
              <span className={`font-bold flex items-center gap-1 ${autoSaveEnabled ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                {autoSaveEnabled ? 'ONLINE - AUTO SAVE' : 'SỬ DỤNG BỘ NHỚ TẠM'}
              </span>
            </div>

            {/* Backup & Restore Action Cluster */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">SAO LƯU & PHỤC HỒI DỰ PHÒNG</span>

              {/* Export Button */}
              <button
                type="button"
                onClick={onExportBackup}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold uppercase transition-all shadow"
              >
                <Download className="w-4 h-4" />
                <span>Tải Bản sao lưu dữ liệu (.json)</span>
              </button>

              {/* Import Button & File input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold uppercase border border-slate-700 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>Khôi phục dữ liệu từ File</span>
              </button>
            </div>

            {/* Wipe & Reset System Database */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <button
                type="button"
                onClick={handleFullResetDatabase}
                disabled={userRole !== 'CEO'}
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  userRole === 'CEO'
                    ? 'bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 cursor-pointer'
                    : 'bg-slate-950/65 text-slate-500 border border-slate-800 cursor-not-allowed opacity-60'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                <span>{userRole === 'CEO' ? 'Xóa sạch & Reset dữ liệu gốc' : 'Yêu cầu quyền CEO để Reset'}</span>
              </button>
            </div>
          </div>

          {/* Cloud Firestore Database Sync Box */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-md p-6 text-white space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <Cloud className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-blue-400">Đấu nối Cloud Database (Firestore)</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Đồng bộ và ghi dữ liệu ổn định khi triển khai lên Vercel</p>
              </div>
            </div>

            {/* Cloud Auto Save Toggle */}
            <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider block text-slate-200">
                  Tự động đồng bộ với Cloud
                </span>
                <p className="text-[9.5px] text-slate-400 leading-normal">
                  Mọi chỉnh sửa dữ liệu sẽ được tự động đồng bộ ngầm lên Cloud Firestore (sau 5 giây dừng thao tác) để đảm bảo ổn định và an toàn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCloudDbSyncEnabled && setCloudDbSyncEnabled(!cloudDbSyncEnabled)}
                className="text-blue-400 hover:text-blue-300 transition-colors shrink-0 animate-fade-in"
              >
                {cloudDbSyncEnabled ? (
                  <ToggleRight className="w-12 h-12 text-blue-500" />
                ) : (
                  <ToggleLeft className="w-12 h-12 text-slate-600" />
                )}
              </button>
            </div>

            {/* Connection Status and Last Synced */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950 px-3 py-2 rounded border border-slate-850">
                <span className="text-slate-400">TRẠNG THÁI KẾT NỐI:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  cloudSyncStatus === 'syncing' ? 'text-blue-400 animate-pulse' :
                  cloudSyncStatus === 'success' ? 'text-emerald-400' :
                  cloudSyncStatus === 'error' ? 'text-rose-400' :
                  cloudSyncStatus === 'offline' ? 'text-amber-400' :
                  'text-slate-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full bg-current ${cloudSyncStatus === 'syncing' ? 'animate-ping' : ''}`}></span>
                  {cloudSyncStatus === 'syncing' ? 'ĐANG ĐỒNG BỘ...' :
                   cloudSyncStatus === 'success' ? 'ĐÃ ĐỒNG BỘ THÀNH CÔNG' :
                   cloudSyncStatus === 'error' ? 'LỖI KẾT NỐI' :
                   cloudSyncStatus === 'offline' ? 'OFFLINE / KHÔNG ĐƯỜNG TRUYỀN' :
                   'ONLINE - SẴN SÀNG'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono bg-slate-950 px-3 py-2 rounded border border-slate-850">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  ĐỒNG BỘ GẦN NHẤT:
                </span>
                <span className="font-bold text-slate-300">{lastSyncedTime}</span>
              </div>
            </div>

            {/* Manual Sync Actions */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (onPushToCloud) {
                    const res = await onPushToCloud();
                    if (res === 'success') {
                      showToast('Đã đẩy toàn bộ dữ liệu hiện tại lên Cloud Firestore!', 'success');
                    } else if (res === 'offline') {
                      showToast('Lỗi: Không tìm thấy kết nối mạng hoặc Firestore bị chặn.', 'error');
                    } else {
                      showToast('Đồng bộ lên Cloud thất bại. Vui lòng kiểm tra lại.', 'error');
                    }
                  }
                }}
                disabled={cloudSyncStatus === 'syncing'}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold uppercase transition-all shadow disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Đẩy lên Cloud</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  if (window.confirm('CẢNH BÁO: Hành động này sẽ tải toàn bộ dữ liệu từ Cloud Firestore về máy và GHI ĐÈ dữ liệu hiện tại trên trình duyệt. Bạn có chắc chắn muốn tiếp tục?')) {
                    if (onPullFromCloud) {
                      const res = await onPullFromCloud();
                      if (res === 'success') {
                        showToast('Đã tải và cập nhật toàn bộ dữ liệu từ Cloud Firestore thành công!', 'success');
                      } else if (res === 'offline') {
                        showToast('Lỗi: Thiết bị ngoại tuyến hoặc bị chặn kết nối.', 'error');
                      } else {
                        showToast('Tải dữ liệu thất bại. Cơ sở dữ liệu Cloud có thể đang trống.', 'error');
                      }
                    }
                  }
                }}
                disabled={cloudSyncStatus === 'syncing'}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold uppercase border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải từ Cloud</span>
              </button>
            </div>

            {/* Security Warning */}
            <div className="pt-3 border-t border-slate-800 flex gap-2 items-start text-slate-400 text-[10px] leading-relaxed">
              <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Bảo mật & Ổn định:</strong> Kết nối trực tiếp được bảo vệ bằng Firebase Security Rules. Thích hợp chạy ổn định lâu dài khi deploy lên môi trường Serverless của Vercel mà không bị mất mát dữ liệu.
              </span>
            </div>
          </div>

          {/* Model Live Preview Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-slate-500">
              <span className="text-[9px] font-extrabold uppercase tracking-widest">Mô phỏng phiếu #3: Sổ Sách Kế Toán</span>
              <Printer className="w-3.5 h-3.5" />
            </div>
            <div className="p-5 font-serif bg-white text-slate-800 border-b border-slate-100 space-y-4 max-h-[180px] overflow-y-auto scrollbar-none text-[10px]">
              {/* Header block */}
              <div className="flex justify-between items-start border-b border-dashed border-slate-100 pb-2">
                <div className="space-y-0.5">
                  <div className="font-bold text-[9px] uppercase text-slate-900 leading-tight">{formConfig.companyName}</div>
                  <div className="text-slate-500 font-sans text-[8px]">{formConfig.siteOffice}</div>
                </div>
                <div className="text-right text-[8px] font-sans">
                  <span className="font-bold text-slate-900">Mẫu số S03a-DN</span><br/>
                  <span className="text-slate-400 italic font-medium">TT 200/2014/TT-BTC</span>
                </div>
              </div>
              {/* Title block */}
              <div className="text-center space-y-0.5">
                <div className="font-bold text-xs uppercase text-emerald-800 tracking-tight">{formConfig.journalTitle}</div>
                <div className="text-[8px] text-slate-400 font-sans italic">Hạch toán năm tài chính 2026</div>
              </div>
              {/* Signatures mock */}
              <div className="grid grid-cols-3 text-center pt-2 border-t border-dashed border-slate-100 text-[8px] font-sans">
                <div>
                  <div className="font-bold text-slate-900">Người lập biểu</div>
                  <div className="mt-4 font-semibold text-slate-700">{formConfig.treasurerName}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">Kế toán trưởng</div>
                  <div className="mt-4 font-bold text-slate-700">{formConfig.chiefAccountantName}</div>
                </div>
                <div>
                  <div className="font-bold text-slate-900">Giám đốc duyệt</div>
                  <div className="mt-4 font-bold text-slate-900">{formConfig.directorName}</div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
