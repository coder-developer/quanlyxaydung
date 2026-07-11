/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Project, Employee, Contractor, Contract, InventoryItem, InventoryLedger, Timesheet, ApprovalRequest, Equipment, FinancialTransaction, MaterialLimit, LaborContract, ConstructionTask } from '../types';

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Chung cư cao cấp Green River',
    location: 'Phường 6, Quận 8, TP.HCM',
    budget: 150000000000, // 150 tỷ VND
    spent: 98500000000,   // 98.5 tỷ VND
    progress: 65,
    manager: 'Nguyễn Văn Mạnh',
    startDate: '2025-01-10',
    endDate: '2026-12-20',
    status: 'Active'
  },
  {
    id: 'proj-2',
    name: 'Cầu vượt nút giao Tân Sơn Nhất',
    location: 'Quận Tân Bình, TP.HCM',
    budget: 85000000000,  // 85 tỷ VND
    spent: 68000000000,   // 68 tỷ VND
    progress: 80,
    manager: 'Trần Hoàng Lâm',
    startDate: '2025-03-15',
    endDate: '2026-09-30',
    status: 'Active'
  },
  {
    id: 'proj-3',
    name: 'Tòa nhà văn phòng TechHub Tower',
    location: 'Phường Thủ Thiêm, Quận 2, TP.HCM',
    budget: 220000000000, // 220 tỷ VND
    spent: 77000000000,   // 77 tỷ VND
    progress: 35,
    manager: 'Lê Hồng Sơn',
    startDate: '2025-08-01',
    endDate: '2027-05-15',
    status: 'Active'
  },
  {
    id: 'proj-4',
    name: 'Khu đô thị sinh thái EcoGarden',
    location: 'Phường Long Bình Tân, Biên Hòa, Đồng Nai',
    budget: 340000000000, // 340 tỷ VND
    spent: 51000000000,   // 51 tỷ VND
    progress: 15,
    manager: 'Phạm Minh Hải',
    startDate: '2026-01-10',
    endDate: '2028-12-30',
    status: 'Active'
  },
  {
    id: 'proj-5',
    name: 'Nhà máy bán dẫn VinaSemi',
    location: 'Khu Công Nghệ Cao, Quận 9, TP.HCM',
    budget: 125000000000, // 125 tỷ VND
    spent: 112500000000,  // 112.5 tỷ VND
    progress: 90,
    manager: 'Vũ Đức Thành',
    startDate: '2025-02-20',
    endDate: '2026-08-15',
    status: 'Active'
  }
];

export const initialContractors: Contractor[] = [
  { id: 'partner-1', name: 'Công ty Cổ phần M&E Toàn Cầu', type: 'Subcontractor', contactPerson: 'Đỗ Quốc Bảo', phone: '0901.234.567', email: 'bao.dq@metoancau.com', rating: 4.8 },
  { id: 'partner-2', name: 'Công ty Cốp pha & Bê tông Sài Gòn', type: 'Subcontractor', contactPerson: 'Nguyễn Tấn Tài', phone: '0988.777.666', email: 'tai.nt@betongsaigon.vn', rating: 4.5 },
  { id: 'partner-3', name: 'Nhà phân phối Sắt Thép Việt', type: 'Supplier', contactPerson: 'Hoàng Thị Thảo', phone: '0912.333.444', email: 'thao.ht@thepviet.com.vn', rating: 4.7 },
  { id: 'partner-4', name: 'Công ty Bê tông tươi Song Hành', type: 'Supplier', contactPerson: 'Bùi Quang Minh', phone: '0934.555.666', email: 'minh.bq@songhanhbetong.com', rating: 4.4 },
  { id: 'partner-5', name: 'Công ty Thiết bị & Sơn hoàn thiện Mỹ Thuật', type: 'Subcontractor', contactPerson: 'Võ Văn Mỹ', phone: '0909.888.999', email: 'my.vv@sonmythuat.com', rating: 4.2 }
];

