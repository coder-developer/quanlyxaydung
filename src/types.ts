/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Project {
  id: string;
  code?: string;
  name: string;
  location: string;
  budget: number; // in VND
  spent: number; // in VND
  progress: number; // percentage (0 - 100)
  manager: string;
  startDate: string;
  endDate: string;
  status: 'Planning' | 'Active' | 'Delayed' | 'Completed';
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
}

export interface Employee {
  id: string;
  code?: string; // Mã nhân viên duy nhất
  name: string;
  role: string;
  type: 'Internal' | 'Seasonal';
  projectId: string; // current work location
  phone: string;
  baseSalary: number; // per day or month
  active: boolean;
  citizenId?: string; // Số CCCD
  permanentAddress?: string; // Nơi thường trú
}

export interface Contractor {
  id: string;
  code?: string;
  name: string;
  type: 'Subcontractor' | 'Supplier' | 'Client';
  contactPerson: string;
  phone: string;
  email: string;
  taxCode?: string;
  officeAddress?: string;
  rating: number;
}

export interface Contract {
  id: string;
  contractNumber: string;
  title: string;
  projectId: string;
  partnerId: string; // Contractor ID or Client
  partnerType: 'Client' | 'Contractor';
  value: number; // Contract value
  advancePayment: number; // Amount paid in advance (đã ứng)
  acceptedValue: number; // Value accepted actually (đã nghiệm thu thực tế)
  paidValue: number; // Amount paid so far (đã thanh toán thực tế)
  startDate: string;
  endDate: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Terminated';
}

export interface InventoryItem {
  id: string;
  code?: string; // Mã vật tư duy nhất
  name: string;
  unit: string;
  totalReceived: number;
  totalIssued: number;
  onHand: number;
  avgCost: number;
}

export interface InventoryLedger {
  id: string;
  itemId: string;
  projectId: string;
  type: 'Receipt' | 'Issue'; // Nhập / Xuất
  quantity: number;
  unitPrice: number;
  sourceOrDestination: string; // e.g. "NPP Thép Việt" or "Tổ thi công móng"
  date: string;
  approvedBy: string;
}

export interface MaterialLimit {
  projectId: string;
  itemId: string;
  plannedQty: number; // Định mức dự toán
  actualIssuedQty: number; // Thực tế đã xuất
}

export interface Timesheet {
  id: string;
  employeeId: string;
  projectId: string;
  date: string;
  checkInTime: string;
  checkOutTime: string | null;
  status: 'Present' | 'Late' | 'Absent' | 'Overtime';
  latitude: number;
  longitude: number;
  gpsStatus: 'In-Range' | 'Out-Of-Range'; // Compare with project GPS
  verifiedByFace: boolean;
  attendancePhoto?: string;
}

export interface ApprovalRequest {
  id: string;
  requesterId: string; // Employee ID
  requestType: 'Material_Purchase' | 'Salary_Advance' | 'Equipment_Dispatch';
  title: string;
  amount: number;
  projectId: string;
  details: string;
  currentLevel: 1 | 2 | 3 | 4; // 1: Site Engineer, 2: Accountant, 3: Director, 4: Approved/Rejected
  status: 'Pending_Accountant' | 'Pending_Director' | 'Approved' | 'Rejected';
  timeline: {
    level: number;
    actor: string;
    action: 'Create' | 'Verify' | 'Approve' | 'Reject';
    date: string;
    note: string;
  }[];
}

export interface Equipment {
  id: string;
  code?: string; // Mã thiết bị duy nhất
  name: string;
  currentProjectId: string;
  status: 'Available' | 'In-Use' | 'Maintenance';
  fuelConsumptionRate: string; // e.g. "12 Litres/Hour"
  lastMaintenance: string;
  nextMaintenance: string;
  fuelCostThisMonth: number;
}

export interface FinancialTransaction {
  id: string;
  projectId: string;
  type: 'Revenue' | 'Expense';
  category: 'Material' | 'Labor' | 'Subcontractor' | 'Equipment' | 'Overhead' | 'Client_Billing';
  amount: number;
  description: string;
  date: string;
  referenceId?: string; // Contract ID, Invoice ID, or Advance ID
}

export interface LaborContract {
  id: string;
  employeeId: string;
  contractNumber: string;
  signDate: string;
  startDate: string;
  endDate: string | null;
  salaryType: 'Monthly' | 'Daily';
  salaryAmount: number;
  allowance: number; // Phụ cấp
  insurance: boolean; // Có đóng bảo hiểm không
  status: 'Active' | 'Expired' | 'Pending';
  signedByEmployee: boolean; // Nhân viên đã ký chưa
  signedByDirector: boolean; // Giám đốc đã ký chưa
}

export interface ConstructionTask {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number; // 0 - 100
  assignedTo: string; // Tên tổ đội / Người chịu trách nhiệm
  status: 'Not_Started' | 'In_Progress' | 'Delayed' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  weight: number; // Trọng số (%)
  notes?: string;
}

export interface CompanyConfig {
  companyName: string;
  siteOffice: string;
  taxCode?: string;
  officeAddress?: string;
  directorName: string;
  chiefAccountantName: string;
  treasurerName: string;
  technicianName: string;
  
  journalTitle: string;
  dispatchTitle: string;
  fuelTitle: string;
  maintenanceTitle: string;
  appTitle?: string;

  // Corporate governance & internal controls
  siteManagerApprovalLimit?: number;
  accountantApprovalLimit?: number;
  fuelVarianceThreshold?: number;
  maxDailyWorkHours?: number;
  requireDoubleApproval?: boolean;
}

export type UserRole = 'CEO' | 'ChiefAccountant' | 'SiteAccountant' | 'SiteManager' | 'Auditor' | 'Employee';
