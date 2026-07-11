/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Project, Employee, ApprovalRequest, Equipment, Timesheet, UserRole } from '../types';
import { HardHat, MapPin, CheckCircle, ShieldAlert, FileSignature, ArrowRight, Truck, PlusCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface OpsSimulatorProps {
  projects: Project[];
  employees: Employee[];
  approvals: ApprovalRequest[];
  equipment: Equipment[];
  timesheets: Timesheet[];
  onCheckIn: (timesheet: Timesheet) => void;
  onApproveLevel: (reqId: string, actor: string, note: string) => void;
  onDispatchMachine: (eqId: string, projectId: string) => void;
  onResetData: () => void;
  userRole?: UserRole;
}

export default function OpsSimulator({
  projects,
  employees,
  approvals,
  equipment,
  timesheets,
  onCheckIn,
  onApproveLevel,
  onDispatchMachine,
  onResetData,
  userRole
}: OpsSimulatorProps) {

  // --- Timesheet Check-In Simulator State ---
  const [selectedEmpId, setSelectedEmpId] = useState<string>('emp-18'); // Worker Trần Văn Bình
  const [gpsSetting, setGpsSetting] = useState<'valid' | 'invalid'>('valid');
  const [faceCheck, setFaceCheck] = useState<boolean>(true);
  const [checkInLog, setCheckInLog] = useState<string>('');

  // --- Equipment Dispatch State ---
  const [selectedEqId, setSelectedEqId] = useState<string>('eq-1');
  const [targetProjId, setTargetProjId] = useState<string>('proj-2');
  const [dispatchLog, setDispatchLog] = useState<string>('');

  // --- Approval Workflow States ---
  const [approvalNotes, setApprovalNotes] = useState<string>('Đồng ý thông qua nội dung đề xuất.');

  // Find selected employee and their assigned project
  const currentEmp = employees.find(e => e.id === selectedEmpId);
  const assignedProj = currentEmp ? projects.find(p => p.id === currentEmp.projectId) : null;

  // Execute Simulation: Worker Check-In
  const handleCheckInSimulate = () => {
    if (!currentEmp || !assignedProj) return;

    // Generate coordinates based on GPS setting
    // Project Center coordinates +/- small offset vs random coffee shop
    const lat = gpsSetting === 'valid' ? 10.7412 + (Math.random() - 0.5) * 0.0002 : 10.7985;
    const lng = gpsSetting === 'valid' ? 106.6345 + (Math.random() - 0.5) * 0.0002 : 106.6912;
    
    const isLate = new Date().getHours() >= 8;

    const newTimesheet: Timesheet = {
      id: `time-${Date.now()}`,
      employeeId: currentEmp.id,
      projectId: assignedProj.id,
      date: new Date().toISOString().split('T')[0],
      checkInTime: new Date().toTimeString().split(' ')[0],
      checkOutTime: null,
      status: isLate ? 'Late' : 'Present',
      latitude: lat,
      longitude: lng,
      gpsStatus: gpsSetting === 'valid' ? 'In-Range' : 'Out-Of-Range',
      verifiedByFace: faceCheck
    };

    onCheckIn(newTimesheet);
    
    if (gpsSetting === 'valid' && faceCheck) {
      setCheckInLog(`✅ [CHẤM CÔNG THÀNH CÔNG] Công nhân ${currentEmp.name} đã check-in thành công tại dự án "${assignedProj.name}". Tọa độ hợp lệ, khớp khuôn mặt 98%!`);
    } else if (gpsSetting === 'invalid') {
      setCheckInLog(`⚠️ [CẢNH BÁO GEOLOCATION] Phát hiện công nhân ${currentEmp.name} chấm công ngoài phạm vi cho phép của dự án (Cách dự án 4.2 km). Log chấm công được gắn cờ Out-of-Range!`);
    } else {
      setCheckInLog(`❌ [LỖI XÁC THỰC] Chấm công bị gắn cờ cảnh báo do không vượt qua bước nhận diện AI khuôn mặt (FaceID không khớp).`);
    }
  };

  // Execute Simulation: Machinery Dispatch
  const handleDispatchSimulate = () => {
    const machine = equipment.find(e => e.id === selectedEqId);
    const targetProj = projects.find(p => p.id === targetProjId);
    if (!machine || !targetProj) return;

    if (machine.currentProjectId === targetProjId) {
      setDispatchLog(`ℹ️ Máy đang ở đúng công trình "${targetProj.name}" rồi.`);
      return;
    }

    onDispatchMachine(selectedEqId, targetProjId);
    setDispatchLog(`🚛 [ĐIỀU ĐỘNG THÀNH CÔNG] Đã luân chuyển máy "${machine.name}" sang dự án "${targetProj.name}". Hệ thống tự động cập nhật nhật ký thiết bị và phân bổ định mức xăng dầu dã chiến.`);
  };

  return (
    <div className="space-y-6" id="ops-simulator-root">
      
      {/* Simulation Control Header */}
      <div className="bg-emerald-950 text-white rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            🏗️ Trình Mô Phỏng Nghiệp Vụ Công Trường (Interactive Sandbox)
          </h2>
          <p className="text-xs text-emerald-200 mt-1">
            Chọn và chạy các kịch bản thực tế để quan sát sự thay đổi dữ liệu đồng bộ trên Executive Dashboard và Hệ thống cơ sở dữ liệu.
          </p>
        </div>
        <button
          onClick={onResetData}
          className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-start md:self-auto shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Khôi phục dữ liệu gốc
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Action 1: GPS Multi-point Timesheet Check-In */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 shadow-3xs">
          <div className="flex items-center gap-2 text-emerald-700">
            <MapPin className="w-5 h-5 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">1. Mô phỏng Chấm công GPS di động dã chiến</h3>
          </div>
          <p className="text-xs text-gray-500 leading-normal">
            Công nhân tại 5 công trường khác nhau sử dụng app điện thoại quét mã QR dán tại lán trại. Hệ thống so khớp GPS và AI camera.
          </p>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100 text-xs">
            {/* Choose Employee */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Chọn Nhân Sự Chấm Công:</label>
              <select
                className="w-full p-2 bg-white border border-gray-200 rounded focus:outline-hidden"
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
              >
                {employees.filter(e => e.role.includes('Thợ') || e.role.includes('Công nhân') || e.role.includes('Lái')).map(e => {
                  const proj = projects.find(p => p.id === e.projectId);
                  return (
                    <option key={e.id} value={e.id}>
                      {e.name} - {e.role} ({proj ? proj.name : 'Văn phòng'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Set GPS location coordinates */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Định Vị Vị Trí Thiết Bị (GPS):</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGpsSetting('valid')}
                  className={`py-2 px-3 rounded font-semibold text-center border transition-all ${
                    gpsSetting === 'valid'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-950 shadow-3xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  📍 Hợp lệ (Tại dự án)
                </button>
                <button
                  type="button"
                  onClick={() => setGpsSetting('invalid')}
                  className={`py-2 px-3 rounded font-semibold text-center border transition-all ${
                    gpsSetting === 'invalid'
                      ? 'bg-rose-50 border-rose-500 text-rose-950 shadow-3xs'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  ☕ Ngoài vùng (Sai vị trí)
                </button>
              </div>
            </div>

            {/* AI Face check option */}
            <div className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="faceCheckCheckbox"
                checked={faceCheck}
                onChange={(e) => setFaceCheck(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <label htmlFor="faceCheckCheckbox" className="font-semibold text-gray-700 select-none cursor-pointer">
                Xác thực khớp khuôn mặt qua AI Face ID (Anti-Fraud)
              </label>
            </div>

            <button
              onClick={handleCheckInSimulate}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              Gửi dữ liệu chấm công (Trigger DB)
            </button>
          </div>

          {/* Action Log Result */}
          {checkInLog && (
            <div className={`p-3.5 rounded-lg border text-xs leading-relaxed font-mono ${
              checkInLog.includes('thành công') 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-900' 
                : 'bg-rose-50 border-rose-100 text-rose-900'
            }`}>
              {checkInLog}
            </div>
          )}
        </div>

        {/* Action 2: Machinery dispatch coordinator */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4 shadow-3xs">
          <div className="flex items-center gap-2 text-indigo-700">
            <Truck className="w-5 h-5 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">2. Mô phỏng luân chuyển thiết bị cơ giới</h3>
          </div>
          <p className="text-xs text-gray-500 leading-normal">
            Điều động thiết bị nặng (máy xúc, máy lu, giàn giáo) sang công trình cần gấp, cập nhật trực tiếp phân bổ xăng dầu và giá thành.
          </p>

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-100 text-xs">
            {/* Choose Equipment */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Chọn Máy Móc Cần Điều Động:</label>
              <select
                className="w-full p-2 bg-white border border-gray-200 rounded focus:outline-hidden"
                value={selectedEqId}
                onChange={(e) => setSelectedEqId(e.target.value)}
              >
                {equipment.map(eq => {
                  const currProj = projects.find(p => p.id === eq.currentProjectId);
                  return (
                    <option key={eq.id} value={eq.id}>
                      {eq.name} - Hiện ở: {currProj ? currProj.name : 'Kho tổng'} ({eq.status})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Choose Destination Project */}
            <div className="space-y-1">
              <label className="font-semibold text-gray-700 block">Dự án Đích (Điều động đến):</label>
              <select
                className="w-full p-2 bg-white border border-gray-200 rounded focus:outline-hidden"
                value={targetProjId}
                onChange={(e) => setTargetProjId(e.target.value)}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleDispatchSimulate}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow-2xs transition flex items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              Lệnh điều xe luân chuyển thiết bị
            </button>
          </div>

          {/* Dispatch Log Result */}
          {dispatchLog && (
            <div className="p-3.5 bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-lg text-xs leading-relaxed font-mono">
              {dispatchLog}
            </div>
          )}
        </div>

      </div>

      {/* Action 3: 3-Level Approval online workflow with DB triggers */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-3xs">
        <div className="flex items-center gap-2 text-amber-700 mb-2">
          <FileSignature className="w-5 h-5 shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">3. Quy trình ký duyệt mua vật tư & Cảnh báo đỏ vượt định mức</h3>
        </div>
        <p className="text-xs text-gray-500 mb-4 leading-normal">
          Duyệt đề xuất mua vật tư hoặc ứng lương qua 3 cấp: Kỹ sư đề xuất ➔ Kế toán đối chiếu định toán ➔ Giám đốc ký duyệt online. Khi Giám đốc duyệt dòng cuối, hệ thống lập tức tăng công nợ nhà cung cấp, tăng kho bãi, tạo chi phí cho dự án, và kích hoạt Trigger cảnh báo đỏ nếu vượt định toán.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {approvals.map((req) => {
            const requester = employees.find(e => e.id === req.requesterId);
            const proj = projects.find(p => p.id === req.projectId);
            
            const isCompleted = req.status === 'Approved' || req.status === 'Rejected';

            return (
              <div key={req.id} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between bg-gray-50/30 hover:border-gray-300 transition shadow-3xs">
                
                {/* Request details */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-gray-400 font-mono">ID: {req.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      req.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                      req.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                    }`}>
                      {req.status === 'Approved' ? 'Đã duyệt xong' : 
                       req.status === 'Rejected' ? 'Từ chối' : 
                       req.status === 'Pending_Accountant' ? 'Kế toán chờ duyệt' : 'Giám đốc chờ duyệt'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-gray-900 leading-snug">{req.title}</h4>
                  
                  <div className="text-[10px] text-gray-500 space-y-1">
                    <div>Đề xuất: <span className="font-semibold text-gray-800">{requester?.name}</span> ({requester?.role})</div>
                    <div>Giá trị: <span className="font-bold text-indigo-950 font-mono">{req.amount.toLocaleString()} ₫</span></div>
                    <div>Dự án liên lụy: <span className="font-semibold text-gray-800">{proj?.name}</span></div>
                    <div className="italic text-gray-400 leading-normal mt-1 block">"{req.details}"</div>
                  </div>
                </div>

                {/* Workflow step representation */}
                <div className="border-t border-gray-200/60 pt-3 mt-3 space-y-3">
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-medium">
                    <span>Lộ trình ký duyệt (Cấp: {req.currentLevel}/4)</span>
                    <span className="font-semibold text-gray-700">
                      {req.currentLevel === 1 ? 'Khởi tạo' :
                       req.currentLevel === 2 ? 'Kế toán' :
                       req.currentLevel === 3 ? 'Giám đốc' : 'Hoàn tất'}
                    </span>
                  </div>

                  {/* Flow dots */}
                  <div className="flex items-center justify-between px-2 relative my-1">
                    <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-1 bg-gray-200 z-0"></div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold z-10 ${
                      req.currentLevel >= 1 ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>1</div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold z-10 ${
                      req.currentLevel >= 2 ? 'bg-emerald-600 text-white font-extrabold' : 'bg-gray-200 text-gray-500'
                    }`}>2</div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold z-10 ${
                      req.currentLevel >= 3 ? 'bg-emerald-600 text-white font-extrabold' : 'bg-gray-200 text-gray-500'
                    }`}>3</div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold z-10 ${
                      req.currentLevel >= 4 ? 'bg-emerald-600 text-white font-extrabold animate-bounce' : 'bg-gray-200 text-gray-500'
                    }`}>✓</div>
                  </div>

                  {/* Action input & approve buttons if not complete */}
                  {!isCompleted ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Ý kiến ký duyệt..."
                        value={approvalNotes}
                        onChange={(e) => setApprovalNotes(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded text-[10px] bg-white focus:outline-hidden"
                      />
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <button
                          onClick={() => {
                            const actorName = req.currentLevel === 2 ? 'Mai Thị Xuân (Kế toán)' : 'Giám đốc Điều hành';
                            onApproveLevel(req.id, actorName, approvalNotes);
                            setApprovalNotes('Đồng ý duyệt cấp tiếp theo.');
                          }}
                          className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center justify-center gap-1 shadow-3xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Phê Duyệt
                        </button>
                        <button
                          onClick={() => {
                            // Reject logic simulated simply
                            onApproveLevel(req.id, 'Ban Lãnh Đạo', 'Từ chối duyệt: Vượt định mức vật tư tối đa.');
                          }}
                          className="py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded flex items-center justify-center gap-1 shadow-3xs"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          Từ Chối
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50 text-emerald-950 p-2 rounded text-[10px] font-mono leading-relaxed border border-emerald-100">
                      <strong>Xác nhận cuối:</strong> Đã ký duyệt thành công. Hệ thống tự động ghi nhận phiếu kho và hạch toán dòng tiền lãi/lỗ độc lập thành công.
                    </div>
                  )}

                  {/* Historical logs list */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-gray-400 block uppercase">Nhật ký phê duyệt:</span>
                    {req.timeline.map((item, iIdx) => (
                      <div key={iIdx} className="text-[9px] text-gray-600 font-mono bg-white p-1 rounded border border-gray-100 flex items-start gap-1">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <div>
                          <strong>{item.actor}</strong> ({item.date}): {item.note}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