// Let's create contracts for projects:
// Each project has:
// 1 Contract with Client (Chủ đầu tư)
// 1 or more Contracts with Contractors/Suppliers
export const initialContracts: Contract[] = [
  // --- Client Contracts (Hợp đồng đầu vào) ---
  {
    id: 'ct-client-1',
    contractNumber: 'HD-CDT-GREENRIVER',
    title: 'Hợp đồng Tổng thầu Thi công Chung cư Green River',
    projectId: 'proj-1',
    partnerId: 'client-gr', // Client name: BĐS Sông Xanh
    partnerType: 'Client',
    value: 150000000000,
    advancePayment: 30000000000, // Đã ứng 30 tỷ
    acceptedValue: 98500000000,   // Đã nghiệm thu 98.5 tỷ
    paidValue: 90000000000,       // Đã thu hồi 90 tỷ từ chủ đầu tư
    startDate: '2025-01-05',
    endDate: '2026-12-30',
    status: 'Active'
  },
  {
    id: 'ct-client-2',
    contractNumber: 'HD-CDT-CAUVUOTTSN',
    title: 'Hợp đồng Xây lắp Cầu vượt nút giao Tân Sơn Nhất',
    projectId: 'proj-2',
    partnerId: 'client-sg-gt', // Sở GTVT TP.HCM
    partnerType: 'Client',
    value: 85000000000,
    advancePayment: 17000000000, // Đã ứng 17 tỷ
    acceptedValue: 68000000000,   // Đã nghiệm thu 68 tỷ
    paidValue: 65000000000,       // Đã thu hồi 65 tỷ
    startDate: '2025-03-10',
    endDate: '2026-10-15',
    status: 'Active'
  },
  {
    id: 'ct-client-3',
    contractNumber: 'HD-CDT-TECHHUB',
    title: 'Hợp đồng Xây dựng Tòa nhà Văn phòng TechHub Tower',
    projectId: 'proj-3',
    partnerId: 'client-techhub', // Công ty CP Đầu tư TechHub
    partnerType: 'Client',
    value: 220000000000,
    advancePayment: 44000000000, // Đã ứng 44 tỷ
    acceptedValue: 77000000000,   // Đã nghiệm thu 77 tỷ
    paidValue: 60000000000,       // Đã thu 60 tỷ
    startDate: '2025-07-25',
    endDate: '2027-06-01',
    status: 'Active'
  },
  {
    id: 'ct-client-4',
    contractNumber: 'HD-CDT-ECOGARDEN',
    title: 'Hợp đồng Tổng thầu Cơ sở Hạ tầng EcoGarden Biên Hòa',
    projectId: 'proj-4',
    partnerId: 'client-ecoland', // Tập đoàn Địa ốc EcoLand
    partnerType: 'Client',
    value: 340000000000,
    advancePayment: 68000000000, // Đã ứng 68 tỷ
    acceptedValue: 51000000000,   // Đã nghiệm thu 51 tỷ
    paidValue: 51000000000,       // Đã thu 51 tỷ
    startDate: '2026-01-02',
    endDate: '2029-01-15',
    status: 'Active'
  },
  {
    id: 'ct-client-5',
    contractNumber: 'HD-CDT-VINASEMI',
    title: 'Hợp đồng Thiết kế Thi công Nhà máy bán dẫn VinaSemi',
    projectId: 'proj-5',
    partnerId: 'client-vinasemi', // Tập đoàn Công nghệ VinaSemi
    partnerType: 'Client',
    value: 125000000000,
    advancePayment: 25000000000, // Đã ứng 25 tỷ
    acceptedValue: 112500000000,  // Đã nghiệm thu 112.5 tỷ
    paidValue: 110000000000,      // Đã thu 110 tỷ
    startDate: '2025-02-15',
    endDate: '2026-09-01',
    status: 'Active'
  },

  // --- Subcontractor / Supplier Contracts (Hợp đồng đầu ra) ---
  {
    id: 'ct-sub-1',
    contractNumber: 'HD-SUB-ME-GR',
    title: 'Hợp đồng Giao khoán Hệ thống Điện nước - Green River',
    projectId: 'proj-1',
    partnerId: 'partner-1', // M&E Toàn Cầu
    partnerType: 'Contractor',
    value: 32000000000,          // 32 tỷ
    advancePayment: 6400000000,  // Đã ứng 6.4 tỷ
    acceptedValue: 18500000000,  // Đã nghiệm thu khối lượng thầu phụ 18.5 tỷ
    paidValue: 15000000000,      // Đã trả thầu phụ 15 tỷ
    startDate: '2025-05-10',
    endDate: '2026-11-30',
    status: 'Active'
  },
  {
    id: 'ct-sub-2',
    contractNumber: 'HD-SUB-COPPHA-TSN',
    title: 'Hợp đồng Đúc dầm & Cốp pha đúc sẵn - Cầu vượt TSN',
    projectId: 'proj-2',
    partnerId: 'partner-2', // Cốp pha Sài Gòn
    partnerType: 'Contractor',
    value: 19500000000,          // 19.5 tỷ
    advancePayment: 4000000000,  // Đã ứng 4 tỷ
    acceptedValue: 15000000000,  // Đã nghiệm thu 15 tỷ
    paidValue: 12000000000,      // Đã trả 12 tỷ
    startDate: '2025-04-01',
    endDate: '2026-08-15',
    status: 'Active'
  },
  {
    id: 'ct-sub-3',
    contractNumber: 'HD-SUP-STEEL-GR',
    title: 'Hợp đồng Cung cấp Sắt Thép Xây dựng - Green River',
    projectId: 'proj-1',
    partnerId: 'partner-3', // Sắt Thép Việt
    partnerType: 'Contractor',
    value: 25000000000,          // 25 tỷ vật tư
    advancePayment: 5000000000,  // Đã ứng 5 tỷ
    acceptedValue: 20000000000,  // Thực tế đã giao và đối chiếu công nợ 20 tỷ
    paidValue: 17000000000,      // Đã trả tiền hàng 17 tỷ
    startDate: '2025-01-15',
    endDate: '2026-06-30',
    status: 'Active'
  },
  {
    id: 'ct-sub-4',
    contractNumber: 'HD-SUP-BETONG-TH',
    title: 'Hợp đồng Nguyên tắc Cung cấp Bê tông thương phẩm - TechHub',
    projectId: 'proj-3',
    partnerId: 'partner-4', // Bê tông Song Hành
    partnerType: 'Contractor',
    value: 45000000000,          // 45 tỷ
    advancePayment: 9000000000,  // Đã ứng 9 tỷ
    acceptedValue: 12000000000,  // Đã giao 12 tỷ
    paidValue: 10000000000,      // Đã thanh toán 10 tỷ
    startDate: '2025-08-10',
    endDate: '2027-03-30',
    status: 'Active'
  },
  {
    id: 'ct-sub-5',
    contractNumber: 'HD-SUB-PAINT-VINASEMI',
    title: 'Hợp đồng Thi công Sơn bả & Sàn Epoxy Phòng Sạch - VinaSemi',
    projectId: 'proj-5',
    partnerId: 'partner-5', // Sơn Mỹ Thuật
    partnerType: 'Contractor',
    value: 12000000000,          // 12 tỷ
    advancePayment: 2400000000,  // Đã ứng 2.4 tỷ
    acceptedValue: 9500000000,   // Đã nghiệm thu 9.5 tỷ
    paidValue: 8000000000,       // Đã trả 8 tỷ
    startDate: '2025-11-01',
    endDate: '2026-07-31',
    status: 'Active'
  }
];

