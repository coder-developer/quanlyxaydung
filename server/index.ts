import 'dotenv/config';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { PoolClient } from 'pg';
import { migrate, pool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 8080);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET phải có ít nhất 32 ký tự.');
if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL.');

type Role = 'CEO' | 'ChiefAccountant' | 'SiteAccountant' | 'SiteManager' | 'Auditor' | 'Employee';
type SessionUser = { id: number; username: string; fullName: string; role: Role; employeeId?: string; mustChangePassword?: boolean; sessionVersion: number };

type EmployeeAccountSource = { id?: string; code?: string; name?: string; role?: string; projectId?: string; active?: boolean };
type JsonRecord = Record<string, any>;
const normalizeEmployeeId = (value: unknown) => String(value || '').trim().toUpperCase();
const employeeMatchesId = (employee: EmployeeAccountSource | undefined, employeeId: unknown) => {
  const expected = normalizeEmployeeId(employeeId);
  return Boolean(employee && expected && [employee.code, employee.id].some(value => normalizeEmployeeId(value) === expected));
};

const DEFAULT_COMPANY_CONFIG = {
  companyName: 'Công Ty Cổ Phần Xây Dựng', siteOffice: 'Tp Hồ Chí Minh', directorName: '', chiefAccountantName: '', treasurerName: '', technicianName: '',
  journalTitle: 'SỔ NHẬT KÝ CHUNG', dispatchTitle: 'LỆNH ĐIỀU ĐỘNG THIẾT BỊ', fuelTitle: 'PHIẾU CẤP PHÁT NHIÊN LIỆU', maintenanceTitle: 'BIÊN BẢN BẢO TRÌ THIẾT BỊ',
  appTitle: 'Quản trị doanh nghiệp', siteManagerApprovalLimit: 50_000_000, accountantApprovalLimit: 200_000_000, fuelVarianceThreshold: 5, maxDailyWorkHours: 12, requireDoubleApproval: true,
};
const emptyStatePayload = () => ({
  companyConfig: { ...DEFAULT_COMPANY_CONFIG }, projects: [], employees: [], contractors: [], contracts: [], inventoryItems: [], materialLimits: [], inventoryLedger: [], timesheets: [], equipment: [], approvals: [], transactions: [], laborContracts: [], constructionTasks: [],
});

const realtimeSignal = new EventEmitter();
realtimeSignal.setMaxListeners(0);
let realtimeListener: PoolClient | null = null;
let realtimeListenerStarting: Promise<void> | null = null;

function ensureRealtimeListener() {
  if (realtimeListener) return Promise.resolve();
  if (realtimeListenerStarting) return realtimeListenerStarting;
  realtimeListenerStarting = (async () => {
    const client = await pool.connect();
    try {
      await client.query('LISTEN erp_realtime');
      realtimeListener = client;
      client.on('notification', notification => {
        if (notification.channel === 'erp_realtime') realtimeSignal.emit('change');
      });
      const reset = () => {
        if (realtimeListener !== client) return;
        realtimeListener = null;
        try { client.release(true); } catch { /* connection is already closed */ }
      };
      client.once('error', reset);
      client.once('end', reset);
    } catch (error) {
      client.release(true);
      throw error;
    }
  })().finally(() => { realtimeListenerStarting = null; });
  return realtimeListenerStarting;
}

async function publishRealtimeEvent(channel: string, eventType: string) {
  try {
    const result = await pool.query(
      'INSERT INTO realtime_events(channel,event_type) VALUES($1,$2) RETURNING id',
      [channel, eventType],
    );
    await pool.query("SELECT pg_notify('erp_realtime',$1)", [String(result.rows[0].id)]);
    if (Number(result.rows[0].id) % 100 === 0) {
      await pool.query("DELETE FROM realtime_events WHERE created_at < NOW()-INTERVAL '7 days'");
    }
  } catch (error) {
    // Nghiệp vụ chính đã thành công; polling dự phòng sẽ đồng bộ nếu kênh
    // realtime tạm gián đoạn, vì vậy không trả lỗi giả cho thao tác của người dùng.
    console.error('Không thể phát sự kiện realtime:', error);
  }
}

const normalizedPosition = (employee: EmployeeAccountSource) => String(employee.role || '')
  .trim()
  .toLocaleLowerCase('vi-VN')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd');
const isSiteManagerEmployee = (employee: EmployeeAccountSource) => normalizedPosition(employee).includes('chi huy truong');
const isChiefAccountantEmployee = (employee: EmployeeAccountSource) => normalizedPosition(employee).includes('ke toan truong');
const isSiteAccountantEmployee = (employee: EmployeeAccountSource) => {
  const position = normalizedPosition(employee);
  return position.includes('ke toan cong truong') || position.includes('ke toan du an');
};
const roleForEmployee = (employee: EmployeeAccountSource): Role => isSiteManagerEmployee(employee)
  ? 'SiteManager'
  : isChiefAccountantEmployee(employee)
    ? 'ChiefAccountant'
    : isSiteAccountantEmployee(employee)
      ? 'SiteAccountant'
      : 'Employee';

async function loadErpPayload() {
  const result = await pool.query('SELECT payload FROM erp_state WHERE id=1');
  return (result.rows[0]?.payload || {}) as JsonRecord;
}

function projectScopeForUser(user: SessionUser, payload: JsonRecord) {
  if (!['SiteManager', 'SiteAccountant'].includes(user.role) || !user.employeeId) return new Set<string>();
  const employees = Array.isArray(payload.employees) ? payload.employees : [];
  const projects = Array.isArray(payload.projects) ? payload.projects : [];
  const employee = employees.find((item: EmployeeAccountSource) => employeeMatchesId(item, user.employeeId));
  const validPosition = user.role === 'SiteManager' ? isSiteManagerEmployee(employee) : isSiteAccountantEmployee(employee);
  if (!employee || !validPosition || employee.active === false) return new Set<string>();
  const ids = new Set<string>();
  if (employee.projectId) ids.add(String(employee.projectId));
  for (const project of user.role === 'SiteManager' ? projects : []) {
    if (String(project.manager || '').trim().toLocaleLowerCase('vi-VN') === String(employee.name || '').trim().toLocaleLowerCase('vi-VN')) ids.add(String(project.id));
  }
  return ids;
}

