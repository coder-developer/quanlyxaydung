/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShieldAlert, Cpu, Database, Network, Cloud, Zap, Server, Map, Smartphone } from 'lucide-react';

export default function TechStackView() {
  return (
    <div className="bg-white rounded-xl shadow-xs border border-gray-100 p-6 space-y-8" id="tech-stack-view-root">
      
      {/* Introduction Banner */}
      <div className="border-b border-gray-100 pb-5">
        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">CTO & Software Architect Proposal</span>
        <h2 className="text-lg font-black text-gray-950 mt-2 flex items-center gap-2">
          💻 Tư Vấn Giải Pháp Công Nghệ & Kiến Trúc Hệ Thống ERP Xây Dựng
        </h2>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Đề xuất công nghệ tối ưu hóa ngân sách, vận hành bền bỉ trên công trường mạng yếu, bảo mật tài chính 3 cấp và tự động hóa cảnh báo đỏ.
        </p>
      </div>

      {/* Tech Stack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Mobile App Tech */}
        <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 space-y-3 shadow-3xs">
          <div className="flex items-center gap-2 text-indigo-700">
            <Smartphone className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Mobile App (Công trường)</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              <strong>Framework: Flutter (Dart)</strong> - Tự hào có hiệu năng biên dịch native cực nhanh, vẽ UI trực tiếp giúp mượt mà trên cả dòng máy Android giá rẻ của công nhân.
            </li>
            <li>
              <strong>Định vị Geofencing</strong>: Sử dụng thư viện <code className="bg-white px-1 rounded font-mono text-[10px]">flutter_background_geolocation</code> để chạy ngầm định vị hàng rào 200m quanh 5 công trường.
            </li>
            <li>
              <strong>Cơ sở dữ liệu cục bộ</strong>: Sử dụng <strong>SQLite (WatermelonDB/Hive)</strong> để lưu trữ toàn bộ dữ liệu offline dã chiến (Offline-First).
            </li>
          </ul>
        </div>

        {/* Web App Tech */}
        <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 space-y-3 shadow-3xs">
          <div className="flex items-center gap-2 text-emerald-700">
            <Server className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Web Admin & Backend</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              <strong>Frontend Web: React + TypeScript + Tailwind CSS</strong> - Giúp tải trang siêu nhanh, cấu trúc SPA trực quan cho khối kế toán, văn phòng, biểu đồ Recharts phân tích tài chính thời gian thực.
            </li>
            <li>
              <strong>Backend: NestJS (Node.js) hoặc FastAPI (Python)</strong> - NestJS cung cấp cơ chế Dependency Injection vững chãi, phân mô-đun chặt chẽ (Auth, Inventory, Timesheet, Finance) phục vụ mở rộng ERP.
            </li>
            <li>
              <strong>API Standard</strong>: RESTful API kết hợp WebSockets để cập nhật trực tuyến thông báo duyệt chi phí 3 cấp.
            </li>
          </ul>
        </div>

        {/* Database Tech */}
        <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100 space-y-3 shadow-3xs">
          <div className="flex items-center gap-2 text-blue-700">
            <Database className="w-5 h-5" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900">Cơ Sở Dữ Liệu (PostgreSQL)</h3>
          </div>
          <ul className="text-xs text-gray-600 space-y-2 list-disc pl-4 leading-relaxed">
            <li>
              <strong>Google Cloud SQL (PostgreSQL Engine)</strong>: Đáp ứng chuẩn ACID cực kỳ khắt khe của hệ thống tài chính kế toán, chống mất mát dữ liệu khi mất nguồn điện.
            </li>
            <li>
              <strong>Mở rộng PostGIS</strong>: Phục vụ tính toán hình học không gian (Spatial Queries). Kiểm tra nhanh vị trí GPS của 50 công nhân xem có nằm trong đa giác bao quanh dự án hay không.
            </li>
            <li>
              <strong>JSONB & Vector Extensions</strong>: Lưu vết phê duyệt linh hoạt và lưu trữ Vector khuôn mặt (Face Embeddings) chấm công AI.
            </li>
          </ul>
        </div>

      </div>

      {/* Geofencing & GPS Spatial SQL explanation */}
      <div className="bg-blue-50/40 rounded-xl p-5 border border-blue-100 space-y-3">
        <h3 className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
          <Map className="w-4 h-4 text-blue-700" />
          Kỹ thuật định vị chấm công Geofencing bằng Spatial SQL (PostGIS):
        </h3>
        <p className="text-xs text-blue-900 leading-relaxed">
          Thay vì tính toán khoảng cách GPS phức tạp và tốn pin trên thiết bị di động của công nhân, Mobile App chỉ cần lấy tọa độ GPS hiện thời (<code className="bg-white px-1 py-0.5 rounded font-mono font-semibold text-[10px]">lat, lng</code>) gửi về Server. Server sử dụng truy vấn không gian PostGIS dã chiến siêu tốc để tính xem nhân viên có đang đứng trong bán kính 200m của dự án hay không:
        </p>
        <pre className="p-3 bg-gray-950 text-emerald-400 rounded-lg text-[10px] font-mono overflow-x-auto leading-relaxed shadow-3xs">
{`-- Truy vấn xác định trạng thái chấm công dựa trên bán kính hàng rào địa lý
SELECT 
    emp.name,
    proj.name AS project_name,
    ST_Distance(
        ST_SetSRID(ST_MakePoint(checkin_lng, checkin_lat), 4326)::geography,
        ST_SetSRID(ST_MakePoint(proj.longitude, proj.latitude), 4326)::geography
    ) AS distance_meters,
    CASE 
        WHEN ST_DWithin(
            ST_SetSRID(ST_MakePoint(checkin_lng, checkin_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(proj.longitude, proj.latitude), 4326)::geography,
            200 -- Hàng rào 200 mét quanh tâm dự án
        ) THEN 'In-Range'
        ELSE 'Out-Of-Range'
    END AS gps_status
FROM employees emp
JOIN projects proj ON emp.project_id = proj.id
WHERE emp.id = 'emp-18';`}
        </pre>
      </div>

      {/* Offline-First & Connectivity Solution */}
      <div className="bg-emerald-50/40 rounded-xl p-5 border border-emerald-100 space-y-4">
        <h3 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
          <Network className="w-4 h-4 text-emerald-700" />
          Giải Pháp Vận Hành Trơn Tru Trên Công Trường Mất Mạng (Offline-First):
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-emerald-950 leading-relaxed">
          <div className="space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Zap className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              1. Outbox Pattern & Local Cache
            </h4>
            <p className="text-emerald-900">
              Mọi tác vụ ghi nhật ký công trường, chụp ảnh tiến độ dã chiến, lập phiếu xuất vật tư của kỹ sư được lưu trực tiếp vào cơ sở dữ liệu SQLite trong máy di động. Hệ thống mã hóa các tác vụ này thành các gói tin sự kiện (Events) xếp trong hàng đợi <strong>Outbox Table</strong>. Công việc trên app vẫn diễn ra bình thường, mượt mà mà không bị treo xoay vòng tròn chờ mạng.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold flex items-center gap-1.5 text-emerald-800">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              2. Background Sync & Xử lý Xung đột
            </h4>
            <p className="text-emerald-900">
              Một tiến trình ngầm (Background Worker) trên Mobile App liên tục lắng nghe trạng thái mạng của thiết bị. Ngay khi phát hiện sóng 3G/4G hồi phục, hệ thống tự động đẩy tuần tự (FIFO) các sự kiện trong Outbox lên Backend Server để xử lý. Các bức ảnh nặng được nén tối đa (WebP) và tải lên Cloud Storage ngầm giúp tiết kiệm băng thông tối đa.
            </p>
          </div>
        </div>
      </div>

      {/* Security Architecture Callout */}
      <div className="bg-rose-50/30 rounded-xl p-5 border border-rose-100 flex items-start gap-4">
        <ShieldAlert className="w-6 h-6 text-rose-700 shrink-0 mt-0.5" />
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-rose-950">Kiến trúc Bảo mật & Phân Quyền Trực Tuyến 3 Cấp:</h4>
          <p className="text-xs text-rose-900 leading-relaxed">
            Hệ thống áp dụng phân quyền nghiêm ngặt theo vai trò (Role-Based Access Control - RBAC). Các API thanh toán, đề xuất vật tư đều bắt buộc đối chiếu với hạn mức trong bảng <code className="bg-white px-1 py-0.5 rounded font-mono text-[10px] text-rose-800 border border-rose-200">material_limits</code> và phải ký số số hóa qua mã OTP di động. Điều này loại bỏ hoàn toàn rủi ro thất thoát vật tư, hoặc kế toán chi tiền khống không thông qua phê duyệt của Ban Giám đốc.
          </p>
        </div>
      </div>

    </div>
  );
}
