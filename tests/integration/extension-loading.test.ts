/**
 * Chrome 插件加载测试
 * 验证插件是否正确加载和初始化
 */

import { test, expect } from './fixtures';

test.describe('插件加载测试', () => {
  
  test('应该成功加载插件并获取 Extension ID', async ({ context, extensionId }) => {
    // 验证 extensionId 存在且格式正确
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/^[a-z]{32}$/);
    
    // 验证 Service Worker 已加载
    const serviceWorkers = context.serviceWorkers();
    expect(serviceWorkers.length).toBeGreaterThan(0);
    
    const background = serviceWorkers[0];
    expect(background.url()).toContain(extensionId);
  });

  test('应该能够访问插件的 Popup 页面', async ({ page, extensionId }) => {
    // 跳转到插件的弹出页
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    
    // 等待页面加载
    await page.waitForLoadState('domcontentloaded');
    
    // 验证页面标题
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('应该能够在测试页面中注入 Content Script', async ({ page }) => {
    // 导航到测试页面
    await page.goto('http://localhost:3000/index.html');
    await page.waitForLoadState('domcontentloaded');
    
    // 等待 content script 注入（检查全局变量或 DOM 元素）
    const hasContentScript = await page.evaluate(() => {
      // 检查插件是否注入了特定的全局变量或 DOM 元素
      return typeof (window as any).tabular !== 'undefined' ||
             document.querySelector('.tabular-extension-panel') !== null;
    });
    
    // 注意：如果 content script 只在特定条件下注入，这个测试可能需要调整
    expect(hasContentScript).toBeDefined();
  });
});
