/**
 * Pro 判断（合并版）
 * 
 * 职责：
 * - Pro 权限判断（allow / verify）
 * - 功能权限映射
 * - 签名验证
 * - 使用模式检测
 * 
 * 注意：当前为占位实现，未来可扩展
 */

import { getFromStorage } from './storage';

/**
 * Pro 功能类型
 */
export type ProFeature =
  | 'table-detect'
  | 'column-align'
  | 'csv-export';

/**
 * Pro 状态接口
 */
export interface ProState {
  isPro: boolean;
  signature: string;
  features: Record<ProFeature, boolean>;
}

/**
 * 检查是否允许使用 Pro 功能
 * 
 * 当前为简化实现，直接返回 false
 * 未来可扩展为完整的权限验证
 * 
 * @param feature Pro 功能类型
 * @returns 是否允许使用
 */
export async function allow(feature: ProFeature): Promise<boolean> {
  const state = await getProState();
  
  // 简化实现：当前所有 Pro 功能都不可用
  // 未来可扩展为：
  // - 验证签名
  // - 检查功能是否启用
  // - 验证使用模式
  
  return state.isPro && state.features[feature] === true;
}

/**
 * 获取 Pro 状态
 */
async function getProState(): Promise<ProState> {
  const defaultState: ProState = {
    isPro: false,
    signature: '',
    features: {
      'table-detect': false,
      'column-align': false,
      'csv-export': false
    }
  };
  
  return await getFromStorage('pro_state', defaultState);
}
