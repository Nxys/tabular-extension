import { Page } from '@playwright/test';
import type { ExtensionMessage, RequestActionMessage, ActionResultMessage } from '../../../shared/types';

/**
 * 消息监听器
 * 用于监听和验证 Content 与 Background 的消息通信
 */
export class MessageSpy {
  private messages: ExtensionMessage[] = [];
  private page: Page | null = null;

  /**
   * 开始监听消息
   */
  async start(page: Page): Promise<void> {
    this.page = page;
    this.messages = [];

    // 注入消息监听脚本到页面
    await page.addInitScript(() => {
      // 保存原始的 sendMessage 方法
      const originalSendMessage = chrome.runtime.sendMessage;
      
      // 创建消息存储
      (window as any).__messageLog__ = [];

      // 重写 sendMessage 方法
      chrome.runtime.sendMessage = function(...args: any[]) {
        const message = args[0];
        (window as any).__messageLog__.push({
          type: 'sent',
          message,
          timestamp: Date.now()
        });
        return originalSendMessage.apply(this, args);
      };

      // 监听接收的消息
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        (window as any).__messageLog__.push({
          type: 'received',
          message,
          timestamp: Date.now()
        });
        return false;
      });
    });
  }

  /**
   * 停止监听
   */
  stop(): void {
    this.page = null;
  }

  /**
   * 获取所有捕获的消息
   */
  async getMessages(): Promise<ExtensionMessage[]> {
    if (!this.page) return [];

    const logs = await this.page.evaluate(() => {
      return (window as any).__messageLog__ || [];
    });

    return logs.map((log: any) => log.message);
  }

  /**
   * 获取最后一条 REQUEST_ACTION 消息
   */
  async getLastRequest(): Promise<RequestActionMessage | null> {
    const messages = await this.getMessages();
    const requests = messages.filter(
      (msg): msg is RequestActionMessage => msg.type === 'REQUEST_ACTION'
    );
    return requests.length > 0 ? requests[requests.length - 1] : null;
  }

  /**
   * 获取最后一条 ACTION_RESULT 消息
   */
  async getLastResult(): Promise<ActionResultMessage | null> {
    const messages = await this.getMessages();
    const results = messages.filter(
      (msg): msg is ActionResultMessage => msg.type === 'ACTION_RESULT'
    );
    return results.length > 0 ? results[results.length - 1] : null;
  }

  /**
   * 等待特定类型的消息
   */
  async waitForMessage(
    type: 'REQUEST_ACTION' | 'ACTION_RESULT',
    timeout: number = 5000
  ): Promise<ExtensionMessage> {
    if (!this.page) {
      throw new Error('MessageSpy not started');
    }

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const messages = await this.getMessages();
      const message = messages.find(msg => msg.type === type);
      
      if (message) {
        return message;
      }

      // 等待一小段时间再检查
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`Timeout waiting for message type: ${type}`);
  }

  /**
   * 清空消息记录
   */
  async clear(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate(() => {
      (window as any).__messageLog__ = [];
    });
  }
}
