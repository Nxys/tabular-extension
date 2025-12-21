/**
 * Usage 模块 - 统一使用控制入口
 * 
 * 职责：
 * - 统一的使用限制判断入口
 * - 消耗使用额度
 * - 不直接访问UI，不弹窗
 * 
 * 依赖：
 * - storage.ts: 状态持久化
 * - policy.ts: 策略定义
 * 
 * 不依赖：
 * - UI 组件（panel.ts）
 * - 核心算法（extractor）
 */

import { getUsageCount, incrementUsage, resetIfNewDay } from './storage';
import { FREE_POLICY } from './policy';

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
 * 检查是否允许使用
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
 * 只在成功提取后调用
 * 
 * @returns Promise<void>
 */
export async function consumeUsage(): Promise<void> {
  await incrementUsage();
}
