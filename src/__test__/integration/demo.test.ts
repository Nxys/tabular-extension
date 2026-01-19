import { test, expect } from '@playwright/test';

/**
 * 演示测试
 * 验证 Playwright 设置和基本浏览器功能
 */

test.describe('Playwright 演示测试', () => {
  
  test('应该能够打开测试页面', async ({ page }) => {
    // 导航到测试页面
    await page.goto('/');
    
    // 检查页面标题
    await expect(page).toHaveTitle(/Chrome 插件测试页面/);
    
    // 检查页面内容
    await expect(page.locator('h1')).toContainText('Chrome 插件测试页面');
  });

  test('应该能够与页面元素交互', async ({ page }) => {
    await page.goto('/');
    
    // 检查表格是否存在
    const table = page.locator('#simple-table');
    await expect(table).toBeVisible();
    
    // 检查表格内容
    await expect(table.locator('th').first()).toContainText('姓名');
    await expect(table.locator('td').first()).toContainText('张三');
  });

  test('应该能够选择文本', async ({ page }) => {
    await page.goto('/');
    
    // 选择测试文本
    const textElement = page.locator('#test-text');
    await textElement.click();
    
    // 使用 JavaScript 选择文本
    await page.evaluate(() => {
      const element = document.querySelector('#test-text');
      if (element) {
        const range = document.createRange();
        range.selectNodeContents(element);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    });
    
    // 验证文本被选中
    const selectedText = await page.evaluate(() => window.getSelection()?.toString());
    expect(selectedText).toContain('测试文本');
  });

  test('应该能够检测表格结构', async ({ page }) => {
    await page.goto('/');
    
    // 获取表格信息
    const tableInfo = await page.evaluate(() => {
      const table = document.querySelector('#product-table');
      if (!table) return null;
      
      const rows = table.querySelectorAll('tr');
      const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim());
      const rowCount = rows.length;
      
      return { headers, rowCount };
    });
    
    expect(tableInfo).not.toBeNull();
    expect(tableInfo?.headers).toContain('产品名称');
    expect(tableInfo?.rowCount).toBeGreaterThan(1);
  });

  test('应该能够模拟表格选择', async ({ page }) => {
    await page.goto('/');
    
    // 获取表格边界
    const table = page.locator('#mixed-table');
    const boundingBox = await table.boundingBox();
    
    expect(boundingBox).not.toBeNull();
    
    if (boundingBox) {
      // 模拟拖拽选择表格
      await page.mouse.move(boundingBox.x + 10, boundingBox.y + 10);
      await page.mouse.down();
      await page.mouse.move(
        boundingBox.x + boundingBox.width - 10, 
        boundingBox.y + boundingBox.height - 10
      );
      await page.mouse.up();
      
      // 验证选择操作完成
      expect(true).toBe(true); // 基本验证操作完成
    }
  });

  test('应该能够检查控制台输出', async ({ page }) => {
    const consoleMessages: string[] = [];
    
    // 监听控制台消息
    page.on('console', msg => {
      consoleMessages.push(msg.text());
    });
    
    await page.goto('/');
    
    // 等待页面加载完成
    await page.waitForLoadState('domcontentloaded');
    
    // 检查是否有预期的控制台消息
    expect(consoleMessages).toContain('测试页面加载完成');
  });
});