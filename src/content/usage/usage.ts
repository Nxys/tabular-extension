/**
 * Usage 模块 - 行为信号记录器
 * 
 * 职责（第三版升级）：
 * - 记录用户行为事件（信号源）
 * - 提供行为统计数据（供 Pro gate 判断使用）
 * - 保留兼容性接口（checkUsage/consumeUsage）
 * - 不直接访问UI，不弹窗
 * 
 * 设计原则：
 * - 从"限制器"升级为"信号记录器"
 * - 记录行为不阻断流程
 * - 作为 Pro gate 的信号输入之一，不是唯一条件
 * 
 * 依赖：
 * - storage.ts: 状态持久化
 * - policy.ts: 策略定义
 * 
 * 不依赖：
 * - UI 组件（panel.ts）
 * - 核心算法（extractor）
 */

import { getUsageCount, incrementUsage, resetIfNewDay, saveStats, getStats } from './storage';
import { FREE_POLICY } from './policy';

/**
 * 使用事件类型
 */
export type UsageEvent =
  | 'select'          // 用户进行了框选
  | 'table-detect'    // 触发了表格检测
  | 'column-align'    // 触发了列对齐
  | 'csv-export';     // 触发了 CSV 导出

/**
 * 事件统计数据
 */
export interface UsageStats {
  /** 今日总选择次数 */
  selectCount: number;
  /** 今日表格检测次数 */
  tableDetectCount: number;
  /** 今日列对齐次数 */
  columnAlignCount: number;
  /** 今日 CSV 导出次数 */
  csvExportCount: number;
  /** 最后更新日期 */
  lastDate: string;
}

/**
 * 使用状态接口
 */
export interface UsageState {
  /** 是否允许使用 */
  allowed: boolean;
  /** 拒绝原因（当 allowed 为 false 时） */
  reason?: 'limit-reached';
  /** 剩余次数 */
  remaining?: number;
}

/**
 * 记录使用事件
 * 
 * 只记录发生过什么，不判断是否合法
 * 不阻断任何流程，即使 storage 失败也不抛出异常
 * 
 * @param event 事件类型
 */
export async function record(event: UsageEvent): Promise<void> {
  try {
    // 首先检查是否需要跨天重置
    await resetIfNewDay();
    
    // 获取当前统计
    const stats = await getStats();
    
    // 更新对应的计数
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
    
    // 保存到 storage
    await saveStats(stats);
  } catch (error) {
    // 记录失败不影响主流程
    console.warn('Failed to record usage event', event, error);
  }
}

/**
 * 获取最近的使用统计
 * 
 * 返回今日的事件统计数据
 * 
 * @returns 使用统计数据
 */
export async function getRecentStats(): Promise<UsageStats> {
  try {
    return await getStats();
  } catch (error) {
    console.warn('Failed to get usage stats', error);
    // 返回默认值，不阻断流程
    return {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: new Date().toDateString()
    };
  }
}

/**
 * 检查是否允许使用
 * 
 * @deprecated 第三版中，此函数仅用于兼容性，保留用于免费版基础限制
 * 实际的 Pro 功能权限判断由 pro/gate.ts 负责
 * 
 * 只判断，不修改状态（幂等操作）
 * 
 * @returns 使用状态，包含是否允许、拒绝原因和剩余次数
 */
export async function checkUsage(): Promise<UsageState> {
  // 首先检查是否需要跨天重置
  await resetIfNewDay();
  
  // 获取当前使用次数
  const count = await getUsageCount();
  
  // 获取当前策略（目前只有免费策略）
  const policy = FREE_POLICY;
  
  // 判断是否达到限制
  if (count >= policy.maxPerDay) {
    return {
      allowed: false,
      reason: 'limit-reached',
      remaining: 0
    };
  }
  
  // 未达到限制，允许使用
  return {
    allowed: true,
    remaining: policy.maxPerDay - count
  };
}

/**
 * 消耗一次使用额度
 * 
 * @deprecated 第三版中，使用 record('select') 代替
 * 保留用于兼容性
 * 
 * 只在成功提取后调用
 * 
 * @returns Promise<void>
 */
export async function consumeUsage(): Promise<void> {
  await incrementUsage();
  // 同时记录 select 事件
  await record('select');
}
