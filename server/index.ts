import 'dotenv/config';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { migrate, pool } from './db.js';

const app = express();
const port = Number(process.env.PORT || 8080);
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET phải có ít nhất 32 ký tự.');
if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL.');

type Role = 'CEO' | 'Accountant' | 'SiteManager' | 'Auditor' | 'Employee';
type SessionUser = { id: number; username: string; fullName: string; role: Role; employeeId?: string };

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '15mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: true, legacyHeaders: false });

function sign(user: SessionUser) {
  return jwt.sign(user, jwtSecret!, { expiresIn: '12h', issuer: 'construct-os' });
}

function authenticate(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Chưa đăng nhập.' });
  try {
    res.locals.user = jwt.verify(token, jwtSecret!, { issuer: 'construct-os' }) as SessionUser;
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

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const username = String(req.body.username || '').trim().toLowerCase();
  const pin = String(req.body.pin || '');
  if (!username || !/^\d{4,12}$/.test(pin)) return res.status(400).json({ error: 'Thông tin đăng nhập không hợp lệ.' });
  const result = await pool.query('SELECT id, username, full_name, role, employee_id, pin_hash FROM app_users WHERE username=$1 AND active=TRUE', [username]);
  const row = result.rows[0];
  if (!row || !(await bcrypt.compare(pin, row.pin_hash))) return res.status(401).json({ error: 'Tên đăng nhập hoặc PIN không đúng.' });
  const user: SessionUser = { id: row.id, username: row.username, fullName: row.full_name, role: row.role, employeeId: row.employee_id || undefined };
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
    (item.id === employeeCode || item.code === employeeCode) && String(item.phone || '').replace(/\D/g, '') === phone && item.active !== false,
  );
  if (!employee) return res.status(404).json({ error: 'Không tìm thấy hồ sơ nhân viên khớp mã và số điện thoại.' });
  const linked = await pool.query('SELECT 1 FROM app_users WHERE employee_id=$1', [employee.id]);
  if (linked.rowCount) return res.status(409).json({ error: 'Hồ sơ nhân viên này đã có tài khoản.' });
  try {
    const result = await pool.query('INSERT INTO app_users(username,full_name,role,pin_hash,employee_id) VALUES($1,$2,\'Employee\',$3,$4) RETURNING id,username,full_name,role,employee_id', [username, employee.name, await bcrypt.hash(pin, 12), employee.id]);
    const row = result.rows[0];
    const user: SessionUser = { id: row.id, username: row.username, fullName: row.full_name, role: row.role, employeeId: row.employee_id };
    res.status(201).json({ token: sign(user), user });
  } catch (error: any) {
    res.status(error?.code === '23505' ? 409 : 500).json({ error: error?.code === '23505' ? 'Tên đăng nhập đã tồn tại.' : 'Không đăng ký được tài khoản.' });
  }
});

app.post('/api/auth/change-pin', authenticate, authLimiter, async (req, res) => {
  const user = res.locals.user as SessionUser;
  const currentPin = String(req.body.currentPin || '');
  const newPin = String(req.body.newPin || '');
  if (!/^\d{6,12}$/.test(newPin) || currentPin === newPin) return res.status(400).json({ error: 'PIN mới phải có 6–12 chữ số và khác PIN hiện tại.' });
  const result = await pool.query('SELECT pin_hash FROM app_users WHERE id=$1 AND active=TRUE', [user.id]);
  if (!result.rows[0] || !(await bcrypt.compare(currentPin, result.rows[0].pin_hash))) return res.status(401).json({ error: 'PIN hiện tại không đúng.' });
  await pool.query('UPDATE app_users SET pin_hash=$1 WHERE id=$2', [await bcrypt.hash(newPin, 12), user.id]);
  await pool.query('INSERT INTO audit_log(user_id,action) VALUES($1,$2)', [user.id, 'pin_changed']);
  res.json({ success: true });
});

