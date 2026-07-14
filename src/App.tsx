/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { lazy, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  initialProjects,
  initialEmployees,
  initialContractors,
  initialContracts,
  initialInventoryItems,
  initialMaterialLimits,
  initialInventoryLedger,
  initialTimesheets,
  initialEquipment,
  initialApprovalRequests,
  initialFinancialTransactions,
  initialLaborContracts,
  initialConstructionTasks
} from './data/mockData';
import { Project, Employee, Contractor, Contract, InventoryItem, MaterialLimit, InventoryLedger, Timesheet, Equipment, ApprovalRequest, FinancialTransaction, LaborContract, ConstructionTask, CompanyConfig, UserRole } from './types';

// Components
import LoginScreen from './components/LoginScreen';
import ChangePinButton from './components/ChangePinButton';
import { readStoredJson } from './lib/storage';
import { apiLogout, fetchServerRevision, fetchServerState, hasApiSession, saveServerState, syncServerBusinessIds } from './lib/api';
import { synchronizeBusinessIds } from './lib/businessIds';

const DashboardView = lazy(() => import('./components/DashboardView'));
const ProjectManager = lazy(() => import('./components/ProjectManager'));
const SchemaExplorer = lazy(() => import('./components/SchemaExplorer'));
const FlowSimulator = lazy(() => import('./components/FlowSimulator'));
const OpsSimulator = lazy(() => import('./components/OpsSimulator'));
const LiabilitiesManager = lazy(() => import('./components/LiabilitiesManager'));
const HRManager = lazy(() => import('./components/HRManager'));
const WarehouseManager = lazy(() => import('./components/WarehouseManager'));
const JournalManager = lazy(() => import('./components/JournalManager'));
const EquipmentManager = lazy(() => import('./components/EquipmentManager'));
const CompanyConfigView = lazy(() => import('./components/CompanyConfigView'));
const DriveManager = lazy(() => import('./components/DriveManager'));
const EmployeePortal = lazy(() => import('./components/EmployeePortal'));
const WorkforceAdmin = lazy(() => import('./components/WorkforceAdmin'));
const MasterDataEditor = lazy(() => import('./components/MasterDataEditor'));

// Icons
import { LayoutDashboard, Database, RefreshCcw, Landmark, ClipboardList, ShieldCheck, FileSpreadsheet, KeyRound, HardHat, Sparkles, Users, Boxes, Wrench, BookOpen, Building2, Search, X, Eye, ArrowRight, Info, MapPin, Hammer, AlertTriangle, Clock, Cloud, Lock, LogOut } from 'lucide-react';

