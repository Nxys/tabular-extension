import { Page, BrowserContext } from '@playwright/test';
import type { AdvancedFeature } from '../../../src/shared/types';

/**
 * Storage 操作辅助工具
 * 用于在测试中操作插件的 storage 数据
 * 
 * 注意：这些函数通过扩展的 background 页面来操作 storage
 */

/**
 * 获取扩展的 background 页面
 */
async function getBackgroundPage(page: Page): Promise<Page> {
  const context = page.context();
  const backgroundPages = context.backgroundPages();
  
  if (backgroundPages.length > 0) {
    return backgroundPages[0];
  }
  
  // 如果还没有 background 页面，等待它加载
  return await context.waitForEvent('backgroundpage');
}

/**
 * 设置用户为 Pro 用户
 */
export async function setProUser(page: Page): Promise<void> {
  const bgPage = await getBackgroundPage(page);
  await bgPage.evaluate(() => {
    return chrome.storage.local.set({
      isPro: true,
      proExpiry: Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 年后过期
    });
  });
}

/**
 * 设置用户为 Free 用户
 */
export async function setFreeUser(page: Page): Promise<void> {
  const bgPage = await getBackgroundPage(page);
  await bgPage.evaluate(() => {
    return chrome.storage.local.set({
      isPro: false,
      proExpiry: 0
    });
  });
}

/**
 * 设置试用次数
 */
export async function setTrialCount(
  page: Page,
  feature: AdvancedFeature,
  count: number
): Promise<void> {
  const bgPage = await getBackgroundPage(page);
  await bgPage.evaluate(
    ({ feature, count }) => {
      const key = `trial_${feature}`;
      return chrome.storage.local.set({ [key]: count });
    },
    { feature, count }
  );
}

/**
 * 获取试用次数
 */
export async function getTrialCount(
  page: Page,
  feature: AdvancedFeature
): Promise<number> {
  const bgPage = await getBackgroundPage(page);
  return await bgPage.evaluate(
    async (feature) => {
      const key = `trial_${feature}`;
      const result = await chrome.storage.local.get(key);
      return result[key] || 0;
    },
    feature
  );
}

/**
 * 清空所有 storage 数据
 */
export async function clearStorage(page: Page): Promise<void> {
  const bgPage = await getBackgroundPage(page);
  await bgPage.evaluate(() => {
    return chrome.storage.local.clear();
  });
}

/**
 * 获取完整的 storage 数据
 */
export async function getStorageData(page: Page): Promise<Record<string, unknown>> {
  const bgPage = await getBackgroundPage(page);
  return await bgPage.evaluate(() => {
    return chrome.storage.local.get(null);
  });
}
