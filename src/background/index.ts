/**
 * Background 入口 - 仅负责消息监听和路由
 * 
 * 职责：
 * - Chrome API 监听器注册
 * - 消息路由到 handlers
 * - 快捷键处理
 * 
 * 注意：此文件不能有任何 export，否则 Chrome 插件无法加载
 */

import type { ExtensionMessage } from '../shared/types';
import { handleActionRequest } from './handlers';
import { getSettings, updateSettings } from './settings';

/**
 * 处理消息 - 路由到对应的处理器
 */
async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  try {
    if (message.type === 'REQUEST_ACTION') {
      return await handleActionRequest(message.payload);
    } else {
      return { error: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Message handling error:', error);
    // 统一异常兜底返回
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
 * 消息监听器
 */
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) => {
  // 处理消息并发送响应
  handleMessage(message).then(sendResponse);
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 快捷键处理
 */
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