app.get('/api/admin/users', authenticate, requireRoles('CEO'), async (_req, res) => {
  const result = await pool.query('SELECT id,username,full_name,role,employee_id,active,created_at FROM app_users ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/admin/users', authenticate, requireRoles('CEO'), async (req, res) => {
  const { username, fullName, employeeId, role = 'Employee', pin } = req.body;
  if (!/^[a-z0-9._-]{3,32}$/.test(String(username || '')) || !/^\d{6,12}$/.test(String(pin || ''))) return res.status(400).json({ error: 'Tên đăng nhập hoặc PIN không hợp lệ.' });
  const hash = await bcrypt.hash(String(pin), 12);
  try {
    const result = await pool.query('INSERT INTO app_users(username,full_name,role,pin_hash,employee_id) VALUES($1,$2,$3,$4,$5) RETURNING id,username,full_name,role,employee_id,active', [username, fullName, role, hash, employeeId || null]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(error?.code === '23505' ? 409 : 500).json({ error: error?.code === '23505' ? 'Tên đăng nhập đã tồn tại.' : 'Không tạo được tài khoản.' });
  }
});

app.patch('/api/admin/users/:id/status', authenticate, requireRoles('CEO'), async (req, res) => {
  const result = await pool.query('UPDATE app_users SET active=$1 WHERE id=$2 RETURNING id,active', [Boolean(req.body.active), req.params.id]);
  res.json(result.rows[0]);
});

app.post('/api/admin/users/:id/reset-pin', authenticate, requireRoles('CEO'), async (req, res) => {
  const pin = String(req.body.pin || '');
  if (!/^\d{6,12}$/.test(pin)) return res.status(400).json({ error: 'PIN phải có 6–12 chữ số.' });
  await pool.query('UPDATE app_users SET pin_hash=$1 WHERE id=$2', [await bcrypt.hash(pin, 12), req.params.id]);
  res.json({ success: true });
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
  res.json({ success: true });
});

app.get('/api/workforce/requests', authenticate, async (_req, res) => {
  const user = res.locals.user as SessionUser;
  const result = user.role === 'Employee'
    ? await pool.query('SELECT * FROM workforce_requests WHERE employee_id=$1 ORDER BY created_at DESC', [user.employeeId])
    : await pool.query('SELECT * FROM workforce_requests ORDER BY created_at DESC');
  res.json(result.rows);
});

app.post('/api/workforce/requests', authenticate, requireRoles('Employee'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const { requestType, startAt, endAt, reason } = req.body;
  const id = randomUUID();
  const result = await pool.query('INSERT INTO workforce_requests(id,employee_id,request_type,start_at,end_at,reason) VALUES($1,$2,$3,$4,$5,$6) RETURNING *', [id, user.employeeId, requestType, startAt, endAt, reason]);
  await pool.query("INSERT INTO notifications(id,title,message,category) VALUES($1,$2,$3,'approval')", [randomUUID(), 'Yêu cầu mới cần duyệt', `${user.fullName} vừa gửi một yêu cầu ${requestType}.`]);
  res.status(201).json(result.rows[0]);
});

app.patch('/api/workforce/requests/:id/review', authenticate, requireRoles('CEO','SiteManager'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const status = req.body.status === 'approved' ? 'approved' : 'rejected';
  const result = await pool.query('UPDATE workforce_requests SET status=$1,reviewed_by=$2,review_note=$3,reviewed_at=NOW() WHERE id=$4 AND status=\'pending\' RETURNING *', [status, user.id, req.body.note || '', req.params.id]);
  const row = result.rows[0];
  if (row) await pool.query("INSERT INTO notifications(id,employee_id,title,message,category) VALUES($1,$2,$3,$4,'request')", [randomUUID(), row.employee_id, 'Yêu cầu đã được xử lý', `Yêu cầu của bạn đã ${status === 'approved' ? 'được duyệt' : 'bị từ chối'}.`]);
  res.json(row);
});

app.get('/api/workforce/shifts', authenticate, async (_req, res) => {
  const user = res.locals.user as SessionUser;
  const result = user.role === 'Employee' ? await pool.query('SELECT * FROM work_shifts WHERE employee_id=$1 ORDER BY shift_date', [user.employeeId]) : await pool.query('SELECT * FROM work_shifts ORDER BY shift_date');
  res.json(result.rows);
});

app.post('/api/workforce/shifts', authenticate, requireRoles('CEO','SiteManager'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const { employeeId, projectId, shiftDate, startTime, endTime, shiftName } = req.body;
  const result = await pool.query('INSERT INTO work_shifts(id,employee_id,project_id,shift_date,start_time,end_time,shift_name,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(employee_id,shift_date) DO UPDATE SET project_id=EXCLUDED.project_id,start_time=EXCLUDED.start_time,end_time=EXCLUDED.end_time,shift_name=EXCLUDED.shift_name RETURNING *', [randomUUID(), employeeId, projectId, shiftDate, startTime, endTime, shiftName, user.id]);
  res.json(result.rows[0]);
});

app.get('/api/workforce/payroll-periods', authenticate, async (_req, res) => res.json((await pool.query('SELECT * FROM payroll_periods ORDER BY period DESC')).rows));
app.put('/api/workforce/payroll-periods/:period', authenticate, requireRoles('CEO','Accountant'), async (req, res) => {
  const user = res.locals.user as SessionUser;
  const result = await pool.query('INSERT INTO payroll_periods(period,attendance_locked,payroll_locked,locked_by,locked_at) VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(period) DO UPDATE SET attendance_locked=EXCLUDED.attendance_locked,payroll_locked=EXCLUDED.payroll_locked,locked_by=EXCLUDED.locked_by,locked_at=NOW() RETURNING *', [req.params.period, Boolean(req.body.attendanceLocked), Boolean(req.body.payrollLocked), user.id]);
  res.json(result.rows[0]);
});

app.get('/api/notifications', authenticate, async (_req, res) => {
  const user = res.locals.user as SessionUser;
  const result = await pool.query('SELECT * FROM notifications WHERE (user_id=$1 OR employee_id=$2 OR (user_id IS NULL AND employee_id IS NULL)) ORDER BY created_at DESC LIMIT 50', [user.id, user.employeeId || null]);
  res.json(result.rows);
});
app.patch('/api/notifications/:id/read', authenticate, async (req, res) => { await pool.query('UPDATE notifications SET read_at=NOW() WHERE id=$1', [req.params.id]); res.json({ success: true }); });
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
    row.payload = {
      companyConfig: payload.companyConfig,
      employees: Array.isArray(payload.employees) ? payload.employees.filter((item: { id?: string }) => item.id === user.employeeId) : [],
      projects: Array.isArray(payload.projects) ? payload.projects.filter((project: { id?: string }) => payload.employees?.some((employee: { id?: string; projectId?: string }) => employee.id === user.employeeId && employee.projectId === project.id)) : [],
      timesheets: Array.isArray(payload.timesheets) ? payload.timesheets.filter((item: { employeeId?: string }) => item.employeeId === user.employeeId) : [],
      laborContracts: Array.isArray(payload.laborContracts) ? payload.laborContracts.filter((item: { employeeId?: string }) => item.employeeId === user.employeeId) : [],
    };
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
  const siteManagerKeys = new Set([
    'projects', 'inventoryItems', 'materialLimits', 'inventoryLedger', 'timesheets',
    'equipment', 'approvals', 'constructionTasks',
  ]);
  let permittedPayload = user.role === 'SiteManager'
    ? Object.fromEntries(Object.entries(payload).filter(([key]) => siteManagerKeys.has(key)))
    : payload;
  if (user.role === 'Employee') {
    const current = await pool.query('SELECT payload FROM erp_state WHERE id=1');
    const existingTimesheets = Array.isArray(current.rows[0]?.payload?.timesheets) ? current.rows[0].payload.timesheets : [];
    const today = new Date().toISOString().slice(0, 10);
    const ownTimesheets = Array.isArray(payload.timesheets)
      ? payload.timesheets.filter((item: { employeeId?: string; date?: string }) => item.employeeId === user.employeeId && item.date === today)
      : [];
    permittedPayload = {
      timesheets: [
        ...existingTimesheets.filter((item: { employeeId?: string }) => item.employeeId !== user.employeeId),
        ...existingTimesheets.filter((item: { employeeId?: string; date?: string }) => item.employeeId === user.employeeId && item.date !== today),
        ...ownTimesheets,
      ],
    };
  }
  if (Array.isArray(permittedPayload.timesheets) && !['CEO', 'Accountant'].includes(user.role)) {
    const period = new Date().toISOString().slice(0, 7);
    const lock = await pool.query('SELECT attendance_locked FROM payroll_periods WHERE period=$1', [period]);
    if (lock.rows[0]?.attendance_locked) return res.status(423).json({ error: `Bảng công tháng ${period} đã khóa.` });
  }
  const result = await pool.query(
    `UPDATE erp_state SET payload=payload || $1::jsonb, revision=revision+1, updated_by=$2, updated_at=NOW()
     WHERE id=1 AND revision=$3 RETURNING revision, updated_at`,
    [permittedPayload, user.id, revision],
  );
  if (!result.rowCount) return res.status(409).json({ error: 'Dữ liệu trên máy chủ đã thay đổi. Hãy tải lại trước khi lưu.', code: 'REVISION_CONFLICT' });
  await pool.query('INSERT INTO audit_log(user_id,action,metadata) VALUES($1,$2,$3)', [user.id, 'state_updated', { revision: result.rows[0].revision }]);
  res.json(result.rows[0]);
});

const dist = path.resolve('dist');
app.use(express.static(dist, { maxAge: '1d', etag: true }));
app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));

