// 后台服务脚本 - 处理扩展生命周期事件

import type { PluginSettings } from './types';

const IGNORED_URLS = [
  'chrome://',
  'chrome-extension://',
  'about:'
];

// 消息类型定义
interface ExtensionMessage {
  type: 'COPY_SUCCESS' | 'COPY_ERROR' | 'EXTENSION_ERROR';
  error?: string;
  data?: unknown;
}

// 扩展安装时的处理
chrome.runtime.onInstalled.addListener(() => {
  // 设置扩展图标和标题
  chrome.action.setTitle({
    title: '框选复制文本'
  });
});

// 扩展启动时的处理
chrome.runtime.onStartup.addListener(() => {

});

// 处理来自 content script 的消息
chrome.runtime.onMessage.addListener((
  request: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: { success: boolean; error?: string }) => void
) => {
  // 处理不同类型的消息
  switch (request.type) {
    case 'COPY_SUCCESS':
      // 复制成功的反馈
      break;

    case 'COPY_ERROR':
      // 复制失败的处理
      console.error('文本复制失败:', request.error);
      break;

    case 'EXTENSION_ERROR':
      // 扩展错误的处理
      console.error('扩展运行错误:', request.error);
      break;

    default:

  }

  // 发送响应
  sendResponse({ success: true });
});

// 监听快捷键命令
chrome.commands.onCommand.addListener(async (command: string) => {
  if (command === 'selection-switch') {
    // 获取当前设置
    const result = await chrome.storage.local.get(['enabled', 'panelPosition']);
    const currentEnabled = typeof result.enabled === 'boolean' ? result.enabled : false;

    // 切换启用状态
    const newSettings: PluginSettings = {
      enabled: !currentEnabled,
      panelPosition: result.panelPosition || 'center'
    };

    // 保存新设置
    await chrome.storage.local.set(newSettings);

    // 通知当前标签页
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    if (tab?.id && tab.url && !IGNORED_URLS.some(ignoredUrl => tab.url!.startsWith(ignoredUrl))) {
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'updateSettings', payload: newSettings });
      } catch (error) {
        // 内容脚本可能还未注入，忽略错误
      }
    }
  }
});
