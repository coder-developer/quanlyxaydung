import { expect, test } from '@playwright/test';

test('CEO đăng nhập và backend xác nhận đúng vai trò', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Tên đăng nhập hoặc mã nhân viên, ví dụ EMP-12').fill(process.env.E2E_CEO_USERNAME || 'ceo');
  await page.getByPlaceholder('Nhập mật khẩu').fill(process.env.E2E_CEO_PIN || '711111');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ban Giám Đốc', exact: true })).toBeVisible();
  const me = await page.evaluate(async () => {
    const token = sessionStorage.getItem('erp_api_token');
    const response = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    return response.json();
  });
  expect(me.user.role).toBe('CEO');
});