// Let's create exactly 50 employees representing engineering staff (Internal) & seasonal labor (Seasonal)
export const initialEmployees: Employee[] = [
  // --- Offices & Project Managers ---
  { id: 'emp-1', name: 'Nguyễn Văn Mạnh', role: 'Chỉ huy trưởng', type: 'Internal', projectId: 'proj-1', phone: '0903.111.222', baseSalary: 45000000, active: true, citizenId: '001085002931', permanentAddress: '15 Lý Tự Trọng, Bến Nghé, Quận 1, TP.HCM' },
  { id: 'emp-2', name: 'Trần Hoàng Lâm', role: 'Chỉ huy trưởng', type: 'Internal', projectId: 'proj-2', phone: '0903.333.444', baseSalary: 42000000, active: true, citizenId: '079093005822', permanentAddress: '248 Nguyễn Thị Minh Khai, Võ Thị Sáu, Quận 3, TP.HCM' },
  { id: 'emp-3', name: 'Lê Hồng Sơn', role: 'Chỉ huy trưởng', type: 'Internal', projectId: 'proj-3', phone: '0903.555.666', baseSalary: 48000000, active: true, citizenId: '048092004811', permanentAddress: '78 Lê Lợi, Hải Châu 1, Hải Châu, Đà Nẵng' },
  { id: 'emp-4', name: 'Phạm Minh Hải', role: 'Chỉ huy trưởng', type: 'Internal', projectId: 'proj-4', phone: '0903.777.888', baseSalary: 50000000, active: true, citizenId: '001090003844', permanentAddress: '102 Phan Đình Phùng, Quán Thánh, Ba Đình, Hà Nội' },
  { id: 'emp-5', name: 'Vũ Đức Thành', role: 'Chỉ huy trưởng', type: 'Internal', projectId: 'proj-5', phone: '0903.999.000', baseSalary: 45000000, active: true, citizenId: '079095001299', permanentAddress: '42 Trần Hưng Đạo, Hiệp Phú, Quận 9, TP.HCM' },
  
  // --- Site Engineers & Supervisors (Kỹ sư giám sát / Kế toán công trường) ---
  { id: 'emp-6', name: 'Hoàng Văn Tú', role: 'Kỹ sư giám sát', type: 'Internal', projectId: 'proj-1', phone: '0912.001.002', baseSalary: 25000000, active: true },
  { id: 'emp-7', name: 'Phạm Thanh Bình', role: 'Kỹ sư giám sát', type: 'Internal', projectId: 'proj-1', phone: '0912.001.003', baseSalary: 22000000, active: true },
  { id: 'emp-8', name: 'Trần Trung Kiên', role: 'Kỹ sư giám sát', type: 'Internal', projectId: 'proj-2', phone: '0912.002.001', baseSalary: 24000000, active: true },
  { id: 'emp-9', name: 'Nguyễn Minh Quân', role: 'Kỹ sư giám sát', type: 'Internal', projectId: 'proj-3', phone: '0912.003.001', baseSalary: 26000000, active: true },
  { id: 'emp-10', name: 'Đặng Quốc Huy', role: 'Kỹ sư giám sát', type: 'Internal', projectId: 'proj-4', phone: '0912.004.001', baseSalary: 28000000, active: true },
  { id: 'emp-11', name: 'Vũ Văn Hùng', role: 'Kỹ sư giám sát', type: 'Internal', projectId: 'proj-5', phone: '0912.005.001', baseSalary: 25000000, active: true },
  
  { id: 'emp-12', name: 'Mai Thị Xuân', role: 'Kế toán công trường', type: 'Internal', projectId: 'proj-1', phone: '0989.123.001', baseSalary: 18000000, active: true },
  { id: 'emp-13', name: 'Bùi Thị Hà', role: 'Kế toán công trường', type: 'Internal', projectId: 'proj-2', phone: '0989.123.002', baseSalary: 18000000, active: true },
  { id: 'emp-14', name: 'Nguyễn Thúy Vy', role: 'Kế toán công trường', type: 'Internal', projectId: 'proj-3', phone: '0989.123.003', baseSalary: 19000000, active: true },
  { id: 'emp-15', name: 'Phạm Thị Lan', role: 'Kế toán công trường', type: 'Internal', projectId: 'proj-4', phone: '0989.123.004', baseSalary: 20000000, active: true },
  { id: 'emp-16', name: 'Lê Thanh Thủy', role: 'Kế toán công trường', type: 'Internal', projectId: 'proj-5', phone: '0989.123.005', baseSalary: 18000000, active: true },

  // --- Seasonal Laborers / Workers (34 công nhân cơ hữu & thời vụ trả lương ngày công) ---
  // Dự án 1: Green River (7 workers)
  { id: 'emp-17', name: 'Nguyễn Văn An', role: 'Tổ trưởng Thợ nề', type: 'Internal', projectId: 'proj-1', phone: '0961.001.001', baseSalary: 550000, active: true }, // baseSalary is daily rate for workers
  { id: 'emp-18', name: 'Trần Văn Bình', role: 'Thợ sắt cán', type: 'Seasonal', projectId: 'proj-1', phone: '0961.001.002', baseSalary: 400000, active: true },
  { id: 'emp-19', name: 'Lê Văn Cường', role: 'Thợ cốt pha', type: 'Seasonal', projectId: 'proj-1', phone: '0961.001.003', baseSalary: 420000, active: true },
  { id: 'emp-20', name: 'Phạm Văn Đông', role: 'Phụ hồ thô', type: 'Seasonal', projectId: 'proj-1', phone: '0961.001.004', baseSalary: 300000, active: true },
  { id: 'emp-21', name: 'Nguyễn Văn Giang', role: 'Thợ hàn điện', type: 'Internal', projectId: 'proj-1', phone: '0961.001.005', baseSalary: 480000, active: true },
  { id: 'emp-22', name: 'Lê Hoàng Hải', role: 'Thợ bê tông', type: 'Seasonal', projectId: 'proj-1', phone: '0961.001.006', baseSalary: 380000, active: true },
  { id: 'emp-23', name: 'Trần Thanh Khánh', role: 'Công nhân giàn giáo', type: 'Seasonal', projectId: 'proj-1', phone: '0961.001.007', baseSalary: 350000, active: true },

  // Dự án 2: Cầu vượt TSN (7 workers)
  { id: 'emp-24', name: 'Nguyễn Văn Lâm', role: 'Tổ trưởng Cơ giới', type: 'Internal', projectId: 'proj-2', phone: '0961.002.001', baseSalary: 600000, active: true },
  { id: 'emp-25', name: 'Trần Văn Minh', role: 'Lái máy xúc', type: 'Internal', projectId: 'proj-2', phone: '0961.002.002', baseSalary: 500000, active: true },
  { id: 'emp-26', name: 'Lê Văn Nam', role: 'Thợ sắt dầm', type: 'Seasonal', projectId: 'proj-2', phone: '0961.002.003', baseSalary: 450000, active: true },
  { id: 'emp-27', name: 'Phạm Văn Oanh', role: 'Thợ cốt pha lực', type: 'Seasonal', projectId: 'proj-2', phone: '0961.002.004', baseSalary: 450000, active: true },
  { id: 'emp-28', name: 'Nguyễn Văn Phương', role: 'Hàn áp lực cao', type: 'Internal', projectId: 'proj-2', phone: '0961.002.005', baseSalary: 520000, active: true },
  { id: 'emp-29', name: 'Lê Hoàng Quang', role: 'Phụ bê tông', type: 'Seasonal', projectId: 'proj-2', phone: '0961.002.006', baseSalary: 320000, active: true },
  { id: 'emp-30', name: 'Trần Thanh Sơn', role: 'Cẩu tháp dầm', type: 'Internal', projectId: 'proj-2', phone: '0961.002.007', baseSalary: 550000, active: true },

  // Dự án 3: TechHub (7 workers)
  { id: 'emp-31', name: 'Lê Văn Thành', role: 'Tổ trưởng Cốt sắt', type: 'Internal', projectId: 'proj-3', phone: '0961.003.001', baseSalary: 580000, active: true },
  { id: 'emp-32', name: 'Phạm Văn Uy', role: 'Thợ sắt đổ cột', type: 'Seasonal', projectId: 'proj-3', phone: '0961.003.002', baseSalary: 430000, active: true },
  { id: 'emp-33', name: 'Nguyễn Văn Vinh', role: 'Cốt pha cao tầng', type: 'Seasonal', projectId: 'proj-3', phone: '0961.003.003', baseSalary: 450000, active: true },
  { id: 'emp-34', name: 'Lê Hoàng Xuân', role: 'Hàn giàn giáo', type: 'Seasonal', projectId: 'proj-3', phone: '0961.003.004', baseSalary: 400000, active: true },
  { id: 'emp-35', name: 'Trần Thanh Yên', role: 'Phụ hồ sàn', type: 'Seasonal', projectId: 'proj-3', phone: '0961.003.005', baseSalary: 310000, active: true },
  { id: 'emp-36', name: 'Bùi Đức Anh', role: 'Lái vận thăng', type: 'Internal', projectId: 'proj-3', phone: '0961.003.006', baseSalary: 480000, active: true },
  { id: 'emp-37', name: 'Phan Văn Bách', role: 'Thợ điện công trình', type: 'Internal', projectId: 'proj-3', phone: '0961.003.007', baseSalary: 500000, active: true },

  // Dự án 4: EcoGarden (7 workers)
  { id: 'emp-38', name: 'Cao Văn Chiến', role: 'Tổ trưởng San lấp', type: 'Internal', projectId: 'proj-4', phone: '0961.004.001', baseSalary: 550000, active: true },
  { id: 'emp-39', name: 'Đỗ Văn Danh', role: 'Lái xe lu', type: 'Internal', projectId: 'proj-4', phone: '0961.004.002', baseSalary: 480000, active: true },
  { id: 'emp-40', name: 'Nguyễn Văn Đạt', role: 'Lái máy gạt', type: 'Internal', projectId: 'proj-4', phone: '0961.004.003', baseSalary: 500000, active: true },
  { id: 'emp-41', name: 'Lê Hoàng Em', role: 'Lao động san lấp', type: 'Seasonal', projectId: 'proj-4', phone: '0961.004.004', baseSalary: 320000, active: true },
  { id: 'emp-42', name: 'Trần Thanh Giang', role: 'Phụ lắp cống', type: 'Seasonal', projectId: 'proj-4', phone: '0961.004.005', baseSalary: 330000, active: true },
  { id: 'emp-43', name: 'Bùi Đức Hải', role: 'Thợ xây gạch block', type: 'Seasonal', projectId: 'proj-4', phone: '0961.004.006', baseSalary: 400000, active: true },
  { id: 'emp-44', name: 'Phan Văn Hậu', role: 'Lao động đường ống', type: 'Seasonal', projectId: 'proj-4', phone: '0961.004.007', baseSalary: 320000, active: true },

  // Dự án 5: VinaSemi (6 workers)
  { id: 'emp-45', name: 'Nguyễn Văn Kha', role: 'Tổ trưởng Hoàn thiện', type: 'Internal', projectId: 'proj-5', phone: '0961.005.001', baseSalary: 580000, active: true },
  { id: 'emp-46', name: 'Trần Văn Lực', role: 'Thợ sơn bả', type: 'Seasonal', projectId: 'proj-5', phone: '0961.005.002', baseSalary: 420000, active: true },
  { id: 'emp-47', name: 'Lê Văn Minh', role: 'Thợ mài sàn Epoxy', type: 'Seasonal', projectId: 'proj-5', phone: '0961.005.003', baseSalary: 450000, active: true },
  { id: 'emp-48', name: 'Phạm Văn Nam', role: 'Thợ lắp trần thạch cao', type: 'Seasonal', projectId: 'proj-5', phone: '0961.005.004', baseSalary: 450000, active: true },
  { id: 'emp-49', name: 'Nguyễn Văn Phong', role: 'Thợ điện nhẹ phòng sạch', type: 'Internal', projectId: 'proj-5', phone: '0961.005.005', baseSalary: 530000, active: true },
  { id: 'emp-50', name: 'Lê Hoàng Vũ', role: 'Thợ kính & Nhôm kính', type: 'Internal', projectId: 'proj-5', phone: '0961.005.006', baseSalary: 480000, active: true }
];

