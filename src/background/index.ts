/**
 * Background 入口 + 消息分发 + Action 处理
 * 
 * 职责：
 * - 消息监听和路由
 * - Action 请求处理
 * - 统一异常兜底
 * - 快捷键处理
 * 
 * ActionHandler 职责边界说明：
 * - 当前允许：生成 uiData.message 文案
 * - 当前禁止：UI 状态管理、A/B 测试逻辑、国际化逻辑
 * - 架构演进：这是阶段性集中实现，未来可迁移至专用文案模块
 */

import type { ExtensionMessage, RequestActionMessage, ActionResultMessage } from '../shared/types';
import { checkUsage, consumeUsage, record } from './usage';
import { allow } from './pro';
import { getSettings, updateSettings } from './settings';

/**
 * 消息监听器
 */
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => {
  // 异步处理消息
  (async () => {
    try {
      if (message.type === 'REQUEST_ACTION') {
        const result = await handleActionRequest(message.payload);
        sendResponse(result);
      } else {
        sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handling error:', error);
      // 统一异常兜底返回
      sendResponse({
        status: 'blocked',
        uiAction: 'SHOW_RESULT_PANEL',
        uiData: {
          message: '操作失败，请重试'
        }
      });
    }
  })();
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 处理 Action 请求
 */
async function handleActionRequest(
  payload: RequestActionMessage['payload']
): Promise<ActionResultMessage['payload']> {
  const { action, data } = payload;
  
  try {
    // 1. 检查免费次数限制
    const usage = await checkUsage();
    if (!usage.allowed) {
      return {
        status: 'limited',
        uiAction: 'SHOW_LIMIT_PANEL',
        uiData: {
          message: `今日免费次数已用完 (${usage.max}/${usage.max})，明天将自动重置`
        }
      };
    }
    
    // 2. 根据 action 类型处理
    switch (action) {
      case 'text-extract':
        return await handleTextExtract(data);
      
      case 'table-detect':
        return await handleTableDetect(data);
      
      case 'column-align':
        return await handleColumnAlign(data);
      
      case 'csv-export':
        return await handleCSVExport(data);
      
      default:
        // 未知操作类型，返回兜底结果
        return {
          status: 'blocked',
          uiAction: 'SHOW_RESULT_PANEL',
          uiData: {
            message: '未知操作类型'
          }
        };
    }
  } catch (error) {
    // 统一异常兜底返回
    console.error('Action handler error:', error);
    return {
      status: 'blocked',
      uiAction: 'SHOW_RESULT_PANEL',
      uiData: {
        message: '操作失败，请重试'
      }
    };
  }
}

/**
 * 处理文本提取
 */
async function handleTextExtract(data: unknown): Promise<ActionResultMessage['payload']> {
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      text: data as string
    }
  };
  
  // 只在成功后记录和消耗 usage
  await record('select');
  await consumeUsage();
  
  return result;
}

/**
 * 处理表格检测
 */
async function handleTableDetect(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('table-detect')) {
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '表格识别是 Pro 功能，请升级以使用'
      }
    };
  }
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data
  };
  
  // 只在成功后记录和消耗 usage
  await record('table-detect');
  await consumeUsage();
  
  return result;
}

/**
 * 处理列对齐
 */
async function handleColumnAlign(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('column-align')) {
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: '列对齐是 Pro 功能，请升级以使用'
      }
    };
  }
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      table: data as string[][]
    }
  };
  
  // 只在成功后记录 usage（不消耗，因为已经在 table-detect 时消耗过）
  await record('column-align');
  
  return result;
}

/**
 * 处理 CSV 导出
 */
async function handleCSVExport(data: unknown): Promise<ActionResultMessage['payload']> {
  // 检查 Pro 权限
  if (!await allow('csv-export')) {
    return {
      status: 'blocked',
      uiAction: 'SHOW_PRO_PANEL',
      uiData: {
        message: 'CSV 导出是 Pro 功能，请升级以使用'
      }
    };
  }
  
  const result: ActionResultMessage['payload'] = {
    status: 'ok',
    uiAction: 'SHOW_RESULT_PANEL',
    data,
    uiData: {
      csv: data as string
    }
  };
  
  // 只在成功后记录 usage（不消耗，因为已经在 table-detect 时消耗过）
  await record('csv-export');
  
  return result;
}

// 快捷键处理
chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === 'selection-switch') {
    const settings = await getSettings();
    await updateSettings({ enabled: !settings.enabled });
    
    // 通知当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, { 
          type: 'updateSettings', 
          payload: { enabled: !settings.enabled } 
        });
      } catch (error) {
        // 内容脚本可能还未注入，忽略错误
      }
    }
  }
});