function filterPayloadForSiteManager(payload: JsonRecord, projectIds: Set<string>) {
  const inProject = (item: JsonRecord, key = 'projectId') => projectIds.has(String(item?.[key] || ''));
  const employees = Array.isArray(payload.employees) ? payload.employees.filter((item: JsonRecord) => inProject(item)) : [];
  const employeeIds = new Set(employees.flatMap((item: JsonRecord) => [normalizeEmployeeId(item.id), normalizeEmployeeId(item.code)]).filter(Boolean));
  const contracts = Array.isArray(payload.contracts) ? payload.contracts.filter((item: JsonRecord) => inProject(item)) : [];
  const partnerIds = new Set(contracts.map((item: JsonRecord) => String(item.partnerId)));
  const inventoryLedger = Array.isArray(payload.inventoryLedger) ? payload.inventoryLedger.filter((item: JsonRecord) => inProject(item)) : [];
  const materialLimits = Array.isArray(payload.materialLimits) ? payload.materialLimits.filter((item: JsonRecord) => inProject(item)) : [];
  const inventoryItems = (Array.isArray(payload.inventoryItems) ? payload.inventoryItems : []).map((item: JsonRecord) => {
    const rows = inventoryLedger.filter((row: JsonRecord) => String(row.itemId) === String(item.id));
    const received = rows.filter((row: JsonRecord) => row.type === 'Receipt').reduce((sum: number, row: JsonRecord) => sum + Number(row.quantity || 0), 0);
    const issued = rows.filter((row: JsonRecord) => row.type === 'Issue').reduce((sum: number, row: JsonRecord) => sum + Number(row.quantity || 0), 0);
    const receivedValue = rows.filter((row: JsonRecord) => row.type === 'Receipt').reduce((sum: number, row: JsonRecord) => sum + Number(row.quantity || 0) * Number(row.unitPrice || 0), 0);
    return { ...item, totalReceived: received, totalIssued: issued, onHand: received - issued, avgCost: received > 0 ? receivedValue / received : Number(item.avgCost || 0) };
  });
  return {
    companyConfig: payload.companyConfig,
    projects: Array.isArray(payload.projects) ? payload.projects.filter((item: JsonRecord) => projectIds.has(String(item.id))) : [],
    employees,
    contractors: Array.isArray(payload.contractors) ? payload.contractors.filter((item: JsonRecord) => partnerIds.has(String(item.id))) : [],
    contracts,
    inventoryItems,
    materialLimits,
    inventoryLedger,
    timesheets: Array.isArray(payload.timesheets) ? payload.timesheets.filter((item: JsonRecord) => inProject(item)) : [],
    equipment: Array.isArray(payload.equipment) ? payload.equipment.filter((item: JsonRecord) => inProject(item, 'currentProjectId')) : [],
    approvals: Array.isArray(payload.approvals) ? payload.approvals.filter((item: JsonRecord) => inProject(item)) : [],
    transactions: Array.isArray(payload.transactions) ? payload.transactions.filter((item: JsonRecord) => inProject(item)) : [],
    laborContracts: Array.isArray(payload.laborContracts) ? payload.laborContracts.filter((item: JsonRecord) => employeeIds.has(normalizeEmployeeId(item.employeeId))) : [],
    constructionTasks: Array.isArray(payload.constructionTasks) ? payload.constructionTasks.filter((item: JsonRecord) => inProject(item)) : [],
  };
}

function mergeScopedRows(existing: any, incoming: any, belongsToScope: (item: JsonRecord) => boolean) {
  const current = Array.isArray(existing) ? existing : [];
  const updates = Array.isArray(incoming) ? incoming.filter(belongsToScope) : [];
  return [...current.filter((item: JsonRecord) => !belongsToScope(item)), ...updates];
}

function mergeSiteManagerPayload(current: JsonRecord, incoming: JsonRecord, projectIds: Set<string>) {
  const inProject = (item: JsonRecord, key = 'projectId') => projectIds.has(String(item?.[key] || ''));
  const result: JsonRecord = {};
  if ('projects' in incoming) {
    const incomingById = new Map((Array.isArray(incoming.projects) ? incoming.projects : []).map((item: JsonRecord) => [String(item.id), item]));
    result.projects = (Array.isArray(current.projects) ? current.projects : []).map((project: JsonRecord) => {
      if (!projectIds.has(String(project.id))) return project;
      const update = incomingById.get(String(project.id));
      if (!update) return project;
      return { ...project, ...update, id: project.id, code: project.code, manager: project.manager, budget: project.budget };
    });
  }
  for (const key of ['inventoryLedger', 'materialLimits', 'timesheets', 'approvals', 'constructionTasks']) {
    if (key in incoming) result[key] = mergeScopedRows(current[key], incoming[key], item => inProject(item));
  }
  if ('equipment' in incoming) result.equipment = mergeScopedRows(current.equipment, incoming.equipment, item => inProject(item, 'currentProjectId'));
  if ('employees' in incoming) {
    const existing = Array.isArray(current.employees) ? current.employees : [];
    const existingIds = new Set(existing.flatMap((item: JsonRecord) => [normalizeEmployeeId(item.id), normalizeEmployeeId(item.code)]).filter(Boolean));
    const createdIds = new Set<string>();
    const created = (Array.isArray(incoming.employees) ? incoming.employees : [])
      .filter((item: JsonRecord) => {
        const employeeId = normalizeEmployeeId(item.code || item.id);
        if (!employeeId || existingIds.has(employeeId) || createdIds.has(employeeId) || !projectIds.has(String(item.projectId || ''))) return false;
        if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(employeeId) || String(item.name || '').trim().length < 2 || String(item.phone || '').trim().length < 6) return false;
        createdIds.add(employeeId);
        return true;
      })
      .slice(0, 50)
      .map((item: JsonRecord) => {
        const employeeId = normalizeEmployeeId(item.code || item.id);
        return {
          ...item,
          id: employeeId,
          code: employeeId,
          name: String(item.name).trim().slice(0, 150),
          phone: String(item.phone).trim().slice(0, 30),
          role: 'Nhân viên công trường',
          projectId: String(item.projectId),
          baseSalary: 0,
          active: true,
        };
      });
    result.employees = [...existing, ...created];
  }
  return result;
}

function mergeChiefAccountantPayload(current: JsonRecord, incoming: JsonRecord) {
  const result: JsonRecord = {};
  for (const key of ['contractors', 'transactions', 'approvals', 'laborContracts']) {
    if (key in incoming) result[key] = incoming[key];
  }
  if ('contracts' in incoming) {
    const existingIds = new Set((Array.isArray(current.contracts) ? current.contracts : []).map((item: JsonRecord) => String(item.id)));
    result.contracts = (Array.isArray(incoming.contracts) ? incoming.contracts : []).filter((item: JsonRecord) => existingIds.has(String(item.id)));
  }
  return result;
}

function mergeSiteAccountantPayload(current: JsonRecord, incoming: JsonRecord, projectIds: Set<string>, user: SessionUser) {
  const inProject = (item: JsonRecord) => projectIds.has(String(item?.projectId || ''));
  const result: JsonRecord = {};
  for (const key of ['inventoryLedger', 'materialLimits']) {
    if (key in incoming) result[key] = mergeScopedRows(current[key], incoming[key], inProject);
  }
  if ('equipment' in incoming) {
    result.equipment = mergeScopedRows(current.equipment, incoming.equipment, item => projectIds.has(String(item?.currentProjectId || '')));
  }
  if ('transactions' in incoming) {
    const existing = Array.isArray(current.transactions) ? current.transactions : [];
    const existingIds = new Set(existing.map((item: JsonRecord) => String(item.id)));
    const created = (Array.isArray(incoming.transactions) ? incoming.transactions : [])
      .filter((item: JsonRecord) => inProject(item) && !existingIds.has(String(item.id)))
      .map((item: JsonRecord) => ({ ...item, entryStatus: 'Draft', enteredBy: user.id }));
    result.transactions = [...existing, ...created];
  }
  if ('approvals' in incoming) {
    const existing = Array.isArray(current.approvals) ? current.approvals : [];
    const existingIds = new Set(existing.map((item: JsonRecord) => String(item.id)));
    const created = (Array.isArray(incoming.approvals) ? incoming.approvals : [])
      .filter((item: JsonRecord) => inProject(item) && !existingIds.has(String(item.id)))
      .map((item: JsonRecord) => ({ ...item, currentLevel: 1, status: 'Pending_Accountant', createdBy: user.id }));
    result.approvals = [...existing, ...created];
  }
  return result;
}

function changedPeriods(beforeValue: unknown, afterValue: unknown, applies: (item: JsonRecord) => boolean = () => true) {
  const beforeRows = Array.isArray(beforeValue) ? beforeValue : [];
  const afterRows = Array.isArray(afterValue) ? afterValue : [];
  const key = (item: JsonRecord, index: number) => String(item.id || `${item.employeeId || ''}:${item.projectId || ''}:${item.date || ''}:${index}`);
  const before = new Map(beforeRows.map((item: JsonRecord, index: number) => [key(item, index), item]));
  const after = new Map(afterRows.map((item: JsonRecord, index: number) => [key(item, index), item]));
  const periods = new Set<string>();
  const record = (item?: JsonRecord) => {
    if (!item || !applies(item) || !/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(String(item.date || ''))) return;
    periods.add(String(item.date).slice(0, 7));
  };
  for (const [id, item] of after) {
    const previous = before.get(id);
    if (JSON.stringify(previous) !== JSON.stringify(item)) { record(previous); record(item); }
  }
  for (const [id, item] of before) if (!after.has(id)) record(item);
  return [...periods];
}

