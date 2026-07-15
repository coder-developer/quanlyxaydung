import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:18080';
if (process.env.ALLOW_TEST_MUTATIONS !== 'true') throw new Error('Chỉ chạy trên database test với ALLOW_TEST_MUTATIONS=true.');

async function request(path, { token, expected = 200, ...init } = {}) {
  const response = await fetch(`${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  const body = await response.json();
  assert.equal(response.status, expected, `${init.method || 'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function login(username, pin) {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, pin }) });
}

async function activate(username, initialPin, newPin) {
  const first = await login(username, initialPin);
  if (first.user.mustChangePassword) {
    await request('/api/auth/change-pin', { token: first.token, method: 'POST', body: JSON.stringify({ currentPin: initialPin, newPin }) });
    return login(username, newPin);
  }
  return first;
}

await request('/api/health');
await request('/api/state', { expected: 401 });

const ceo = await activate('ceo', process.env.TEST_CEO_PIN || '111111', '711111');
const accountant = await activate('ketoan', process.env.TEST_ACCOUNTANT_PIN || '222222', '722222');
const auditor = await activate('kiemtoan', process.env.TEST_AUDITOR_PIN || '444444', '744444');

const initial = await request('/api/state', { token: ceo.token });
const today = new Date().toISOString().slice(0, 10);
const period = today.slice(0, 7);
const payload = {
  ...initial.payload,
  projects: [{ id: 'DA-TEST', code: 'DA-TEST', name: 'Dự án kiểm thử', location: 'TP HCM', manager: 'Chỉ huy Test', budget: 1000000000, spent: 0, status: 'Active', latitude: 10.77, longitude: 106.69, geofenceRadius: 500 }],
  employees: [
    { id: 'CHT-TEST', code: 'CHT-TEST', name: 'Chỉ huy Test', role: 'Chỉ huy trưởng', phone: '0900000001', projectId: 'DA-TEST', type: 'Internal', baseSalary: 1, active: true },
    { id: 'KTCT-TEST', code: 'KTCT-TEST', name: 'Kế toán Test', role: 'Kế toán công trường', phone: '0900000002', projectId: 'DA-TEST', type: 'Internal', baseSalary: 1, active: true },
    { id: 'NV-TEST', code: 'NV-TEST', name: 'Nhân viên Test', role: 'Nhân viên công trường', phone: '0900000003', projectId: 'DA-TEST', type: 'Internal', baseSalary: 1, active: true },
  ],
  equipment: [{ id: 'TB-TEST', code: 'TB-TEST', name: 'Máy kiểm thử', currentProjectId: 'DA-TEST', status: 'Available', fuelCostThisMonth: 0, lastMaintenance: today, nextMaintenance: today }],
  timesheets: [], contractors: [], contracts: [], inventoryItems: [], materialLimits: [], inventoryLedger: [], approvals: [], transactions: [], laborContracts: [], constructionTasks: [],
};
const seeded = await request('/api/state', { token: ceo.token, method: 'PUT', body: JSON.stringify({ revision: initial.revision, payload }) });

const manager = await activate('cht-test', process.env.TEST_EMPLOYEE_PIN || '555555', '733331');
const siteAccountant = await activate('ktct-test', process.env.TEST_EMPLOYEE_PIN || '555555', '733332');
const employee = await activate('nv-test', process.env.TEST_EMPLOYEE_PIN || '555555', '733333');

assert.equal(manager.user.role, 'SiteManager');
assert.equal(siteAccountant.user.role, 'SiteAccountant');
assert.equal(employee.user.role, 'Employee');
await request('/api/operations/vouchers', { token: siteAccountant.token, method: 'POST', expected: 403, body: JSON.stringify({ id: 'PT-DENY' }) });
await request('/api/operations/fuel', { token: auditor.token, method: 'POST', expected: 403, body: JSON.stringify({ id: 'NL-DENY' }) });
await request('/api/operations/fuel', { token: employee.token, expected: 403 });

const cursor = await request('/api/realtime/events', { token: ceo.token });
const fuel = await request('/api/operations/fuel', { token: siteAccountant.token, method: 'POST', expected: 201, body: JSON.stringify({ id: 'NL-TEST', equipmentId: 'TB-TEST', projectId: 'DA-TEST', date: today, litersOrKw: 10, cost: 100000, recordedBy: 'Kế toán Test' }) });
assert.equal(fuel.rowVersion, 1);
await request('/api/operations/fuel/NL-TEST', { token: siteAccountant.token, method: 'PUT', body: JSON.stringify({ ...fuel, cost: 110000 }) });
await request('/api/operations/fuel/NL-TEST', { token: siteAccountant.token, method: 'PUT', expected: 409, body: JSON.stringify({ ...fuel, cost: 120000 }) });
const events = await request(`/api/realtime/events?after=${cursor.cursor}`, { token: ceo.token });
assert.ok(events.events.some(event => event.channel === 'operations'));

let state = await request('/api/state', { token: ceo.token });
state.payload.timesheets = [{ id: 'TS-TEST', employeeId: 'NV-TEST', projectId: 'DA-TEST', date: today, checkInTime: '07:00:00', checkOutTime: null, status: 'Present', latitude: 10.77, longitude: 106.69, gpsStatus: 'In-Range', verifiedByFace: false }];
await request('/api/state', { token: ceo.token, method: 'PUT', body: JSON.stringify({ revision: state.revision, payload: state.payload }) });
await request(`/api/workforce/payroll-periods/${period}`, { token: accountant.token, method: 'PUT', body: JSON.stringify({ attendanceLocked: true, payrollLocked: true }) });
state = await request('/api/state', { token: ceo.token });
state.payload.timesheets[0].checkOutTime = '17:00:00';
await request('/api/state', { token: ceo.token, method: 'PUT', expected: 423, body: JSON.stringify({ revision: state.revision, payload: state.payload }) });

state = await request('/api/state', { token: ceo.token });
state.payload.equipment = [];
await request('/api/state', { token: ceo.token, method: 'PUT', body: JSON.stringify({ revision: state.revision, payload: state.payload }) });
const fuelAfterCascade = await request('/api/operations/fuel', { token: ceo.token });
assert.equal(fuelAfterCascade.some(row => row.id === 'NL-TEST'), false);

console.log('API integration: RBAC, conflict, realtime, period lock and equipment cascade passed.');
