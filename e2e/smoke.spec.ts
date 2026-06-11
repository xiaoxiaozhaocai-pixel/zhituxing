import { test, expect } from '@playwright/test';

test.describe('冒烟测试', () => {
  test('首页加载正常', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/职途星/);
  });

  test('/api/health 返回 200', async ({ page }) => {
    const response = await page.goto('/api/health');
    expect(response?.status()).toBe(200);
  });
});