await migrate();

const seeds: Array<[string, string, Role, string, string?]> = [
  ['ceo', 'Giám đốc', 'CEO', process.env.SEED_CEO_PIN || '1111'],
  ['ketoan', 'Kế toán trưởng', 'Accountant', process.env.SEED_ACCOUNTANT_PIN || '2222'],
  ['chihuy', 'Chỉ huy trưởng', 'SiteManager', process.env.SEED_SITE_MANAGER_PIN || '3333'],
  ['kiemtoan', 'Kiểm toán viên', 'Auditor', process.env.SEED_AUDITOR_PIN || '4444'],
  ['nhanvien', 'Nguyễn Văn Mạnh', 'Employee', process.env.SEED_EMPLOYEE_PIN || '5555', 'emp-1'],
];
for (const [username, fullName, role, pin, employeeId] of seeds) {
  if (process.env.NODE_ENV === 'production' && (!pin || pin === 'CHANGE_ME' || pin.length < 6)) {
    throw new Error(`PIN production cho tài khoản ${username} phải có ít nhất 6 chữ số và không được để mặc định.`);
  }
  const hash = await bcrypt.hash(pin, 12);
  await pool.query(
    'INSERT INTO app_users(username,full_name,role,pin_hash,employee_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT(username) DO UPDATE SET employee_id=EXCLUDED.employee_id',
    [username, fullName, role, hash, employeeId || null],
  );
}

app.listen(port, '0.0.0.0', () => console.log(`CONSTRUCT-OS listening on :${port}`));
