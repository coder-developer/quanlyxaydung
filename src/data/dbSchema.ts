/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DbColumn {
  name: string;
  type: string;
  constraints?: string[];
  description: string;
}

export interface DbRelation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  type: '1:N' | 'N:M' | '1:1';
  description: string;
}

export interface DbTable {
  name: string;
  description: string;
  columns: DbColumn[];
  primaryKeys: string[];
  indexes: string[];
}

export const dbTables: DbTable[] = [
  {
    name: 'projects',
    description: 'Bảng lưu trữ thông tin về các dự án/công trường xây dựng đang triển khai.',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_projects_status ON projects(status);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã định danh duy nhất của dự án.' },
      { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'], description: 'Tên dự án (Ví dụ: Green River Quận 8).' },
      { name: 'location', type: 'VARCHAR(500)', constraints: ['NOT NULL'], description: 'Địa chỉ cụ thể của dự án.' },
      { name: 'latitude', type: 'DECIMAL(10, 8)', constraints: ['NOT NULL'], description: 'Vĩ độ GPS tâm dự án (dùng để cấu hình hàng rào địa lý chấm công).' },
      { name: 'longitude', type: 'DECIMAL(11, 8)', constraints: ['NOT NULL'], description: 'Kinh độ GPS tâm dự án (bán kính chấm công mặc định 200m).' },
      { name: 'budget', type: 'NUMERIC(15, 2)', constraints: ['NOT NULL', 'CHECK (budget > 0)'], description: 'Ngân sách tổng duyệt ban đầu (VND).' },
      { name: 'spent', type: 'NUMERIC(15, 2)', constraints: ['DEFAULT 0'], description: 'Tổng chi phí thực tế đã tích lũy (VND).' },
      { name: 'progress', type: 'DECIMAL(5, 2)', constraints: ['DEFAULT 0.00', 'CHECK (progress BETWEEN 0 AND 100)'], description: 'Tiến độ hoàn thành dự toán (%).' },
      { name: 'manager_id', type: 'UUID', constraints: ['REFERENCES employees(id)'], description: 'Mã người chỉ huy trưởng chịu trách nhiệm chính.' },
      { name: 'start_date', type: 'DATE', constraints: ['NOT NULL'], description: 'Ngày khởi công dự kiến.' },
      { name: 'end_date', type: 'DATE', constraints: ['NOT NULL'], description: 'Ngày hoàn thành dự kiến.' },
      { name: 'status', type: 'VARCHAR(50)', constraints: ['DEFAULT \'Planning\''], description: 'Trạng thái: Planning, Active, Delayed, Completed.' },
      { name: 'created_at', type: 'TIMESTAMP', constraints: ['DEFAULT CURRENT_TIMESTAMP'], description: 'Thời điểm tạo bản ghi.' }
    ]
  },
  {
    name: 'employees',
    description: 'Bảng thông tin nhân sự toàn công ty, bao gồm kỹ sư văn phòng, kỹ sư công trường và lao động thời vụ.',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_employees_project ON employees(project_id);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã nhân sự duy nhất.' },
      { name: 'name', type: 'VARCHAR(150)', constraints: ['NOT NULL'], description: 'Họ và tên đầy đủ.' },
      { name: 'role', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Chức danh công việc (Chỉ huy trưởng, Kỹ sư giám sát, Thợ xây, Tổ trưởng...).' },
      { name: 'type', type: 'VARCHAR(50)', constraints: ['NOT NULL', 'CHECK (type IN (\'Internal\', \'Seasonal\'))'], description: 'Phân loại lao động: Internal (Cơ hữu/Có đóng bảo hiểm) hoặc Seasonal (Thời vụ/Khoán nhật).' },
      { name: 'project_id', type: 'UUID', constraints: ['REFERENCES projects(id)'], description: 'Dự án hiện tại được điều động làm việc. Nếu NULL là nhân sự khối văn phòng.' },
      { name: 'phone', type: 'VARCHAR(20)', constraints: ['NOT NULL', 'UNIQUE'], description: 'Số điện thoại liên hệ (dùng để đăng nhập app).' },
      { name: 'base_salary', type: 'NUMERIC(15, 2)', constraints: ['NOT NULL'], description: 'Mức lương cơ bản (Theo tháng với cơ hữu, Theo ngày công với thời vụ).' },
      { name: 'active', type: 'BOOLEAN', constraints: ['DEFAULT TRUE'], description: 'Trạng thái đang làm việc hay đã nghỉ.' },
      { name: 'face_embedding', type: 'VECTOR(512)', constraints: [], description: 'Vector nhận diện khuôn mặt phục vụ chấm công chống gian lận.' }
    ]
  },
  {
    name: 'contractors',
    description: 'Danh bạ các nhà thầu phụ (đội thi công thuê ngoài) và nhà cung cấp vật liệu xây dựng.',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_contractors_type ON contractors(type);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã nhà thầu / nhà cung cấp.' },
      { name: 'name', type: 'VARCHAR(255)', constraints: ['NOT NULL'], description: 'Tên pháp nhân công ty hoặc tên đội trưởng đội thầu.' },
      { name: 'type', type: 'VARCHAR(50)', constraints: ['NOT NULL', 'CHECK (type IN (\'Subcontractor\', \'Supplier\'))'], description: 'Phân loại đối tác: Subcontractor (Nhà thầu phụ) hoặc Supplier (Nhà cung cấp vật tư).' },
      { name: 'contact_person', type: 'VARCHAR(100)', description: 'Người đại diện liên hệ.' },
      { name: 'phone', type: 'VARCHAR(20)', description: 'Số điện thoại liên hệ.' },
      { name: 'email', type: 'VARCHAR(100)', description: 'Địa chỉ email gửi hóa đơn/đơn hàng.' },
      { name: 'rating', type: 'DECIMAL(2, 1)', constraints: ['DEFAULT 5.0'], description: 'Đánh giá năng lực đối tác (1.0 đến 5.0).' }
    ]
  },
  {
    name: 'contracts',
    description: 'Bảng lưu trữ thông tin hợp đồng gốc và phụ lục. Gồm cả hợp đồng đầu vào (thu từ chủ đầu tư) và hợp đồng đầu ra (chi trả thầu phụ/nhà cung cấp).',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_contracts_project ON contracts(project_id);', 'CREATE INDEX idx_contracts_partner ON contracts(partner_id);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã định danh hợp đồng.' },
      { name: 'contract_number', type: 'VARCHAR(100)', constraints: ['NOT NULL', 'UNIQUE'], description: 'Số hiệu hợp đồng quản lý (Ví dụ: HD-2026-GR-01).' },
      { name: 'title', type: 'VARCHAR(255)', constraints: ['NOT NULL'], description: 'Tên gọi hợp đồng.' },
      { name: 'project_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES projects(id)'], description: 'Hợp đồng thuộc dự án nào.' },
      { name: 'partner_id', type: 'UUID', constraints: ['NOT NULL'], description: 'Mã đối tác (Nếu là Hợp đồng thầu phụ/vật tư thì nối sang `contractors`, nếu Hợp đồng chủ đầu tư thì nối sang Client ID).' },
      { name: 'partner_type', type: 'VARCHAR(50)', constraints: ['NOT NULL', 'CHECK (partner_type IN (\'Client\', \'Contractor\'))'], description: 'Đối tác là Chủ đầu tư (Client) hay Thầu phụ/Nhà cung cấp (Contractor).' },
      { name: 'value', type: 'NUMERIC(15, 2)', constraints: ['NOT NULL'], description: 'Giá trị hợp đồng ký kết ban đầu (VND).' },
      { name: 'advance_payment', type: 'NUMERIC(15, 2)', constraints: ['DEFAULT 0'], description: 'Số tiền chủ đầu tư/doanh nghiệp đã tạm ứng trước (VND).' },
      { name: 'accepted_value', type: 'NUMERIC(15, 2)', constraints: ['DEFAULT 0'], description: 'Giá trị khối lượng công việc thực tế đã được nghiệm thu (VND).' },
      { name: 'paid_value', type: 'NUMERIC(15, 2)', constraints: ['DEFAULT 0'], description: 'Tổng số tiền thực tế đã thanh toán lũy kế đến hiện tại (VND).' },
      { name: 'start_date', type: 'DATE', description: 'Ngày hiệu lực hợp đồng.' },
      { name: 'end_date', type: 'DATE', description: 'Ngày hết hạn hợp đồng.' },
      { name: 'status', type: 'VARCHAR(50)', constraints: ['DEFAULT \'Active\''], description: 'Trạng thái hợp đồng: Draft, Active, Completed, Terminated.' }
    ]
  },
  {
    name: 'inventory_items',
    description: 'Danh mục định nghĩa các chủng loại vật tư xây dựng trong kho.',
    primaryKeys: ['id'],
    indexes: [],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã vật tư.' },
      { name: 'name', type: 'VARCHAR(150)', constraints: ['NOT NULL', 'UNIQUE'], description: 'Tên vật tư (Ví dụ: Thép phi 18, Xi măng Holcim, Cát vàng).' },
      { name: 'unit', type: 'VARCHAR(50)', constraints: ['NOT NULL'], description: 'Đơn vị tính (Tấn, Bao, m3, Cái, Mét...).' },
      { name: 'avg_cost', type: 'NUMERIC(15, 2)', constraints: ['DEFAULT 0'], description: 'Giá vốn nhập kho trung bình (VND) tính theo phương pháp bình quân gia quyền.' }
    ]
  },
  {
    name: 'inventory_ledger',
    description: 'Sổ cái theo dõi chi tiết mọi hoạt động nhập kho (Receipt) và xuất kho (Issue) vật liệu theo từng dự án cụ thể.',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_ledger_item ON inventory_ledger(item_id);', 'CREATE INDEX idx_ledger_project ON inventory_ledger(project_id);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã phiếu kho duy nhất.' },
      { name: 'item_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES inventory_items(id)'], description: 'Mã vật tư xuất/nhập.' },
      { name: 'project_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES projects(id)'], description: 'Công trường nhận vật tư (đối với xuất kho) hoặc bàn giao (đối với nhập kho).' },
      { name: 'type', type: 'VARCHAR(20)', constraints: ['NOT NULL', 'CHECK (type IN (\'Receipt\', \'Issue\'))'], description: 'Receipt (Nhập kho vật tư) hoặc Issue (Xuất kho cấp phát thi công).' },
      { name: 'quantity', type: 'DECIMAL(12, 4)', constraints: ['NOT NULL', 'CHECK (quantity > 0)'], description: 'Số lượng thực xuất/nhập.' },
      { name: 'unit_price', type: 'NUMERIC(15, 2)', constraints: ['NOT NULL'], description: 'Đơn giá xuất/nhập vật tư (VND).' },
      { name: 'source_or_destination', type: 'VARCHAR(255)', description: 'Nơi xuất xứ hoặc đối tượng sử dụng (Ví dụ: Nhập từ NPP Hòa Phát, Xuất cho Tổ thép Móng).' },
      { name: 'date', type: 'DATE', constraints: ['NOT NULL', 'DEFAULT CURRENT_DATE'], description: 'Ngày thực hiện giao dịch kho.' },
      { name: 'approved_by', type: 'UUID', constraints: ['REFERENCES employees(id)'], description: 'Mã thủ kho hoặc kỹ sư công trường thực hiện xác nhận ký duyệt phiếu.' }
    ]
  },
  {
    name: 'material_limits',
    description: 'Bảng quản lý mối quan hệ Nhiều - Nhiều giữa Vật tư và Dự án để kiểm soát định mức dự toán vật tư thi công.',
    primaryKeys: ['project_id', 'item_id'],
    indexes: [],
    columns: [
      { name: 'project_id', type: 'UUID', constraints: ['REFERENCES projects(id)', 'ON DELETE CASCADE'], description: 'Dự án cần áp định mức.' },
      { name: 'item_id', type: 'UUID', constraints: ['REFERENCES inventory_items(id)', 'ON DELETE CASCADE'], description: 'Vật tư áp định mức.' },
      { name: 'planned_qty', type: 'DECIMAL(12, 4)', constraints: ['NOT NULL'], description: 'Khối lượng vật tư dự toán tối đa được duyệt ban đầu.' },
      { name: 'actual_issued_qty', type: 'DECIMAL(12, 4)', constraints: ['DEFAULT 0.0000'], description: 'Lũy kế khối lượng thực tế đã xuất cấp phát tại công trình này.' }
    ]
  },
  {
    name: 'timesheets',
    description: 'Bảng chấm công ngày của công nhân và kỹ sư tại 5 công trường thông qua quét QR / định vị GPS di động.',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_timesheets_emp ON timesheets(employee_id);', 'CREATE INDEX idx_timesheets_project ON timesheets(project_id);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã lượt chấm công.' },
      { name: 'employee_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES employees(id)'], description: 'Nhân sự chấm công.' },
      { name: 'project_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES projects(id)'], description: 'Dự án / công trường chấm công thực tế.' },
      { name: 'date', type: 'DATE', constraints: ['NOT NULL', 'DEFAULT CURRENT_DATE'], description: 'Ngày chấm công.' },
      { name: 'check_in_time', type: 'TIME', constraints: ['NOT NULL'], description: 'Giờ check-in công trường.' },
      { name: 'check_out_time', type: 'TIME', description: 'Giờ check-out công trường.' },
      { name: 'status', type: 'VARCHAR(50)', constraints: ['DEFAULT \'Present\''], description: 'Trạng thái: Present (Đúng giờ), Late (Muộn), Absent (Vắng), Overtime (Tăng ca).' },
      { name: 'latitude', type: 'DECIMAL(10, 8)', constraints: ['NOT NULL'], description: 'Vĩ độ GPS thiết bị di động lúc chấm công.' },
      { name: 'longitude', type: 'DECIMAL(11, 8)', constraints: ['NOT NULL'], description: 'Kinh độ GPS thiết bị di động lúc chấm công.' },
      { name: 'gps_status', type: 'VARCHAR(50)', constraints: ['NOT NULL', 'CHECK (gps_status IN (\'In-Range\', \'Out-Of-Range\'))'], description: 'Trạng thái định vị: In-Range (Nằm trong bán kính 200m của dự án) hoặc Out-Of-Range (Ngoài bán kính).' },
      { name: 'verified_by_face', type: 'BOOLEAN', constraints: ['DEFAULT FALSE'], description: 'Xác thực khớp khuôn mặt qua AI camera chống chấm công hộ (True/False).' }
    ]
  },
  {
    name: 'equipment',
    description: 'Bảng quản lý tài sản máy móc thiết bị thi công cơ giới nặng điều động luân chuyển giữa các dự án.',
    primaryKeys: ['id'],
    indexes: [],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã định danh máy móc.' },
      { name: 'name', type: 'VARCHAR(150)', constraints: ['NOT NULL'], description: 'Tên máy móc (Ví dụ: Máy xúc Komatsu PC200, Máy trộn bê tông 350L).' },
      { name: 'current_project_id', type: 'UUID', constraints: ['REFERENCES projects(id)'], description: 'Vị trí dự án hiện tại máy đang được điều động làm việc.' },
      { name: 'status', type: 'VARCHAR(50)', constraints: ['DEFAULT \'Available\''], description: 'Trạng thái máy: Available (Đang rảnh), In-Use (Đang chạy tại công trình), Maintenance (Bảo dưỡng).' },
      { name: 'fuel_consumption_rate', type: 'VARCHAR(50)', description: 'Định mức tiêu hao xăng dầu lý thuyết (Ví dụ: 12 lít/giờ).' },
      { name: 'last_maintenance', type: 'DATE', description: 'Ngày bảo dưỡng gần nhất.' },
      { name: 'next_maintenance', type: 'DATE', description: 'Hạn bảo dưỡng tiếp theo.' },
      { name: 'fuel_cost_this_month', type: 'NUMERIC(15,2)', constraints: ['DEFAULT 0'], description: 'Lũy kế chi phí nhiên liệu tháng này phục vụ kiểm soát thất thoát.' }
    ]
  },
  {
    name: 'approval_workflows',
    description: 'Quy trình ký duyệt trực tuyến 3 cấp độ dành cho các đề xuất chi phí vật tư hoặc tạm ứng lương.',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_approvals_status ON approval_workflows(status);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã số đề xuất phê duyệt.' },
      { name: 'requester_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES employees(id)'], description: 'Kỹ sư công trường / người đề xuất.' },
      { name: 'request_type', type: 'VARCHAR(100)', constraints: ['NOT NULL'], description: 'Loại đề xuất: Material_Purchase (Mua vật tư), Salary_Advance (Tạm ứng lương), Equipment_Dispatch (Điều động máy móc).' },
      { name: 'title', type: 'VARCHAR(255)', constraints: ['NOT NULL'], description: 'Tiêu đề đề xuất.' },
      { name: 'amount', type: 'NUMERIC(15, 2)', constraints: ['DEFAULT 0'], description: 'Giá trị tiền hoặc giá trị ước tính của đề xuất (VND).' },
      { name: 'project_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES projects(id)'], description: 'Dự án liên đới.' },
      { name: 'details', type: 'TEXT', description: 'Nội dung chi tiết/Lý do đề xuất.' },
      { name: 'current_level', type: 'SMALLINT', constraints: ['NOT NULL', 'DEFAULT 1'], description: 'Cấp duyệt hiện tại (1: Tạo/Kỹ sư, 2: Kế toán kiểm tra, 3: Giám đốc duyệt, 4: Hoàn tất).' },
      { name: 'status', type: 'VARCHAR(50)', constraints: ['DEFAULT \'Pending_Accountant\''], description: 'Trạng thái: Pending_Accountant (Kế toán chờ duyệt), Pending_Director (Giám đốc chờ duyệt), Approved (Đã thông qua), Rejected (Bị từ chối).' },
      { name: 'timeline_json', type: 'JSONB', description: 'Lưu trữ lịch sử vết phê duyệt, ghi chú và mốc thời gian của từng cấp dưới dạng JSON.' }
    ]
  },
  {
    name: 'financial_transactions',
    description: 'Sổ cái giao dịch tài chính ghi nhận dòng tiền thu/chi thực tế theo từng dự án độc lập để phục vụ tính P&L (Lãi/Lỗ).',
    primaryKeys: ['id'],
    indexes: ['CREATE INDEX idx_finance_project ON financial_transactions(project_id);', 'CREATE INDEX idx_finance_category ON financial_transactions(category);'],
    columns: [
      { name: 'id', type: 'UUID', constraints: ['PRIMARY KEY', 'DEFAULT gen_random_uuid()'], description: 'Mã giao dịch tài chính.' },
      { name: 'project_id', type: 'UUID', constraints: ['NOT NULL', 'REFERENCES projects(id)'], description: 'Dự án hạch toán thu chi.' },
      { name: 'type', type: 'VARCHAR(20)', constraints: ['NOT NULL', 'CHECK (type IN (\'Revenue\', \'Expense\'))'], description: 'Revenue (Thu tiền chủ đầu tư) hoặc Expense (Chi phí dự án).' },
      { name: 'category', type: 'VARCHAR(50)', constraints: ['NOT NULL'], description: 'Phân loại chi phí: Material (Vật tư), Labor (Nhân công), Subcontractor (Thầu phụ), Equipment (Máy móc), Overhead (Quản lý doanh nghiệp), Client_Billing (Thu tiền nghiệm thu).' },
      { name: 'amount', type: 'NUMERIC(15, 2)', constraints: ['NOT NULL', 'CHECK (amount > 0)'], description: 'Số tiền thực tế giao dịch (VND).' },
      { name: 'description', type: 'VARCHAR(500)', constraints: ['NOT NULL'], description: 'Nội dung hạch toán chi tiết dòng tiền.' },
      { name: 'date', type: 'DATE', constraints: ['NOT NULL', 'DEFAULT CURRENT_DATE'], description: 'Ngày giao dịch dòng tiền thực tế.' },
      { name: 'reference_id', type: 'UUID', description: 'Liên kết tới mã hợp đồng, phiếu kho hoặc phiếu phê duyệt liên quan.' }
    ]
  }
];