function normalizeCascades(payload: JsonRecord) {
  const next = { ...emptyStatePayload(), ...payload } as JsonRecord;
  const projects = Array.isArray(next.projects) ? next.projects : [];
  const projectIds = new Set(projects.map((item: JsonRecord) => String(item.id)));
  const employees = (Array.isArray(next.employees) ? next.employees : []).map((item: JsonRecord) => projectIds.has(String(item.projectId)) ? item : { ...item, projectId: '' });
  const employeeIds = new Set(employees.flatMap((item: JsonRecord) => [normalizeEmployeeId(item.id), normalizeEmployeeId(item.code)]).filter(Boolean));
  const contractors = Array.isArray(next.contractors) ? next.contractors : [];
  const contractorIds = new Set(contractors.map((item: JsonRecord) => String(item.id)));
  const contracts = (Array.isArray(next.contracts) ? next.contracts : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId)) && (item.partnerType !== 'Contractor' || contractorIds.has(String(item.partnerId))));
  const contractIds = new Set(contracts.map((item: JsonRecord) => String(item.id)));
  const inventoryItems = Array.isArray(next.inventoryItems) ? next.inventoryItems : [];
  const inventoryIds = new Set(inventoryItems.map((item: JsonRecord) => String(item.id)));
  return {
    ...next, projects, employees, contractors, contracts, inventoryItems,
    materialLimits: (Array.isArray(next.materialLimits) ? next.materialLimits : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId)) && inventoryIds.has(String(item.itemId))),
    inventoryLedger: (Array.isArray(next.inventoryLedger) ? next.inventoryLedger : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId)) && inventoryIds.has(String(item.itemId))),
    timesheets: (Array.isArray(next.timesheets) ? next.timesheets : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId)) && employeeIds.has(normalizeEmployeeId(item.employeeId))),
    equipment: (Array.isArray(next.equipment) ? next.equipment : []).map((item: JsonRecord) => projectIds.has(String(item.currentProjectId)) ? item : { ...item, currentProjectId: '' }),
    approvals: (Array.isArray(next.approvals) ? next.approvals : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId)) && (!item.requesterId || employeeIds.has(normalizeEmployeeId(item.requesterId)))),
    transactions: (Array.isArray(next.transactions) ? next.transactions : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId)) && (!item.referenceId || contractIds.has(String(item.referenceId)) || !String(item.referenceId).startsWith('HD-'))),
    laborContracts: (Array.isArray(next.laborContracts) ? next.laborContracts : []).filter((item: JsonRecord) => employeeIds.has(normalizeEmployeeId(item.employeeId))),
    constructionTasks: (Array.isArray(next.constructionTasks) ? next.constructionTasks : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId))),
  };
}

async function provisionEmployeeAccounts(employees: EmployeeAccountSource[]) {
  const defaultPassword = process.env.SEED_EMPLOYEE_PIN || '5555';
  if (process.env.NODE_ENV === 'production' && defaultPassword.length < 6) {
    throw new Error('Mật khẩu mặc định của nhân viên trên production phải có ít nhất 6 chữ số.');
  }
  const passwordHash = await bcrypt.hash(defaultPassword, 12);
  let created = 0;
  for (const employee of employees) {
    const employeeId = String(employee.code || employee.id || '').trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(employeeId)) continue;
    if (employee.active === false) {
      await pool.query('UPDATE app_users SET active=FALSE,session_version=session_version+1 WHERE UPPER(employee_id)=$1 AND active=TRUE', [employeeId]);
      continue;
    }
    const username = employeeId.toLowerCase();
    const desiredRole = roleForEmployee(employee);
    const existing = await pool.query('SELECT id,username,active FROM app_users WHERE UPPER(employee_id)=$1 LIMIT 1', [employeeId]);
    if (existing.rowCount) {
      if (existing.rows[0].username === 'nhanvien') {
        const usernameOwner = await pool.query('SELECT id FROM app_users WHERE username=$1 AND id<>$2 LIMIT 1', [username, existing.rows[0].id]);
        if (!usernameOwner.rowCount) await pool.query('UPDATE app_users SET username=$1 WHERE id=$2', [username, existing.rows[0].id]);
      }
      await pool.query(
        `UPDATE app_users SET full_name=$1, role=$2, active=TRUE,
         session_version=session_version+CASE WHEN role<>$2 OR active=FALSE THEN 1 ELSE 0 END
         WHERE id=$3`,
        [String(employee.name || employeeId), desiredRole, existing.rows[0].id],
      );
      continue;
    }
    const usernameOwner = await pool.query('SELECT id FROM app_users WHERE username=$1 LIMIT 1', [username]);
    if (usernameOwner.rowCount) continue;
    await pool.query(
      `INSERT INTO app_users(username,full_name,role,pin_hash,employee_id,must_change_pin)
       VALUES($1,$2,$3,$4,$5,TRUE)`,
      [username, String(employee.name || employeeId), desiredRole, passwordHash, employeeId],
    );
    created += 1;
  }
  return created;
}

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(express.json({ limit: '8mb' }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

function sign(user: SessionUser) {
  return jwt.sign(user, jwtSecret!, { expiresIn: '4h', issuer: 'quan-tri-doanh-nghiep', audience: 'webapp' });
}

async function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  try {
    const tokenUser = jwt.verify(token, jwtSecret!, { issuer: 'quan-tri-doanh-nghiep', audience: 'webapp' }) as SessionUser;
    const result = await pool.query('SELECT id,username,full_name,role,employee_id,active,must_change_pin,session_version FROM app_users WHERE id=$1', [tokenUser.id]);
    const row = result.rows[0];
    if (!row || !row.active || Number(row.session_version) !== Number(tokenUser.sessionVersion)) return res.status(401).json({ error: 'Phiên đăng nhập không còn hiệu lực.' });
    const user: SessionUser = {
      id: Number(row.id), username: row.username, fullName: row.full_name, role: row.role,
      employeeId: row.employee_id || undefined, mustChangePassword: row.must_change_pin,
      sessionVersion: Number(row.session_version),
    };
    if (user.mustChangePassword && req.path !== '/api/auth/change-pin') return res.status(428).json({ error: 'Bạn phải đổi mật khẩu trước khi sử dụng hệ thống.', code: 'PASSWORD_CHANGE_REQUIRED' });
    res.locals.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Phiên đăng nhập hết hạn.' });
  }
}

function requireRoles(...roles: Role[]) {
  return (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    const user = res.locals.user as SessionUser;
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Bạn không có quyền thực hiện thao tác này.' });
    next();
  };
}

app.get('/api/health', async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/realtime/events', authenticate, async (req, res) => {
  const rawAfter = req.query.after;
  if (rawAfter === undefined) {
    const latest = await pool.query('SELECT COALESCE(MAX(id),0) AS cursor FROM realtime_events');
    return res.json({ cursor: Number(latest.rows[0].cursor), events: [] });
  }
  const after = Number(rawAfter);
  if (!Number.isSafeInteger(after) || after < 0) return res.status(400).json({ error: 'Con trỏ realtime không hợp lệ.' });

  await ensureRealtimeListener();
  const readEvents = () => pool.query(
    'SELECT id,channel,event_type,created_at FROM realtime_events WHERE id>$1 ORDER BY id ASC LIMIT 100',
    [after],
  );
  let result = await readEvents();
  if (!result.rowCount) {
    await new Promise<void>(resolve => {
      const finish = () => { clearTimeout(timer); realtimeSignal.off('change', finish); resolve(); };
      const timer = setTimeout(finish, 8_000);
      realtimeSignal.once('change', finish);
    });
    result = await readEvents();
  }
  const cursor = result.rowCount ? Number(result.rows[result.rows.length - 1].id) : after;
  res.json({ cursor, events: result.rows });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const pin = String(req.body.pin || '');
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !/^\d{4,12}$/.test(pin)) return res.status(400).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
  const attempt = await pool.query('SELECT failed_count,window_started,locked_until FROM auth_attempts WHERE username=$1', [username]);
  if (attempt.rows[0]?.locked_until && new Date(attempt.rows[0].locked_until).getTime() > Date.now()) return res.status(429).json({ error: 'Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.' });
  const result = await pool.query(
    `SELECT id, username, full_name, role, employee_id, pin_hash, must_change_pin, session_version
     FROM app_users
     WHERE active=TRUE AND (username=$1 OR LOWER(employee_id)=$1)
     ORDER BY (username=$1) DESC
     LIMIT 1`,
    [username],
  );
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(pin, row.pin_hash))) {
    await pool.query(
      `INSERT INTO auth_attempts(username,failed_count,window_started,locked_until) VALUES($1,1,NOW(),NULL)
       ON CONFLICT(username) DO UPDATE SET
       failed_count=CASE WHEN auth_attempts.window_started < NOW()-INTERVAL '15 minutes' THEN 1 ELSE auth_attempts.failed_count+1 END,
       window_started=CASE WHEN auth_attempts.window_started < NOW()-INTERVAL '15 minutes' THEN NOW() ELSE auth_attempts.window_started END,
       locked_until=CASE WHEN (CASE WHEN auth_attempts.window_started < NOW()-INTERVAL '15 minutes' THEN 1 ELSE auth_attempts.failed_count+1 END)>=5 THEN NOW()+INTERVAL '15 minutes' ELSE NULL END`,
      [username],
    );
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
  }
  await pool.query('DELETE FROM auth_attempts WHERE username=$1', [username]);
  const user: SessionUser = { id: Number(row.id), username: row.username, fullName: row.full_name, role: row.role, employeeId: row.employee_id || undefined, mustChangePassword: row.must_change_pin, sessionVersion: Number(row.session_version) };
  await pool.query('INSERT INTO audit_log(user_id,action) VALUES($1,$2)', [user.id, 'login']);
  res.json({ token: sign(user), user });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const employeeCode = String(req.body.employeeCode || '').trim();
  const phone = String(req.body.phone || '').replace(/\D/g, '');
  const pin = String(req.body.pin || '');
  if (!/^[a-z0-9._-]{3,32}$/.test(username) || !/^\d{6,12}$/.test(pin) || !employeeCode || phone.length < 9) return res.status(400).json({ error: 'Thông tin đăng ký không hợp lệ.' });
  const state = await pool.query('SELECT payload FROM erp_state WHERE id=1');
  const employees = Array.isArray(state.rows[0]?.payload?.employees) ? state.rows[0].payload.employees : [];
  const employee = employees.find((item: { id?: string; code?: string; phone?: string; active?: boolean }) =>
    employeeMatchesId(item, employeeCode) && String(item.phone || '').replace(/\D/g, '') === phone && item.active !== false,
  );
  if (!employee) return res.status(404).json({ error: 'Không tìm thấy hồ sơ nhân viên khớp mã và số điện thoại.' });
  const linkedEmployeeId = normalizeEmployeeId(employee.code || employee.id);
  const linked = await pool.query('SELECT 1 FROM app_users WHERE UPPER(employee_id)=$1', [linkedEmployeeId]);
  if (linked.rowCount) return res.status(409).json({ error: 'Hồ sơ nhân viên này đã có tài khoản.' });
  try {
    const role = roleForEmployee(employee);
    const result = await pool.query('INSERT INTO app_users(username,full_name,role,pin_hash,employee_id,must_change_pin) VALUES($1,$2,$3,$4,$5,FALSE) RETURNING id,username,full_name,role,employee_id,must_change_pin,session_version', [username, employee.name, role, await bcrypt.hash(pin, 12), linkedEmployeeId]);
    const row = result.rows[0];
    const user: SessionUser = { id: Number(row.id), username: row.username, fullName: row.full_name, role: row.role, employeeId: row.employee_id, mustChangePassword: false, sessionVersion: Number(row.session_version) };
    await publishRealtimeEvent('accounts', 'account_registered');
    res.status(201).json({ token: sign(user), user });
  } catch (error: any) {
    res.status(error?.code === '23505' ? 409 : 500).json({ error: error?.code === '23505' ? 'Tên đăng nhập đã tồn tại.' : 'Không đăng ký được tài khoản.' });
  }
});

