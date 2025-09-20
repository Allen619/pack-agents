import { test, expect } from '@playwright/test';

test.describe('基础连接测试', () => {
  test('应用可以正常访问', async ({ page }) => {
    // 增加超时时间
    test.setTimeout(60000);

    try {
      await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });

      // 检查页面是否加载
      const title = await page.title();
      console.log('页面标题:', title);

      // 检查是否有基本元素
      const body = await page.locator('body').isVisible();
      expect(body).toBe(true);

      console.log('基础连接测试通过');
    } catch (error) {
      console.error('连接测试失败:', error);
      throw error;
    }
  });
});
