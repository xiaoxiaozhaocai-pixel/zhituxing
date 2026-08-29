/**
 * Phase 3 · E2E 功能回归（公共路径）
 *
 * 目标：锁定「公开可抓取/免登录」的页面与接口契约，防止改坏用户可感知的能力边界。
 * 这里聚焦 Public / SSR / 静态页面，不需要真实登录态，可在 CI（fake Supabase、
 * DEEPSEEK_ENABLED=false）的本地构建上稳定跑通。登录态 / LLM 强依赖链路留给后续
 * 专门的认证流 / 内容品质层（Phase 4+）覆盖。
 *
 * 覆盖范围：
 *   ① 首页 /          —— 唯一主入口，人格化开场，核心链路可见
 *   ② /insights       —— 公开判断力内容库（能力边界展示阵地，四层+因果层+JSON-LD）
 *   ③ /api/health     —— 服务存活检查
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 3 · 公共路径功能回归', () => {
  test.describe('首页 /', () => {
    test('标题含「职途星」', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/职途星/);
    });

    test('Hero 主标题「先想清楚再投简历」', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toContainText('先想清楚');
      await expect(page.locator('body')).toContainText('再投简历');
    });

    test('小职人格化开场白', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toContainText('我是小职，懂桂电的AI朋友');
    });

    test('核心链路入口可见（认知校正/模拟面试）', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('body')).toContainText('认知校正');
      await expect(page.locator('body')).toContainText('模拟面试');
    });
  });

  test.describe('判断力内容库 /insights（公开 SSR 能力边界）', () => {
    test('页面标题完整', async ({ page }) => {
      await page.goto('/insights');
      await expect(page).toHaveTitle(/求职判断力内容库/);
    });

    test('H1 求职判断力内容库', async ({ page }) => {
      await page.goto('/insights');
      await expect(page.locator('body')).toContainText('求职判断力');
    });

    test('四层内容区（行业雷达/词条库/认知库/能力词典）', async ({ page }) => {
      await page.goto('/insights');
      await expect(page.locator('body')).toContainText('面试行业雷达');
      await expect(page.locator('body')).toContainText('潜台词词条库');
      await expect(page.locator('body')).toContainText('专业认知库');
      await expect(page.locator('body')).toContainText('岗位能力词典');
    });

    test('判断力因果层呈现', async ({ page }) => {
      await page.goto('/insights');
      await expect(page.locator('body')).toContainText('判断力因果层');
    });

    test('Hero 统计体现内容规模（行业/词条）', async ({ page }) => {
      await page.goto('/insights');
      await expect(page.locator('body')).toContainText('个行业雷达');
      await expect(page.locator('body')).toContainText('条潜台词词条');
    });

    test('JSON-LD 结构化数据', async ({ page }) => {
      await page.goto('/insights');
      // 页面上可能注入多个 JSON-LD（布局/元数据），任一个命中即通过
      const jsonlds = page.locator('script[type="application/ld+json"]');
      const count = await jsonlds.count();
      expect(count).toBeGreaterThan(0);
      let matched = false;
      for (let i = 0; i < count; i++) {
        const t = await jsonlds.nth(i).textContent();
        if (t && t.includes('职途星求职判断力内容库')) {
          matched = true;
          break;
        }
      }
      expect(matched).toBe(true);
    });
  });

  test.describe('健康检查 /api/health', () => {
    test('返回 200', async ({ page }) => {
      const res = await page.goto('/api/health');
      expect(res?.status()).toBe(200);
    });
  });
});