app.post('/api/auth/change-pin', authenticate, authLimiter, async (req, res) => {
  const user = res.locals.user as SessionUser;
  const currentPin = String(req.body.currentPin || '');
  const newPin = String(req.body.newPin || '');
  if (!/^\d{6,12}$/.test(newPin) || currentPin === newPin) return res.status(400).json({ error: 'Mật khẩu mới phải có 6–12 chữ số và khác mật khẩu hiện tại.' });
  const result = await pool.query('SELECT pin_hash FROM app_users WHERE id=$1 AND active=TRUE', [user.id]);
  if (!result.rows[0] || !(await bcrypt.compare(currentPin, result.rows[0].pin_hash))) return res.status(401).json({ error: 'Mật khẩu hiện tại không đúng.' });
  await pool.query('UPDATE app_users SET pin_hash=$1, must_change_pin=FALSE, session_version=session_version+1 WHERE id=$2', [await bcrypt.hash(newPin, 12), user.id]);
  await pool.query('INSERT INTO audit_log(user_id,action) VALUES($1,$2)', [user.id, 'pin_changed']);
  await publishRealtimeEvent('accounts', 'account_password_changed');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, async (_req, res) => {
  res.json({ user: res.locals.user as SessionUser });
});

app.post('/api/admin/sync-business-ids', authenticate, requireRoles('CEO'), async (req, res) => {
  const mappings = Array.isArray(req.body.mappings) ? req.body.mappings.slice(0, 500) : [];
  const valid = mappings.every((item: any) => ['project', 'employee', 'contractor', 'contract', 'inventory', 'equipment'].includes(item.entityType)
    && /^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(String(item.oldId || '').toUpperCase())
    && /^[A-Z0-9][A-Z0-9._-]{1,63}$/.test(String(item.newId || '').toUpperCase()));
  if (!mappings.length || !valid) return res.status(400).json({ error: 'Danh sách đổi ID không hợp lệ.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const item of mappings) {
      if (item.entityType === 'employee') {
        const oldId = normalizeEmployeeId(item.oldId);
        const newId = normalizeEmployeeId(item.newId);
        if (oldId === newId) continue;
        const targetOwner = await client.query('SELECT id FROM app_users WHERE UPPER(employee_id)=$1 ORDER BY active DESC,id LIMIT 1', [newId]);
        if (targetOwner.rowCount) {
          await client.query('UPDATE app_users SET employee_id=NULL,active=FALSE,session_version=session_version+1 WHERE UPPER(employee_id)=$1 AND id<>$2', [oldId, targetOwner.rows[0].id]);
        } else {
          await client.query('UPDATE app_users SET employee_id=$1,session_version=session_version+1 WHERE UPPER(employee_id)=$2', [newId, oldId]);
        }
        await client.query('UPDATE workforce_requests SET employee_id=$1 WHERE UPPER(employee_id)=$2', [newId, oldId]);
        await client.query('UPDATE work_shifts SET employee_id=$1 WHERE UPPER(employee_id)=$2', [newId, oldId]);
        await client.query('UPDATE notifications SET employee_id=$1 WHERE UPPER(employee_id)=$2', [newId, oldId]);
        await client.query('DELETE FROM payslip_views old_row USING payslip_views new_row WHERE UPPER(old_row.employee_id)=$1 AND UPPER(new_row.employee_id)=$2 AND old_row.period=new_row.period', [oldId, newId]);
        await client.query('UPDATE payslip_views SET employee_id=$1 WHERE UPPER(employee_id)=$2', [newId, oldId]);
        const consentExists = await client.query('SELECT 1 FROM privacy_consents WHERE UPPER(employee_id)=$1', [newId]);
        if (consentExists.rowCount) await client.query('DELETE FROM privacy_consents WHERE UPPER(employee_id)=$1', [oldId]);
        else await client.query('UPDATE privacy_consents SET employee_id=$1 WHERE UPPER(employee_id)=$2', [newId, oldId]);
      }
      if (item.entityType === 'project') {
        await client.query('UPDATE work_shifts SET project_id=$1 WHERE project_id=$2', [item.newId, item.oldId]);
      }
    }
    await client.query('INSERT INTO audit_log(user_id,action,metadata) VALUES($1,$2,$3)', [res.locals.user.id, 'business_ids_synced', { count: mappings.length }]);
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(409).json({ error: 'Không thể đổi ID vì mã mới đang được sử dụng trong dữ liệu liên quan.' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/users', authenticate, requireRoles('CEO'), async (_req, res) => {
  const result = await pool.query('SELECT id,username,full_name,role,employee_id,must_change_pin,active,created_at FROM app_users ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/admin/users', authenticate, requireRoles('CEO'), async (req, res) => {
  const { username, fullName, employeeId, role = 'Employee', pin } = req.body;
  if (!/^[a-z0-9._-]{3,32}$/.test(String(username || '')) || !/^\d{6,12}$/.test(String(pin || ''))) return res.status(400).json({ error: 'Tên đăng nhập hoặc mật khẩu không hợp lệ.' });
  let effectiveRole: Role = role;
  let effectiveFullName = String(fullName || '').trim();
  if (employeeId) {
    const payload = await loadErpPayload();
    const employee = (Array.isArray(payload.employees) ? payload.employees : []).find((item: EmployeeAccountSource) => employeeMatchesId(item, employeeId));
    if (!employee) return res.status(400).json({ error: 'Hồ sơ nhân viên không tồn tại.' });
    effectiveRole = roleForEmployee(employee);
    effectiveFullName = String(employee.name || effectiveFullName);
  }
  if (!['CEO', 'ChiefAccountant', 'SiteAccountant', 'SiteManager', 'Auditor', 'Employee'].includes(effectiveRole) || !effectiveFullName) return res.status(400).json({ error: 'Vai trò hoặc họ tên không hợp lệ.' });
  const hash = await bcrypt.hash(String(pin), 12);
  try {
    const result = await pool.query('INSERT INTO app_users(username,full_name,role,pin_hash,employee_id,must_change_pin) VALUES($1,$2,$3,$4,$5,TRUE) RETURNING id,username,full_name,role,employee_id,must_change_pin,active', [username, effectiveFullName, effectiveRole, hash, employeeId ? normalizeEmployeeId(employeeId) : null]);
    await publishRealtimeEvent('accounts', 'account_created');
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(error?.code === '23505' ? 409 : 500).json({ error: error?.code === '23505' ? 'Tên đăng nhập đã tồn tại.' : 'Không tạo được tài khoản.' });
  }
});

app.patch('/api/admin/users/:id/status', authenticate, requireRoles('CEO'), async (req, res) => {
  const result = await pool.query('UPDATE app_users SET active=$1,session_version=session_version+1 WHERE id=$2 RETURNING id,active', [Boolean(req.body.active), req.params.id]);
  await pool.query('INSERT INTO audit_log(user_id,action,metadata) VALUES($1,$2,$3)', [res.locals.user.id, 'account_status_changed', { targetUserId: req.params.id, active: Boolean(req.body.active) }]);
  await publishRealtimeEvent('accounts', 'account_status_changed');
  res.json(result.rows[0]);
});

app.post('/api/admin/users/:id/reset-pin', authenticate, requireRoles('CEO'), async (req, res) => {
  const pin = String(req.body.pin || '');
  if (!/^\d{6,12}$/.test(pin)) return res.status(400).json({ error: 'Mật khẩu phải có 6–12 chữ số.' });
  await pool.query('UPDATE app_users SET pin_hash=$1, must_change_pin=TRUE, session_version=session_version+1 WHERE id=$2', [await bcrypt.hash(pin, 12), req.params.id]);
  await pool.query('INSERT INTO audit_log(user_id,action,metadata) VALUES($1,$2,$3)', [res.locals.user.id, 'password_reset', { targetUserId: req.params.id }]);
  await publishRealtimeEvent('accounts', 'account_password_reset');
  res.json({ success: true });
});

app.post('/api/admin/provision-employees', authenticate, requireRoles('CEO'), async (_req, res) => {
  const state = await pool.query('SELECT payload FROM erp_state WHERE id=1');
  const employees = Array.isArray(state.rows[0]?.payload?.employees) ? state.rows[0].payload.employees : [];
  const created = await provisionEmployeeAccounts(employees);
  await publishRealtimeEvent('accounts', 'accounts_provisioned');
  res.json({ success: true, created, totalEmployees: employees.filter((item: EmployeeAccountSource) => item.active !== false).length });
});

app.delete('/api/admin/users/:id', authenticate, requireRoles('CEO'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  if (Number(req.params.id) === Number(user.id)) return res.status(400).json({ error: 'Không thể tự xóa tài khoản đang đăng nhập.' });
  const target = await pool.query('SELECT role FROM app_users WHERE id=$1', [req.params.id]);
  if (!target.rows[0]) return res.status(404).json({ error: 'Tài khoản không tồn tại.' });
  await pool.query('UPDATE audit_log SET user_id=NULL WHERE user_id=$1', [req.params.id]);
  await pool.query('UPDATE workforce_requests SET reviewed_by=NULL WHERE reviewed_by=$1', [req.params.id]);
  await pool.query('UPDATE work_shifts SET created_by=NULL WHERE created_by=$1', [req.params.id]);
  await pool.query('UPDATE payroll_periods SET locked_by=NULL WHERE locked_by=$1', [req.params.id]);
  await pool.query('DELETE FROM notifications WHERE user_id=$1', [req.params.id]);
  await pool.query('DELETE FROM app_users WHERE id=$1', [req.params.id]);
  await publishRealtimeEvent('accounts', 'account_deleted');
  res.json({ success: true });
});

app.post('/api/admin/reset-system', authenticate, requireRoles('CEO'), async (req, res) => {
  if (req.body.confirmation !== 'RESET_TO_DEFAULT') return res.status(400).json({ error: 'Thiếu mã xác nhận reset hệ thống.' });
  const user = res.locals.user as SessionUser;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const table of ['notifications', 'payslip_views', 'privacy_consents', 'work_shifts', 'workforce_requests', 'payroll_periods', 'auth_attempts', 'erp_state_backups', 'audit_log']) {
      await client.query(`DELETE FROM ${table}`);
    }
    const result = await client.query('UPDATE erp_state SET payload=$1,revision=revision+1,updated_by=$2,updated_at=NOW() WHERE id=1 RETURNING revision,payload,updated_at', [emptyStatePayload(), user.id]);
    await client.query('DELETE FROM app_users WHERE employee_id IS NOT NULL');
    await client.query('INSERT INTO audit_log(user_id,action,metadata) VALUES($1,$2,$3)', [user.id, 'system_reset', { defaultCompany: DEFAULT_COMPANY_CONFIG.companyName }]);
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ error: 'Không thể reset hệ thống an toàn.' });
  } finally {
    client.release();
  }
});

app.get('/api/workforce/requests', authenticate, async (_req, res) => {
  const user = res.locals.user as SessionUser;
  let result;
  if (user.role === 'Employee') result = await pool.query('SELECT * FROM workforce_requests WHERE UPPER(employee_id)=$1 ORDER BY created_at DESC', [normalizeEmployeeId(user.employeeId)]);
  else if (user.role === 'SiteManager') {
    const payload = await loadErpPayload();
    const projectIds = projectScopeForUser(user, payload);
    const employeeIds = (Array.isArray(payload.employees) ? payload.employees : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId))).flatMap((item: JsonRecord) => [normalizeEmployeeId(item.id), normalizeEmployeeId(item.code)]).filter(Boolean);
    result = await pool.query('SELECT * FROM workforce_requests WHERE UPPER(employee_id)=ANY($1::text[]) ORDER BY created_at DESC', [employeeIds]);
  } else result = await pool.query('SELECT * FROM workforce_requests ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/workforce/requests', authenticate, requireRoles('Employee'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const { requestType, startAt, endAt, reason } = req.body;
  const amount = Number(req.body.amount || 0);
  const validRequestTypes = ['leave', 'overtime', 'business_trip', 'shift_swap', 'salary_advance'];
  const start = new Date(startAt); const end = new Date(endAt);
  const invalidAmount = requestType === 'salary_advance' && (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000);
  if (!validRequestTypes.includes(requestType) || invalidAmount || !Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start || String(reason || '').trim().length < 3 || String(reason).length > 1000) return res.status(400).json({ error: 'Nội dung yêu cầu không hợp lệ.' });
  const id = randomUUID();
  const result = await pool.query('INSERT INTO workforce_requests(id,employee_id,request_type,start_at,end_at,reason,amount) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *', [id, normalizeEmployeeId(user.employeeId), requestType, startAt, endAt, String(reason).trim(), requestType === 'salary_advance' ? amount : 0]);
  const payload = await loadErpPayload();
  const requester = (Array.isArray(payload.employees) ? payload.employees : []).find((item: JsonRecord) => employeeMatchesId(item, user.employeeId));
  const managerIds = (Array.isArray(payload.employees) ? payload.employees : [])
    .filter((item: EmployeeAccountSource) => isSiteManagerEmployee(item) && item.projectId === requester?.projectId)
    .flatMap((item: EmployeeAccountSource) => [normalizeEmployeeId(item.id), normalizeEmployeeId(item.code)]).filter(Boolean);
  const reviewers = await pool.query("SELECT id FROM app_users WHERE active=TRUE AND (role='CEO' OR (role='SiteManager' AND UPPER(employee_id)=ANY($1::text[])))", [managerIds]);
  for (const reviewer of reviewers.rows) await pool.query("INSERT INTO notifications(id,user_id,title,message,category) VALUES($1,$2,$3,$4,'approval')", [randomUUID(), reviewer.id, 'Yêu cầu mới cần duyệt', `${user.fullName} vừa gửi một yêu cầu ${requestType}.`]);
  await publishRealtimeEvent('workforce_requests', 'request_created');
  await publishRealtimeEvent('notifications', 'notification_created');
  res.status(201).json(result.rows[0]);
});

app.patch('/api/workforce/requests/:id/review', authenticate, requireRoles('CEO','SiteManager'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const status = req.body.status === 'approved' ? 'approved' : 'rejected';
  let employeeIds: string[] | null = null;
  if (user.role === 'SiteManager') {
    const payload = await loadErpPayload();
    const projectIds = projectScopeForUser(user, payload);
    employeeIds = (Array.isArray(payload.employees) ? payload.employees : []).filter((item: JsonRecord) => projectIds.has(String(item.projectId))).flatMap((item: JsonRecord) => [normalizeEmployeeId(item.id), normalizeEmployeeId(item.code)]).filter(Boolean);
  }
  const result = employeeIds
    ? await pool.query('UPDATE workforce_requests SET status=$1,reviewed_by=$2,review_note=$3,reviewed_at=NOW() WHERE id=$4 AND status=\'pending\' AND UPPER(employee_id)=ANY($5::text[]) RETURNING *', [status, user.id, req.body.note || '', req.params.id, employeeIds])
    : await pool.query('UPDATE workforce_requests SET status=$1,reviewed_by=$2,review_note=$3,reviewed_at=NOW() WHERE id=$4 AND status=\'pending\' RETURNING *', [status, user.id, req.body.note || '', req.params.id]);
  const row = result.rows[0];
  if (row) await pool.query("INSERT INTO notifications(id,employee_id,title,message,category) VALUES($1,$2,$3,$4,'request')", [randomUUID(), row.employee_id, 'Yêu cầu đã được xử lý', `Yêu cầu của bạn đã ${status === 'approved' ? 'được duyệt' : 'bị từ chối'}.`]);
  if (!row) return res.status(404).json({ error: 'Yêu cầu không tồn tại, đã được xử lý hoặc nằm ngoài công trường được phân quyền.' });
  await publishRealtimeEvent('workforce_requests', 'request_reviewed');
  await publishRealtimeEvent('notifications', 'notification_created');
  res.json(row);
});

app.get('/api/workforce/shifts', authenticate, async (_req, res) => {
  const user = res.locals.user as SessionUser;
  let result;
  if (user.role === 'Employee') result = await pool.query('SELECT * FROM work_shifts WHERE UPPER(employee_id)=$1 ORDER BY shift_date', [normalizeEmployeeId(user.employeeId)]);
  else if (user.role === 'SiteManager') {
    const projectIds = [...projectScopeForUser(user, await loadErpPayload())];
    result = await pool.query('SELECT * FROM work_shifts WHERE project_id=ANY($1::text[]) ORDER BY shift_date', [projectIds]);
  } else result = await pool.query('SELECT * FROM work_shifts ORDER BY shift_date');
  res.json(result.rows);
});

app.post('/api/workforce/shifts', authenticate, requireRoles('CEO','SiteManager'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const { employeeId, projectId, shiftDate, startTime, endTime, shiftName } = req.body;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate || '')) || !/^\d{2}:\d{2}$/.test(String(startTime || '')) || !/^\d{2}:\d{2}$/.test(String(endTime || '')) || !String(shiftName || '').trim() || String(shiftName).length > 100) return res.status(400).json({ error: 'Thông tin ca làm việc không hợp lệ.' });
  if (user.role === 'SiteManager') {
    const payload = await loadErpPayload();
    const projectIds = projectScopeForUser(user, payload);
    const employee = (Array.isArray(payload.employees) ? payload.employees : []).find((item: JsonRecord) => employeeMatchesId(item, employeeId));
    if (!projectIds.has(String(projectId)) || !employee || !projectIds.has(String(employee.projectId))) return res.status(403).json({ error: 'Bạn chỉ được phân ca cho nhân viên thuộc công trường mình quản lý.' });
  }
  const result = await pool.query('INSERT INTO work_shifts(id,employee_id,project_id,shift_date,start_time,end_time,shift_name,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(employee_id,shift_date) DO UPDATE SET project_id=EXCLUDED.project_id,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,shift_name=EXCLUDED.shift_name RETURNING *', [randomUUID(), employeeId, projectId, shiftDate, startTime, endTime, shiftName, user.id]);
  await publishRealtimeEvent('shifts', 'shift_saved');
  res.json(result.rows[0]);
});