export const dbRelationships: DbRelation[] = [
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'employees',
    toColumn: 'project_id',
    type: '1:N',
    description: 'Một dự án có nhiều nhân sự / kỹ sư được điều động làm việc tại công trường.'
  },
  {
    fromTable: 'employees',
    fromColumn: 'id',
    toTable: 'projects',
    toColumn: 'manager_id',
    type: '1:1',
    description: 'Một nhân sự cấp cao (Kỹ sư trưởng) làm Chỉ huy trưởng quản lý một dự án.'
  },
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'contracts',
    toColumn: 'project_id',
    type: '1:N',
    description: 'Một dự án có thể ký kết một hợp đồng gốc với Chủ đầu tư và nhiều hợp đồng giao khoán với các nhà thầu phụ khác nhau.'
  },
  {
    fromTable: 'contractors',
    fromColumn: 'id',
    toTable: 'contracts',
    toColumn: 'partner_id',
    type: '1:N',
    description: 'Một nhà thầu phụ / nhà cung cấp có thể ký kết nhiều hợp đồng cung ứng / thi công với công ty.'
  },
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'material_limits',
    toColumn: 'project_id',
    type: '1:N',
    description: 'Mối quan hệ N-M giữa Vật tư và Dự án: Một dự án có định mức riêng cho nhiều loại vật liệu.'
  },
  {
    fromTable: 'inventory_items',
    fromColumn: 'id',
    toTable: 'material_limits',
    toColumn: 'item_id',
    type: '1:N',
    description: 'Mối quan hệ N-M giữa Vật tư và Dự án: Một loại vật liệu nằm trong định mức của nhiều dự án khác nhau.'
  },
  {
    fromTable: 'inventory_items',
    fromColumn: 'id',
    toTable: 'inventory_ledger',
    toColumn: 'item_id',
    type: '1:N',
    description: 'Một loại vật liệu có thể phát sinh nhiều phiếu nhập, phiếu xuất kho trong suốt dòng đời dự án.'
  },
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'inventory_ledger',
    toColumn: 'project_id',
    type: '1:N',
    description: 'Một dự án công trường phát sinh nhiều phiếu xuất kho cấp phát vật tư hoặc nhập kho giao thẳng.'
  },
  {
    fromTable: 'employees',
    fromColumn: 'id',
    toTable: 'timesheets',
    toColumn: 'employee_id',
    type: '1:N',
    description: 'Một nhân viên / công nhân có lịch sử chấm công nhiều ngày tại công trường.'
  },
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'timesheets',
    toColumn: 'project_id',
    type: '1:N',
    description: 'Một công trường ghi nhận lượt chấm công hàng ngày của nhiều công nhân thi công tại đó.'
  },
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'equipment',
    toColumn: 'current_project_id',
    type: '1:N',
    description: 'Một công trường tại một thời điểm được điều động trưng dụng nhiều loại máy móc thi công.'
  },
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'approval_workflows',
    toColumn: 'project_id',
    type: '1:N',
    description: 'Một dự án phát sinh nhiều phiếu đề xuất thanh toán vật tư hoặc tạm ứng lương.'
  },
  {
    fromTable: 'projects',
    fromColumn: 'id',
    toTable: 'financial_transactions',
    toColumn: 'project_id',
    type: '1:N',
    description: 'Một dự án hạch toán nhiều giao dịch thu, chi dòng tiền thực tế để đo lường lợi nhuận gộp.'
  }
];

