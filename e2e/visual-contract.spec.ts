/**
 * Phase 5 · 视觉契约测试（Visual Contract）
 *
 * 目标：把「蓝白配色 / 禁暗色主题 / 标题结构 / 关键视觉元素」这些视觉硬约束
 * 固化为可自动运行的契约断言，跑在 CI E2E（fake Supabase + DEEPSEEK_ENABLED=false）上。
 *
 * 选型说明：不做纯 pixel-diff（对含登录态 / 动态 JD 数据 / 时效性内容的站点易 flaky，
 * 且需维护大量基线截图），改为「读取 computed style + DOM 结构」的**视觉契约**——稳定、
 * 断言品牌视觉红线，避免改坏视觉基线时靠人工巡检才发现。
 *
 * 覆盖：① 首页 / ② /insights（公开能力边界阵地）
 *   - 无暗色主题（SOUL 视觉红线：禁用 dark）
 *   - 主色 token = #165DFF（品牌蓝）
 *   - 页面背景浅色（蓝白基调）
 *   - 标题结构：存在唯一主标题 H1、存在分块标题 H2
 *   - 关键视觉元素 / 锚点导航 / CTA 可见
 */
import { test, expect } from '@playwright/test';

test.describe('Phase 5 · 视觉契约', () => {
  /** 读取 :root 下的 CSS 变量，trim 去掉多余空白 */
  async function readCssVar(page: import('@playwright/test').Page, name: string): Promise<string> {
    const value = await page.evaluate((varName) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
      return (v || '').trim();
    }, name);
    return value;
  }

  /** 判断 html 是否挂了 .dark（启用暗色主题） */
  async function hasDarkClass(page: import('@playwright/test').Page): Promise<boolean> {
    return page.evaluate(() => document.documentElement.classList.contains('dark'));
  }

  /** 取 body 背景 RGB 值（[r,g,b]），对 oklch/rgb 均能解析 */
  async function bodyBgRgb(page: import('@playwright/test').Page): Promise<number[]> {
    return page.evaluate(() => {
      const c = getComputedStyle(document.body).backgroundColor;
      const m = c.match(/\d+/g);
      return m && m.length >= 3 ? m.slice(0, 3).map(Number) : [0, 0, 0];
    });
  }

  test.describe('首页 /（品牌视觉基线）', () => {
    test('未启用暗色主题（SOUL 红线）', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/职途星/);
      expect(await hasDarkClass(page)).toBe(false);
    });

    test('主色 token 为品牌蓝 #165DFF', async ({ page }) => {
      await page.goto('/');
      const primary = await readCssVar(page, '--primary');
      expect(primary).toBe('#165DFF');
    });

    test('页面背景为浅色（蓝白基调）', async ({ page }) => {
      await page.goto('/');
      const [r, g, b] = await bodyBgRgb(page);
      expect(r).toBeGreaterThan(220);
      expect(g).toBeGreaterThan(220);
      expect(b).toBeGreaterThan(220);
    });

    test('主标题结构与关键视觉元素可见', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.locator('body')).toContainText('先想清楚');
      await expect(page.locator('body')).toContainText('再投简历');
      await expect(page.locator('body')).toContainText('认知校正');
    });
  });

  test.describe('判断力内容库 /insights（公开视觉阵地）', () => {
    test('未启用暗色主题', async ({ page }) => {
      await page.goto('/insights');
      await expect(page).toHaveTitle(/求职判断力内容库/);
      expect(await hasDarkClass(page)).toBe(false);
    });

    test('主色 token 为品牌蓝 #165DFF', async ({ page }) => {
      await page.goto('/insights');
      const primary = await readCssVar(page, '--primary');
      expect(primary).toBe('#165DFF');
    });

    test('标题结构：唯一主标题 H1 + 分块标题 H2', async ({ page }) => {
      await page.goto('/insights');
      await expect(page.locator('h1')).toHaveCount(1);
      const h2Count = await page.locator('h2').count();
      expect(h2Count).toBeGreaterThan(0);
    });

    test('锚点导航 + 四层核心内容可见', async ({ page }) => {
      await page.goto('/insights');
      await expect(page.locator('a[href^="#"]').first()).toBeVisible();
      await expect(page.locator('body')).toContainText('面试行业雷达');
      await expect(page.locator('body')).toContainText('潜台词词条库');
      await expect(page.locator('body')).toContainText('专业认知库');
      await expect(page.locator('body')).toContainText('岗位能力词典');
    });
  });
});
