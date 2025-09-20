import { test, expect } from '@playwright/test';

test.describe('基础导航功能', () => {
  test.beforeEach(async ({ page }) => {
    // 访问首页
    await page.goto('/');
  });

  test('应用首页加载正常', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/Pack Agents/);

    // 检查主要导航元素
    await expect(page.locator('text=Pack Agents')).toBeVisible();
    await expect(page.locator('text=仪表板')).toBeVisible();
    await expect(page.locator('text=Agent 工厂')).toBeVisible();
    await expect(page.locator('text=工作流编排')).toBeVisible();
  });

  test('左侧导航菜单功能正常', async ({ page }) => {
    // 点击 Agent 工厂菜单
    await page.click('text=Agent 工厂');
    await expect(page.locator('text=Agent 列表')).toBeVisible();
    await expect(page.locator('text=模板库')).toBeVisible();

    // 点击工作流编排菜单
    await page.click('text=工作流编排');
    await expect(page.locator('text=工作流列表')).toBeVisible();
    await expect(page.locator('text=模板库')).toBeVisible();
  });

  test('仪表板显示统计信息', async ({ page }) => {
    // 检查统计卡片
    await expect(page.locator('text=Agent 总数')).toBeVisible();
    await expect(page.locator('text=工作流总数')).toBeVisible();
    await expect(page.locator('text=活跃执行')).toBeVisible();

    // 检查快速操作按钮
    await expect(page.locator('text=创建 Agent')).toBeVisible();
    await expect(page.locator('text=创建工作流')).toBeVisible();
    await expect(page.locator('text=浏览模板')).toBeVisible();
  });

  test('响应式设计在不同屏幕尺寸下正常', async ({ page }) => {
    // 测试移动端视图
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('text=Pack Agents')).toBeVisible();

    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('text=Pack Agents')).toBeVisible();

    // 恢复桌面视图
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('text=Pack Agents')).toBeVisible();
  });
});