app.get('/api/workforce/payroll-periods', authenticate, async (_req, res) => res.json((await pool.query('SELECT * FROM payroll_periods ORDER BY period DESC')).rows));
app.put('/api/workforce/payroll-periods/:period', authenticate, requireRoles('CEO','ChiefAccountant'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const period = String(req.params.period);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return res.status(400).json({ error: 'Kỳ lương không hợp lệ.' });
  const attendanceLocked = Boolean(req.body.attendanceLocked);
  const payrollLocked = Boolean(req.body.payrollLocked);
  if (payrollLocked && !attendanceLocked) return res.status(400).json({ error: 'Phải khóa bảng công trước khi khóa bảng lương.' });
  const result = await pool.query('INSERT INTO payroll_periods(period,attendance_locked,payroll_locked,locked_by,locked_at) VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(period) DO UPDATE SET attendance_locked=EXCLUDED.attendance_locked,payroll_locked=EXCLUDED.payroll_locked,locked_by=EXCLUDED.locked_by,locked_at=NOW() RETURNING *', [period, attendanceLocked, payrollLocked, user.id]);
  await pool.query('INSERT INTO audit_log(user_id,action,metadata) VALUES($1,$2,$3)', [user.id, 'payroll_period_lock_changed', { period, attendanceLocked, payrollLocked }]);
  await publishRealtimeEvent('payroll_periods', 'period_updated');
  res.json(result.rows[0]);
});

