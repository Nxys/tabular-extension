/**
 * 消息通信模拟器
 * 提供消息拦截和验证功能，支持异步消息处理
 */

import type {
  RequestActionMessage,
  ActionResultMessage,
} from '../../shared/types';

/**
 * 消息拦截器
 */
export interface MessageInterceptor {
  onRequest?: (message: RequestActionMessage) => void;
  onResponse?: (response: ActionResultMessage['payload']) => void;
}

/**
 * 消息历史记录
 */
interface MessageHistory {
  requests: RequestActionMessage[];
  responses: ActionResultMessage['payload'][];
}

// 全局消息拦截器
let globalInterceptor: MessageInterceptor | null = null;

// 全局消息历史
let messageHistory: MessageHistory = {
  requests: [],
  responses: [],
};

/**
 * 设置消息拦截器
 * @param interceptor 拦截器配置
 */
export function setMessageInterceptor(
  interceptor: MessageInterceptor
): void {
  globalInterceptor = interceptor;
}

/**
 * 清除消息拦截器
 */
export function clearMessageInterceptor(): void {
  globalInterceptor = null;
}

/**
 * 获取消息历史
 * @returns 消息历史记录
 */
export function getMessageHistory(): MessageHistory {
  return {
    requests: [...messageHistory.requests],
    responses: [...messageHistory.responses],
  };
}

/**
 * 清除消息历史
 */
export function clearMessageHistory(): void {
  messageHistory = {
    requests: [],
    responses: [],
  };
}

/**
 * 记录请求消息（内部使用）
 * @param message 请求消息
 */
export function recordRequest(message: RequestActionMessage): void {
  messageHistory.requests.push(message);
  if (globalInterceptor?.onRequest) {
    globalInterceptor.onRequest(message);
  }
}

/**
 * 记录响应消息（内部使用）
 * @param response 响应消息
 */
export function recordResponse(response: ActionResultMessage['payload']): void {
  messageHistory.responses.push(response);
  if (globalInterceptor?.onResponse) {
    globalInterceptor.onResponse(response);
  }
}
