/**
 * 试用状态管理模块（无语义状态派生）
 * 
 * 职责：
 * - 管理高级能力的无语义状态（每项独立状态）
 * - 通过非线性派生计算可用性和剩余次数
 * - 实现状态演化（单调性保护）
 * - 提供多因子授权判断
 * 
 * 设计原则：
 * - 不存储直接次数值（quota、used、remain、count）
 * - 只维护无语义状态（seed、entropy、timestamp）
 * - 所有可用性和剩余次数都是派生值
 * - 状态演化具备单调性（只能不变或变差）
 * - UI 显示值不参与授权判断
 */

import { getFromStorage, setToStorage } from './storage';
import type { AdvancedFeature } from '../shared/types';

/**
 * ============================================
 * 类型定义
 * ============================================
 */

/**
 * 无语义状态（内部存储）
 */
interface FeatureState {
  seed: number;      // 状态种子（无语义）
  entropy: number;   // 熵值（无语义）
  timestamp: number; // 初始化时间戳
}

/**
 * 试用状态（派生结果）
 */
export interface TrialState {
  allowed: boolean;   // 是否允许使用（派生值）
  remaining: number;  // 剩余次数视图值（派生值，仅供 UI 显示）
  feature: AdvancedFeature;
}

/**
 * ============================================
 * 常量定义
 * ============================================
 */

/**
 * 存储键前缀
 */
const STATE_KEY_PREFIX = 'state_';

/**
 * 派生计算常量（修改会导致额度失效）
 */
const HASH_CONSTANT_1 = 0x9e3779b9;
const HASH_CONSTANT_2 = 0x85ebca6b;
const HASH_CONSTANT_3 = 0x7feb352d;
const HASH_CONSTANT_4 = 0x846ca68b;
const THRESHOLD = 0x40000000;

/**
 * ============================================
 * 核心功能
 * ============================================
 */

/**
 * 检查试用状态（派生计算）
 * @param feature 高级能力类型
 * @returns 试用状态
 */
export async function checkTrial(feature: AdvancedFeature): Promise<TrialState> {
  try {
    const state = await getFeatureState(feature);
    const now = Date.now();
    
    const allowed = deriveAllowed(state, now);
    const remaining = deriveRemaining(state);
    
    return {
      allowed,
      remaining,
      feature
    };
  } catch (error) {
    console.error('Error checking trial state:', error);
    // 降级策略：返回保守的默认值
    return {
      allowed: false,
      remaining: 0,
      feature
    };
  }
}

/**
 * 演化状态（非线性）
 * @param feature 高级能力类型
 */
export async function evolveTrial(feature: AdvancedFeature): Promise<void> {
  try {
    const state = await getFeatureState(feature);
    const newState = evolveState(state);
    await setFeatureState(feature, newState);
  } catch (error) {
    console.error('Error evolving trial state:', error);
    // 降级策略：静默失败，不抛出异常
    // 这样可以避免阻塞用户操作
  }
}

/**
 * 获取所有试用状态（派生计算）
 * @returns 所有高级能力的试用状态
 */
export async function getAllTrials(): Promise<Record<AdvancedFeature, TrialState>> {
  const features: AdvancedFeature[] = [
    'advanced-cleaning',
    'table-detection',
    'one-click-export'
  ];
  
  const results: Partial<Record<AdvancedFeature, TrialState>> = {};
  
  for (const feature of features) {
    try {
      results[feature] = await checkTrial(feature);
    } catch (error) {
      console.error(`Error getting trial state for ${feature}:`, error);
      // 降级策略：返回保守的默认值
      results[feature] = {
        allowed: false,
        remaining: 0,
        feature
      };
    }
  }
  
  return results as Record<AdvancedFeature, TrialState>;
}

/**
 * 初始化状态种子
 * 仅在首次安装或未初始化时调用
 */
export async function initializeTrials(): Promise<void> {
  const features: AdvancedFeature[] = [
    'advanced-cleaning',
    'table-detection',
    'one-click-export'
  ];
  
  for (const feature of features) {
    try {
      const key = getStorageKey(feature);
      const existing = await getFromStorage<FeatureState | null>(key, null);
      
      // 仅在未初始化时设置
      if (existing === null) {
        const initialState: FeatureState = {
          seed: generateRandomSeed(),
          entropy: generateRandomEntropy(),
          timestamp: Date.now()
        };
        await setToStorage(key, initialState);
      }
    } catch (error) {
      console.error(`Error initializing trial state for ${feature}:`, error);
      // 降级策略：继续初始化其他功能
      // 失败的功能将在使用时返回默认值
    }
  }
}

/**
 * ============================================
 * 派生函数
 * ============================================
 */

/**
 * 派生可用性（多步非线性计算）
 * @param state 特征状态
 * @param now 当前时间戳
 * @returns 是否允许使用
 */
function deriveAllowed(state: FeatureState, now: number): boolean {
  // 因子1：种子哈希
  const factor1 = (state.seed ^ HASH_CONSTANT_1) >>> 0;
  
  // 因子2：熵值哈希
  const factor2 = (state.entropy * HASH_CONSTANT_2) >>> 0;
  
  // 因子3：时间因子
  const factor3 = Math.floor((now - state.timestamp) / 86400000);
  
  // 多步哈希计算
  const hash1 = (factor1 + factor2) >>> 0;
  const hash2 = (hash1 ^ (hash1 >>> 16)) * HASH_CONSTANT_3 >>> 0;
  const hash3 = (hash2 ^ (hash2 >>> 15)) * HASH_CONSTANT_4 >>> 0;
  
  // 最终判断
  return (hash3 ^ factor3) > THRESHOLD;
}