// Inventory items:
export const initialInventoryItems: InventoryItem[] = [
  { id: 'item-steel', code: 'VT-001', name: 'Thép phi 18 (Hòa Phát)', unit: 'Tấn', totalReceived: 250, totalIssued: 180, onHand: 70, avgCost: 17500000 },
  { id: 'item-cement', code: 'VT-002', name: 'Xi măng Portland Holcim PCB40', unit: 'Bao (50kg)', totalReceived: 5000, totalIssued: 4100, onHand: 900, avgCost: 95000 },
  { id: 'item-sand', code: 'VT-003', name: 'Cát vàng đổ bê tông hạt lớn', unit: 'm3', totalReceived: 1200, totalIssued: 950, onHand: 250, avgCost: 380000 },
  { id: 'item-stone', code: 'VT-004', name: 'Đá dăm 1x2 thi công móng', unit: 'm3', totalReceived: 1500, totalIssued: 1100, onHand: 400, avgCost: 320000 },
  { id: 'item-concrete', code: 'VT-005', name: 'Bê tông thương phẩm tươi M350', unit: 'm3', totalReceived: 3500, totalIssued: 3500, onHand: 0, avgCost: 1350000 } // Directly received & issued
];

// Material limit per project
export const initialMaterialLimits: MaterialLimit[] = [
  // Green River Quận 8 (Thép phi 18 và Xi măng)
  { projectId: 'proj-1', itemId: 'item-steel', plannedQty: 100, actualIssuedQty: 92 },  // Danger zone!
  { projectId: 'proj-1', itemId: 'item-cement', plannedQty: 2000, actualIssuedQty: 1850 },
  // Cầu vượt TSN
  { projectId: 'proj-2', itemId: 'item-steel', plannedQty: 80, actualIssuedQty: 78 },    // Over limit incoming!
  { projectId: 'proj-2', itemId: 'item-concrete', plannedQty: 1200, actualIssuedQty: 1150 },
  // TechHub Tower
  { projectId: 'proj-3', itemId: 'item-steel', plannedQty: 250, actualIssuedQty: 90 },
  { projectId: 'proj-3', itemId: 'item-concrete', plannedQty: 2000, actualIssuedQty: 750 },
  // EcoGarden
  { projectId: 'proj-4', itemId: 'item-sand', plannedQty: 3000, actualIssuedQty: 1200 },
  { projectId: 'proj-4', itemId: 'item-stone', plannedQty: 4000, actualIssuedQty: 800 },
  // VinaSemi
  { projectId: 'proj-5', itemId: 'item-cement', plannedQty: 1500, actualIssuedQty: 1480 },
  { projectId: 'proj-5', itemId: 'item-concrete', plannedQty: 1000, actualIssuedQty: 990 }
];

// Inventory ledger transaction logs
export const initialInventoryLedger: InventoryLedger[] = [
  { id: 'ledger-1', itemId: 'item-steel', projectId: 'proj-1', type: 'Receipt', quantity: 150, unitPrice: 17500000, sourceOrDestination: 'NPP Sắt Thép Việt', date: '2026-06-10', approvedBy: 'emp-12' },
  { id: 'ledger-2', itemId: 'item-steel', projectId: 'proj-1', type: 'Issue', quantity: 92, unitPrice: 17500000, sourceOrDestination: 'Tổ thép móng mố M1 - Green River', date: '2026-06-15', approvedBy: 'emp-6' },
  { id: 'ledger-3', itemId: 'item-steel', projectId: 'proj-2', type: 'Receipt', quantity: 100, unitPrice: 17600000, sourceOrDestination: 'NPP Sắt Thép Việt', date: '2026-06-11', approvedBy: 'emp-13' },
  { id: 'ledger-4', itemId: 'item-steel', projectId: 'proj-2', type: 'Issue', quantity: 78, unitPrice: 17600000, sourceOrDestination: 'Đúc dầm nhịp chính - Cầu vượt TSN', date: '2026-06-18', approvedBy: 'emp-8' },
  { id: 'ledger-5', itemId: 'item-cement', projectId: 'proj-1', type: 'Receipt', quantity: 2000, unitPrice: 95000, sourceOrDestination: 'Hà Tiên/Holcim Co.', date: '2026-06-12', approvedBy: 'emp-12' },
  { id: 'ledger-6', itemId: 'item-cement', projectId: 'proj-1', type: 'Issue', quantity: 1850, unitPrice: 95000, sourceOrDestination: 'Tổ bê tông tươi sàn tầng 12', date: '2026-06-20', approvedBy: 'emp-7' }
];

