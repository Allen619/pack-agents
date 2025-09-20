import { test, expect } from '@playwright/test';

test.describe('Agent 管理功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 确保配置系统已初始化
    await page.waitForLoadState('networkidle');
  });

  test('Agent 列表页面功能', async ({ page }) => {
    // 导航到 Agent 列表
    await page.click('text=Agent 工厂');
    await page.click('text=Agent 列表');

    // 等待页面加载
    await page.waitForURL('**/agents');
    await expect(page.locator('h1:has-text("Agent 管理")')).toBeVisible();

    // 检查创建按钮
    await expect(page.locator('text=创建 Agent')).toBeVisible();
    await expect(page.locator('text=浏览模板')).toBeVisible();
  });

  test('创建新 Agent 流程', async ({ page }) => {
    // 导航到创建页面
    await page.click('text=Agent 工厂');
    await page.click('text=Agent 列表');
    await page.click('text=创建 Agent');

    // 等待创建页面加载
    await page.waitForURL('**/agents/create');
    await expect(page.locator('h1:has-text("创建 Agent")')).toBeVisible();

    // 填写基本信息
    const agentName = `测试Agent-${Date.now()}`;
    await page.fill('input[placeholder*="Agent名称"]', agentName);
    await page.fill('textarea[placeholder*="描述"]', '这是一个测试Agent的描述');

    // 选择角色
    await page.click('.ant-select-selector:has-text("选择角色")');
    await page.click('text=开发助手');

    // 填写系统提示
    await page.fill(
      'textarea[placeholder*="系统提示"]',
      '你是一个专业的开发助手，帮助用户解决编程问题。'
    );

    // 选择 LLM 提供商
    await page.click('.ant-select-selector:has-text("选择提供商")');
    await page.click('text=Anthropic Claude');

    // 选择模型
    await page.click('.ant-select-selector:has-text("选择模型")');
    await page.click('text=claude-3-sonnet-20240229');

    // 保存 Agent
    await page.click('button:has-text("创建 Agent")');

    // 验证创建成功
    await page.waitForURL('**/agents');
    await expect(page.locator(`text=${agentName}`)).toBeVisible();
  });

  test('Agent 模板功能', async ({ page }) => {
    // 导航到模板页面
    await page.click('text=Agent 工厂');
    await page.click('text=模板库');

    // 等待模板页面加载
    await page.waitForURL('**/agents/templates');
    await expect(page.locator('h1:has-text("Agent 模板")')).toBeVisible();

    // 检查是否有默认模板
    await expect(page.locator('.ant-card').first()).toBeVisible();

    // 点击使用模板按钮
    await page.click('button:has-text("使用模板")').first();

    // 应该跳转到创建页面，并且模板信息已填充
    await page.waitForURL('**/agents/create*');
    await expect(page.locator('input[value*="助手"]')).toBeVisible();
  });

  test('Agent 编辑功能', async ({ page }) => {
    // 首先创建一个 Agent（简化版）
    await page.goto('/agents/create');

    const agentName = `编辑测试Agent-${Date.now()}`;
    await page.fill('input[placeholder*="Agent名称"]', agentName);
    await page.fill('textarea[placeholder*="描述"]', '原始描述');

    await page.click('.ant-select-selector:has-text("选择角色")');
    await page.click('text=开发助手');

    await page.click('button:has-text("创建 Agent")');
    await page.waitForURL('**/agents');

    // 查找刚创建的 Agent 并点击编辑
    await page.click(
      `[data-testid="agent-card"]:has-text("${agentName}") button:has-text("编辑")`
    );

    // 等待编辑页面加载
    await page.waitForURL('**/agents/*/edit');

    // 修改描述
    await page.fill('textarea[placeholder*="描述"]', '修改后的描述');

    // 保存修改
    await page.click('button:has-text("保存修改")');

    // 验证修改成功
    await page.waitForURL('**/agents');
    await expect(page.locator('text=修改后的描述')).toBeVisible();
  });

  test('Agent 聊天功能', async ({ page }) => {
    // 导航到 Agent 列表
    await page.goto('/agents');

    // 如果有 Agent，点击聊天按钮
    const chatButton = page.locator('button:has-text("聊天")').first();
    if (await chatButton.isVisible()) {
      await chatButton.click();

      // 等待聊天页面加载
      await page.waitForURL('**/agents/*/chat');

      // 检查聊天界面元素
      await expect(page.locator('.ant-input')).toBeVisible(); // 输入框
      await expect(page.locator('button:has-text("发送")')).toBeVisible(); // 发送按钮

      // 测试发送消息
      await page.fill('.ant-input', '你好，这是一个测试消息');
      await page.click('button:has-text("发送")');

      // 验证消息显示
      await expect(page.locator('text=你好，这是一个测试消息')).toBeVisible();
    }
  });
});