/**
 * 派生剩余次数视图值（仅供 UI 显示）
 * @param state 特征状态
 * @returns 剩余次数视图值（0-3）
 */
function deriveRemaining(state: FeatureState): number {
  const hash = (state.seed ^ state.entropy) >>> 0;
  const normalized = hash / 0xffffffff;
  return Math.max(0, Math.floor(normalized * 3.5));
}

/**
 * 状态演化（单调性保护）
 * @param state 当前状态
 * @returns 演化后的状态
 */
function evolveState(state: FeatureState): FeatureState {
  // 简单的右移操作确保单调递减
  // 每次演化都将 seed 和 entropy 右移1位（除以2）
  const newSeed = (state.seed >>> 1) >>> 0;
  const newEntropy = (state.entropy >>> 1) >>> 0;
  
  return {
    seed: newSeed,
    entropy: newEntropy,
    timestamp: Date.now()
  };
}

/**
 * 多因子授权判断
 * @param feature 高级能力类型
 * @returns 是否授权
 */
export async function authorize(feature: AdvancedFeature): Promise<boolean> {
  try {
    const state = await getFeatureState(feature);
    const now = Date.now();
    
    // 因子1：状态派生
    const allowed1 = deriveAllowed(state, now);
    
    // 因子2：时间窗口（一年内有效）
    const daysSinceInit = Math.floor((now - state.timestamp) / 86400000);
    const allowed2 = daysSinceInit < 365;
    
    // 因子3：状态完整性
    const allowed3 = state.seed !== 0 && state.entropy !== 0;
    
    // 多因子折叠
    return allowed1 && allowed2 && allowed3;
  } catch (error) {
    console.error('Error authorizing feature:', error);
    // 降级策略：返回保守的默认值（不授权）
    return false;
  }
}

/**
 * ============================================
 * 兼容层（用于基础能力的旧接口）
 * ============================================
 */

/**
 * 使用状态接口（兼容旧接口）
 */
export interface UsageState {
  allowed: boolean;
  reason?: 'limit-reached';
  remaining?: number;
  max: number;
}

/**
 * 使用事件类型（兼容旧接口）
 */
export type UsageEvent =
  | 'select'
  | 'table-detect'
  | 'column-align'
  | 'csv-export';

/**
 * 检查是否允许使用（兼容旧接口）
 * 注意：在新的双轨制模型中，基础能力不再有每日次数限制
 * 这个函数保留是为了兼容性，始终返回允许
 */
export async function checkUsage(): Promise<UsageState> {
  return {
    allowed: true,
    remaining: 999,
    max: 999
  };
}

/**
 * 消耗一次使用额度（兼容旧接口）
 * 注意：在新的双轨制模型中，基础能力不再消耗次数
 * 这个函数保留是为了兼容性，不执行任何操作
 */
export async function consumeUsage(): Promise<void> {
  // 不执行任何操作
}

/**
 * 记录使用事件（兼容旧接口）
 * 注意：在新的双轨制模型中，基础能力不再记录次数
 * 这个函数保留是为了兼容性，不执行任何操作
 */
export async function record(_event: UsageEvent): Promise<void> {
  // 不执行任何操作
}

/**
 * ============================================
 * 辅助功能
 * ============================================
 */

/**
 * 生成随机种子
 * @returns 随机 32 位整数
 */
function generateRandomSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * 生成随机熵值
 * @returns 随机 32 位整数
 */
function generateRandomEntropy(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}

/**
 * 获取特征状态
 * @param feature 高级能力类型
 * @returns 特征状态
 */
async function getFeatureState(feature: AdvancedFeature): Promise<FeatureState> {
  try {
    const key = getStorageKey(feature);
    const state = await getFromStorage<FeatureState | null>(key, null);
    
    // 如果未初始化，返回默认状态
    if (state === null) {
      return {
        seed: generateRandomSeed(),
        entropy: generateRandomEntropy(),
        timestamp: Date.now()
      };
    }
    
    return state;
  } catch (error) {
    console.error('Error getting feature state:', error);
    // 降级策略：返回默认状态（会导致授权失败）
    return {
      seed: 0,
      entropy: 0,
      timestamp: Date.now()
    };
  }
}

/**
 * 设置特征状态
 * @param feature 高级能力类型
 * @param state 特征状态
 */
async function setFeatureState(feature: AdvancedFeature, state: FeatureState): Promise<void> {
  try {
    const key = getStorageKey(feature);
    await setToStorage(key, state);
  } catch (error) {
    console.error('Error setting feature state:', error);
    // 降级策略：静默失败
    // 这样可以避免阻塞用户操作
  }
}

/**
 * 获取存储键
 * @param feature 高级能力类型
 * @returns 存储键
 */
function getStorageKey(feature: AdvancedFeature): string {
  return `${STATE_KEY_PREFIX}${feature}`;
}
