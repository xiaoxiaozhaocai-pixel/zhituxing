/**
 * Phase 5 · 视觉契约测试（Visual Contract）
 *
 * 目标：把「蓝白配色 / 禁暗色主题 / 品牌主色 / 页面浅底 / 标题结构 / 关键视觉元素」
 * 固化为可自动运行的契约断言，跑在 CI E2E（fake Supabase + DEEPSEEK_ENABLED=false）上。
 *
 * 选型说明：不做纯 pixel-diff（对含登录态 / 动态 JD 数据 / 时效性内容的站点易 flaky，
 * 且需维护大量基线截图），改为「读取 CSS 变量 + DOM 结构」的**视觉契约**——稳定、
 * 断言品牌视觉红线，避免改坏视觉基线时靠人工巡检才发现。
 *
 * 稳定性说明：
 *   ① 主色 token 经 getComputedStyle 读取会被浏览器规范化为小写（#165DFF → #165dff），
 *      故比较前统一 toLowerCase()。
 *   ② 背景浅色读全局 `--background` token，而非 body computed backgroundColor，
 *      避免页面局部渐变/容器覆盖导致误读（曾读到非浅色而误报）。
 *   ③ ⚠️ production build 的 CSS 压缩器会把 `--background: oklch(1 0 0)` 转换成
 *      `lab(100% 0 0)`（压缩器输出格式不固定，可能是 oklch / lab / lch / color(srgb)）。
 *      故 isLightBackground 统一抽取「明度分量」，兼容 oklch / lab / lch /
 *      color(srgb) / rgb / hsl / hex / 命名色，对压缩器输出格式免疫，避免 flaky。
 *   ④ CI 下项目 src/proxy.ts 有全局限流（400 次/分钟，按 IP），同一 IP 高频访问构建产物
 *      会触发 429 返回 JSON 错误，导致后续用例失败。已通过 ci.yml 的 e2e job 注入
 *      E2E_DISABLE_RATE_LIMIT=true 豁免（仅 CI 生效，线上生产未设置不受影响）。
 *
 * 覆盖：① 首页 / ② /insights（公开能力边界阵地）
 *   每个页面合并为 2 个用例（品牌基线条 + 内容结构条），以压低在同一 IP 下的页面访问量。
 */
import { test, expect } from '@playwright/test';

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

/**
 * 判断颜色明度是否够浅（蓝白基调）。
 * 兼容 production build 压缩器可能输出的任意现代 CSS 颜色格式：
 *   oklch(L ...)   → L∈[0,1]（oklch 明度）
 *   lab/lch(L ...) → L∈[0,100]（可带 %，lab/lch 明度）
 *   color(srgb ...) / rgb() / rgba() / hsl() → 分量可为 0-255、0-1 归一化或 0-100%
 *   hex / 命名浅色
 * 统一抽取「明度/亮度」判断，避免随 build 的颜色格式变化而 flaky。
 */
function isLightBackground(value: string): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (!v) return false;

  // oklch(L C H[/A])：L∈[0,1]，≥0.8 视为浅
  const oklch = v.match(/oklch\(\s*([\d.]+)/);
  if (oklch) return parseFloat(oklch[1]) >= 0.8;
  // lab(L a b[/A]) / lch(L C H[/A])：L∈[0,100]（可带 %），≥80 视为浅
  const lab = v.match(/(?:lab|lch)\(\s*([\d.]+%?)/);
  if (lab) return parseFloat(lab[1]) >= 80;

  // color(srgb ...) / rgb() / rgba() / hsl()：抽取前三个数值，归一化到 0-255 后取最小值
  const colorBody = v.match(/color\(([^)]+)\)/);
  const funcBody = v.match(/(?:rgba?|hsla?)\(([^)]+)\)/);
  const inner = colorBody ? colorBody[1] : funcBody ? funcBody[1] : '';
  if (inner) {
    const hasPct = inner.includes('%');
    const nums = inner.replace(/%/g, '').split(/[\s,/]+/).filter(Boolean).map(Number).filter((n) => !Number.isNaN(n));
    if (nums.length >= 3) {
      let [r, g, b] = nums;
      if (hasPct) { r *= 2.55; g *= 2.55; b *= 2.55; }          // 0-100% → 0-255
      else if (r <= 1 && g <= 1 && b <= 1) { r *= 255; g *= 255; b *= 255; } // 0-1 → 0-255
      return Math.min(r, g, b) >= 200;
    }
  }

  // hex #fff / #ffffff
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    const picks = hex.length === 3
      ? [hex[0] + hex[0], hex[1] + hex[1], hex[2] + hex[2]]
      : hex.length === 6 ? [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)] : [];
    if (picks.length === 3) {
      const [r, g, b] = picks.map((h) => parseInt(h, 16));
      return Math.min(r, g, b) >= 200;
    }
  }

  // 常见命名浅色
  const lightNames = ['white', 'whitesmoke', 'snow', 'ivory', 'floralwhite', 'aliceblue', 'ghostwhite', 'azure', 'lightyellow', 'honeydew', 'mintcream', 'lightgoldenrodyellow'];
  if (lightNames.includes(v)) return true;
  return false;
}

test.describe('Phase 5 · 视觉契约', () => {
  test.describe('首页 /（品牌视觉基线）', () => {
    test('品牌视觉基线：禁暗色 / 主色=品牌蓝 / 页面浅底', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/职途星/);
      // SOUL 视觉红线：禁用暗色主题
      expect(await hasDarkClass(page)).toBe(false);
      // 主色 token 为品牌蓝 #165DFF（getComputedStyle 会规范化为小写，统一 toLowerCase）
      const primary = await readCssVar(page, '--primary');
      expect(primary.toLowerCase()).toBe('#165dff');
      // 页面背景 token 为浅色（蓝白基调）
      const bg = await readCssVar(page, '--background');
      expect(isLightBackground(bg), `--background 应为浅色, raw=${bg}`).toBe(true);
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
    test('品牌视觉基线：禁暗色 / 主色=品牌蓝', async ({ page }) => {
      await page.goto('/insights');
      await expect(page).toHaveTitle(/求职判断力内容库/);
      // 禁用暗色主题
      expect(await hasDarkClass(page)).toBe(false);
      // 主色 token 为品牌蓝 #165DFF
      const primary = await readCssVar(page, '--primary');
      expect(primary.toLowerCase()).toBe('#165dff');
      // 页面背景 token 为浅色（蓝白基调）
      const bg = await readCssVar(page, '--background');
      expect(isLightBackground(bg), `--background 应为浅色, raw=${bg}`).toBe(true);
    });

    test('标题结构：唯一主标题 H1 + 分块标题 H2 + 锚点与四层内容可见', async ({ page }) => {
      await page.goto('/insights');
      await expect(page.locator('h1')).toHaveCount(1);
      const h2Count = await page.locator('h2').count();
      expect(h2Count).toBeGreaterThan(0);
      await expect(page.locator('a[href^="#"]').first()).toBeVisible();
      await expect(page.locator('body')).toContainText('面试行业雷达');
      await expect(page.locator('body')).toContainText('潜台词词条库');
      await expect(page.locator('body')).toContainText('专业认知库');
      await expect(page.locator('body')).toContainText('岗位能力词典');
    });
  });
});
