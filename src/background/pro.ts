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

import { getFromStorage, setToStorage } from './storage';
import { encryptProState, decryptProState } from './crypto';

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
 * 存储键名
 */
const PRO_STATE_KEY = 'pro_state';

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
  try {
    const state = await getProState();
    
    // 简化实现：当前所有 Pro 功能都不可用
    // 未来可扩展为：
    // - 验证签名
    // - 检查功能是否启用
    // - 验证使用模式
    
    return state.isPro && state.features[feature] === true;
  } catch (error) {
    console.error('Error checking Pro permission:', error);
    // 降级策略：默认按 Free 用户处理
    return false;
  }
}

/**
 * 获取默认 Pro 状态（Free 用户）
 */
function getDefaultProState(): ProState {
  return {
    isPro: false,
    signature: '',
    features: {
      'table-detect': false,
      'column-align': false,
      'csv-export': false
    }
  };
}

/**
 * 获取 Pro 状态（支持加密存储和向后兼容）
 * 
 * 读取流程：
 * 1. 从 storage 读取数据
 * 2. 尝试解密（新格式）
 * 3. 解密失败则尝试读取明文（旧格式）
 * 4. 检测到明文数据则自动迁移到加密格式
 * 5. 所有失败则返回默认 Free 状态
 * 
 * @returns Pro 状态
 */
export async function getProState(): Promise<ProState> {
  const defaultState = getDefaultProState();
  
  try {
    // 从 storage 读取原始数据
    const rawData = await getFromStorage<string | ProState | null>(PRO_STATE_KEY, null);
    
    if (!rawData) {
      // 没有数据，返回默认状态
      return defaultState;
    }
    
    // 如果是字符串，尝试解密（新格式）
    if (typeof rawData === 'string') {
      const decrypted = await decryptProState(rawData);
      
      if (decrypted) {
        // 解密成功，返回解密后的状态
        return decrypted;
      }
      
      // 解密失败，返回默认状态
      console.warn('Failed to decrypt Pro state, using default Free state');
      return defaultState;
    }
    
    // 如果是对象，说明是旧版本的明文数据
    if (typeof rawData === 'object' && rawData !== null) {
      console.log('Detected plaintext Pro state, migrating to encrypted format');
      
      // 验证数据结构
      const state = rawData as ProState;
      if (typeof state.isPro === 'boolean' && state.features) {
        // 自动迁移到加密格式
        await setProState(state);
        return state;
      }
    }
    
    // 数据格式不正确，返回默认状态
    console.warn('Invalid Pro state format, using default Free state');
    return defaultState;
    
  } catch (error) {
    console.error('Error getting Pro state:', error);
    // 降级策略：返回默认状态（Free 用户）
    return defaultState;
  }
}

/**
 * 设置 Pro 状态（加密存储）
 * 
 * 写入流程：
 * 1. 加密状态对象
 * 2. 写入 storage
 * 
 * @param state Pro 状态
 * @throws 加密或存储失败时抛出错误
 */
export async function setProState(state: ProState): Promise<void> {
  try {
    // 加密状态
    const encrypted = await encryptProState(state);
    
    // 写入 storage
    await setToStorage(PRO_STATE_KEY, encrypted);
    
    console.log('Pro state saved successfully (encrypted)');
  } catch (error) {
    console.error('Error setting Pro state:', error);
    throw new Error('Failed to save Pro state');
  }
}
