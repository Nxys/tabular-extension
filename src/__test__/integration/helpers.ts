/**
 * 集成测试辅助函数库
 * 提供集成测试常用的辅助函数，简化测试代码编写
 */

import type {
  ActionType,
  RequestActionMessage,
  ActionResultMessage,
  PluginSettings,
} from '../../shared/types';
import { handleActionRequest } from '../../background/index';
import { recordRequest, recordResponse } from './messaging';

/**
 * 模拟 Content 层发送消息到 Background 层
 * @param action 操作类型
 * @param data 操作数据
 * @returns Background 层的响应
 */
export async function sendRequestAction(
  action: ActionType,
  data?: unknown
): Promise<ActionResultMessage['payload']> {
  // 构造请求消息
  const request: RequestActionMessage = {
    type: 'REQUEST_ACTION',
    payload: {
      action,
      data,
    },
  };
  
  // 记录请求
  recordRequest(request);
  
  // 调用 Background 层的处理函数
  const response = await handleActionRequest(request.payload);
  
  // 记录响应
  recordResponse(response);
  
  return response;
}

/**
 * 模拟完整的用户交互流程
 * @param action 操作类型
 * @param data 操作数据
 * @param options 测试选项
 * @returns Background 层的响应
 */
export async function simulateUserAction(
  action: ActionType,
  data?: unknown,
  options?: {
    usageCount?: number;  // 当前使用次数
    hasPro?: boolean;     // 是否有 Pro 权限
  }
): Promise<ActionResultMessage['payload']> {
  // 设置测试状态
  if (options) {
    const state: Parameters<typeof setupTestState>[0] = {};
    if (options.usageCount !== undefined) {
      state.usageCount = options.usageCount;
    }
    if (options.hasPro !== undefined) {
      state.hasPro = options.hasPro;
    }
    await setupTestState(state);
  }
  
  // 发送请求
  return await sendRequestAction(action, data);
}

/**
 * 设置测试环境状态
 * @param state 要设置的状态
 */
export async function setupTestState(state: {
  usageCount?: number;
  usageDate?: string;
  hasPro?: boolean;
  settings?: Partial<PluginSettings>;
}): Promise<void> {
  // 设置使用次数（使用正确的存储键）
  if (state.usageCount !== undefined || state.usageDate !== undefined) {
    const today = state.usageDate || new Date().toDateString();
    await chrome.storage.local.set({
      usage_count: state.usageCount || 0,
      last_usage_date: today,
    });
  }
  
  // 设置 Pro 权限（使用正确的存储键和格式）
  if (state.hasPro !== undefined) {
    await chrome.storage.local.set({
      pro_state: {
        isPro: state.hasPro,
        signature: state.hasPro ? 'test-signature' : '',
        features: {
          'table-detect': state.hasPro,
          'column-align': state.hasPro,
          'csv-export': state.hasPro,
        },
      },
    });
  }
  
  // 设置插件配置（直接存储 enabled 和 panelPosition）
  if (state.settings) {
    const updates: Record<string, unknown> = {};
    if (state.settings.enabled !== undefined) {
      updates.enabled = state.settings.enabled;
    }
    if (state.settings.panelPosition !== undefined) {
      updates.panelPosition = state.settings.panelPosition;
    }
    await chrome.storage.local.set(updates);
  }
}

/**
 * 清理测试环境
 */
export async function cleanupTestState(): Promise<void> {
  // 清空所有存储
  await chrome.storage.local.clear();
  
  // 重置为默认状态（使用正确的存储键）
  await chrome.storage.local.set({
    usage_count: 0,
    last_usage_date: new Date().toDateString(),
    pro_state: {
      isPro: false,
      signature: '',
      features: {
        'table-detect': false,
        'column-align': false,
        'csv-export': false,
      },
    },
    enabled: false,
    panelPosition: 'center',
  });
}

/**
 * 等待异步操作完成
 * @param ms 等待时间（毫秒），默认 0
 */
export async function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 验证消息格式
 * @param message 要验证的消息
 * @param type 消息类型
 * @returns 是否符合格式
 */
export function validateMessageFormat(
  message: unknown,
  type: 'REQUEST_ACTION' | 'ACTION_RESULT'
): boolean {
  if (!message || typeof message !== 'object') {
    return false;
  }
  
  const msg = message as Record<string, unknown>;
  
  if (type === 'REQUEST_ACTION') {
    // 验证 REQUEST_ACTION 格式
    if (msg.type !== 'REQUEST_ACTION') {
      return false;
    }
    
    const payload = msg.payload as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    
    // 验证 action 字段
    const validActions = ['text-extract', 'table-detect', 'column-align', 'csv-export'];
    if (!validActions.includes(payload.action as string)) {
      return false;
    }
    
    return true;
  } else if (type === 'ACTION_RESULT') {
    // 验证 ACTION_RESULT 格式
    if (msg.type !== 'ACTION_RESULT') {
      return false;
    }
    
    const payload = msg.payload as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') {
      return false;
    }
    
    // 验证必需字段
    const validStatuses = ['ok', 'limited', 'blocked'];
    if (!validStatuses.includes(payload.status as string)) {
      return false;
    }
    
    const validUIActions = ['SHOW_RESULT_PANEL', 'SHOW_LIMIT_PANEL', 'SHOW_PRO_PANEL'];
    if (!validUIActions.includes(payload.uiAction as string)) {
      return false;
    }
    
    return true;
  }
  
  return false;
}
