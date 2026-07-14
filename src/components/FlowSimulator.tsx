/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingCart, CheckSquare, Truck, FileCheck, Landmark, HardHat, ShieldCheck, MapPin, CalendarDays, Coins, ArrowRight, Table } from 'lucide-react';

interface FlowStep {
  title: string;
  actor: string;
  desc: string;
  icon: React.ReactNode;
  tablesAffected: string[];
  triggerDetails?: string;
}

export default function FlowSimulator() {
  const [activeFlow, setActiveFlow] = useState<'material' | 'labor'>('material');
  const [activeStep, setActiveStep] = useState<number>(0);

  const materialFlowSteps: FlowStep[] = [
    {
      title: 'Bước 1: Lập Đề Xuất Mua Vật Tư',
      actor: 'Kỹ sư Công trường',
      desc: 'Khi thấy vật tư sắp cạn, Kỹ sư lập đề xuất mua khẩn cấp trên app di động (Ví dụ: 15 tấn Thép phi 18). Đề xuất được lưu trữ tạm thời với trạng thái chờ duyệt.',
      icon: <ShoppingCart className="w-6 h-6 text-indigo-600" />,
      tablesAffected: ['approval_workflows (status = "Pending_Accountant", current_level = 1)']
    },
    {
      title: 'Bước 2: Kế Toán Đối Chiếu Định Mức',
      actor: 'Kế toán Công trường',
      desc: 'Kế toán nhận thông báo trên Web Admin, tiến hành kiểm tra định mức dự toán được phê duyệt ban đầu cho dự án. Hệ thống so sánh xem lượng xuất mới có làm tổng lượng xuất vượt định mức đỏ hay không.',
      icon: <CheckSquare className="w-6 h-6 text-amber-600" />,
      tablesAffected: ['material_limits (planned_qty vs actual_issued_qty)', 'approval_workflows (current_level = 2)']
    },
    {
      title: 'Bước 3: Giám Đốc Phê Duyệt Trực Tuyến',
      actor: 'Giám đốc Điều hành',
      desc: 'Giám đốc nhận thông báo đẩy trên điện thoại di động, xem báo cáo định mức và ký duyệt online bằng 1 chạm. Trạng thái đề xuất chuyển sang "Approved".',
      icon: <FileCheck className="w-6 h-6 text-emerald-600" />,
      tablesAffected: ['approval_workflows (status = "Approved", current_level = 4)']
    },
    {
      title: 'Bước 4: Nhà Cung Cấp Giao Vật Tư',
      actor: 'Nhà cung cấp vật tư',
      desc: 'Đơn đặt hàng tự động chuyển sang Nhà phân phối Thép Việt. Họ tiến hành vận chuyển thép thẳng đến công trường dự án trong ngày.',
      icon: <Truck className="w-6 h-6 text-sky-600" />,
      tablesAffected: ['contractors (Supplier contact)', 'contracts (accepted_value)']
    },
    {
      title: 'Bước 5: Nhập Kho & Ghi Nhận Phiếu Kho',
      actor: 'Thủ kho Công trường',
      desc: 'Thủ kho kiểm đếm thực tế, chụp ảnh biên bản giao hàng và xác nhận nhập kho trên app di động. Hệ thống tạo phiếu nhập kho và tự động tăng số lượng tồn kho khả dụng.',
      icon: <Table className="w-6 h-6 text-pink-600" />,
      tablesAffected: ['inventory_ledger (type = "Receipt")', 'inventory_items (on_hand = on_hand + Qty)'],
      triggerDetails: 'Trigger DB tự động kiểm tra định mức và tính đơn giá bình quân gia quyền.'
    },
    {
      title: 'Bước 6: Ghi Nhận Công Nợ & Chi Phí Dự Án',
      actor: 'Kế toán Tổng hợp',
      desc: 'Kế toán ghi tăng giá trị nghiệm thu thực tế và công nợ phải trả cho nhà cung cấp trên hợp đồng. Đồng thời hạch toán một bút toán "Expense" (Chi phí) phân loại "Material" thuộc dự án.',
      icon: <Coins className="w-6 h-6 text-rose-600" />,
      tablesAffected: ['contracts (accepted_value = accepted_value + Value)', 'financial_transactions (type = "Expense", category = "Material")']
    },
    {
      title: 'Bước 7: Kích Hoạt Trigger Tự Động Tính P&L',
      actor: 'Hệ thống (Database Trigger)',
      desc: 'Ngay khi giao dịch tài chính Expense được tạo, trigger mức cơ sở dữ liệu (PostgreSQL AFTER INSERT Trigger) tự động cộng dồn số tiền chi tiêu vào tổng chi phí thực tế lũy kế của dự án.',
      icon: <Landmark className="w-6 h-6 text-teal-600" />,
      tablesAffected: ['projects (spent = spent + TransactionAmount)'],
      triggerDetails: 'Trigger "update_project_actual_spent()" chạy ngầm trong database giúp báo cáo P&L luôn chính xác theo thời gian thực (Real-time)!'
    }
  ];

  const laborFlowSteps: FlowStep[] = [
    {
      title: 'Bước 1: Quét QR & Ghi Nhận GPS',
      actor: 'Công nhân / Kỹ sư',
      desc: 'Khi đến công trường, công nhân mở Mobile App quét mã QR tĩnh dán tại cổng, đồng thời chụp ảnh tự sướng và ghi nhận tọa độ định vị GPS thực tế.',
      icon: <HardHat className="w-6 h-6 text-yellow-600" />,
      tablesAffected: ['timesheets (check_in_time = Now(), latitude, longitude)']
    },
    {
      title: 'Bước 2: Hàng Rào Địa Lý & AI Quét Mặt',
      actor: 'Hệ thống (Geofencing & AI)',
      desc: 'Hệ thống tính toán khoảng cách từ tọa độ của thiết bị đến tâm dự án. Nếu khoảng cách < 200m, gắn tag "In-Range", nếu > 200m gắn tag "Out-Of-Range" (Cảnh báo). AI đối khớp nhận diện khuôn mặt chống chấm công hộ.',
      icon: <MapPin className="w-6 h-6 text-rose-600" />,
      tablesAffected: ['timesheets (gps_status, verified_by_face = True/False)']
    },
    {
      title: 'Bước 3: Ghi Nhận Bảng Công Ngày',
      actor: 'Ban Chỉ huy Công trường',
      desc: 'Dữ liệu chấm công đẩy thẳng về Web Admin của Kế toán công trường. Hệ thống tự động phân loại công ngày: Đúng giờ, Đi muộn, Tăng ca .',
      icon: <CalendarDays className="w-6 h-6 text-blue-600" />,
      tablesAffected: ['timesheets (status = "Present"/"Late"/"Overtime")']
    },
    {
      title: 'Bước 4: Xét Duyệt Tạm Ứng Tuần/Tháng',
      actor: 'Kỹ sư trưởng & Giám đốc',
      desc: 'Trong tháng, công nhân có thể đề xuất tạm ứng lương lương tuần . Đề xuất này đi qua quy trình ký duyệt 3 cấp và ghi giảm nợ tạm ứng.',
      icon: <ShieldCheck className="w-6 h-6 text-emerald-600" />,
      tablesAffected: ['approval_workflows (request_type = "Salary_Advance")', 'financial_transactions (Expense, reference_id)']
    },
    {
      title: 'Bước 5: Tổng Hợp Bảng Lương Tự Động',
      actor: 'Kế toán Lương',
      desc: 'Đến cuối tháng, hệ thống tự động quét toàn bộ bảng công, nhân đơn giá lương ngày công (với công nhân thời vụ) hoặc lương tháng (với kỹ sư), tự động khấu trừ các khoản tạm ứng lương đã duyệt và tính ra thực lĩnh.',
      icon: <Coins className="w-6 h-6 text-indigo-600" />,
      tablesAffected: ['employees (base_salary)', 'timesheets (summarized)']
    },
    {
      title: 'Bước 6: Ghi Nhận Giá Vốn Nhân Công & P&L',
      actor: 'Kế toán Tổng hợp',
      desc: 'Sau khi chi trả lương, hệ thống ghi nhận giao dịch chi phí Expense, phân loại "Labor" thuộc dự án tương ứng. Trigger tự động cộng dồn chi phí lương vào giá vốn công trình trong bảng projects.',
      icon: <Landmark className="w-6 h-6 text-purple-600" />,
      tablesAffected: ['financial_transactions (category = "Labor")', 'projects (spent = spent + Lương tháng)'],
      triggerDetails: 'Đảm bảo dòng tiền chi trả nhân công luôn ánh xạ đúng vào giá vốn riêng biệt của từng công trình, tránh nhập nhèm giữa các dự án xây dựng.'
    }
  ];

  const currentSteps = activeFlow === 'material' ? materialFlowSteps : laborFlowSteps;
  const currentStepData = currentSteps[activeStep];

  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6" id="flow-simulator-root">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-gray-100 pb-5 mb-6 gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            📊 Trực Quan Luồng Vận Hành Dữ Liệu Cốt Lõi
          </h2>
          <p className="text-xs text-gray-500 mt-1">Mô tả cách tiền, vật tư và chấm công số hóa vận chuyển xuyên suốt các bảng của hệ thống ERP.</p>
        </div>

        {/* Flow Selector Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-lg text-xs self-start md:self-auto">
          <button
            onClick={() => { setActiveFlow('material'); setActiveStep(0); }}
            className={`px-4 py-2 rounded-md transition-all font-semibold flex items-center gap-1.5 ${
              activeFlow === 'material' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Vật Tư & Công Nợ Nhà Cung Cấp
          </button>
          <button
            onClick={() => { setActiveFlow('labor'); setActiveStep(0); }}
            className={`px-4 py-2 rounded-md transition-all font-semibold flex items-center gap-1.5 ${
              activeFlow === 'labor' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            Chấm Công & Giá Vốn Nhân Công
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Step Map */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Các bước trong quy trình:</h3>
            <div className="relative pl-4 space-y-3 border-l-2 border-emerald-100">
              {currentSteps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left relative pl-6 py-2.5 rounded-lg text-xs transition-all duration-150 block ${
                    activeStep === idx
                      ? 'bg-emerald-50 text-emerald-950 font-semibold shadow-3xs border border-emerald-200/50'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <div className={`absolute -left-[25px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full flex items-center justify-center border-2 text-[8px] font-bold ${
                    activeStep === idx
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-emerald-200 text-emerald-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="truncate">{step.title.split(': ')[1]}</span>
                    <span className="text-[10px] text-gray-400 font-normal shrink-0 italic">{step.actor}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button
              disabled={activeStep === 0}
              onClick={() => setActiveStep(prev => prev - 1)}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 rounded text-xs font-semibold text-gray-700 transition"
            >
              Quay lại
            </button>
            <span className="text-xs text-gray-400 font-mono font-bold">
              {activeStep + 1} / {currentSteps.length}
            </span>
            <button
              disabled={activeStep === currentSteps.length - 1}
              onClick={() => setActiveStep(prev => prev + 1)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded text-xs font-semibold text-white transition flex items-center gap-1"
            >
              Tiếp theo <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right Side: Step Visualizer Detail & Database Simulation Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100 flex flex-col justify-between h-full space-y-4">

            {/* Step Heading */}
            <div className="flex items-start gap-4">
              <div className="p-3.5 bg-white rounded-xl shadow-2xs border border-gray-100 shrink-0">
                {currentStepData.icon}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-widest">{currentStepData.actor}</span>
                <h4 className="text-sm font-bold text-gray-900 mt-0.5">{currentStepData.title}</h4>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{currentStepData.desc}</p>
              </div>
            </div>

            {/* Database Impact Panel */}
            <div className="border-t border-dashed border-gray-200 pt-4 mt-2">
              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1">
                <Table className="w-3.5 h-3.5 text-gray-400" />
                Dữ Liệu Tác Động Trong Database (SQL Tables Affected):
              </h5>

              <div className="space-y-2">
                {currentStepData.tablesAffected.map((tbl, idx) => {
                  const parts = tbl.split(' (');
                  const tName = parts[0];
                  const tField = parts[1] ? parts[1].replace(')', '') : null;

                  return (
                    <div key={idx} className="bg-white p-2.5 rounded-lg border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-1.5 shadow-3xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <code className="text-xs font-mono font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {tName}
                        </code>
                      </div>
                      {tField && (
                        <div className="text-[10px] font-mono text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          Field update: <span className="text-indigo-700 font-bold">{tField}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Database Trigger Callout if exists */}
              {currentStepData.triggerDetails && (
                <div className="mt-3.5 p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2.5">
                  <span className="text-xs text-amber-600 shrink-0">⚙️</span>
                  <div>
                    <h6 className="text-[10px] font-bold text-amber-900 uppercase tracking-tight">Database Trigger hoạt động:</h6>
                    <p className="text-[10px] text-amber-800 leading-normal mt-0.5 font-mono">{currentStepData.triggerDetails}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Core flows summary card */}
            <div className="bg-white rounded-lg p-3.5 border border-gray-100">
              <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                <span>Dòng chảy tài chính (P&L Impact)</span>
                <span className="text-emerald-700 font-semibold font-mono uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
                  {activeFlow === 'material' ? 'Hợp đồng đầu vào ➔ Chi phí vật tư' : 'Nhân công chấm công ➔ Chi phí giá vốn'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