export function generatePostgreSqlDdl(): string {
  let ddl = `-- =========================================================================\n`;
  ddl += `-- POSTGRESQL / CLOUD SQL DDL FOR TOTAL CONSTRUCTION ERP SYSTEM\n`;
  ddl += `-- Lược đồ dữ liệu Quản Trị Doanh Nghiệp\n`;
  ddl += `-- Đơn vị tiền tệ hạch toán: VND | Chuẩn định dạng: UUID & Foreign Key cascade\n`;
  ddl += `-- =========================================================================\n\n`;

  ddl += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
  ddl += `CREATE EXTENSION IF NOT EXISTS "vector"; -- Phục vụ chấm công đối khớp khuôn mặt bằng AI\n\n`;

  // Write tables in order of dependency
  const sortedTables = [
    'employees', // base
    'projects', // depends on employees (manager_id)
    'contractors', // base
    'contracts', // depends on projects, contractors
    'inventory_items', // base
    'inventory_ledger', // depends on inventory_items, projects, employees
    'material_limits', // depends on projects, inventory_items
    'timesheets', // depends on employees, projects
    'equipment', // depends on projects
    'approval_workflows', // depends on employees, projects
    'financial_transactions' // depends on projects
  ];

  sortedTables.forEach(tableName => {
    const table = dbTables.find(t => t.name === tableName);
    if (!table) return;

    ddl += `-- ${table.description}\n`;
    ddl += `CREATE TABLE ${table.name} (\n`;

    const colLines = table.columns.map(col => {
      const constraintsStr = col.constraints && col.constraints.length > 0 ? ` ${col.constraints.join(' ')}` : '';
      return `    ${col.name.padEnd(25)} ${col.type}${constraintsStr} -- ${col.description}`;
    });

    ddl += colLines.join(',\n');
    ddl += `\n);\n\n`;

    // Indexes
    table.indexes.forEach(idx => {
      ddl += `${idx}\n`;
    });
    if (table.indexes.length > 0) ddl += `\n`;
  });

  // Alter project to add manager_id foreign key safely if deferred or standard
  ddl += `-- Thiết lập khóa ngoại chéo an toàn cho dự án\n`;
  ddl += `ALTER TABLE projects ADD CONSTRAINT fk_projects_manager FOREIGN KEY (manager_id) REFERENCES employees(id) ON DELETE SET NULL;\n\n`;

  ddl += `-- =========================================================================\n`;
  ddl += `-- TRÂU BÒ CHỨC NĂNG (TRIGGERS) - TỰ ĐỘNG CẬP NHẬT CHI PHÍ THỰC TẾ & CẢNH BÁO VƯỢT ĐỊNH MỨC VẬT TƯ\n`;
  ddl += `-- =========================================================================\n\n`;

  ddl += `-- 1. Trigger tự động tính lũy kế chi phí dự án khi phát sinh giao dịch tài chính Chi Phí (Expense)\n`;
  ddl += `CREATE OR REPLACE FUNCTION update_project_actual_spent()\n`;
  ddl += `RETURNS TRIGGER AS $$\n`;
  ddl += `BEGIN\n`;
  ddl += `    IF (TG_OP = 'INSERT' AND NEW.type = 'Expense') THEN\n`;
  ddl += `        UPDATE projects SET spent = spent + NEW.amount WHERE id = NEW.project_id;\n`;
  ddl += `    ELSIF (TG_OP = 'DELETE' AND OLD.type = 'Expense') THEN\n`;
  ddl += `        UPDATE projects SET spent = spent - OLD.amount WHERE id = OLD.project_id;\n`;
  ddl += `    ELSIF (TG_OP = 'UPDATE') THEN\n`;
  ddl += `        IF (OLD.type = 'Expense') THEN\n`;
  ddl += `            UPDATE projects SET spent = spent - OLD.amount WHERE id = OLD.project_id;\n`;
  ddl += `        END IF;\n`;
  ddl += `        IF (NEW.type = 'Expense') THEN\n`;
  ddl += `            UPDATE projects SET spent = spent + NEW.amount WHERE id = NEW.project_id;\n`;
  ddl += `        END IF;\n`;
  ddl += `    END IF;\n`;
  ddl += `    RETURN NEW;\n`;
  ddl += `END;\n`;
  ddl += `$$ LANGUAGE plpgsql;\n\n`;

  ddl += `CREATE TRIGGER trg_update_project_spent\n`;
  ddl += `AFTER INSERT OR UPDATE OR DELETE ON financial_transactions\n`;
  ddl += `FOR EACH ROW EXECUTE FUNCTION update_project_actual_spent();\n\n`;

  ddl += `-- 2. Trigger tự động cập nhật số lượng thực xuất vật tư và bắn cảnh báo nếu vượt định mức ban đầu\n`;
  ddl += `CREATE OR REPLACE FUNCTION track_material_limits_and_alert()\n`;
  ddl += `RETURNS TRIGGER AS $$\n`;
  ddl += `DECLARE\n`;
  ddl += `    v_planned DECIMAL(12, 4);\n`;
  ddl += `    v_actual DECIMAL(12, 4);\n`;
  ddl += `    v_item_name VARCHAR(150);\n`;
  ddl += `    v_proj_name VARCHAR(255);\n`;
  ddl += `BEGIN\n`;
  ddl += `    -- Chỉ áp dụng cho phiếu XUẤT KHO (Issue)\n`;
  ddl += `    IF (NEW.type = 'Issue') THEN\n`;
  ddl += `        -- Cập nhật lũy kế thực xuất trong bảng định mức\n`;
  ddl += `        UPDATE material_limits \n`;
  ddl += `        SET actual_issued_qty = actual_issued_qty + NEW.quantity\n`;
  ddl += `        WHERE project_id = NEW.project_id AND item_id = NEW.item_id;\n`;
  ddl += `        \n`;
  ddl += `        -- Kiểm tra xem có vượt quá định mức dự toán không\n`;
  ddl += `        SELECT planned_qty, actual_issued_qty INTO v_planned, v_actual\n`;
  ddl += `        FROM material_limits\n`;
  ddl += `        WHERE project_id = NEW.project_id AND item_id = NEW.item_id;\n`;
  ddl += `        \n`;
  ddl += `        IF (v_actual > v_planned) THEN\n`;
  ddl += `            SELECT name INTO v_item_name FROM inventory_items WHERE id = NEW.item_id;\n`;
  ddl += `            SELECT name INTO v_proj_name FROM projects WHERE id = NEW.project_id;\n`;
  ddl += `            \n`;
  ddl += `            -- Ghi nhận log cảnh báo vượt định mức hoặc gửi notification cho giám đốc\n`;
  ddl += `            RAISE WARNING 'CẢNH BÁO: Dự án % đã xuất vượt định mức vật tư % (Thực xuất: %, Định mức: %)', \n`;
  ddl += `                v_proj_name, v_item_name, v_actual, v_planned;\n`;
  ddl += `        END IF;\n`;
  ddl += `    END IF;\n`;
  ddl += `    RETURN NEW;\n`;
  ddl += `END;\n`;
  ddl += `$$ LANGUAGE plpgsql;\n\n`;

  ddl += `CREATE TRIGGER trg_track_material_limits\n`;
  ddl += `AFTER INSERT ON inventory_ledger\n`;
  ddl += `FOR EACH ROW EXECUTE FUNCTION track_material_limits_and_alert();\n`;

  return ddl;
}