export default function App() {
  const serverMode = import.meta.env.VITE_USE_SERVER === 'true';
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'schema' | 'flows' | 'sim' | 'liabilities' | 'hr' | 'workforce' | 'masterdata' | 'warehouse' | 'equipment' | 'journal' | 'company' | 'drive'>('dashboard');

  // --- CURRENT ROLE FOR ROLE-BASED ACCESS CONTROL (RBAC) ---
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('erp_current_user_role');
    return (saved as UserRole) || 'CEO';
  });

  // --- CURRENT USER FULL NAME ---
  const [currentUserFullName, setCurrentUserFullName] = useState<string | null>(() => {
    return localStorage.getItem('erp_current_user_name');
  });
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(() => localStorage.getItem('erp_current_employee_id'));

  // --- LOGIN ACCESS CONTROL ---
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('erp_is_logged_in') === 'true' && (!serverMode || hasApiSession());
  });

  const handleLoginSuccess = useCallback((role: UserRole, fullName?: string, employeeId?: string) => {
    setCurrentUserRole(role);
    localStorage.setItem('erp_current_user_role', role);
    localStorage.setItem('erp_is_logged_in', 'true');
    if (fullName) {
      setCurrentUserFullName(fullName);
      localStorage.setItem('erp_current_user_name', fullName);
    } else {
      setCurrentUserFullName(null);
      localStorage.removeItem('erp_current_user_name');
    }
    setCurrentEmployeeId(employeeId || null);
    if (employeeId) localStorage.setItem('erp_current_employee_id', employeeId);
    else localStorage.removeItem('erp_current_employee_id');
    setIsLoggedIn(true);
  }, []);

  const handleLogout = useCallback(() => {
    apiLogout();
    setCurrentUserFullName(null);
    setCurrentEmployeeId(null);
    setIsLoggedIn(false);
  }, []);

  useEffect(() => {
    window.addEventListener('erp:session-expired', handleLogout);
    return () => window.removeEventListener('erp:session-expired', handleLogout);
  }, [handleLogout]);

  const [permissionDeniedMsg, setPermissionDeniedMsg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('erp_current_user_role', currentUserRole);
  }, [currentUserRole]);

  // Check if a tab is restricted for the current role
  const isTabRestricted = useCallback((tab: string) => {
    if (currentUserRole === 'SiteManager') {
      const siteManagerRestricted = ['schema', 'liabilities', 'company', 'journal', 'masterdata'];
      return siteManagerRestricted.includes(tab);
    }
    return false;
  }, [currentUserRole]);

  // Handle restricted active tab redirect
  useEffect(() => {
    if (isTabRestricted(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUserRole, activeTab, isTabRestricted]);

  const handleTabClick = useCallback((tab: typeof activeTab, label: string) => {
    if (isTabRestricted(tab)) {
      setPermissionDeniedMsg(`Bạn không có quyền truy cập phân hệ "${label}" với tài khoản hiện tại.`);
    } else {
      setActiveTab(tab);
    }
  }, [isTabRestricted, currentUserRole]);

  // --- LOCAL STORAGE AUTO-SAVE CONFIGURATION ---
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('erp_autosave_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  // --- STATE FOR OUR IN-MEMORY RELATIONAL DATABASE ---
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>(() => {
    const saved = localStorage.getItem('erp_company_config');
    if (saved) {
      const parsed = readStoredJson<Partial<CompanyConfig>>('erp_company_config', {});
      // Ensure corporate governance fields have safe defaults if missing
      return {
        siteManagerApprovalLimit: 50000000,
        accountantApprovalLimit: 200000000,
        fuelVarianceThreshold: 5,
        maxDailyWorkHours: 12,
        requireDoubleApproval: true,
        ...parsed
      };
    }
    return {
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
      siteManagerApprovalLimit: 50000000,
      accountantApprovalLimit: 200000000,
      fuelVarianceThreshold: 5,
      maxDailyWorkHours: 12,
      requireDoubleApproval: true,
    };
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    return readStoredJson('erp_projects', initialProjects);
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    return readStoredJson('erp_employees', initialEmployees);
  });

  const [contractors, setContractors] = useState<Contractor[]>(() => {
    return readStoredJson('erp_contractors', initialContractors);
  });

  const [contracts, setContracts] = useState<Contract[]>(() => {
    return readStoredJson('erp_contracts', initialContracts);
  });

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>(() => {
    return readStoredJson('erp_inventory_items', initialInventoryItems);
  });

  const [materialLimits, setMaterialLimits] = useState<MaterialLimit[]>(() => {
    return readStoredJson('erp_material_limits', initialMaterialLimits);
  });

  const [inventoryLedger, setInventoryLedger] = useState<InventoryLedger[]>(() => {
    return readStoredJson('erp_inventory_ledger', initialInventoryLedger);
  });

  const [timesheets, setTimesheets] = useState<Timesheet[]>(() => {
    return readStoredJson('erp_timesheets', initialTimesheets);
  });

  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    return readStoredJson('erp_equipment', initialEquipment);
  });

  const [approvals, setApprovals] = useState<ApprovalRequest[]>(() => {
    return readStoredJson('erp_approvals', initialApprovalRequests);
  });

  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => {
    return readStoredJson('erp_transactions', initialFinancialTransactions);
  });

  const [laborContracts, setLaborContracts] = useState<LaborContract[]>(() => {
    return readStoredJson('erp_labor_contracts', initialLaborContracts);
  });

  const [constructionTasks, setConstructionTasks] = useState<ConstructionTask[]>(() => {
    return readStoredJson('erp_construction_tasks', initialConstructionTasks);
  });

  // --- PERSISTENCE EFFECT ---
  useEffect(() => {
    if (!isLoggedIn) return;
    localStorage.setItem('erp_autosave_enabled', String(autoSaveEnabled));
    if (autoSaveEnabled) {
      localStorage.setItem('erp_company_config', JSON.stringify(companyConfig));
      localStorage.setItem('erp_projects', JSON.stringify(projects));
      localStorage.setItem('erp_employees', JSON.stringify(employees));
      localStorage.setItem('erp_contractors', JSON.stringify(contractors));
      localStorage.setItem('erp_contracts', JSON.stringify(contracts));
      localStorage.setItem('erp_inventory_items', JSON.stringify(inventoryItems));
      localStorage.setItem('erp_material_limits', JSON.stringify(materialLimits));
      localStorage.setItem('erp_inventory_ledger', JSON.stringify(inventoryLedger));
      localStorage.setItem('erp_timesheets', JSON.stringify(timesheets));
      localStorage.setItem('erp_equipment', JSON.stringify(equipment));
      localStorage.setItem('erp_approvals', JSON.stringify(approvals));
      localStorage.setItem('erp_transactions', JSON.stringify(transactions));
      localStorage.setItem('erp_labor_contracts', JSON.stringify(laborContracts));
      localStorage.setItem('erp_construction_tasks', JSON.stringify(constructionTasks));
    }
  }, [
    isLoggedIn,
    autoSaveEnabled,
    companyConfig,
    projects,
    employees,
    contractors,
    contracts,
    inventoryItems,
    materialLimits,
    inventoryLedger,
    timesheets,
    equipment,
    approvals,
    transactions,
    laborContracts,
    constructionTasks
  ]);

  // --- CLOUD FIRESTORE DATABASE SYNC ---
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'offline'>('idle');
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem('erp_last_synced_time') || 'Chưa đồng bộ';
  });
  const [cloudDbSyncEnabled, setCloudDbSyncEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('erp_clouddb_sync_enabled');
    return saved !== null ? saved === 'true' : false;
  });

  const handlePushToCloud = useCallback(async () => {
    setCloudSyncStatus('syncing');
    try {
      const { batchSaveCollection, testConnection } = await import('./lib/firestoreSync');
      const connected = await testConnection();
      if (!connected) {
        setCloudSyncStatus('offline');
        return 'offline';
      }

      await batchSaveCollection('company_config', [companyConfig], 'companyName');
      await batchSaveCollection('projects', projects);
      await batchSaveCollection('employees', employees);
      await batchSaveCollection('contractors', contractors);
      await batchSaveCollection('contracts', contracts);
      await batchSaveCollection('inventory_items', inventoryItems);
      await batchSaveCollection('material_limits', materialLimits);
      await batchSaveCollection('inventory_ledger', inventoryLedger);
      await batchSaveCollection('timesheets', timesheets);
      await batchSaveCollection('equipment', equipment);
      await batchSaveCollection('approvals', approvals);
      await batchSaveCollection('transactions', transactions);
      await batchSaveCollection('labor_contracts', laborContracts);
      await batchSaveCollection('construction_tasks', constructionTasks);

      const nowStr = new Date().toLocaleString('vi-VN');
      setLastSyncedTime(nowStr);
      localStorage.setItem('erp_last_synced_time', nowStr);
      setCloudSyncStatus('success');
      return 'success';
    } catch (err) {
      console.error('Error pushing data to Cloud Firestore:', err);
      setCloudSyncStatus('error');
      return 'error';
    }
  }, [
    companyConfig, projects, employees, contractors, contracts,
    inventoryItems, materialLimits, inventoryLedger, timesheets,
    equipment, approvals, transactions, laborContracts, constructionTasks
  ]);

  const handlePullFromCloud = useCallback(async () => {
    setCloudSyncStatus('syncing');
    try {
      const { fetchCollection, testConnection } = await import('./lib/firestoreSync');
      const connected = await testConnection();
      if (!connected) {
        setCloudSyncStatus('offline');
        return 'offline';
      }

      const cloudCompanyConfig = await fetchCollection('company_config');
      const cloudProjects = await fetchCollection('projects');
      const cloudEmployees = await fetchCollection('employees');
      const cloudContractors = await fetchCollection('contractors');
      const cloudContracts = await fetchCollection('contracts');
      const cloudInventoryItems = await fetchCollection('inventory_items');
      const cloudMaterialLimits = await fetchCollection('material_limits');
      const cloudInventoryLedger = await fetchCollection('inventory_ledger');
      const cloudTimesheets = await fetchCollection('timesheets');
      const cloudEquipment = await fetchCollection('equipment');
      const cloudApprovals = await fetchCollection('approvals');
      const cloudTransactions = await fetchCollection('transactions');
      const cloudLaborContracts = await fetchCollection('labor_contracts');
      const cloudConstructionTasks = await fetchCollection('construction_tasks');

      if (cloudCompanyConfig.length > 0) setCompanyConfig(cloudCompanyConfig[0]);
      if (cloudProjects.length > 0) setProjects(cloudProjects);
      if (cloudEmployees.length > 0) setEmployees(cloudEmployees);
      if (cloudContractors.length > 0) setContractors(cloudContractors);
      if (cloudContracts.length > 0) setContracts(cloudContracts);
      if (cloudInventoryItems.length > 0) setInventoryItems(cloudInventoryItems);
      if (cloudMaterialLimits.length > 0) setMaterialLimits(cloudMaterialLimits);
      if (cloudInventoryLedger.length > 0) setInventoryLedger(cloudInventoryLedger);
      if (cloudTimesheets.length > 0) setTimesheets(cloudTimesheets);
      if (cloudEquipment.length > 0) setEquipment(cloudEquipment);
      if (cloudApprovals.length > 0) setApprovals(cloudApprovals);
      if (cloudTransactions.length > 0) setTransactions(cloudTransactions);
      if (cloudLaborContracts.length > 0) setLaborContracts(cloudLaborContracts);
      if (cloudConstructionTasks.length > 0) setConstructionTasks(cloudConstructionTasks);

      const nowStr = new Date().toLocaleString('vi-VN');
      setLastSyncedTime(nowStr);
      localStorage.setItem('erp_last_synced_time', nowStr);
      setCloudSyncStatus('success');
      return 'success';
    } catch (err) {
      console.error('Error pulling data from Cloud Firestore:', err);
      setCloudSyncStatus('error');
      return 'error';
    }
  }, []);

  // Sync state settings to localStorage
  useEffect(() => {
    localStorage.setItem('erp_clouddb_sync_enabled', String(cloudDbSyncEnabled));
  }, [cloudDbSyncEnabled]);

  // Auto-pull from Cloud Firestore on boot if sync is enabled
  useEffect(() => {
    if (cloudDbSyncEnabled) {
      handlePullFromCloud().then((res) => {
        if (res === 'success') {
          console.log('Successfully auto-pulled data from Cloud Firestore on application boot.');
        }
      });
    }
  }, []);

  // Debounced auto-save to Cloud Firestore (runs 5 seconds after modifications stop)
  useEffect(() => {
    if (!cloudDbSyncEnabled) return;

    const timer = setTimeout(() => {
      setCloudSyncStatus('syncing');
      import('./lib/firestoreSync').then(async ({ batchSaveCollection, testConnection }) => {
        const connected = await testConnection();
        if (!connected) {
          setCloudSyncStatus('offline');
          return;
        }
        try {
          await batchSaveCollection('company_config', [companyConfig], 'companyName');
          await batchSaveCollection('projects', projects);
          await batchSaveCollection('employees', employees);
          await batchSaveCollection('contractors', contractors);
          await batchSaveCollection('contracts', contracts);
          await batchSaveCollection('inventory_items', inventoryItems);
          await batchSaveCollection('material_limits', materialLimits);
          await batchSaveCollection('inventory_ledger', inventoryLedger);
          await batchSaveCollection('timesheets', timesheets);
          await batchSaveCollection('equipment', equipment);
          await batchSaveCollection('approvals', approvals);
          await batchSaveCollection('transactions', transactions);
          await batchSaveCollection('labor_contracts', laborContracts);
          await batchSaveCollection('construction_tasks', constructionTasks);

          const nowStr = new Date().toLocaleString('vi-VN');
          setLastSyncedTime(nowStr);
          localStorage.setItem('erp_last_synced_time', nowStr);
          setCloudSyncStatus('success');
        } catch (e) {
          console.error('Background auto-sync failed:', e);
          setCloudSyncStatus('error');
        }
      }).catch((error) => {
        console.error('Không thể tải mô-đun đồng bộ đám mây:', error);
        setCloudSyncStatus('error');
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    cloudDbSyncEnabled,
    companyConfig, projects, employees, contractors, contracts,
    inventoryItems, materialLimits, inventoryLedger, timesheets,
    equipment, approvals, transactions, laborContracts, constructionTasks
  ]);

  // Đồng bộ dữ liệu tập trung khi app chạy cùng backend trên VPS.
  const serverRevision = useRef(0);
  const lastSyncedPayload = useRef('');
  const syncInFlight = useRef(false);
  const applyingRemotePayload = useRef(false);
  const businessIdSyncInFlight = useRef(false);
  const [serverReady, setServerReady] = useState(false);
  const [serverSyncError, setServerSyncError] = useState<string | null>(null);
  const [serverSyncStatus, setServerSyncStatus] = useState<'loading' | 'saved' | 'saving' | 'offline' | 'conflict'>('loading');
  const erpPayload = useMemo(() => ({
    companyConfig, projects, employees, contractors, contracts, inventoryItems,
    materialLimits, inventoryLedger, timesheets, equipment, approvals,
    transactions, laborContracts, constructionTasks,
  }), [companyConfig, projects, employees, contractors, contracts, inventoryItems,
    materialLimits, inventoryLedger, timesheets, equipment, approvals,
    transactions, laborContracts, constructionTasks]);

  const applyServerPayload = useCallback((payload: typeof erpPayload) => {
    if (!payload || Object.keys(payload).length === 0) return;
    if (payload.companyConfig) setCompanyConfig(payload.companyConfig);
    if (payload.projects) setProjects(payload.projects);
    if (payload.employees) setEmployees(payload.employees);
    if (payload.contractors) setContractors(payload.contractors);
    if (payload.contracts) setContracts(payload.contracts);
    if (payload.inventoryItems) setInventoryItems(payload.inventoryItems);
    if (payload.materialLimits) setMaterialLimits(payload.materialLimits);
    if (payload.inventoryLedger) setInventoryLedger(payload.inventoryLedger);
    if (payload.timesheets) setTimesheets(payload.timesheets);
    if (payload.equipment) setEquipment(payload.equipment);
    if (payload.approvals) setApprovals(payload.approvals);
    if (payload.transactions) setTransactions(payload.transactions);
    if (payload.laborContracts) setLaborContracts(payload.laborContracts);
    if (payload.constructionTasks) setConstructionTasks(payload.constructionTasks);
  }, []);

  useEffect(() => {
    if (!serverMode || !isLoggedIn) return;
    let cancelled = false;
    fetchServerState<typeof erpPayload>().then(({ payload, revision }) => {
      if (cancelled) return;
      applyingRemotePayload.current = Boolean(payload && Object.keys(payload).length > 0);
      applyServerPayload(payload);
      if (!applyingRemotePayload.current) lastSyncedPayload.current = JSON.stringify(payload || {});
      serverRevision.current = Number(revision);
      setServerReady(true);
      setServerSyncError(null);
      setServerSyncStatus('saved');
    }).catch((error) => {
      if (!cancelled) {
        setServerSyncError(error instanceof Error ? error.message : 'Không tải được dữ liệu máy chủ.');
        setServerSyncStatus('offline');
      }
    });
    return () => { cancelled = true; };
  }, [serverMode, isLoggedIn, applyServerPayload]);

  useEffect(() => {
    if (!applyingRemotePayload.current) return;
    lastSyncedPayload.current = JSON.stringify(erpPayload);
    applyingRemotePayload.current = false;
  }, [erpPayload]);

  useEffect(() => {
    if (!serverMode || !isLoggedIn || !serverReady || currentUserRole === 'Auditor') return;
    const serialized = JSON.stringify(erpPayload);
    if (serialized === lastSyncedPayload.current || syncInFlight.current) return;
    const timer = setTimeout(() => {
      syncInFlight.current = true;
      setServerSyncStatus('saving');
      saveServerState(erpPayload, serverRevision.current).then(({ revision }) => {
        serverRevision.current = Number(revision);
        lastSyncedPayload.current = serialized;
        setServerSyncError(null);
        setServerSyncStatus('saved');
      }).catch((error) => {
        setServerSyncError(error instanceof Error ? error.message : 'Không lưu được dữ liệu máy chủ.');
        setServerSyncStatus(error && typeof error === 'object' && 'code' in error && error.code === 'REVISION_CONFLICT' ? 'conflict' : 'offline');
      }).finally(() => {
        syncInFlight.current = false;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [serverMode, isLoggedIn, serverReady, currentUserRole, erpPayload]);

  // Máy đang mở tự nhận thay đổi từ máy khác trong tối đa 5 giây.
  useEffect(() => {
    if (!serverMode || !isLoggedIn || !serverReady) return;
    const poll = async () => {
      if (syncInFlight.current) return;
      try {
        const { revision } = await fetchServerRevision();
        if (Number(revision) <= serverRevision.current) return;
        if (JSON.stringify(erpPayload) !== lastSyncedPayload.current) {
          setServerSyncStatus('conflict');
          setServerSyncError('Có dữ liệu mới trên máy chủ trong khi máy này đang có thay đổi chưa lưu.');
          return;
        }
        const remote = await fetchServerState<typeof erpPayload>();
        applyingRemotePayload.current = true;
        applyServerPayload(remote.payload);
        serverRevision.current = Number(remote.revision);
        setServerSyncStatus('saved');
        setServerSyncError(null);
      } catch (error) {
        setServerSyncStatus('offline');
        setServerSyncError(error instanceof Error ? error.message : 'Mất kết nối máy chủ.');
      }
    };
    const timer = window.setInterval(poll, 5000);
    return () => window.clearInterval(timer);
  }, [serverMode, isLoggedIn, serverReady, erpPayload, applyServerPayload]);

  // Mã nghiệp vụ là khóa chính. Khi mã thay đổi, cập nhật toàn bộ quan hệ liên quan theo một lần đồng bộ.
  useEffect(() => {
    if (!isLoggedIn || (serverMode && !serverReady) || !['CEO', 'Accountant'].includes(currentUserRole) || businessIdSyncInFlight.current) return;
    const synchronized = synchronizeBusinessIds({
      projects, employees, contractors, contracts, inventoryItems, materialLimits,
      inventoryLedger, timesheets, equipment, approvals, transactions, laborContracts, constructionTasks,
    });
    if (!synchronized.changed) return;
    businessIdSyncInFlight.current = true;
    const apply = async () => {
      if (serverMode) await syncServerBusinessIds(synchronized.mappings);
      const next = synchronized.state;
      setProjects(next.projects);
      setEmployees(next.employees);
      setContractors(next.contractors);
      setContracts(next.contracts);
      setInventoryItems(next.inventoryItems);
      setMaterialLimits(next.materialLimits);
      setInventoryLedger(next.inventoryLedger);
      setTimesheets(next.timesheets);
      setEquipment(next.equipment);
      setApprovals(next.approvals);
      setTransactions(next.transactions);
      setLaborContracts(next.laborContracts);
      setConstructionTasks(next.constructionTasks);
      setCurrentEmployeeId(current => {
        const replacement = synchronized.mappings.find(item => item.entityType === 'employee' && item.oldId === current)?.newId || current;
        if (replacement) localStorage.setItem('erp_current_employee_id', replacement);
        return replacement;
      });
      setServerSyncError(null);
    };
    apply().catch(error => {
      setServerSyncError(error instanceof Error ? error.message : 'Không thể đồng bộ mã nghiệp vụ và ID nội bộ.');
    }).finally(() => {
      businessIdSyncInFlight.current = false;
    });
  }, [isLoggedIn, serverMode, serverReady, currentUserRole, projects, employees, contractors, contracts, inventoryItems, materialLimits, inventoryLedger, timesheets, equipment, approvals, transactions, laborContracts, constructionTasks]);

  const handleExportBackup = useCallback(() => {
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      companyConfig,
      projects,
      employees,
      contractors,
      contracts,
      inventoryItems,
      materialLimits,
      inventoryLedger,
      timesheets,
      equipment,
      approvals,
      transactions,
      laborContracts,
      constructionTasks
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `erp_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [
    companyConfig,
    projects,
    employees,
    contractors,
    contracts,
    inventoryItems,
    materialLimits,
    inventoryLedger,
    timesheets,
    equipment,
    approvals,
    transactions,
    laborContracts,
    constructionTasks
  ]);

  const handleImportBackup = useCallback((backup: any): string | null => {
    try {
      if (!backup || typeof backup !== 'object') return 'Dữ liệu không hợp lệ.';
      if (!backup.companyConfig || !Array.isArray(backup.projects)) {
        return 'Định dạng file backup không khớp tiêu chuẩn ERP.';
      }

      if (backup.companyConfig) setCompanyConfig(backup.companyConfig);
      if (backup.projects) setProjects(backup.projects);
      if (backup.employees) setEmployees(backup.employees);
      if (backup.contractors) setContractors(backup.contractors);
      if (backup.contracts) setContracts(backup.contracts);
      if (backup.inventoryItems) setInventoryItems(backup.inventoryItems);
      if (backup.materialLimits) setMaterialLimits(backup.materialLimits);
      if (backup.inventoryLedger) setInventoryLedger(backup.inventoryLedger);
      if (backup.timesheets) setTimesheets(backup.timesheets);
      if (backup.equipment) setEquipment(backup.equipment);
      if (backup.approvals) setApprovals(backup.approvals);
      if (backup.transactions) setTransactions(backup.transactions);
      if (backup.laborContracts) setLaborContracts(backup.laborContracts);
      if (backup.constructionTasks) setConstructionTasks(backup.constructionTasks);

      return null;
    } catch (err: any) {
      return err.message || 'Lỗi không xác định khi khôi phục.';
    }
  }, []);

  // --- STATE FOR GLOBAL SEARCH IN THE HEADER ---
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedSearchDetail, setSelectedSearchDetail] = useState<{
    type: 'Project' | 'Employee' | 'InventoryItem';
    data: any;
  } | null>(null);

  // Memoized search results across Projects, Employees, and Inventory Items
  const searchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) {
      return { projects: [], employees: [], inventoryItems: [] };
    }
    const query = globalSearchQuery.toLowerCase().trim();

    const matchedProjects = projects.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.location.toLowerCase().includes(query) ||
      p.manager.toLowerCase().includes(query) ||
      p.id.toLowerCase().includes(query)
    ).slice(0, 4);

    const matchedEmployees = employees.filter(e =>
      e.name.toLowerCase().includes(query) ||
      e.role.toLowerCase().includes(query) ||
      e.phone.toLowerCase().includes(query) ||
      e.id.toLowerCase().includes(query)
    ).slice(0, 4);

    const matchedInventoryItems = inventoryItems.filter(i =>
      i.name.toLowerCase().includes(query) ||
      i.unit.toLowerCase().includes(query) ||
      i.id.toLowerCase().includes(query)
    ).slice(0, 4);

    return {
      projects: matchedProjects,
      employees: matchedEmployees,
      inventoryItems: matchedInventoryItems
    };
  }, [globalSearchQuery, projects, employees, inventoryItems]);

  // --- HANDLER: WORKER GPS CHECK-IN ---
  const handleCheckIn = useCallback((newTimesheet: Timesheet) => {
    setTimesheets(prev => [newTimesheet, ...prev]);
  }, []);

  // --- HANDLER: PROGRESS 3-LEVEL APPROVAL WORKFLOW ---
  // When final approval is granted (Level 4), we simulate SQL Trigger Cascades!
  const handleApproveLevel = useCallback((reqId: string, actor: string, note: string) => {
    setApprovals(prevApprovals => {
      return prevApprovals.map(req => {
        if (req.id !== reqId) return req;

        const nextLevel = (req.currentLevel + 1) as 1 | 2 | 3 | 4;
        const newTimeline = [
          ...req.timeline,
          {
            level: req.currentLevel,
            actor,
            action: note.includes('Từ chối') ? 'Reject' as const : (req.currentLevel === 3 ? 'Approve' as const : 'Verify' as const),
            date: new Date().toISOString().replace('T', ' ').substring(0, 16),
            note
          }
        ];

        let newStatus = req.status;
        if (note.includes('Từ chối')) {
          newStatus = 'Rejected';
          return { ...req, currentLevel: 4 as const, status: newStatus, timeline: newTimeline };
        } else if (nextLevel === 4) {
          newStatus = 'Approved';

          // --- SIMULATE DATABASE TRIGGER CASCADES ---

          // Case 1: Material PO Approved (e.g. req-1)
          if (req.requestType === 'Material_Purchase') {
            // Find related project and material.
            // For req-1: purchase of 15 tons of Steel phi 18 for project proj-1
            const pId = req.projectId;
            const itemId = 'item-steel'; // hardcoded for req-1 simulation
            const qty = 15;
            const price = 17500000;
            const totalCost = req.amount; // 262,500,000 VND

            // 1. Add Inventory ledger Receipt (Nhập kho)
            const ledgerId = `ledger-${Date.now()}`;
            const newLedger: InventoryLedger = {
              id: ledgerId,
              itemId,
              projectId: pId,
              type: 'Receipt',
              quantity: qty,
              unitPrice: price,
              sourceOrDestination: 'NPP Sắt Thép Việt (Sau phê duyệt)',
              date: new Date().toISOString().split('T')[0],
              approvedBy: 'emp-12' // Mai Thị Xuân
            };
            setInventoryLedger(prev => [newLedger, ...prev]);

            // 2. Increment Inventory Item on-hand & total received
            setInventoryItems(prevItems =>
              prevItems.map(item => {
                if (item.id === itemId) {
                  return {
                    ...item,
                    totalReceived: item.totalReceived + qty,
                    onHand: item.onHand + qty
                  };
                }
                return item;
              })
            );

            // 3. Immediately simulate Site Usage (Xuất kho cấp phát thi công) to trigger over-budget alarm!
            const newIssueLedger: InventoryLedger = {
              id: `ledger-issue-${Date.now()}`,
              itemId,
              projectId: pId,
              type: 'Issue',
              quantity: qty,
              unitPrice: price,
              sourceOrDestination: 'Cấp phát móng dầm mố M1',
              date: new Date().toISOString().split('T')[0],
              approvedBy: 'emp-6' // Hoàng Văn Tú
            };
            setInventoryLedger(prev => [newIssueLedger, ...prev]);

            setInventoryItems(prevItems =>
              prevItems.map(item => {
                if (item.id === itemId) {
                  return {
                    ...item,
                    totalIssued: item.totalIssued + qty,
                    onHand: item.onHand // Hand remains same because +15 received and -15 issued
                  };
                }
                return item;
              })
            );

            // 4. Update material limit: increment actualIssuedQty (Vật tư - Dự án)
            setMaterialLimits(prevLimits =>
              prevLimits.map(limit => {
                if (limit.projectId === pId && limit.itemId === itemId) {
                  return {
                    ...limit,
                    actualIssuedQty: limit.actualIssuedQty + qty
                  };
                }
                return limit;
              })
            );

            // 5. Create Financial Transaction (Bút toán chi phí)
            const newTx: FinancialTransaction = {
              id: `tx-${Date.now()}`,
              projectId: pId,
              type: 'Expense',
              category: 'Material',
              amount: totalCost,
              description: `Thanh toán mua thép phi 18 bổ sung theo phê duyệt PO #${req.id}`,
              date: new Date().toISOString().split('T')[0],
              referenceId: req.id
            };
            setTransactions(prevTxs => [newTx, ...prevTxs]);

            // 6. Project Spent update (spent = spent + totalCost)
            setProjects(prevProjs =>
              prevProjs.map(proj => {
                if (proj.id === pId) {
                  return {
                    ...proj,
                    spent: proj.spent + totalCost
                  };
                }
                return proj;
              })
            );
          }

          // Case 2: Salary Advance Approved (e.g. req-2)
          if (req.requestType === 'Salary_Advance') {
            const pId = req.projectId;
            const amount = req.amount;

            // Create financial transaction
            const newTx: FinancialTransaction = {
              id: `tx-${Date.now()}`,
              projectId: pId,
              type: 'Expense',
              category: 'Labor',
              amount,
              description: `Tạm ứng lương tuần cho tổ cốp pha theo phê duyệt #${req.id}`,
              date: new Date().toISOString().split('T')[0],
              referenceId: req.id
            };
            setTransactions(prevTxs => [newTx, ...prevTxs]);

            // Update project spent
            setProjects(prevProjs =>
              prevProjs.map(proj => {
                if (proj.id === pId) {
                  return {
                    ...proj,
                    spent: proj.spent + amount
                  };
                }
                return proj;
              })
            );
          }
        } else {
          newStatus = nextLevel === 3 ? 'Pending_Director' : 'Pending_Accountant';
        }

        return {
          ...req,
          currentLevel: nextLevel,
          status: newStatus,
          timeline: newTimeline
        };
      });
    });
  }, []);

  // --- HANDLER: HEAVY MACHINERY DISPATCH ---
  const handleDispatchMachine = useCallback((eqId: string, projectId: string) => {
    setEquipment(prev =>
      prev.map(eq => {
        if (eq.id === eqId) {
          // Add transportation fuel surcharge
          return {
            ...eq,
            currentProjectId: projectId,
            status: 'In-Use',
            fuelCostThisMonth: eq.fuelCostThisMonth + 5000000 // Add 5M VND transportation fuel cost
          };
        }
        return eq;
      })
    );
  }, []);

  // --- HANDLER: RESET SIMULATION DATA ---
  const handleResetData = useCallback(() => {
    localStorage.removeItem('erp_company_config');
    localStorage.removeItem('erp_projects');
    localStorage.removeItem('erp_employees');
    localStorage.removeItem('erp_contractors');
    localStorage.removeItem('erp_contracts');
    localStorage.removeItem('erp_inventory_items');
    localStorage.removeItem('erp_material_limits');
    localStorage.removeItem('erp_inventory_ledger');
    localStorage.removeItem('erp_timesheets');
    localStorage.removeItem('erp_equipment');
    localStorage.removeItem('erp_approvals');
    localStorage.removeItem('erp_transactions');
    localStorage.removeItem('erp_labor_contracts');
    localStorage.removeItem('erp_construction_tasks');

    setCompanyConfig({
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
      siteManagerApprovalLimit: 50000000,
      accountantApprovalLimit: 200000000,
      fuelVarianceThreshold: 5,
      maxDailyWorkHours: 12,
      requireDoubleApproval: true,
    });
    setProjects(initialProjects);
    setEmployees(initialEmployees);
    setContractors(initialContractors);
    setContracts(initialContracts);
    setInventoryItems(initialInventoryItems);
    setMaterialLimits(initialMaterialLimits);
    setInventoryLedger(initialInventoryLedger);
    setTimesheets(initialTimesheets);
    setEquipment(initialEquipment);
    setApprovals(initialApprovalRequests);
    setTransactions(initialFinancialTransactions);
    setLaborContracts(initialLaborContracts);
    setConstructionTasks(initialConstructionTasks);
  }, []);

  // --- SECURE STATE SETTERS FOR ROLE-BASED ACCESS CONTROL (RBAC) ---
  const secureSetState = useCallback(<T,>(
    setter: React.Dispatch<React.SetStateAction<T>>,
    allowedRoles: UserRole[],
    entityName: string
  ) => {
    return (value: React.SetStateAction<T>) => {
      if (currentUserRole === 'Auditor') {
        setPermissionDeniedMsg(`Chế độ "Thanh tra / Khách" chỉ cho phép xem dữ liệu. Tất cả các hành động thêm mới, sửa đổi hoặc xóa đối với "${entityName}" đều bị từ chối.`);
        return;
      }
      if (!allowedRoles.includes(currentUserRole)) {
        const roleLabel = currentUserRole === 'SiteManager' ? 'Chỉ Huy Trưởng' : currentUserRole;
        setPermissionDeniedMsg(`Vai trò "${roleLabel}" không được phép chỉnh sửa dữ liệu của "${entityName}". Chức năng này chỉ dành cho Ban Giám Đốc (CEO) hoặc Kế Toán Trưởng.`);
        return;
      }
      setter(value);
    };
  }, [currentUserRole]);

  const handleResetDataSecured = useCallback(() => {
    if (currentUserRole !== 'CEO') {
      setPermissionDeniedMsg('Hành động khôi phục dữ liệu gốc hệ thống yêu cầu đặc quyền tối cao của Giám Đốc (CEO).');
      return;
    }
    handleResetData();
  }, [currentUserRole, handleResetData]);

  const securedHandleApproveLevel = useCallback((reqId: string, actor: string, note: string) => {
    if (currentUserRole !== 'CEO') {
      setPermissionDeniedMsg(`Đặc quyền phê duyệt thanh toán, hồ sơ hoặc ký số quyết định chỉ dành cho Giám Đốc (CEO). Vai trò hiện tại "${currentUserRole === 'SiteManager' ? 'Chỉ Huy Trưởng' : currentUserRole}" không có quyền duyệt chi.`);
      return;
    }
    handleApproveLevel(reqId, actor, note);
  }, [currentUserRole, handleApproveLevel]);

  const securedHandleCheckIn = useCallback((newTimesheet: Timesheet) => {
    if (currentUserRole === 'Auditor') {
      setPermissionDeniedMsg('Chế độ "Thanh tra / Khách" chỉ cho phép xem dữ liệu. Không thể thực hiện chấm công giả lập.');
      return;
    }
    handleCheckIn(newTimesheet);
  }, [currentUserRole, handleCheckIn]);

  const securedHandleDispatchMachine = useCallback((equipId: string, projId: string) => {
    if (currentUserRole === 'Auditor') {
      setPermissionDeniedMsg('Chế độ "Thanh tra / Khách" chỉ cho phép xem dữ liệu. Không thể điều động thiết bị.');
      return;
    }
    handleDispatchMachine(equipId, projId);
  }, [currentUserRole, handleDispatchMachine]);

  // --- UNCONDITIONAL TOP-LEVEL MEMOIZED SECURED SETTERS (RBAC) ---
  const securedSetContractors = useMemo(() => secureSetState(setContractors, ['CEO', 'Accountant'], 'Nhà thầu & Thầu phụ'), [secureSetState, setContractors]);
  const securedSetContracts = useMemo(() => secureSetState(setContracts, ['CEO', 'Accountant'], 'Hợp đồng kinh tế'), [secureSetState, setContracts]);
  const securedSetTransactions = useMemo(() => secureSetState(setTransactions, ['CEO', 'Accountant'], 'Giao dịch tài chính / Chi trả'), [secureSetState, setTransactions]);
  const securedSetProjectsCEO = useMemo(() => secureSetState(setProjects, ['CEO'], 'Thông tin Dự án'), [secureSetState, setProjects]);
  const securedSetEmployees = useMemo(() => secureSetState(setEmployees, ['CEO', 'Accountant'], 'Hồ sơ Nhân sự'), [secureSetState, setEmployees]);
  const securedSetTimesheets = useMemo(() => secureSetState(setTimesheets, ['CEO', 'Accountant', 'SiteManager', 'Employee'], 'Bảng Chấm công'), [secureSetState, setTimesheets]);
  const securedSetLaborContracts = useMemo(() => secureSetState(setLaborContracts, ['CEO', 'Accountant'], 'Hợp đồng Lao động'), [secureSetState, setLaborContracts]);
  const securedSetConstructionTasks = useMemo(() => secureSetState(setConstructionTasks, ['CEO', 'Accountant', 'SiteManager'], 'Nhiệm vụ thi công'), [secureSetState, setConstructionTasks]);
  const securedSetInventoryItems = useMemo(() => secureSetState(setInventoryItems, ['CEO', 'Accountant', 'SiteManager'], 'Kho vật tư'), [secureSetState, setInventoryItems]);
  const securedSetInventoryLedger = useMemo(() => secureSetState(setInventoryLedger, ['CEO', 'Accountant', 'SiteManager'], 'Nhật ký xuất nhập kho'), [secureSetState, setInventoryLedger]);
  const securedSetMaterialLimits = useMemo(() => secureSetState(setMaterialLimits, ['CEO', 'Accountant', 'SiteManager'], 'Định mức hạn mức vật tư'), [secureSetState, setMaterialLimits]);
  const securedSetCompanyConfig = useMemo(() => secureSetState(setCompanyConfig, ['CEO'], 'Thông tin Doanh nghiệp'), [secureSetState, setCompanyConfig]);
  const securedSetEquipment = useMemo(() => secureSetState(setEquipment, ['CEO', 'Accountant', 'SiteManager'], 'Thiết bị & Dụng cụ'), [secureSetState, setEquipment]);

  if (!isLoggedIn) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        appTitle={companyConfig?.appTitle || 'Quản Trị Doanh Nghiệp'}
        companyName={companyConfig?.companyName}
      />
    );
  }

  if (currentUserRole === 'Employee') {
    return currentEmployeeId ? (
      <EmployeePortal
        employeeId={currentEmployeeId}
        employees={employees}
        projects={projects}
        timesheets={timesheets}
        setTimesheets={securedSetTimesheets}
        laborContracts={laborContracts}
        companyConfig={companyConfig}
        onLogout={handleLogout}
      />
    ) : <div className="min-h-screen grid place-items-center bg-slate-950 text-white">Tài khoản chưa được liên kết hồ sơ nhân viên.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden" id="app-root">
      {serverMode && serverSyncError && (
        <div role="alert" className="fixed z-50 right-4 bottom-4 max-w-md rounded-xl bg-rose-950 px-4 py-3 text-xs font-semibold text-white shadow-2xl">
          Đồng bộ máy chủ gặp lỗi: {serverSyncError} Dữ liệu vẫn được giữ tạm trên trình duyệt.
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 flex flex-col shrink-0 border-b md:border-b-0 md:border-r border-slate-850">
        {/* Brand Header */}
        <div className="p-4 md:p-6 flex items-center justify-between md:justify-start gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <img src="/app-avatar-192.png" alt="Biểu tượng ứng dụng" className="w-9 h-9 rounded-lg object-cover shadow-lg shadow-blue-500/20 ring-1 ring-white/10" />
            <div className="flex flex-col">
              <span className="text-white font-bold text-sm md:text-base tracking-tight leading-none uppercase">
                {companyConfig?.appTitle || 'Quản Trị Doanh Nghiệp'}
              </span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-1">STANDARD V1.0</span>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-1.5 bg-slate-800 px-2 py-0.5 rounded text-[9px] text-emerald-400 font-extrabold uppercase tracking-wider">
            Mobile Mode
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex flex-row md:flex-col gap-1.5 md:space-y-1.5 p-2 md:p-4 overflow-x-auto md:overflow-y-auto scrollbar-none md:flex-1 shrink-0">
          <div className="hidden md:block text-slate-500 text-[9px] font-extrabold uppercase tracking-widest mb-3 px-3">Main Management</div>

          <button
            onClick={() => handleTabClick('dashboard', 'Báo cáo Tài chính P&L')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Báo cáo Tài chính P&L</span>
            </div>
          </button>

          <button
            onClick={() => handleTabClick('projects', 'Quản lý dự án')}
            className={`flex-none md:w-full flex items-center px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${activeTab === 'projects' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <div className="flex items-center gap-2.5 md:gap-3"><Building2 className="w-4 h-4 shrink-0"/><span>Quản lý dự án</span></div>
          </button>

          <button
            onClick={() => handleTabClick('company', 'Thông tin Doanh nghiệp')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'company'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('company')
                  ? 'text-slate-600 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Thông tin Doanh nghiệp</span>
            </div>
            {isTabRestricted('company') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

          <button
            onClick={() => handleTabClick('journal', 'Nhật ký chung Kế toán')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'journal'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('journal')
                  ? 'text-slate-600 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Nhật ký chung Kế toán</span>
            </div>
            {isTabRestricted('journal') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

          <button
            onClick={() => handleTabClick('liabilities', 'Công nợ & Thầu phụ')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'liabilities'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('liabilities')
                  ? 'text-slate-600 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <Landmark className="w-4 h-4 shrink-0" />
              <span>Công nợ & Thầu phụ</span>
            </div>
            {isTabRestricted('liabilities') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

          <button
            onClick={() => handleTabClick('hr', 'Nhân sự & Chấm công')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'hr'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('hr')
                  ? 'text-slate-600 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <Users className="w-4 h-4 shrink-0" />
              <span>Nhân sự & Chấm công</span>
            </div>
            {isTabRestricted('hr') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

          <button
            onClick={() => handleTabClick('workforce', 'Vận hành Nhân sự')}
            className={`flex-none md:w-full flex items-center px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${activeTab === 'workforce' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <div className="flex items-center gap-2.5 md:gap-3"><ClipboardList className="w-4 h-4 shrink-0"/><span>Vận hành Nhân sự</span></div>
          </button>

          <button onClick={() => handleTabClick('masterdata', 'Dữ liệu danh mục')} className={`flex-none md:w-full flex items-center px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${activeTab === 'masterdata' ? 'bg-blue-600 text-white shadow-xs' : isTabRestricted('masterdata') ? 'text-slate-600 opacity-55' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}><div className="flex items-center gap-2.5 md:gap-3"><Database className="w-4 h-4 shrink-0"/><span>Dữ liệu danh mục</span></div></button>

          <button
            onClick={() => handleTabClick('warehouse', 'Kho vật tư')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'warehouse'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('warehouse')
                  ? 'text-slate-600 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <Boxes className="w-4 h-4 shrink-0" />
              <span>Kho vật tư</span>
            </div>
            {isTabRestricted('warehouse') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

          <button
            onClick={() => handleTabClick('equipment', 'Thiết bị & Dụng cụ')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'equipment'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('equipment')
                  ? 'text-slate-600 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <Wrench className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Thiết bị & Dụng cụ</span>
            </div>
            {isTabRestricted('equipment') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

          <button
            onClick={() => handleTabClick('drive', 'Lưu trữ Google Drive')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors text-left ${
              activeTab === 'drive'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('drive')
                  ? 'text-slate-600 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <Cloud className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Lưu trữ Google Drive</span>
            </div>
            {isTabRestricted('drive') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

          <div className="hidden md:block text-slate-500 text-[9px] font-extrabold uppercase tracking-widest mt-6 mb-3 px-3">Site Operations</div>

          <button
            onClick={() => handleTabClick('sim', 'Live Ops Simulator')}
            className={`flex-none md:w-full flex items-center justify-between px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition-colors relative text-left ${
              activeTab === 'sim'
                ? 'bg-blue-600 text-white shadow-xs'
                : isTabRestricted('sim')
                  ? 'text-slate-650 bg-slate-950/20 cursor-not-allowed opacity-55'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2.5 md:gap-3">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Live Ops Simulator</span>
            </div>
            {approvals.some(r => r.status.startsWith('Pending')) && (
              <span className="absolute top-2.5 right-3 w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
            )}
            {isTabRestricted('sim') && <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />}
          </button>

        </nav>

        {/* Sidebar Footer Stats / Actor */}
        <div className="hidden md:block p-4 border-t border-slate-800 space-y-3 bg-slate-950/20 shrink-0">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[8px] font-extrabold text-slate-500 uppercase tracking-widest">
              <span>Định mức rủi ro</span>
              <span className="text-rose-500 flex items-center gap-1 animate-pulse">● Cảnh báo</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-rose-500" style={{ width: '85%' }}></div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-1 border-t border-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-blue-600/90 flex items-center justify-center font-extrabold text-[10px] text-white uppercase border border-blue-500 shrink-0">
              {currentUserRole === 'CEO' && 'CEO'}
              {currentUserRole === 'Accountant' && 'ACC'}
              {currentUserRole === 'SiteManager' && 'MGR'}
              {currentUserRole === 'Auditor' && 'AUD'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-white font-extrabold leading-none uppercase truncate">
                {currentUserRole === 'CEO' && (companyConfig?.directorName || 'Đỗ Minh Tuấn')}
                {currentUserRole === 'Accountant' && (companyConfig?.chiefAccountantName || 'Nguyễn T. Hà')}
                {currentUserRole === 'SiteManager' && (currentUserFullName || 'Chỉ huy trưởng')}
                {currentUserRole === 'Auditor' && 'Thanh Tra Khách'}
              </span>
              <span className="text-[8px] text-blue-400 uppercase tracking-wider font-bold mt-1">
                {currentUserRole === 'CEO' && 'Giám đốc Điều hành'}
                {currentUserRole === 'Accountant' && 'Kế toán trưởng'}
                {currentUserRole === 'SiteManager' && 'Chỉ huy trưởng'}
                {currentUserRole === 'Auditor' && 'Đoàn Thanh tra'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

        {/* Upper Top Navbar Header */}
        <header className="h-auto py-3 md:h-16 bg-white border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-8 gap-3 shrink-0 shadow-3xs">
          <div className="shrink-0">
            <h1 className="text-xs md:text-sm lg:text-base font-black text-slate-800 tracking-tight flex items-center gap-1.5 md:gap-2">
              {activeTab === 'dashboard' && '📊 Bảng Điều Khiển Tài Chính & P&L Công Trường'}
              {activeTab === 'projects' && '🏗️ Quản Lý Dự Án & Công Trường'}
              {activeTab === 'journal' && '📖 Sổ Nhật Ký Chung Kế Toán Chuẩn Thông Tư 200'}
              {activeTab === 'liabilities' && '💳 Quản Lý Công Nợ, Thầu Phụ & Chủ Đầu Tư'}
              {activeTab === 'schema' && '🗄️ Kiến Trúc Hệ Cơ Sở Dữ Liệu Quan Hệ (ERD)'}
              {activeTab === 'flows' && '⚙️ Luồng Chuỗi Sự Kiện Nghiệp Vụ Cốt Lõi'}
              {activeTab === 'hr' && '👥 Quản Lý Nhân Sự, Chấm Công & Hợp Đồng'}
              {activeTab === 'workforce' && '🧭 Vận Hành Nhân Sự & Phê Duyệt'}
              {activeTab === 'masterdata' && '🗂️ Chỉnh Sửa Dữ Liệu Danh Mục'}
              {activeTab === 'warehouse' && '📦 Quản Lý Kho Vật Tư & Định Mức'}
              {activeTab === 'equipment' && '🚜 Quản Lý Cấp Phát Thiết Bị & Dụng Cụ'}
              {activeTab === 'sim' && '🏗️ Trình Mô Phỏng Live Operations & Triggers'}
              {activeTab === 'company' && '🏢 Cấu Hình Thông Tin Doanh Nghiệp & Tiêu Đề Phiếu In'}
            </h1>
            <p className="text-[9px] md:text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
              Hệ thống quản lý thời gian thực • {projects.length} Công trường
            </p>
          </div>

          {/* Global Search Input wrapper */}
          <div className="relative w-full md:w-80 lg:w-96 shrink-1" id="global-search-container">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Tìm nhanh dự án, nhân viên, vật tư..."
              className="block w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-3xs"
            />
            {globalSearchQuery && (
              <button
                onClick={() => setGlobalSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Floating Dropdown Results */}
            {globalSearchQuery.trim() && (
              <div className="absolute left-0 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {/* Projects Section */}
                {searchResults.projects.length > 0 && (
                  <div className="p-3">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <LayoutDashboard className="w-3 h-3 text-slate-400" />
                      DỰ ÁN ({searchResults.projects.length})
                    </div>
                    <div className="space-y-1">
                      {searchResults.projects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedSearchDetail({ type: 'Project', data: p });
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left p-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">{p.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">Mã: {p.id} • Chỉ huy: {p.manager}</div>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Employees Section */}
                {searchResults.employees.length > 0 && (
                  <div className="p-3">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3 h-3 text-slate-400" />
                      NHÂN SỰ ({searchResults.employees.length})
                    </div>
                    <div className="space-y-1">
                      {searchResults.employees.map(e => (
                        <button
                          key={e.id}
                          onClick={() => {
                            setSelectedSearchDetail({ type: 'Employee', data: e });
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left p-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">{e.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">Vai trò: {e.role} • {e.type === 'Internal' ? 'Biên chế' : 'Thời vụ'}</div>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inventory Items Section */}
                {searchResults.inventoryItems.length > 0 && (
                  <div className="p-3">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                      <Boxes className="w-3 h-3 text-slate-400" />
                      KHO VẬT TƯ ({searchResults.inventoryItems.length})
                    </div>
                    <div className="space-y-1">
                      {searchResults.inventoryItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedSearchDetail({ type: 'InventoryItem', data: item });
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left p-1.5 rounded-md hover:bg-blue-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-blue-700">{item.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">Hiện có: {item.onHand.toLocaleString()} {item.unit}</div>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {searchResults.projects.length === 0 && searchResults.employees.length === 0 && searchResults.inventoryItems.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs font-semibold flex flex-col items-center gap-1">
                    <Info className="w-5 h-5 text-slate-300" />
                    Không tìm thấy kết quả phù hợp cho "{globalSearchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
            {/* Current Role Badge & Log Out */}
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shadow-3xs shrink-0" id="role-control-panel">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
              <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
                {currentUserFullName ? `${currentUserFullName} (` : ''}
                {currentUserRole === 'CEO' && '💼 CEO / Giám Đốc'}
                {currentUserRole === 'Accountant' && '🧮 Kế Toán Trưởng'}
                {currentUserRole === 'SiteManager' && '🚧 Chỉ Huy Trưởng'}
                {currentUserRole === 'Auditor' && '🔍 Thanh Tra / Khách'}
                {currentUserFullName ? ')' : ''}
              </span>
              <div className="w-px h-3 bg-slate-250 mx-1"></div>
              {serverMode && <ChangePinButton onChanged={handleLogout} />}
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Đăng xuất phiên làm việc"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Đăng xuất</span>
              </button>
            </div>

            {/* Quick Status Pill */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded border shrink-0 shadow-3xs ${
              !serverMode || serverSyncStatus === 'saved' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
              serverSyncStatus === 'saving' || serverSyncStatus === 'loading' ? 'bg-blue-50 border-blue-100 text-blue-700' :
              'bg-rose-50 border-rose-100 text-rose-700'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                !serverMode || serverSyncStatus === 'saved' ? 'bg-emerald-500' :
                serverSyncStatus === 'saving' || serverSyncStatus === 'loading' ? 'bg-blue-500' : 'bg-rose-500'
              }`}></div>
              <span className="text-[9px] font-extrabold uppercase tracking-wider">
                {!serverMode ? 'SYSTEM LIVE' : serverSyncStatus === 'saved' ? 'Đã đồng bộ' : serverSyncStatus === 'saving' ? 'Đang lưu...' : serverSyncStatus === 'loading' ? 'Đang tải...' : serverSyncStatus === 'conflict' ? 'Có xung đột' : 'Mất kết nối'}
              </span>
            </div>

            {/* Quick action button - Restricted to CEO ONLY */}
            {currentUserRole === 'CEO' && (
              <button
                onClick={handleResetDataSecured}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded transition-colors border border-rose-200 shadow-3xs shrink-0"
                title="Reset Toàn Bộ Dữ Liệu"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset Toàn Bộ Dữ Liệu</span>
              </button>
            )}
          </div>
        </header>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50/50">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Header Mini Dashboard Quick Stats */}
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">DỰ ÁN LIÊN KẾT</p>
                  <h2 className="text-xl font-black text-slate-900 font-mono mt-1">{projects.length} Công trình</h2>
                  <p className="text-[10px] text-slate-400 mt-1">Delta / Coteccons / Self-Perform</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">LAO ĐỘNG QUẢN LÝ</p>
                  <h2 className="text-xl font-black text-slate-900 font-mono mt-1">50 Nhân viên</h2>
                  <p className="text-[10px] text-slate-400 mt-1">Quét QR & Định vị Geofencing</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">NHÀ PHÂN PHỐI</p>
                  <h2 className="text-xl font-black text-slate-900 font-mono mt-1">5 Đơn vị chính</h2>
                  <p className="text-[10px] text-slate-400 mt-1">Kiểm toán công nợ 100%</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-rose-500">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">TRẠNG THÁI VẬT TƯ</p>
                  <h2 className="text-xl font-black text-rose-600 font-mono mt-1">Có Cảnh Báo</h2>
                  <p className="text-[10px] text-rose-500 font-semibold mt-1">Xuất kho vượt dự toán</p>
                </div>
              </div>
            )}

            {/* --- SECURE STATE SETTERS FOR ROLE-BASED ACCESS CONTROL (RBAC) --- */}
            {(() => {
              // We create the wrappers inside an IIFE or as inline variables
              return null;
            })()}

            {/* Render Active View component with graceful container */}
            <div className="min-h-0">
              {activeTab === 'dashboard' && (
                <DashboardView
                  projects={projects}
                  employees={employees}
                  contractors={contractors}
                  contracts={contracts}
                  inventoryItems={inventoryItems}
                  materialLimits={materialLimits}
                  equipment={equipment}
                  transactions={transactions}
                  globalSearchQuery={globalSearchQuery}
                  companyConfig={companyConfig}
                />
              )}

              {activeTab === 'projects' && (
                <ProjectManager projects={projects} setProjects={securedSetProjectsCEO} role={currentUserRole} />
              )}

              {activeTab === 'liabilities' && (
                <LiabilitiesManager
                  projects={projects}
                  contractors={contractors}
                  setContractors={securedSetContractors}
                  contracts={contracts}
                  setContracts={securedSetContracts}
                  transactions={transactions}
                  setTransactions={securedSetTransactions}
                  setProjects={securedSetProjectsCEO}
                  companyConfig={companyConfig}
                  userRole={currentUserRole}
                />
              )}

              {activeTab === 'schema' && (
                <SchemaExplorer />
              )}

              {activeTab === 'flows' && (
                <FlowSimulator />
              )}

              {activeTab === 'sim' && (
                <OpsSimulator
                  projects={projects}
                  employees={employees}
                  approvals={approvals}
                  equipment={equipment}
                  timesheets={timesheets}
                  onCheckIn={securedHandleCheckIn}
                  onApproveLevel={securedHandleApproveLevel}
                  onDispatchMachine={securedHandleDispatchMachine}
                  onResetData={handleResetDataSecured}
                  userRole={currentUserRole}
                />
              )}

              {activeTab === 'hr' && (
                <HRManager
                  projects={projects}
                  setProjects={securedSetProjectsCEO}
                  employees={employees}
                  setEmployees={securedSetEmployees}
                  timesheets={timesheets}
                  setTimesheets={securedSetTimesheets}
                  transactions={transactions}
                  setTransactions={securedSetTransactions}
                  laborContracts={laborContracts}
                  setLaborContracts={securedSetLaborContracts}
                  constructionTasks={constructionTasks}
                  setConstructionTasks={securedSetConstructionTasks}
                  companyConfig={companyConfig}
                  globalSearchQuery={globalSearchQuery}
                  userRole={currentUserRole}
                />
              )}

              {activeTab === 'workforce' && (
                <WorkforceAdmin role={currentUserRole} employees={employees} projects={projects} timesheets={timesheets} setProjects={securedSetProjectsCEO} />
              )}

              {activeTab === 'masterdata' && (
                <MasterDataEditor projects={projects} setProjects={securedSetProjectsCEO} employees={employees} setEmployees={securedSetEmployees} contractors={contractors} setContractors={securedSetContractors} contracts={contracts} setContracts={securedSetContracts} inventoryItems={inventoryItems} setInventoryItems={securedSetInventoryItems} equipment={equipment} setEquipment={securedSetEquipment} />
              )}

              {activeTab === 'warehouse' && (
                <WarehouseManager
                  projects={projects}
                  setProjects={securedSetProjectsCEO}
                  inventoryItems={inventoryItems}
                  setInventoryItems={securedSetInventoryItems}
                  inventoryLedger={inventoryLedger}
                  setInventoryLedger={securedSetInventoryLedger}
                  materialLimits={materialLimits}
                  setMaterialLimits={securedSetMaterialLimits}
                  transactions={transactions}
                  setTransactions={securedSetTransactions}
                  globalSearchQuery={globalSearchQuery}
                  companyConfig={companyConfig}
                  userRole={currentUserRole}
                />
              )}

              {activeTab === 'company' && (
                <CompanyConfigView
                  companyConfig={companyConfig}
                  setCompanyConfig={securedSetCompanyConfig}
                  autoSaveEnabled={autoSaveEnabled}
                  setAutoSaveEnabled={setAutoSaveEnabled}
                  onExportBackup={handleExportBackup}
                  onImportBackup={handleImportBackup}
                  onResetData={handleResetDataSecured}
                  userRole={currentUserRole}
                  cloudSyncStatus={cloudSyncStatus}
                  lastSyncedTime={lastSyncedTime}
                  cloudDbSyncEnabled={cloudDbSyncEnabled}
                  setCloudDbSyncEnabled={setCloudDbSyncEnabled}
                  onPushToCloud={handlePushToCloud}
                  onPullFromCloud={handlePullFromCloud}
                />
              )}

              {activeTab === 'journal' && (
                <JournalManager
                  projects={projects}
                  transactions={transactions}
                  setTransactions={securedSetTransactions}
                  inventoryLedger={inventoryLedger}
                  timesheets={timesheets}
                  equipment={equipment}
                  companyConfig={companyConfig}
                  userRole={currentUserRole}
                />
              )}

              {activeTab === 'equipment' && (
                <EquipmentManager
                  projects={projects}
                  setProjects={securedSetProjectsCEO}
                  equipment={equipment}
                  setEquipment={securedSetEquipment}
                  transactions={transactions}
                  setTransactions={securedSetTransactions}
                  companyConfig={companyConfig}
                  userRole={currentUserRole}
                />
              )}

              {activeTab === 'drive' && (
                <DriveManager projects={projects} backupData={erpPayload} />
              )}
            </div>

            {/* Custom Footer inside scroll container */}
            <footer className="pt-8 border-t border-slate-200 text-slate-400 text-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-500">Quản Trị Doanh Nghiệp • Hệ thống quản trị tập trung</span>
              </div>
              <div className="text-center sm:text-right text-[10px] space-y-0.5 font-medium text-slate-400">
                <p>Hệ thống đạt chuẩn ACID kế toán | Kiểm soát thất thoát vật tư</p>
                <p className="text-slate-300">© 2026 ERP Construction. All rights reserved.</p>
              </div>
            </footer>

          </div>
        </div>
      </main>

      {/* Global Search Detail Modal */}
      {selectedSearchDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  {selectedSearchDetail.type === 'Project' && <LayoutDashboard className="w-5 h-5" />}
                  {selectedSearchDetail.type === 'Employee' && <Users className="w-5 h-5" />}
                  {selectedSearchDetail.type === 'InventoryItem' && <Boxes className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                    {selectedSearchDetail.type === 'Project' && 'Thông tin Chi tiết Dự án'}
                    {selectedSearchDetail.type === 'Employee' && 'Thông tin Chi tiết Nhân sự'}
                    {selectedSearchDetail.type === 'InventoryItem' && 'Thông tin Chi tiết Vật tư'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    Truy vấn dữ liệu thời gian thực
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSearchDetail(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-700 text-xs">

              {/* PROJECT TYPE */}
              {selectedSearchDetail.type === 'Project' && (() => {
                const p = selectedSearchDetail.data;
                const activeEmps = employees.filter(e => e.projectId === p.id);
                const activeEqs = equipment.filter(eq => eq.currentProjectId === p.id);

                return (
                  <div className="space-y-5">
                    {/* Basic Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Tên Dự Án</span>
                        <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Mã dự án</span>
                        <span className="font-mono font-bold text-slate-700">{p.id}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Chỉ huy trưởng</span>
                        <span className="font-bold text-slate-800">{p.manager}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Địa điểm</span>
                        <span className="font-bold text-slate-800">{p.location}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-150 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase">Tiến độ thi công</span>
                        <span className="font-bold text-blue-600 font-mono">{p.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${p.progress}%` }}></div>
                      </div>
                    </div>

                    {/* Financials */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50/40 p-3 rounded-lg border border-emerald-100">
                        <span className="text-[9px] text-emerald-600 font-extrabold uppercase block mb-0.5">Tổng Ngân sách</span>
                        <span className="font-mono font-bold text-emerald-800">{(p.budget as number).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="bg-blue-50/40 p-3 rounded-lg border border-blue-100">
                        <span className="text-[9px] text-blue-600 font-extrabold uppercase block mb-0.5">Đã Chi trả (Thực chi)</span>
                        <span className="font-mono font-bold text-blue-800">{(p.spent as number).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[9px] text-slate-500 font-extrabold uppercase block mb-0.5">Còn Lại</span>
                        <span className="font-mono font-bold text-slate-800">{(p.budget - p.spent as number).toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    {/* Relations lists */}
                    <div className="space-y-4 pt-2">
                      {/* Labor */}
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          Nhân sự phụ trách & làm việc ({activeEmps.length})
                        </h4>
                        {activeEmps.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                            {activeEmps.map(emp => (
                              <div key={emp.id} className="p-2 border border-slate-100 rounded-md bg-white flex items-center justify-between">
                                <span className="font-semibold text-slate-800">{emp.name}</span>
                                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{emp.role}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Chưa có nhân sự gán trực tiếp vào công trường này.</div>
                        )}
                      </div>

                      {/* Equipment */}
                      <div>
                        <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                          <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                          Thiết bị thi công đang điều động ({activeEqs.length})
                        </h4>
                        {activeEqs.length > 0 ? (
                          <div className="grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                            {activeEqs.map(eq => (
                              <div key={eq.id} className="p-2 border border-slate-100 rounded-md bg-white flex items-center justify-between">
                                <span className="font-semibold text-slate-800">{eq.name}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  eq.status === 'In-Use' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border'
                                }`}>
                                  {eq.status === 'In-Use' ? 'Đang chạy' : 'Đang nghỉ'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Chưa có thiết bị nào đang phân phối tại công trường này.</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* EMPLOYEE TYPE */}
              {selectedSearchDetail.type === 'Employee' && (() => {
                const e = selectedSearchDetail.data;
                const proj = projects.find(p => p.id === e.projectId);
                const contract = laborContracts.find(c => c.employeeId === e.id);
                const latestTimesheets = timesheets.filter(t => t.employeeId === e.id).slice(0, 5);

                return (
                  <div className="space-y-5">
                    {/* Basic Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Họ và Tên</span>
                        <span className="font-bold text-slate-900 text-sm">{e.name}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Mã nhân sự</span>
                        <span className="font-mono font-bold text-slate-700">{e.id}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Chức danh / Vai trò</span>
                        <span className="font-bold text-slate-800">{e.role}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Số điện thoại</span>
                        <span className="font-bold text-slate-800">{e.phone}</span>
                      </div>
                    </div>

                    {/* Worksite & Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Công trường gán</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" />
                          {proj ? proj.name : 'Văn phòng chính'}
                        </span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Loại lao động</span>
                        <span className={`inline-block text-[10px] px-2 py-0.5 rounded font-bold ${
                          e.type === 'Internal' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {e.type === 'Internal' ? 'Nhân sự biên chế' : 'Nhân công thời vụ'}
                        </span>
                      </div>
                    </div>

                    {/* Labor Contract details */}
                    <div className="bg-slate-50/70 p-4 rounded-lg border border-slate-150 space-y-3">
                      <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-200/60 pb-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                        Hợp đồng lao động liên kết
                      </h4>
                      {contract ? (
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Số hợp đồng</span>
                            <span className="font-mono font-bold text-slate-800">{contract.contractNumber}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Mức lương cơ bản / Ngày</span>
                            <span className="font-mono font-bold text-emerald-700">{contract.dailyWage.toLocaleString('vi-VN')} đ</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Thời gian hợp đồng</span>
                            <span className="font-medium text-slate-700">{contract.startDate} đến {contract.endDate || 'Vô thời hạn'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">Trạng thái pháp lý</span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                              <ShieldCheck className="w-3.5 h-3.5" /> Có hiệu lực
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Chưa tìm thấy hợp đồng lao động đã ký số.</div>
                      )}
                    </div>

                    {/* Timesheet logs */}
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        Nhật ký chấm công (Timesheet) mới nhất
                      </h4>
                      {latestTimesheets.length > 0 ? (
                        <div className="border border-slate-150 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                          {latestTimesheets.map(t => (
                            <div key={t.id} className="p-2 flex justify-between items-center text-xs">
                              <span className="font-mono text-slate-500 font-bold">{t.date}</span>
                              <span className="font-semibold text-slate-800">{t.hoursWorked} giờ công</span>
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" /> {t.gpsAddress}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Chưa ghi nhận nhật ký chấm công GPS.</div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* INVENTORY ITEM TYPE */}
              {selectedSearchDetail.type === 'InventoryItem' && (() => {
                const i = selectedSearchDetail.data;
                const ledgerEntries = inventoryLedger.filter(entry => entry.itemId === i.id).slice(0, 5);

                return (
                  <div className="space-y-5">
                    {/* Basic Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Tên Vật Tư</span>
                        <span className="font-bold text-slate-900 text-sm">{i.name}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Mã vật tư</span>
                        <span className="font-mono font-bold text-slate-700">{i.id}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Đơn vị tính</span>
                        <span className="font-bold text-slate-800">{i.unit}</span>
                      </div>
                      <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-150">
                        <span className="text-[10px] text-slate-400 font-extrabold uppercase block mb-1">Đơn giá bình quân</span>
                        <span className="font-mono font-bold text-emerald-700">{(i.avgCost as number).toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    {/* Stock status cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 text-center">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Tồn kho hiện hữu</span>
                        <span className="text-sm font-mono font-black text-slate-800">{i.onHand.toLocaleString()} {i.unit}</span>
                      </div>
                      <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-center">
                        <span className="text-[9px] text-emerald-600 font-extrabold uppercase block mb-1">Tổng Nhập Kho</span>
                        <span className="text-sm font-mono font-black text-emerald-800">{(i.totalReceived || 0).toLocaleString()} {i.unit}</span>
                      </div>
                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100 text-center">
                        <span className="text-[9px] text-amber-600 font-extrabold uppercase block mb-1">Tổng Xuất Kho</span>
                        <span className="text-sm font-mono font-black text-amber-800">{(i.totalIssued || 0).toLocaleString()} {i.unit}</span>
                      </div>
                    </div>

                    {/* Inventory Value */}
                    <div className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/60 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-600 font-extrabold uppercase block">Tổng Giá trị hàng tồn</span>
                        <p className="text-[9px] text-slate-400 font-medium">Công thức: Tồn hiện tại × Đơn giá bình quân</p>
                      </div>
                      <span className="font-mono font-black text-emerald-800 text-base">
                        {(i.onHand * i.avgCost as number).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    {/* Inventory Ledgers */}
                    <div>
                      <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <ClipboardList className="w-3.5 h-3.5 text-blue-500" />
                        Nhật ký nhập/xuất kho (Ledger) mới nhất
                      </h4>
                      {ledgerEntries.length > 0 ? (
                        <div className="border border-slate-150 rounded-lg overflow-hidden divide-y divide-slate-100 bg-white">
                          {ledgerEntries.map(entry => {
                            const pName = projects.find(proj => proj.id === entry.projectId)?.name || 'Kho chung';
                            const isIn = entry.type === 'Receipt';
                            return (
                              <div key={entry.id} className="p-2.5 flex justify-between items-center text-xs">
                                <div className="space-y-0.5">
                                  <span className="font-mono text-[10px] text-slate-400 block font-bold">{entry.date}</span>
                                  <span className="font-bold text-slate-700">{pName}</span>
                                </div>
                                <div className="text-right">
                                  <span className={`font-mono font-bold text-xs ${isIn ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {isIn ? '+' : '-'}{entry.qty.toLocaleString()} {i.unit}
                                  </span>
                                  <span className="text-[9px] text-slate-400 block">{entry.note}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">Chưa ghi nhận giao dịch nhập xuất kho nào.</div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                onClick={() => setSelectedSearchDetail(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors shadow-3xs"
              >
                Đóng
              </button>

              {/* Action specific to tab redirect */}
              {selectedSearchDetail.type === 'Project' && (
                <button
                  onClick={() => {
                    setActiveTab('dashboard');
                    setGlobalSearchQuery(selectedSearchDetail.data.name);
                    setSelectedSearchDetail(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Xem dự án trên Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {selectedSearchDetail.type === 'Employee' && (
                <button
                  onClick={() => {
                    setActiveTab('hr');
                    setGlobalSearchQuery(selectedSearchDetail.data.name);
                    setSelectedSearchDetail(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Xem nhân sự trên HR Manager</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {selectedSearchDetail.type === 'InventoryItem' && (
                <button
                  onClick={() => {
                    setActiveTab('warehouse');
                    setGlobalSearchQuery(selectedSearchDetail.data.name);
                    setSelectedSearchDetail(null);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span>Xem vật tư trong kho</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Permission Denied Dialog */}
      {permissionDeniedMsg && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in" id="permission-denied-modal">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-rose-50 p-6 flex flex-col items-center text-center border-b border-slate-100">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-600 mb-4 animate-bounce">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-850 uppercase tracking-tight">Quyền Truy Cập Bị Hạn Chế</h3>
              <p className="text-xs text-rose-700 font-semibold mt-2 leading-relaxed">
                {permissionDeniedMsg}
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex flex-col gap-2">
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-center mb-1">
                Chuyển đổi nhanh vai trò thử nghiệm:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setCurrentUserRole('CEO');
                    setPermissionDeniedMsg(null);
                  }}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 rounded-lg shadow-3xs transition-colors flex flex-col items-center"
                >
                  <span className="font-extrabold">💼 CEO / Giám Đốc</span>
                  <span className="text-[8px] text-slate-400 font-medium">Toàn bộ quyền hạn</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentUserRole('Accountant');
                    setPermissionDeniedMsg(null);
                  }}
                  className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-800 rounded-lg shadow-3xs transition-colors flex flex-col items-center"
                >
                  <span className="font-extrabold">🧮 Kế Toán Trưởng</span>
                  <span className="text-[8px] text-slate-400 font-medium">Kế toán & Nhân sự</span>
                </button>
              </div>
              <button
                onClick={() => setPermissionDeniedMsg(null)}
                className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors shadow-3xs"
              >
                Đóng thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