app.get('/api/notifications', authenticate, async (_req, res) => {
  const user = res.locals.user as SessionUser;
  const allowGlobal = ['CEO', 'ChiefAccountant'].includes(user.role);
  const result = await pool.query('SELECT * FROM notifications WHERE (user_id=$1 OR employee_id=$2 OR ($3::boolean AND user_id IS NULL AND employee_id IS NULL)) ORDER BY created_at DESC LIMIT 50', [user.id, user.employeeId || null, allowGlobal]);
  res.json(result.rows);
});
app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
  const user = res.locals.user as SessionUser;
  const allowGlobal = ['CEO', 'ChiefAccountant'].includes(user.role);
  const result = await pool.query(
    'UPDATE notifications SET read_at=NOW() WHERE id=$1 AND (user_id=$2 OR employee_id=$3 OR ($4::boolean AND user_id IS NULL AND employee_id IS NULL)) RETURNING id',
    [req.params.id, user.id, user.employeeId || null, allowGlobal],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Thông báo không tồn tại.' });
  await publishRealtimeEvent('notifications', 'notification_read');
  res.json({ success: true });
});
app.post('/api/payslips/:period/viewed', authenticate, requireRoles('Employee'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  await pool.query('INSERT INTO payslip_views(period,employee_id) VALUES($1,$2) ON CONFLICT(period,employee_id) DO UPDATE SET viewed_at=NOW()', [req.params.period, user.employeeId]);
  res.json({ success: true });
});
app.put('/api/privacy/attendance-photo', authenticate, requireRoles('Employee'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  await pool.query('INSERT INTO privacy_consents(employee_id,attendance_photo_consent,consented_at,revoked_at) VALUES($1,$2,CASE WHEN $2 THEN NOW() END,CASE WHEN $2 THEN NULL ELSE NOW() END) ON CONFLICT(employee_id) DO UPDATE SET attendance_photo_consent=EXCLUDED.attendance_photo_consent,consented_at=EXCLUDED.consented_at,revoked_at=EXCLUDED.revoked_at', [user.employeeId, Boolean(req.body.consent)]);
  res.json({ success: true });
});

