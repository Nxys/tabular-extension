/**
 * Playwright 自定义 Test Fixture
 * 用于 Chrome 插件集成测试
 * 
 * 使用 launchPersistentContext 加载插件
 */

import { join } from 'path';
import { execSync } from 'child_process';
import { test as base, chromium, type BrowserContext } from '@playwright/test';

/**
 * 自动获取显示器配置参数
 * 逻辑：检测到多个分辨率配置时判定为有扩展屏
 */
function getDisplayArgs() {
  const defaultSize = '--window-size=1440,900';
  
  try {
    // 获取 macOS 系统显示器数据
    const output = execSync('system_profiler SPDisplaysDataType').toString();
    // 统计分辨率出现的次数
    const displayCount = (output.match(/Resolution:/g) || []).length;

    if (displayCount > 1) {
      // 有扩展屏：请将 1728 替换为您之前测试出的扩展屏起始 X 坐标
      return ['--window-position=-842,-1228', defaultSize];
    }
  } catch (e) {
    // 异常或未检测到则返回主屏坐标
  }
  
  // 无扩展屏：坐标回归 0,0
  return ['--window-position=0,0', defaultSize];
}

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
    const pathToExtension = join(process.cwd(), 'build/extension');
    const displayArgs = getDisplayArgs();
    
    const context = await chromium.launchPersistentContext('', {
      headless: false, // 插件测试必须关闭无头模式（或使用 'new'）
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        ...displayArgs,
      ],
      viewport: null,
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
