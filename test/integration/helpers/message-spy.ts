import { Page } from '@playwright/test';
import type { ExtensionMessage, RequestActionMessage, ActionResultMessage } from '../../../src/shared/types';

/**
 * 消息监听器
 * 
 * 用于监听和验证 Content 与 Background 的消息通信。
 * 通过注入脚本拦截 chrome.runtime.sendMessage 和 chrome.runtime.onMessage，
 * 记录所有发送和接收的消息，用于集成测试中的消息协议验证。
 * 
 * @example
 * ```typescript
 * const spy = new MessageSpy();
 * await spy.start(page);
 * 
 * // 执行操作...
 * 
 * const request = await spy.getLastRequest();
 * expect(request?.payload.action).toBe('text-extract');
 * 
 * spy.stop();
 * ```
 */
export class MessageSpy {
  private messages: ExtensionMessage[] = [];
  private page: Page | null = null;

  /**
   * 开始监听消息
   * 
   * 注入脚本到页面，拦截所有 Chrome 扩展消息通信。
   * 必须在页面加载前或导航前调用，以确保脚本正确注入。
   * 
   * @param page Playwright Page 对象
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
   * 
   * 清理 page 引用，停止消息监听。
   * 注意：已记录的消息不会被清除，需要调用 clear() 方法。
   */
  stop(): void {
    this.page = null;
  }

  /**
   * 获取所有捕获的消息
   * 
   * 从页面中读取所有已记录的消息（包括发送和接收的消息）。
   * 
   * @returns 消息数组，如果未启动监听则返回空数组
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
   * 
   * 过滤所有消息，返回最后一条 Content 发送给 Background 的请求消息。
   * 
   * @returns REQUEST_ACTION 消息，如果没有则返回 null
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
   * 
   * 过滤所有消息，返回最后一条 Background 返回给 Content 的响应消息。
   * 
   * @returns ACTION_RESULT 消息，如果没有则返回 null
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
   * 
   * 轮询检查消息列表，直到找到指定类型的消息或超时。
   * 适用于需要等待异步消息通信完成的场景。
   * 
   * @param type 消息类型（REQUEST_ACTION 或 ACTION_RESULT）
   * @param timeout 超时时间（毫秒），默认 5000ms
   * @returns 找到的消息
   * @throws 如果超时未找到消息则抛出错误
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
   * 
   * 清除页面中已记录的所有消息，用于测试隔离。
   * 建议在每个测试用例开始前调用，确保消息记录不会相互干扰。
   */
  async clear(): Promise<void> {
    if (!this.page) return;

    await this.page.evaluate(() => {
      (window as any).__messageLog__ = [];
    });
  }
}