app.get('/api/state', authenticate, async (_req, res) => {
  const result = await pool.query('SELECT revision, payload, updated_at FROM erp_state WHERE id=1');
  const row = result.rows[0];
  const user = res.locals.user as SessionUser;
  if (user.role === 'Employee') {
    const payload = row.payload || {};
    const ownEmployee = Array.isArray(payload.employees) ? payload.employees.find((item: EmployeeAccountSource) => employeeMatchesId(item, user.employeeId)) : undefined;
    row.payload = {
      companyConfig: payload.companyConfig,
      employees: ownEmployee ? [ownEmployee] : [],
      projects: Array.isArray(payload.projects) ? payload.projects.filter((project: { id?: string }) => ownEmployee?.projectId === project.id) : [],
      timesheets: Array.isArray(payload.timesheets) ? payload.timesheets.filter((item: { employeeId?: string }) => normalizeEmployeeId(item.employeeId) === normalizeEmployeeId(user.employeeId)) : [],
      laborContracts: Array.isArray(payload.laborContracts) ? payload.laborContracts.filter((item: { employeeId?: string }) => normalizeEmployeeId(item.employeeId) === normalizeEmployeeId(user.employeeId)) : [],
    };
  } else if (user.role === 'SiteManager' || user.role === 'SiteAccountant') {
    row.payload = filterPayloadForSiteManager(row.payload || {}, projectScopeForUser(user, row.payload || {}));
  }
  res.json(row);
});

app.get('/api/state/meta', authenticate, async (_req, res) => {
  const result = await pool.query('SELECT revision, updated_at FROM erp_state WHERE id=1');
  res.json(result.rows[0]);
});

