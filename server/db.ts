import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PGPOOL_MAX || 5),
  idleTimeoutMillis: 30_000,
  allowExitOnIdle: true,
  ssl: process.env.NODE_ENV === 'production' && process.env.DATABASE_SSL !== 'false'
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL,
      employee_id TEXT,
      pin_hash TEXT NOT NULL,
      must_change_pin BOOLEAN NOT NULL DEFAULT FALSE,
      session_version INTEGER NOT NULL DEFAULT 1,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS erp_state (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      revision BIGINT NOT NULL DEFAULT 0,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_by BIGINT REFERENCES app_users(id),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT REFERENCES app_users(id),
      action TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS workforce_requests (
      id UUID PRIMARY KEY,
      employee_id TEXT NOT NULL,
      request_type TEXT NOT NULL CHECK (request_type IN ('leave','overtime','business_trip','shift_swap','salary_advance')),
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      reason TEXT NOT NULL,
      amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      reviewed_by BIGINT REFERENCES app_users(id),
      review_note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS work_shifts (
      id UUID PRIMARY KEY,
      employee_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      shift_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      shift_name TEXT NOT NULL,
      created_by BIGINT REFERENCES app_users(id),
      UNIQUE(employee_id, shift_date)
    );
    CREATE TABLE IF NOT EXISTS payroll_periods (
      period TEXT PRIMARY KEY,
      attendance_locked BOOLEAN NOT NULL DEFAULT FALSE,
      payroll_locked BOOLEAN NOT NULL DEFAULT FALSE,
      locked_by BIGINT REFERENCES app_users(id),
      locked_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY,
      user_id BIGINT REFERENCES app_users(id),
      employee_id TEXT,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      category TEXT NOT NULL,
      read_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS realtime_events (
      id BIGSERIAL PRIMARY KEY,
      channel TEXT NOT NULL,
      event_type TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS realtime_events_created_at_idx ON realtime_events(created_at);
    CREATE TABLE IF NOT EXISTS payslip_views (
      period TEXT NOT NULL,
      employee_id TEXT NOT NULL,
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(period, employee_id)
    );
    CREATE TABLE IF NOT EXISTS privacy_consents (
      employee_id TEXT PRIMARY KEY,
      attendance_photo_consent BOOLEAN NOT NULL DEFAULT FALSE,
      consented_at TIMESTAMPTZ,
      revoked_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS auth_attempts (
      username TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      window_started TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      locked_until TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS erp_state_backups (
      id BIGSERIAL PRIMARY KEY,
      revision BIGINT NOT NULL,
      payload JSONB NOT NULL,
      created_by BIGINT REFERENCES app_users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO erp_state (id,payload) VALUES (1, jsonb_build_object(
      'companyConfig', jsonb_build_object(
        'companyName','Công Ty Cổ Phần Xây Dựng','siteOffice','Tp Hồ Chí Minh','taxCode','','officeAddress','Tp Hồ Chí Minh','directorName','','chiefAccountantName','','treasurerName','','technicianName','',
        'journalTitle','SỔ NHẬT KÝ CHUNG','dispatchTitle','LỆNH ĐIỀU ĐỘNG THIẾT BỊ','fuelTitle','PHIẾU CẤP PHÁT NHIÊN LIỆU','maintenanceTitle','BIÊN BẢN BẢO TRÌ THIẾT BỊ',
        'appTitle','Quản trị doanh nghiệp','siteManagerApprovalLimit',50000000,'accountantApprovalLimit',200000000,'fuelVarianceThreshold',5,'maxDailyWorkHours',12,'requireDoubleApproval',true
      ),
      'projects','[]'::jsonb,'employees','[]'::jsonb,'contractors','[]'::jsonb,'contracts','[]'::jsonb,'inventoryItems','[]'::jsonb,'materialLimits','[]'::jsonb,
      'inventoryLedger','[]'::jsonb,'timesheets','[]'::jsonb,'equipment','[]'::jsonb,'approvals','[]'::jsonb,'transactions','[]'::jsonb,'laborContracts','[]'::jsonb,'constructionTasks','[]'::jsonb
    )) ON CONFLICT (id) DO NOTHING;
    UPDATE erp_state
    SET payload=jsonb_set(payload,'{companyConfig,appTitle}',to_jsonb('Quản trị doanh nghiệp'::text),true)
    WHERE COALESCE(payload#>>'{companyConfig,appTitle}','') IN ('','Quản Trị Doanh Nghiệp','CONSTRUCT-OS');
    UPDATE erp_state
    SET payload=jsonb_set(payload,'{companyConfig,companyName}',to_jsonb('Công Ty Cổ Phần Xây Dựng'::text),true)
    WHERE COALESCE(payload#>>'{companyConfig,companyName}','') IN ('','CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT');
    UPDATE erp_state
    SET payload=jsonb_set(payload,'{companyConfig,siteOffice}',to_jsonb('Tp Hồ Chí Minh'::text),true)
    WHERE COALESCE(payload#>>'{companyConfig,siteOffice}','')='' OR LOWER(payload#>>'{companyConfig,siteOffice}') LIKE '%dã chiến%';
    UPDATE erp_state
    SET payload=jsonb_set(payload,'{companyConfig,taxCode}',to_jsonb(''::text),true)
    WHERE payload#>'{companyConfig,taxCode}' IS NULL;
    UPDATE erp_state
    SET payload=jsonb_set(payload,'{companyConfig,officeAddress}',to_jsonb(COALESCE(NULLIF(payload#>>'{companyConfig,siteOffice}',''),'Tp Hồ Chí Minh')),true)
    WHERE payload#>'{companyConfig,officeAddress}' IS NULL;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS employee_id TEXT;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_change_pin BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE workforce_requests ADD COLUMN IF NOT EXISTS amount NUMERIC(18,2) NOT NULL DEFAULT 0;
    ALTER TABLE workforce_requests DROP CONSTRAINT IF EXISTS workforce_requests_request_type_check;
    ALTER TABLE workforce_requests ADD CONSTRAINT workforce_requests_request_type_check CHECK (request_type IN ('leave','overtime','business_trip','shift_swap','salary_advance'));
    WITH duplicate_links AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id ORDER BY active DESC, id) AS link_order
      FROM app_users WHERE employee_id IS NOT NULL
    )
    UPDATE app_users SET employee_id=NULL,session_version=session_version+1
    WHERE id IN (SELECT id FROM duplicate_links WHERE link_order > 1);
    CREATE UNIQUE INDEX IF NOT EXISTS app_users_employee_id_unique ON app_users(employee_id) WHERE employee_id IS NOT NULL;
    ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
    UPDATE app_users SET role='ChiefAccountant',session_version=session_version+1 WHERE role='Accountant';
    ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('CEO','ChiefAccountant','SiteAccountant','SiteManager','Auditor','Employee'));
  `);
}
