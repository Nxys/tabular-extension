import { Page } from '@playwright/test';
import { ExtensionMessage, RequestActionMessage, ActionResultMessage } from '../../../src/shared/types';

/**
 * 消息监听器
 * 用于监听和验证 Content 与 Background 的消息通信
 */
export class MessageSpy {
  private messages: ExtensionMessage[] = [];
  private isListening = false;
  private page: Page | null = null;

  /**
   * 开始监听消息
   * @param page Playwright Page 对象
   */
  async start(page: Page): Promise<void> {
    this.page = page;
    this.isListening = true;
    this.messages = [];

    // 在当前页面注入消息拦截脚本
    await page.evaluate(() => {
      // 创建消息存储（如果不存在）
      if (!(window as any).__messageSpyData__) {
        (window as any).__messageSpyData__ = [];
      }

      // 监听 message 事件（主要的消息通信方式）
      if (!(window as any).__messageSpyListenerAdded__) {
        (window as any).__messageSpyListenerAdded__ = true;
        window.addEventListener('message', (event) => {
          const message = event.data;
          if (message && (message.type === 'REQUEST_ACTION' || message.type === 'ACTION_RESULT')) {
            (window as any).__messageSpyData__.push({
              timestamp: Date.now(),
              message: JSON.parse(JSON.stringify(message))
            });
          }
        });
      }
    });
  }

  /**
   * 停止监听
   */
  stop(): void {
    this.isListening = false;
    this.page = null;
  }

  /**
   * 获取所有捕获的消息
   */
  getMessages(): ExtensionMessage[] {
    return [...this.messages];
  }

  /**
   * 从页面获取最新的消息
   */
  async fetchMessages(): Promise<void> {
    if (!this.page) return;

    const newMessages = await this.page.evaluate(() => {
      const data = (window as any).__messageSpyData__ || [];
      return data.map((item: any) => item.message);
    });

    // 只添加新消息
    const existingCount = this.messages.length;
    if (newMessages.length > existingCount) {
      this.messages = newMessages;
    }
  }

  /**
   * 获取最后一条 REQUEST_ACTION 消息
   */
  async getLastRequest(): Promise<RequestActionMessage | null> {
    await this.fetchMessages();
    
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].type === 'REQUEST_ACTION') {
        return this.messages[i] as RequestActionMessage;
      }
    }
    return null;
  }

  /**
   * 获取最后一条 ACTION_RESULT 消息
   */
  async getLastResult(): Promise<ActionResultMessage | null> {
    await this.fetchMessages();
    
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].type === 'ACTION_RESULT') {
        return this.messages[i] as ActionResultMessage;
      }
    }
    return null;
  }

  /**
   * 等待特定类型的消息
   * @param type 消息类型
   * @param timeout 超时时间（毫秒）
   */
  async waitForMessage(
    type: 'REQUEST_ACTION' | 'ACTION_RESULT',
    timeout: number = 5000
  ): Promise<ExtensionMessage> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      await this.fetchMessages();
      
      // 查找匹配类型的消息
      for (let i = this.messages.length - 1; i >= 0; i--) {
        if (this.messages[i].type === type) {
          return this.messages[i];
        }
      }
      
      // 等待一小段时间再重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`等待消息超时: ${type} (${timeout}ms)`);
  }

  /**
   * 清空消息记录
   */
  async clear(): Promise<void> {
    this.messages = [];
    
    if (this.page) {
      await this.page.evaluate(() => {
        (window as any).__messageSpyData__ = [];
      });
    }
  }
}
