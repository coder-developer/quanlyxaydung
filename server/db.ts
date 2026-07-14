import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
      request_type TEXT NOT NULL CHECK (request_type IN ('leave','overtime','business_trip','shift_swap')),
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      reason TEXT NOT NULL,
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
    INSERT INTO erp_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
    ALTER TABLE app_users ADD COLUMN IF NOT EXISTS employee_id TEXT;
    ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check;
    ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('CEO','Accountant','SiteManager','Auditor','Employee'));
  `);
}
