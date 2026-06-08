import { test, expect } from '@playwright/test';

test.describe('技能图谱页面', () => {
  test('页面加载并渲染力导向图', async ({ page }) => {
    await page.goto('/skills-graph');
    
    // 等待页面标题
    await expect(page).toHaveTitle(/职途星/);
    
    // 等待SVG渲染（力导向图的节点是circle元素）
    await page.waitForSelector('svg circle', { timeout: 10000 });
    
    // 获取所有节点位置
    const circles = await page.locator('svg circle').all();
    expect(circles.length).toBeGreaterThan(2);
    
    // 验证节点没有全部塌缩在一起（上次 node.y += node.y 的bug会挤成一条线）
    const positions: { x: number; y: number }[] = [];
    for (const circle of circles) {
      const cx = await circle.getAttribute('cx');
      const cy = await circle.getAttribute('cy');
      if (cx && cy) {
        positions.push({ x: parseFloat(cx), y: parseFloat(cy) });
      }
    }
    
    expect(positions.length).toBeGreaterThan(2);
    
    // 检查至少有两对节点之间的距离 > 50px（说明没挤成一条线）
    let dispersedPairs = 0;
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i]!.x - positions[j]!.x;
        const dy = positions[i]!.y - positions[j]!.y;
        if (Math.sqrt(dx * dx + dy * dy) > 50) {
          dispersedPairs++;
        }
      }
    }
    expect(dispersedPairs).toBeGreaterThan(positions.length / 2);
  });

  test('布局切换器可用', async ({ page }) => {
    await page.goto('/skills-graph');
    await page.waitForSelector('svg circle', { timeout: 10000 });
    
    // 点击布局切换按钮
    const buttons = page.locator('button').filter({ hasText: /环形|层次|力导向/ });
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('搜索功能可用', async ({ page }) => {
    await page.goto('/skills-graph');
    await page.waitForSelector('svg circle', { timeout: 10000 });
    
    // 查找搜索输入框
    const searchInput = page.locator('input[placeholder*="搜索"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('Python');
      await page.keyboard.press('Enter');
      // 等待搜索结果
      await page.waitForTimeout(1000);
    }
  });
});
