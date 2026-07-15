import type { UserRole } from '../types';

const TOKEN_KEY = 'erp_api_token';
const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ApiUser { id: number; username: string; fullName: string; role: UserRole; employeeId?: string; mustChangePassword?: boolean }
export interface ServerState<T> { revision: number; payload: T; updated_at: string }

export async function apiLogin(username: string, pin: string) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, pin }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Không thể đăng nhập.');
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.setItem(TOKEN_KEY, body.token);
  return body as { token: string; user: ApiUser };
}

export async function apiRegister(username: string, employeeCode: string, phone: string, pin: string) {
  const response = await fetch(`${API_BASE}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, employeeCode, phone, pin }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Không đăng ký được tài khoản.');
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.setItem(TOKEN_KEY, body.token);
  return body as { token: string; user: ApiUser };
}

export const apiChangePin = (currentPin: string, newPin: string) => apiFetch('/api/auth/change-pin', { method: 'POST', body: JSON.stringify({ currentPin, newPin }) }) as Promise<{ success: boolean }>;
export const apiCurrentUser = () => apiFetch('/api/auth/me') as Promise<{ user: ApiUser }>;
export const apiResetSystem = () => apiFetch('/api/admin/reset-system', { method: 'POST', body: JSON.stringify({ confirmation: 'RESET_TO_DEFAULT' }) }) as Promise<ServerState<Record<string, unknown>>>;
export const syncServerBusinessIds = (mappings: Array<{ entityType: string; oldId: string; newId: string }>) => apiFetch('/api/admin/sync-business-ids', { method: 'POST', body: JSON.stringify({ mappings }) }) as Promise<{ success: boolean }>;

export function apiLogout() {
  for (const storage of [localStorage, sessionStorage]) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith('erp_')) storage.removeItem(key);
    }
  }
}
export function hasApiSession() { return Boolean(sessionStorage.getItem(TOKEN_KEY)); }

export async function apiFetch(path: string, init?: RequestInit) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      window.dispatchEvent(new Event('erp:session-expired'));
    }
    const error = new Error(body.error || 'Máy chủ không phản hồi.') as Error & { status?: number; code?: string };
    error.status = response.status; error.code = body.code; throw error;
  }
  return body;
}

export const fetchServerState = <T>() => apiFetch('/api/state') as Promise<ServerState<T>>;
export const fetchServerRevision = () => apiFetch('/api/state/meta') as Promise<{ revision: number; updated_at: string }>;
export const saveServerState = <T>(payload: T, revision: number) => apiFetch('/api/state', {
  method: 'PUT', body: JSON.stringify({ payload, revision }),
}) as Promise<{ revision: number; updated_at: string }>;