app.put('/api/state', authenticate, async (req, res) => {
  const user = res.locals.user as SessionUser;
  if (user.role === 'Auditor') return res.status(403).json({ error: 'Tài khoản chỉ có quyền xem.' });
  const revision = Number(req.body.revision);
  const payload = req.body.payload;
  if (!Number.isSafeInteger(revision) || !payload || typeof payload !== 'object') return res.status(400).json({ error: 'Dữ liệu đồng bộ không hợp lệ.' });
  const currentState = await pool.query('SELECT payload FROM erp_state WHERE id=1');
  const currentPayload = (currentState.rows[0]?.payload || {}) as JsonRecord;
  let permittedPayload = payload;
  if (user.role === 'ChiefAccountant') permittedPayload = mergeChiefAccountantPayload(currentPayload, payload);
  if (user.role === 'SiteAccountant') {
    const projectIds = projectScopeForUser(user, currentPayload);
    if (!projectIds.size) return res.status(403).json({ error: 'Tài khoản Kế toán công trường chưa được phân công dự án.' });
    permittedPayload = mergeSiteAccountantPayload(currentPayload, payload, projectIds, user);
  }
  if (user.role === 'SiteManager') {
    const projectIds = projectScopeForUser(user, currentPayload);
    if (!projectIds.size) return res.status(403).json({ error: 'Tài khoản Chỉ huy trưởng chưa được gắn với công trường.' });
    permittedPayload = mergeSiteManagerPayload(currentPayload, payload, projectIds);
  }
  if (user.role === 'Employee') {
    const existingTimesheets = Array.isArray(currentPayload.timesheets) ? currentPayload.timesheets : [];
    const today = new Date().toISOString().slice(0, 10);
    const employees = Array.isArray(currentPayload.employees) ? currentPayload.employees : [];
    const projects = Array.isArray(currentPayload.projects) ? currentPayload.projects : [];
    const employee = employees.find((item: JsonRecord) => employeeMatchesId(item, user.employeeId));
    const project = projects.find((item: JsonRecord) => item.id === employee?.projectId);
    if (!employee || !project) return res.status(403).json({ error: 'Hồ sơ nhân viên chưa được phân công công trường.' });
    const projectLatitude = Number(project.latitude);
    const projectLongitude = Number(project.longitude);
    const geofenceRadius = Number(project.geofenceRadius || 200);
    if (!Number.isFinite(projectLatitude) || projectLatitude < -90 || projectLatitude > 90 || !Number.isFinite(projectLongitude) || projectLongitude < -180 || projectLongitude > 180 || !Number.isFinite(geofenceRadius) || geofenceRadius < 25 || geofenceRadius > 5000) {
      return res.status(409).json({ error: 'Công trường chưa được cấu hình geofence hợp lệ.' });
    }
    let ownTimesheets = Array.isArray(payload.timesheets)
      ? payload.timesheets.filter((item: { employeeId?: string; date?: string }) => normalizeEmployeeId(item.employeeId) === normalizeEmployeeId(user.employeeId) && item.date === today)
      : [];
    const hasPhoto = ownTimesheets.some((item: JsonRecord) => Boolean(item.attendancePhoto));
    if (ownTimesheets.some((item: JsonRecord) => typeof item.attendancePhoto === 'string' && item.attendancePhoto.length > 2_200_000)) return res.status(413).json({ error: 'Ảnh chấm công vượt quá dung lượng cho phép.' });
    if (hasPhoto) {
      const consent = await pool.query('SELECT attendance_photo_consent FROM privacy_consents WHERE employee_id=$1', [user.employeeId]);
      if (!consent.rows[0]?.attendance_photo_consent) return res.status(403).json({ error: 'Bạn chưa đồng ý sử dụng ảnh chấm công.' });
    }
    const invalidCoordinates = ownTimesheets.some((item: JsonRecord) => {
      const latitude = Number(item.latitude); const longitude = Number(item.longitude);
      return !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180;
    });
    if (invalidCoordinates) return res.status(400).json({ error: 'Tọa độ chấm công không hợp lệ.' });
    let outsideGeofence = false;
    ownTimesheets = ownTimesheets.map((item: JsonRecord) => {
      const latitude = Number(item.latitude);
      const longitude = Number(item.longitude);
      const toRad = (value: number) => value * Math.PI / 180;
      const dLat = toRad(latitude - projectLatitude);
      const dLon = toRad(longitude - projectLongitude);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(projectLatitude)) * Math.cos(toRad(latitude)) * Math.sin(dLon / 2) ** 2;
      const distance = 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const inRange = distance <= geofenceRadius;
      if (!inRange) outsideGeofence = true;
      return { ...item, employeeId: user.employeeId, projectId: project.id, gpsStatus: inRange ? 'In-Range' : 'Out-Of-Range', geofenceDistanceMeters: Math.round(distance), geofenceVerifiedAt: new Date().toISOString(), verifiedByFace: Boolean(item.attendancePhoto) };
    });
    if (outsideGeofence) return res.status(403).json({ error: 'Vị trí hiện tại nằm ngoài geofence của công trường.' });
    permittedPayload = {
      timesheets: [
        ...existingTimesheets.filter((item: { employeeId?: string }) => normalizeEmployeeId(item.employeeId) !== normalizeEmployeeId(user.employeeId)),
        ...existingTimesheets.filter((item: { employeeId?: string; date?: string }) => normalizeEmployeeId(item.employeeId) === normalizeEmployeeId(user.employeeId) && item.date !== today),
        ...ownTimesheets,
      ],
    };
  }
  permittedPayload = normalizeCascades({ ...currentPayload, ...permittedPayload });
  const nextTimesheets = Array.isArray(permittedPayload.timesheets) ? permittedPayload.timesheets : currentPayload.timesheets;
  const nextTransactions = Array.isArray(permittedPayload.transactions) ? permittedPayload.transactions : currentPayload.transactions;
  const changedAttendancePeriods = changedPeriods(currentPayload.timesheets, nextTimesheets);
  const changedPayrollPeriods = changedPeriods(currentPayload.transactions, nextTransactions, item => item.category === 'Labor');
  if (changedAttendancePeriods.length) {
    const lock = await pool.query('SELECT period,attendance_locked,payroll_locked FROM payroll_periods WHERE period=ANY($1::text[]) AND (attendance_locked=TRUE OR payroll_locked=TRUE) LIMIT 1', [changedAttendancePeriods]);
    if (lock.rowCount) return res.status(423).json({ error: `Kỳ công/lương tháng ${lock.rows[0].period} đã khóa.` });
  }
  if (changedPayrollPeriods.length) {
    const lock = await pool.query('SELECT period FROM payroll_periods WHERE period=ANY($1::text[]) AND payroll_locked=TRUE LIMIT 1', [changedPayrollPeriods]);
    if (lock.rowCount) return res.status(423).json({ error: `Bảng lương tháng ${lock.rows[0].period} đã khóa.` });
  }
  const result = await pool.query(
    `UPDATE erp_state SET payload=payload || $1::jsonb, revision=revision+1, updated_by=$2, updated_at=NOW()
     WHERE id=1 AND revision=$3 RETURNING revision, updated_at`,
    [permittedPayload, user.id, revision],
  );
  if (!result.rowCount) return res.status(409).json({ error: 'Dữ liệu trên máy chủ đã thay đổi. Hãy tải lại trước khi lưu.', code: 'REVISION_CONFLICT' });
  await pool.query('INSERT INTO erp_state_backups(revision,payload,created_by) VALUES($1,$2,$3)', [revision, currentPayload, user.id]);
  await pool.query('DELETE FROM erp_state_backups WHERE id NOT IN (SELECT id FROM erp_state_backups ORDER BY id DESC LIMIT 50)');
  await pool.query('INSERT INTO audit_log(user_id,action,metadata) VALUES($1,$2,$3)', [user.id, 'state_updated', { revision: result.rows[0].revision }]);
  if (Array.isArray(permittedPayload.employees) && ['CEO', 'SiteManager'].includes(user.role)) {
    await provisionEmployeeAccounts(permittedPayload.employees);
    await publishRealtimeEvent('accounts', 'accounts_provisioned');
  }
  const projectIds = (permittedPayload.projects as JsonRecord[]).map(item => String(item.id));
  const employeeIds = (permittedPayload.employees as JsonRecord[]).flatMap(item => [normalizeEmployeeId(item.id), normalizeEmployeeId(item.code)]).filter(Boolean);
  await pool.query('UPDATE app_users SET active=FALSE,session_version=session_version+1 WHERE employee_id IS NOT NULL AND UPPER(employee_id)<>ALL($1::text[]) AND active=TRUE', [employeeIds]);
  await pool.query('DELETE FROM work_shifts WHERE project_id<>ALL($1::text[]) OR UPPER(employee_id)<>ALL($2::text[])', [projectIds, employeeIds]);
  await pool.query('DELETE FROM workforce_requests WHERE UPPER(employee_id)<>ALL($1::text[])', [employeeIds]);
  await pool.query('DELETE FROM notifications WHERE employee_id IS NOT NULL AND UPPER(employee_id)<>ALL($1::text[])', [employeeIds]);
  await pool.query('DELETE FROM payslip_views WHERE UPPER(employee_id)<>ALL($1::text[])', [employeeIds]);
  await pool.query('DELETE FROM privacy_consents WHERE UPPER(employee_id)<>ALL($1::text[])', [employeeIds]);
  res.json(result.rows[0]);
});

const dist = path.resolve('dist');
app.use(express.static(dist, { maxAge: '1d', etag: true }));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

await migrate();

const seeds: Array<[string, string, Role, string, string?]> = [
  ['ceo', 'Giám đốc', 'CEO', process.env.SEED_CEO_PIN || '1111'],
  ['ketoan', 'Kế toán trưởng', 'ChiefAccountant', process.env.SEED_ACCOUNTANT_PIN || '2222'],
  ['kiemtoan', 'Kiểm toán viên', 'Auditor', process.env.SEED_AUDITOR_PIN || '4444'],
];
const existingSeedUsers = await pool.query('SELECT username FROM app_users WHERE username=ANY($1::text[])', [seeds.map(([username]) => username)]);
const existingSeedUsernames = new Set(existingSeedUsers.rows.map(row => String(row.username)));
for (const [username, fullName, role, pin, employeeId] of seeds) {
  if (process.env.NODE_ENV === 'production' && (!pin || pin === 'CHANGE_ME' || pin.length < 6)) {
    throw new Error(`Mật khẩu production cho tài khoản ${username} phải có ít nhất 6 chữ số và không được để mặc định.`);
  }
  if (!existingSeedUsernames.has(username)) {
    const hash = await bcrypt.hash(pin, 12);
    await pool.query(
      'INSERT INTO app_users(username,full_name,role,pin_hash,employee_id,must_change_pin) VALUES($1,$2,$3,$4,$5,TRUE) ON CONFLICT(username) DO NOTHING',
      [username, fullName, role, hash, employeeId || null],
    );
  }
}

// Container/VPS performs a complete account reconciliation when starting. On
// Vercel, doing dozens of sequential queries during every cold start causes
// function timeouts; account provisioning still runs whenever ERP state changes.
if (!process.env.VERCEL) {
  const stateForAccounts = await pool.query('SELECT payload FROM erp_state WHERE id=1');
  const employeesForAccounts = Array.isArray(stateForAccounts.rows[0]?.payload?.employees) ? stateForAccounts.rows[0].payload.employees : [];
  await provisionEmployeeAccounts(employeesForAccounts);
}
await pool.query("UPDATE app_users SET active=FALSE,session_version=session_version+1 WHERE username='chihuy' AND employee_id IS NULL AND active=TRUE");

if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', () => console.log(`Quản trị doanh nghiệp listening on :${port}`));
}

export default app;