// Timesheet today
export const initialTimesheets: Timesheet[] = [
  // Let's generate check-in logs for today for several employees on site (GPS coordinates of site centers vs check-in GPS)
  // proj-1 (Green River Quận 8 center: lat=10.7412, lng=106.6345)
  { id: 'time-1', employeeId: 'emp-17', projectId: 'proj-1', date: '2026-07-08', checkInTime: '06:55:00', checkOutTime: null, status: 'Present', latitude: 10.7414, longitude: 106.6346, gpsStatus: 'In-Range', verifiedByFace: true },
  { id: 'time-2', employeeId: 'emp-18', projectId: 'proj-1', date: '2026-07-08', checkInTime: '07:05:00', checkOutTime: null, status: 'Late', latitude: 10.7410, longitude: 106.6344, gpsStatus: 'In-Range', verifiedByFace: true },
  { id: 'time-3', employeeId: 'emp-19', projectId: 'proj-1', date: '2026-07-08', checkInTime: '06:48:00', checkOutTime: null, status: 'Present', latitude: 10.7445, longitude: 106.6398, gpsStatus: 'Out-Of-Range', verifiedByFace: false }, // Worker checks in from coffee shop! Out-of-Range warning!
  { id: 'time-4', employeeId: 'emp-20', projectId: 'proj-1', date: '2026-07-08', checkInTime: '06:58:00', checkOutTime: null, status: 'Present', latitude: 10.7412, longitude: 106.6345, gpsStatus: 'In-Range', verifiedByFace: true },
  
  // proj-2 (Cầu vượt TSN center: lat=10.8142, lng=106.6625)
  { id: 'time-5', employeeId: 'emp-24', projectId: 'proj-2', date: '2026-07-08', checkInTime: '06:50:00', checkOutTime: null, status: 'Present', latitude: 10.8143, longitude: 106.6626, gpsStatus: 'In-Range', verifiedByFace: true },
  { id: 'time-6', employeeId: 'emp-25', projectId: 'proj-2', date: '2026-07-08', checkInTime: '06:52:00', checkOutTime: null, status: 'Present', latitude: 10.8141, longitude: 106.6624, gpsStatus: 'In-Range', verifiedByFace: true },
  { id: 'time-7', employeeId: 'emp-26', projectId: 'proj-2', date: '2026-07-08', checkInTime: '07:30:00', checkOutTime: null, status: 'Late', latitude: 10.8142, longitude: 106.6625, gpsStatus: 'In-Range', verifiedByFace: true }
];

// Equipment machinery
export const initialEquipment: Equipment[] = [
  { id: 'eq-1', code: 'TB-001', name: 'Máy xúc bánh xích Komatsu PC200', currentProjectId: 'proj-1', status: 'In-Use', fuelConsumptionRate: '15 Lít / Giờ', lastMaintenance: '2026-05-10', nextMaintenance: '2026-11-10', fuelCostThisMonth: 18500000 },
  { id: 'eq-2', code: 'TB-002', name: 'Xe lu rung Hamm 3411 (11 Tấn)', currentProjectId: 'proj-4', status: 'In-Use', fuelConsumptionRate: '10 Lít / Giờ', lastMaintenance: '2026-04-15', nextMaintenance: '2026-10-15', fuelCostThisMonth: 12400000 },
  { id: 'eq-3', code: 'TB-003', name: 'Cần cẩu tháp Zoomlion TC6012', currentProjectId: 'proj-3', status: 'In-Use', fuelConsumptionRate: 'Chạy điện công nghiệp', lastMaintenance: '2026-06-01', nextMaintenance: '2026-12-01', fuelCostThisMonth: 0 },
  { id: 'eq-4', code: 'TB-004', name: 'Máy trộn bê tông tươi tự hành JS500', currentProjectId: 'proj-2', status: 'In-Use', fuelConsumptionRate: '8 Lít / Giờ', lastMaintenance: '2026-05-20', nextMaintenance: '2026-11-20', fuelCostThisMonth: 9200000 },
  { id: 'eq-5', code: 'TB-005', name: 'Máy đầm dùi chạy xăng Honda GX160', currentProjectId: 'proj-5', status: 'Available', fuelConsumptionRate: '2 Lít / Giờ', lastMaintenance: '2026-06-15', nextMaintenance: '2026-12-15', fuelCostThisMonth: 1500000 }
];

// Approval requests
export const initialApprovalRequests: ApprovalRequest[] = [
  {
    id: 'req-1',
    requesterId: 'emp-6', // Kỹ sư Hoàng Văn Tú
    requestType: 'Material_Purchase',
    title: 'Đề xuất mua khẩn cấp 15 tấn Thép phi 18 bù hụt định mức mố M1',
    amount: 262500000, // 262.5 triệu VND
    projectId: 'proj-1',
    details: 'Mố cầu M1 tại Green River phát sinh gia cường dầm thép chống lún, khối lượng thực tế vượt định mức thiết kế 12 tấn. Đề xuất duyệt mua khẩn cấp từ NPP Thép Việt để kịp tiến độ đổ bê tông sàn dầm thứ Bảy.',
    currentLevel: 2, // At Accountant check
    status: 'Pending_Accountant',
    timeline: [
      { level: 1, actor: 'Hoàng Văn Tú (Kỹ sư)', action: 'Create', date: '2026-07-07 09:30', note: 'Lập đề xuất khẩn cấp đính kèm bản vẽ gia cường kết cấu.' }
    ]
  },
  {
    id: 'req-2',
    requesterId: 'emp-27', // Thợ cốp pha Phạm Văn Oanh (seasonal)
    requestType: 'Salary_Advance',
    title: 'Đề xuất tạm ứng lương tuần cho tổ cốp pha Cầu vượt TSN',
    amount: 15000000, // 15 triệu VND
    projectId: 'proj-2',
    details: 'Đề xuất tạm ứng lương tuần cho 5 anh em tổ cốp pha thời vụ để trang trải chi phí sinh hoạt giữa tháng. Đã làm việc đủ 12 ngày công, khối lượng hoàn thành nghiệm thu thực tế đạt 100% chỉ tiêu tuần.',
    currentLevel: 3, // Passed accountant, pending director
    status: 'Pending_Director',
    timeline: [
      { level: 1, actor: 'Phạm Văn Oanh (Công nhân)', action: 'Create', date: '2026-07-06 14:00', note: 'Đề xuất tạm ứng lương tuần hỗ trợ công nhân.' },
      { level: 2, actor: 'Bùi Thị Hà (Kế toán)', action: 'Verify', date: '2026-07-07 10:15', note: 'Đã đối chiếu bảng công & khối lượng hoàn thành đạt yêu cầu. Định mức khả thi.' }
    ]
  },
  {
    id: 'req-3',
    requesterId: 'emp-11', // Kỹ sư Vũ Văn Hùng - VinaSemi
    requestType: 'Equipment_Dispatch',
    title: 'Đề xuất điều động máy xúc Komatsu sang nhà máy VinaSemi',
    amount: 5000000, // Chi phí vận chuyển xe fooc nâng máy xúc 5tr
    projectId: 'proj-5',
    details: 'Hạng mục sân vườn, đường nội bộ nhà máy VinaSemi bước vào giai đoạn san lấp mặt bằng gấp. Đề xuất điều phối máy xúc xích Komatsu PC200 từ Green River đang rảnh sang chạy liên tục trong 4 ngày.',
    currentLevel: 4,
    status: 'Approved',
    timeline: [
      { level: 1, actor: 'Vũ Văn Hùng (Kỹ sư)', action: 'Create', date: '2026-07-05 08:00', note: 'Lập nhu cầu luân chuyển máy phục vụ san lấp gấp.' },
      { level: 2, actor: 'Mai Thị Xuân (Kế toán)', action: 'Verify', date: '2026-07-05 11:30', note: 'Đã bố trí chi phí xe cẩu kéo máy xúc 5,000,000 VND từ ngân sách vận hành thiết bị.' },
      { level: 3, actor: 'Vũ Đức Thành (Giám đốc)', action: 'Approve', date: '2026-07-05 16:20', note: 'Duyệt điều phối máy xúc. Điều phối viên thiết bị liên hệ bàn giao.' }
    ]
  }
];

