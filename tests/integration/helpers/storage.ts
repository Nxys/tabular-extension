import { Page } from '@playwright/test';
import type { AdvancedFeature } from '../../../src/shared/types';

/**
 * Storage 操作辅助工具
 * 用于在集成测试中操作插件的 chrome.storage.local 数据
 * 
 * 注意：chrome.storage API 只能在插件上下文中使用，
 * 因此我们需要通过 background service worker 来访问
 */

/**
 * 在 background service worker 中执行代码
 * @param page Playwright Page 对象
 * @param fn 要执行的函数
 * @param arg 传递给函数的参数（可选）
 */
async function executeInBackground<T, A = void>(
  page: Page,
  fn: A extends void ? () => T | Promise<T> : (arg: A) => T | Promise<T>,
  arg?: A
): Promise<T> {
  const context = page.context();
  let background = context.serviceWorkers()[0];
  
  // 如果 service worker 不存在，等待它加载
  if (!background) {
    try {
      background = await context.waitForEvent('serviceworker', { timeout: 5000 });
    } catch (error) {
      throw new Error('Background service worker not found after waiting');
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await background.evaluate(fn as any, arg);
}

/**
 * 开启插件功能
 * @param page Playwright Page 对象
 */
export async function enablePlugin(page: Page): Promise<void> {
  await executeInBackground(page, () => {
    return chrome.storage.local.set({ 'enabled': true });
  });
  
  // 等待设置生效
  await page.waitForTimeout(500);
}

/**
 * 关闭插件功能
 * @param page Playwright Page 对象
 */
export async function disablePlugin(page: Page): Promise<void> {
  await executeInBackground(page, () => {
    return chrome.storage.local.set({ 'enabled': false });
  });
  
  // 等待设置生效
  await page.waitForTimeout(500);
}

/**
 * 设置用户为 Pro 用户
 * @param page Playwright Page 对象
 */
export async function setProUser(page: Page): Promise<void> {
  await executeInBackground(page, () => {
    const proState = {
      isPro: true,
      signature: 'test-signature',
      features: {
        'table-detect': true,
        'column-align': true,
        'csv-export': true
      }
    };
    
    // 直接存储明文数据（测试环境不需要加密）
    return chrome.storage.local.set({ 'pro_state': proState });
  });
}

/**
 * 设置用户为 Free 用户
 * @param page Playwright Page 对象
 */
export async function setFreeUser(page: Page): Promise<void> {
  await executeInBackground(page, () => {
    const proState = {
      isPro: false,
      signature: '',
      features: {
        'table-detect': false,
        'column-align': false,
        'csv-export': false
      }
    };
    
    return chrome.storage.local.set({ 'pro_state': proState });
  });
}

/**
 * 设置试用次数
 * @param page Playwright Page 对象
 * @param feature 功能类型
 * @param count 试用次数（0-3）
 */
export async function setTrialCount(
  page: Page,
  feature: AdvancedFeature,
  count: number
): Promise<void> {
  await executeInBackground(
    page,
    ({ feature, count }) => {
      // 根据次数反向计算 seed 和 entropy
      // deriveRemaining 逻辑：Math.max(0, Math.floor((hash / 0xffffffff) * 3.5))
      // 要得到 count，需要：(hash / 0xffffffff) * 3.5 >= count
      // 即：hash >= (count / 3.5) * 0xffffffff
      
      const normalized = (count + 0.5) / 3.5; // 加 0.5 确保向上取整
      const hash = Math.floor(normalized * 0xffffffff) >>> 0;
      
      // seed ^ entropy = hash
      // 简单实现：seed = hash, entropy = 0
      const seed = hash >>> 0;
      const entropy = 0;
      
      const state = {
        seed,
        entropy,
        timestamp: Date.now()
      };
      
      const key = `state_${feature}`;
      return chrome.storage.local.set({ [key]: state });
    },
    { feature, count }
  );
}

/**
 * 获取试用次数
 * @param page Playwright Page 对象
 * @param feature 功能类型
 * @returns 剩余试用次数
 */
export async function getTrialCount(
  page: Page,
  feature: AdvancedFeature
): Promise<number> {
  return await executeInBackground(
    page,
    (feature) => {
      const key = `state_${feature}`;
      
      return chrome.storage.local.get([key]).then((result) => {
        const state = result[key];
        
        if (!state) {
          return 0;
        }
        
        // 使用与 usage.ts 相同的派生逻辑
        const hash = (state.seed ^ state.entropy) >>> 0;
        const normalized = hash / 0xffffffff;
        return Math.max(0, Math.floor(normalized * 3.5));
      });
    },
    feature
  );
}

/**
 * 清空所有 storage 数据
 * @param page Playwright Page 对象
 */
export async function clearStorage(page: Page): Promise<void> {
  await executeInBackground(page, () => {
    return chrome.storage.local.clear();
  });
}

/**
 * 获取完整的 storage 数据
 * @param page Playwright Page 对象
 * @returns 所有存储的数据
 */
export async function getStorageData(page: Page): Promise<Record<string, unknown>> {
  return await executeInBackground(page, () => {
    return chrome.storage.local.get(null);
  });
}
