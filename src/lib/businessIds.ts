import type { ApprovalRequest, ConstructionTask, Contract, Contractor, Employee, Equipment, FinancialTransaction, InventoryItem, InventoryLedger, LaborContract, MaterialLimit, Project, Timesheet } from '../types';

export type BusinessEntityType = 'project' | 'employee' | 'contractor' | 'contract' | 'inventory' | 'equipment';
export interface BusinessIdMapping { entityType: BusinessEntityType; oldId: string; newId: string }

export interface BusinessIdState {
  projects: Project[];
  employees: Employee[];
  contractors: Contractor[];
  contracts: Contract[];
  inventoryItems: InventoryItem[];
  materialLimits: MaterialLimit[];
  inventoryLedger: InventoryLedger[];
  timesheets: Timesheet[];
  equipment: Equipment[];
  approvals: ApprovalRequest[];
  transactions: FinancialTransaction[];
  laborContracts: LaborContract[];
  constructionTasks: ConstructionTask[];
}

export function normalizeBusinessId(value: string, fallback: string) {
  const normalized = String(value || fallback).trim().toUpperCase().replace(/[^A-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || fallback;
}

function uniqueId(base: string, used: Set<string>) {
  let value = base;
  let suffix = 2;
  while (used.has(value)) value = `${base}-${suffix++}`;
  used.add(value);
  return value;
}

function mapped(map: Map<string, string>, value: string) {
  return map.get(value) || value;
}

export function synchronizeBusinessIds(state: BusinessIdState) {
  const mappings: BusinessIdMapping[] = [];
  const build = <T extends { id: string }>(items: T[], entityType: BusinessEntityType, prefix: string, codeOf: (item: T, index: number) => string | undefined, update: (item: T, id: string) => T) => {
    const used = new Set<string>();
    const map = new Map<string, string>();
    const values = items.map((item, index) => {
      const requested = normalizeBusinessId(codeOf(item, index) || `${prefix}-${String(index + 1).padStart(3, '0')}`, `${prefix}-${String(index + 1).padStart(3, '0')}`);
      const id = uniqueId(requested, used);
      map.set(item.id, id);
      if (item.id !== id) mappings.push({ entityType, oldId: item.id, newId: id });
      return update(item, id);
    });
    return { values, map };
  };

  const projects = build(state.projects, 'project', 'DA', item => item.code, (item, id) => ({ ...item, id, code: id }));
  const employees = build(state.employees, 'employee', 'NV', item => item.code, (item, id) => ({ ...item, id, code: id }));
  const contractors = build(state.contractors, 'contractor', 'DT', item => item.code, (item, id) => ({ ...item, id, code: id }));
  const contracts = build(state.contracts, 'contract', 'HD', item => item.contractNumber, (item, id) => ({ ...item, id, contractNumber: id }));
  const inventory = build(state.inventoryItems, 'inventory', 'VT', item => item.code, (item, id) => ({ ...item, id, code: id }));
  const equipment = build(state.equipment, 'equipment', 'TB', item => item.code, (item, id) => ({ ...item, id, code: id }));

  const result: BusinessIdState = {
    projects: projects.values,
    employees: employees.values.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId) })),
    contractors: contractors.values,
    contracts: contracts.values.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId), partnerId: mapped(contractors.map, item.partnerId) })),
    inventoryItems: inventory.values,
    materialLimits: state.materialLimits.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId), itemId: mapped(inventory.map, item.itemId) })),
    inventoryLedger: state.inventoryLedger.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId), itemId: mapped(inventory.map, item.itemId), approvedBy: mapped(employees.map, item.approvedBy) })),
    timesheets: state.timesheets.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId), employeeId: mapped(employees.map, item.employeeId) })),
    equipment: equipment.values.map(item => ({ ...item, currentProjectId: mapped(projects.map, item.currentProjectId) })),
    approvals: state.approvals.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId), requesterId: mapped(employees.map, item.requesterId) })),
    transactions: state.transactions.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId), referenceId: item.referenceId ? mapped(contracts.map, mapped(equipment.map, item.referenceId)) : undefined })),
    laborContracts: state.laborContracts.map(item => ({ ...item, employeeId: mapped(employees.map, item.employeeId) })),
    constructionTasks: state.constructionTasks.map(item => ({ ...item, projectId: mapped(projects.map, item.projectId) })),
  };
  return { state: result, mappings, changed: mappings.length > 0 };
}