// Financial Ledger to track revenue and detailed project P&L expenses
// Sum of expenses should be tracked to match initialProjects.spent approximately
export const initialFinancialTransactions: FinancialTransaction[] = [
  // --- Green River (spent = 98.5 tỷ, revenue/advance = 90 tỷ) ---
  { id: 'tx-1', projectId: 'proj-1', type: 'Revenue', category: 'Client_Billing', amount: 30000000000, description: 'Chủ đầu tư BĐS Sông Xanh tạm ứng hợp đồng đợt 1', date: '2025-01-15', referenceId: 'ct-client-1' },
  { id: 'tx-2', projectId: 'proj-1', type: 'Revenue', category: 'Client_Billing', amount: 60000000000, description: 'Chủ đầu tư thanh toán đợt 2 nghiệm thu khối lượng sàn tầng 10', date: '2025-12-10', referenceId: 'ct-client-1' },
  { id: 'tx-3', projectId: 'proj-1', type: 'Expense', category: 'Material', amount: 35000000000, description: 'Thanh toán mua thép móng, xi măng đợt 1 - NPP Thép Việt', date: '2025-02-20', referenceId: 'ct-sub-3' },
  { id: 'tx-4', projectId: 'proj-1', type: 'Expense', category: 'Subcontractor', amount: 15000000000, description: 'Thanh toán đợt 1 khối lượng cơ điện M&E thi công âm tường', date: '2025-06-15', referenceId: 'ct-sub-1' },
  { id: 'tx-5', projectId: 'proj-1', type: 'Expense', category: 'Labor', amount: 28500000000, description: 'Chi phí nhân công, lương kỹ sư & đội công nhân mộc nề năm 2025', date: '2025-12-31' },
  { id: 'tx-6', projectId: 'proj-1', type: 'Expense', category: 'Equipment', amount: 12000000000, description: 'Chi phí vận hành cần cẩu, máy xúc và thuê giàn giáo thi công phần thân', date: '2025-11-20' },
  { id: 'tx-7', projectId: 'proj-1', type: 'Expense', category: 'Overhead', amount: 8000000000, description: 'Chi phí quản lý ban điều hành công trường, tiếp khách, điện nước sinh hoạt', date: '2025-12-31' },

  // --- Cầu vượt TSN (spent = 68 tỷ, revenue = 65 tỷ) ---
  { id: 'tx-8', projectId: 'proj-2', type: 'Revenue', category: 'Client_Billing', amount: 17000000000, description: 'Sở GTVT tạm ứng giải ngân hợp đồng đầu khởi công', date: '2025-03-20', referenceId: 'ct-client-2' },
  { id: 'tx-9', projectId: 'proj-2', type: 'Revenue', category: 'Client_Billing', amount: 48000000000, description: 'Sở GTVT giải ngân đợt 2 nghiệm thu đúc xong 6 dầm Super-T', date: '2025-10-05', referenceId: 'ct-client-2' },
  { id: 'tx-10', projectId: 'proj-2', type: 'Expense', category: 'Subcontractor', amount: 12000000000, description: 'Thanh toán thầu phụ Cốp pha đúc dầm nhịp chính', date: '2025-05-15', referenceId: 'ct-sub-2' },
  { id: 'tx-11', projectId: 'proj-2', type: 'Expense', category: 'Material', amount: 26000000000, description: 'Chi phí sắt thép chịu lực cao, bê tông Song Hành đúc dầm', date: '2025-06-30' },
  { id: 'tx-12', projectId: 'proj-2', type: 'Expense', category: 'Labor', amount: 18000000000, description: 'Chi phí nhân lực thi công cốt thép, lao dầm, đổ bê tông tại công trường', date: '2025-12-31' },
  { id: 'tx-13', projectId: 'proj-2', type: 'Expense', category: 'Equipment', amount: 9000000000, description: 'Chi phí thuê cẩu xích siêu trường 150 tấn luồn dầm', date: '2025-09-10' },
  { id: 'tx-14', projectId: 'proj-2', type: 'Expense', category: 'Overhead', amount: 3000000000, description: 'Chi phí văn phòng điều hành cầu vượt, đo đạc trắc địa', date: '2025-12-31' },

  // --- TechHub Tower (spent = 77 tỷ, revenue = 60 tỷ) ---
  { id: 'tx-15', projectId: 'proj-3', type: 'Revenue', category: 'Client_Billing', amount: 44000000000, description: 'Tập đoàn TechHub tạm ứng hợp đồng ký kết', date: '2025-08-05', referenceId: 'ct-client-3' },
  { id: 'tx-16', projectId: 'proj-3', type: 'Revenue', category: 'Client_Billing', amount: 16000000000, description: 'Nghiệm thu thanh toán phần móng vây tòa nhà TechHub', date: '2026-02-15', referenceId: 'ct-client-3' },
  { id: 'tx-17', projectId: 'proj-3', type: 'Expense', category: 'Material', amount: 32000000000, description: 'Mua sắm vật tư thép móng vây, bê tông Song Hành đổ sàn hầm', date: '2025-10-10', referenceId: 'ct-sub-4' },
  { id: 'tx-18', projectId: 'proj-3', type: 'Expense', category: 'Subcontractor', amount: 20000000000, description: 'Tạm ứng thầu phụ khoan cọc nhồi móng sâu hầm tòa nhà', date: '2025-09-01' },
  { id: 'tx-19', projectId: 'proj-3', type: 'Expense', category: 'Labor', amount: 15000000000, description: 'Lương ban quản lý dự án, chi đội khoán móng và thợ hàn vây', date: '2025-12-31' },
  { id: 'tx-20', projectId: 'proj-3', type: 'Expense', category: 'Equipment', amount: 8000000000, description: 'Thuê robot đào đất ngầm hầm 2, máy cẩu hạ lồng thép cọc nhồi', date: '2025-10-25' },
  { id: 'tx-21', projectId: 'proj-3', type: 'Expense', category: 'Overhead', amount: 2000000000, description: 'Chi phí tư vấn giám sát độc lập, thủ tục pháp lý xây dựng hầm', date: '2025-12-31' },

  // --- EcoGarden (spent = 51 tỷ, revenue = 51 tỷ) ---
  { id: 'tx-22', projectId: 'proj-4', type: 'Revenue', category: 'Client_Billing', amount: 51000000000, description: 'Chủ đầu tư Ecoland thanh toán giá trị san lấp, cống hộp phân khu A', date: '2026-03-10', referenceId: 'ct-client-4' },
  { id: 'tx-23', projectId: 'proj-4', type: 'Expense', category: 'Equipment', amount: 22000000000, description: 'Chi phí máy móc cơ giới san gạt, lu nền, tiêu hao xăng dầu lu nền', date: '2026-02-28' },
  { id: 'tx-24', projectId: 'proj-4', type: 'Expense', category: 'Material', amount: 14000000000, description: 'Mua cát san lấp đợt 1 và cống hộp đúc sẵn lắp đặt hạ tầng', date: '2026-03-01' },
  { id: 'tx-25', projectId: 'proj-4', type: 'Expense', category: 'Labor', amount: 10000000000, description: 'Chi trả lương kỹ sư cầu đường, lái xe ben, đội san lấp Biên Hòa', date: '2026-04-30' },
  { id: 'tx-26', projectId: 'proj-4', type: 'Expense', category: 'Overhead', amount: 5000000000, description: 'Chi phí lán trại dã chiến, đền bù hoa màu, bảo vệ công trường diện rộng', date: '2026-02-15' },

  // --- VinaSemi (spent = 112.5 tỷ, revenue = 110 tỷ) ---
  { id: 'tx-27', projectId: 'proj-5', type: 'Revenue', category: 'Client_Billing', amount: 25000000000, description: 'Tập đoàn VinaSemi tạm ứng đợt khởi công xây nhà máy sạch', date: '2025-03-01', referenceId: 'ct-client-5' },
  { id: 'tx-28', projectId: 'proj-5', type: 'Revenue', category: 'Client_Billing', amount: 85000000000, description: 'Thanh toán đợt 2 hoàn thiện cất nóc & phủ kính vỏ nhà máy', date: '2026-01-20', referenceId: 'ct-client-5' },
  { id: 'tx-29', projectId: 'proj-5', type: 'Expense', category: 'Subcontractor', amount: 35000000000, description: 'Thanh toán thầu phụ Mỹ Thuật sơn sàn Epoxy kháng khuẩn và trần sạch', date: '2026-02-10', referenceId: 'ct-sub-5' },
  { id: 'tx-30', projectId: 'proj-5', type: 'Expense', category: 'Material', amount: 42000000000, description: 'Vật tư thi công: Khung kính chịu lực, panel tiêu âm, kính cường lực sạch', date: '2025-08-15' },
  { id: 'tx-31', projectId: 'proj-5', type: 'Expense', category: 'Labor', amount: 22000000000, description: 'Chi phí nhân công chất lượng cao lắp đặt thiết bị tinh vi nhà máy', date: '2025-12-31' },
  { id: 'tx-32', projectId: 'proj-5', type: 'Expense', category: 'Equipment', amount: 10000000000, description: 'Chi phí xe nâng người Genie cắt kéo, cần cẩu siêu kính thi công panel', date: '2025-10-15' },
  { id: 'tx-33', projectId: 'proj-5', type: 'Expense', category: 'Overhead', amount: 3500000000, description: 'Bảo hiểm cháy nổ công trình, nghiệm thu PCCC, đo đạc môi trường phòng sạch', date: '2026-03-01' }
];

