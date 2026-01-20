/**
 * Playwright 自定义 Test Fixture
 * 用于 Chrome 插件集成测试
 * 
 * 使用 launchPersistentContext 加载插件
 */

import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

/**
 * 扩展的测试上下文类型
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  /**
   * 自定义 context fixture
   * 使用 launchPersistentContext 加载 Chrome 插件
   */
  context: async ({ }, use) => {
    const pathToExtension = path.join(process.cwd(), 'build/extension');
    
    const context = await chromium.launchPersistentContext('', {
      headless: false, // 插件测试必须关闭无头模式（或使用 'new'）
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    
    await use(context);
    await context.close();
  },

  /**
   * 自动获取插件 ID
   * 通过 Service Worker 提取 Extension ID
   */
  extensionId: async ({ context }, use) => {
    // 获取 Service Worker 以提取 Extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }

    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
