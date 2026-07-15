import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function expectNoPageOverflow(page: import('@playwright/test').Page) {
  const metrics = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
  }));
  expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.bodyWidth).toBeLessThanOrEqual(metrics.viewport);
}

test('giao diện mobile không tràn màn hình trước và sau đăng nhập', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Quản trị doanh nghiệp' })).toBeVisible();
  await expectNoPageOverflow(page);

  await page.getByPlaceholder('Tên đăng nhập hoặc mã nhân viên, ví dụ EMP-12').fill(process.env.E2E_CEO_USERNAME || 'ceo');
  await page.getByPlaceholder('Nhập mật khẩu').fill(process.env.E2E_CEO_PIN || '711111');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();

  const menuButton = page.getByRole('button', { name: 'Mở menu' });
  await expect(menuButton).toBeVisible();
  await expectNoPageOverflow(page);

  await menuButton.click();
  await expect(page.getByRole('button', { name: 'Ban Giám Đốc', exact: true })).toBeVisible();
  await expectNoPageOverflow(page);

  await page.getByRole('button', { name: 'Tổng quan & Báo cáo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible();
  await expectNoPageOverflow(page);
});