export const initialLaborContracts: LaborContract[] = [
  {
    id: 'lc-1',
    employeeId: 'emp-1', // Nguyễn Văn An
    contractNumber: 'HĐLĐ/2025/001-GR',
    signDate: '2025-01-02',
    startDate: '2025-01-05',
    endDate: '2027-01-05',
    salaryType: 'Monthly',
    salaryAmount: 18000000,
    allowance: 1500000,
    insurance: true,
    status: 'Active',
    signedByEmployee: true,
    signedByDirector: true,
  },
  {
    id: 'lc-2',
    employeeId: 'emp-2', // Trần Thị Bình
    contractNumber: 'HĐLĐ/2025/002-GR',
    signDate: '2025-01-02',
    startDate: '2025-01-05',
    endDate: '2026-01-05',
    salaryType: 'Monthly',
    salaryAmount: 15000000,
    allowance: 1000000,
    insurance: true,
    status: 'Expired',
    signedByEmployee: true,
    signedByDirector: true,
  },
  {
    id: 'lc-3',
    employeeId: 'emp-6', // Hoàng Văn Tú
    contractNumber: 'HĐLĐ/2025/006-GR',
    signDate: '2025-03-10',
    startDate: '2025-03-15',
    endDate: '2027-03-15',
    salaryType: 'Monthly',
    salaryAmount: 22000000,
    allowance: 2000000,
    insurance: true,
    status: 'Active',
    signedByEmployee: true,
    signedByDirector: true,
  },
  {
    id: 'lc-4',
    employeeId: 'emp-17', // Trần Văn Hải (worker)
    contractNumber: 'HĐLĐ/2025/017-TV',
    signDate: '2025-05-20',
    startDate: '2025-05-22',
    endDate: null, // Vô thời hạn hoặc thời vụ dài ngày
    salaryType: 'Daily',
    salaryAmount: 450000,
    allowance: 50000,
    insurance: false,
    status: 'Active',
    signedByEmployee: true,
    signedByDirector: true,
  },
  {
    id: 'lc-5',
    employeeId: 'emp-27', // Phạm Văn Oanh
    contractNumber: 'HĐLĐ/2026/027-TV',
    signDate: '2026-03-15',
    startDate: '2026-03-16',
    endDate: '2026-09-16',
    salaryType: 'Daily',
    salaryAmount: 480000,
    allowance: 30000,
    insurance: false,
    status: 'Active',
    signedByEmployee: true,
    signedByDirector: false, // Giám đốc chưa ký
  },
];

