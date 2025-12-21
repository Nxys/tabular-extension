/**
 * Storage 模块 - 状态持久化层
 * 
 * 职责：
 * - 使用次数的持久化
 * - 自动跨天重置
 * - 不暴露给其他模块直接使用（只被 usage.ts 调用）
 */

/**
 * 存储键名
 */
const STORAGE_KEYS = {
  USAGE_COUNT: 'usage_count',
  LAST_USAGE_DATE: 'last_usage_date'
} as const;

/**
 * 内存降级存储（当 chrome.storage.local 不可用时使用）
 */
const memoryFallback = {
  usageCount: 0,
  lastUsageDate: ''
};

/**
 * 获取当日使用次数
 * 
 * @returns 当前使用次数，如果存储访问失败则返回内存中的值
 */
export async function getUsageCount(): Promise<number> {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.USAGE_COUNT]);
    return result[STORAGE_KEYS.USAGE_COUNT] || 0;
  } catch (error) {
    console.warn('Storage access failed, using memory fallback', error);
    return memoryFallback.usageCount;
  }
}

/**
 * 增加使用次数
 * 
 * @returns Promise<void>
 */
export async function incrementUsage(): Promise<void> {
  try {
    const count = await getUsageCount();
    await chrome.storage.local.set({
      [STORAGE_KEYS.USAGE_COUNT]: count + 1
    });
  } catch (error) {
    console.warn('Failed to increment usage, using memory fallback', error);
    memoryFallback.usageCount += 1;
  }
}

/**
 * 如果是新的一天，重置使用次数
 * 
 * 检测日期变化并自动重置计数
 * 如果存储的日期格式异常或无法解析，视为新的一天并重置
 * 
 * @returns Promise<void>
 */
export async function resetIfNewDay(): Promise<void> {
  try {
    const today = new Date().toDateString();
    const result = await chrome.storage.local.get([STORAGE_KEYS.LAST_USAGE_DATE]);
    const lastDate = result[STORAGE_KEYS.LAST_USAGE_DATE];
    
    // 如果没有存储日期或日期不同，重置计数
    if (!lastDate || lastDate !== today) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.USAGE_COUNT]: 0,
        [STORAGE_KEYS.LAST_USAGE_DATE]: today
      });
    }
  } catch (error) {
    console.warn('Date reset failed, using memory fallback', error);
    const today = new Date().toDateString();
    if (memoryFallback.lastUsageDate !== today) {
      memoryFallback.usageCount = 0;
      memoryFallback.lastUsageDate = today;
    }
  }
}
