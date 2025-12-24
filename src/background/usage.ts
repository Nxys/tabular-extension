/**
 * 使用次数 + 策略（合并版）
 * 
 * 职责：
 * - 使用次数管理（check / consume / record）
 * - 免费策略定义
 * - 跨天重置逻辑
 * - 使用统计数据
 */

import { getFromStorage, setToStorage } from './storage';

/**
 * ============================================
 * 策略定义
 * ============================================
 */

/**
 * 免费策略：每日20次
 */
export const FREE_POLICY = {
  maxPerDay: 20
};

/**
 * ============================================
 * 类型定义
 * ============================================
 */

/**
 * 使用事件类型
 */
export type UsageEvent =
  | 'select'
  | 'table-detect'
  | 'column-align'
  | 'csv-export';

/**
 * 使用状态接口
 */
export interface UsageState {
  allowed: boolean;
  reason?: 'limit-reached';
  remaining?: number;
  max: number;
}

/**
 * 事件统计数据
 */
export interface UsageStats {
  selectCount: number;
  tableDetectCount: number;
  columnAlignCount: number;
  csvExportCount: number;
  lastDate: string;
}

/**
 * ============================================
 * 核心功能
 * ============================================
 */

/**
 * 检查是否允许使用
 */
export async function checkUsage(): Promise<UsageState> {
  await resetIfNewDay();
  
  const count = await getUsageCount();
  const max = FREE_POLICY.maxPerDay;
  
  if (count >= max) {
    return {
      allowed: false,
      reason: 'limit-reached',
      remaining: 0,
      max
    };
  }
  
  return {
    allowed: true,
    remaining: max - count,
    max
  };
}

/**
 * 消耗一次使用额度
 */
export async function consumeUsage(): Promise<void> {
  const count = await getUsageCount();
  await setToStorage('usage_count', count + 1);
}

/**
 * 记录使用事件
 */
export async function record(event: UsageEvent): Promise<void> {
  try {
    await resetIfNewDay();
    
    const stats = await getStats();
    
    switch (event) {
      case 'select':
        stats.selectCount++;
        break;
      case 'table-detect':
        stats.tableDetectCount++;
        break;
      case 'column-align':
        stats.columnAlignCount++;
        break;
      case 'csv-export':
        stats.csvExportCount++;
        break;
    }
    
    await setToStorage('usage_stats', stats);
  } catch (error) {
    console.warn('Failed to record usage event', event, error);
  }
}

/**
 * ============================================
 * 辅助功能
 * ============================================
 */

/**
 * 获取当日使用次数
 */
async function getUsageCount(): Promise<number> {
  return await getFromStorage('usage_count', 0);
}

/**
 * 获取使用统计
 */
async function getStats(): Promise<UsageStats> {
  const defaultStats: UsageStats = {
    selectCount: 0,
    tableDetectCount: 0,
    columnAlignCount: 0,
    csvExportCount: 0,
    lastDate: new Date().toDateString()
  };
  
  return await getFromStorage('usage_stats', defaultStats);
}

/**
 * 如果是新的一天，重置使用次数
 */
async function resetIfNewDay(): Promise<void> {
  const today = new Date().toDateString();
  const lastDate = await getFromStorage('last_usage_date', '');
  
  if (!lastDate || lastDate !== today) {
    await setToStorage('usage_count', 0);
    await setToStorage('last_usage_date', today);
    await setToStorage('usage_stats', {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: today
    });
  }
}