export const initialConstructionTasks: ConstructionTask[] = [
  // Green River (proj-1)
  {
    id: 'task-1-1',
    projectId: 'proj-1',
    name: 'Thi công ép cọc nhồi móng phân khu A',
    startDate: '2025-01-10',
    endDate: '2025-03-15',
    progress: 100,
    assignedTo: 'Đội thi công móng ngầm Số 1',
    status: 'Completed',
    priority: 'High',
    weight: 15,
    notes: 'Đã hoàn thành nghiệm thu bàn giao.',
  },
  {
    id: 'task-1-2',
    projectId: 'proj-1',
    name: 'Đổ bê tông hầm B1 và kết cấu chịu lực móng vây',
    startDate: '2025-03-20',
    endDate: '2025-06-30',
    progress: 100,
    assignedTo: 'Đội bê tông Hòa Bình',
    status: 'Completed',
    priority: 'High',
    weight: 20,
    notes: 'Vượt tiến độ 5 ngày.',
  },
  {
    id: 'task-1-3',
    projectId: 'proj-1',
    name: 'Xây dựng kết cấu thân sàn từ tầng 1 đến sàn tầng 15',
    startDate: '2025-07-01',
    endDate: '2026-02-28',
    progress: 100,
    assignedTo: 'Tổ thợ nề cốt thép Miền Tây',
    status: 'Completed',
    priority: 'High',
    weight: 35,
    notes: 'Đã cất nóc sàn tầng 15 thành công.',
  },
  {
    id: 'task-1-4',
    projectId: 'proj-1',
    name: 'Thi công xây tô ngăn phòng và trát hoàn thiện mặt ngoài',
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    progress: 75,
    assignedTo: 'Đội hoàn thiện An Phong',
    status: 'In_Progress',
    priority: 'Medium',
    weight: 15,
    notes: 'Đang hoàn thiện tô trát tầng 12, đảm bảo tiến độ.',
  },
  {
    id: 'task-1-5',
    projectId: 'proj-1',
    name: 'Lắp đặt hệ thống cơ điện âm tường (M&E) căn hộ',
    startDate: '2026-04-15',
    endDate: '2026-10-30',
    progress: 40,
    assignedTo: 'Thầu phụ Cơ điện Ree Corp',
    status: 'In_Progress',
    priority: 'High',
    weight: 10,
    notes: 'Tiến độ song hành với đội tô trát.',
  },
  {
    id: 'task-1-6',
    projectId: 'proj-1',
    name: 'Lắp đặt thang máy, kiểm định PCCC và nghiệm thu đưa vào sử dụng',
    startDate: '2026-09-01',
    endDate: '2026-12-15',
    progress: 0,
    assignedTo: 'Hãng thang máy Otis & Đội PCCC',
    status: 'Not_Started',
    priority: 'High',
    weight: 5,
    notes: 'Đang chuẩn bị hồ sơ pháp lý đệ trình phòng cháy.',
  },

  // Cầu vượt TSN (proj-2)
  {
    id: 'task-2-1',
    projectId: 'proj-2',
    name: 'Giải phóng mặt bằng, di dời hạ tầng điện nước ngầm',
    startDate: '2025-03-15',
    endDate: '2025-05-30',
    progress: 100,
    assignedTo: 'Đội GPMB Quận Tân Bình',
    status: 'Completed',
    priority: 'High',
    weight: 10,
  },
  {
    id: 'task-2-2',
    projectId: 'proj-2',
    name: 'Khoan cọc nhồi mố trụ cầu T1, T2, T3',
    startDate: '2025-06-01',
    endDate: '2025-09-15',
    progress: 100,
    assignedTo: 'Tổ khoan cọc Nhồi Số 3',
    status: 'Completed',
    priority: 'High',
    weight: 25,
  },
  {
    id: 'task-2-3',
    projectId: 'proj-2',
    name: 'Đúc 6 dầm Super-T tại bãi đúc dầm Song Hành',
    startDate: '2025-07-10',
    endDate: '2025-11-20',
    progress: 100,
    assignedTo: 'Tổ đúc dầm bê tông cốt thép dự ứng lực',
    status: 'Completed',
    priority: 'High',
    weight: 25,
  },
  {
    id: 'task-2-4',
    projectId: 'proj-2',
    name: 'Lao phóng dầm Super-T lên nhịp chính mố T1-T2',
    startDate: '2025-12-01',
    endDate: '2026-02-15',
    progress: 100,
    assignedTo: 'Đội xe cẩu tải siêu trường siêu trọng',
    status: 'Completed',
    priority: 'High',
    weight: 20,
    notes: 'Lao dầm vào ban đêm từ 22h - 4h để tránh kẹt xe sân bay.',
  },
  {
    id: 'task-2-5',
    projectId: 'proj-2',
    name: 'Thi công bản mặt cầu, chống thấm và thảm bê tông nhựa nóng',
    startDate: '2026-02-16',
    endDate: '2026-06-30',
    progress: 95,
    assignedTo: 'Đội thảm nhựa CII',
    status: 'In_Progress',
    priority: 'High',
    weight: 15,
    notes: 'Đã hoàn thành chống thấm, đang lu lèn thảm nhựa lớp 2.',
  },
  {
    id: 'task-2-6',
    projectId: 'proj-2',
    name: 'Lắp đặt lan can bảo vệ, hệ thống chiếu sáng và vạch kẻ đường',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
    progress: 20,
    assignedTo: 'Tổ hoàn thiện An toàn giao thông',
    status: 'In_Progress',
    priority: 'Medium',
    weight: 5,
    notes: 'Đang lắp trụ lan can inox dọc mố cầu.',
  },

  // TechHub Tower (proj-3)
  {
    id: 'task-3-1',
    projectId: 'proj-3',
    name: 'Thi công tường vây Barrette sâu 40m quanh chu vi hầm',
    startDate: '2025-08-10',
    endDate: '2025-11-30',
    progress: 100,
    assignedTo: 'Tổ cơ giới móng vây Bauer',
    status: 'Completed',
    priority: 'High',
    weight: 30,
  },
  {
    id: 'task-3-2',
    projectId: 'proj-3',
    name: 'Đào đất và làm giằng chống Shoring hầm tầng hầm 1, B2',
    startDate: '2025-12-01',
    endDate: '2026-03-15',
    progress: 100,
    assignedTo: 'Đội đào móng Sông Đà',
    status: 'Completed',
    priority: 'High',
    weight: 30,
  },
  {
    id: 'task-3-3',
    projectId: 'proj-3',
    name: 'Đổ bê tông đài móng dày 3.5m và sàn đáy tầng hầm 3',
    startDate: '2026-03-16',
    endDate: '2026-07-15',
    progress: 60,
    assignedTo: 'Tổ bê tông móng hầm sâu TechHub',
    status: 'In_Progress',
    priority: 'High',
    weight: 25,
    notes: 'Đã đổ xong đợt 1 phân khu cốt lõi thang máy.',
  },
  {
    id: 'task-3-4',
    projectId: 'proj-3',
    name: 'Lên cột vách lõi thang và đổ sàn hầm B1, B2',
    startDate: '2026-07-16',
    endDate: '2026-10-31',
    progress: 0,
    assignedTo: 'Đội ván khuôn trượt Miền Trung',
    status: 'Not_Started',
    priority: 'High',
    weight: 15,
  }
];

