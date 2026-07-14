export function readStoredJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Dữ liệu lưu cục bộ "${key}" bị lỗi và đã được khôi phục về mặc định.`, error);
    localStorage.removeItem(key);
    return fallback;
  }
}
