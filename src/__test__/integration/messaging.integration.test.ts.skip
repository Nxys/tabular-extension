/**
 * 消息通信集成测试
 * 验证 Content 层和 Background 层之间的消息传递协议
 * 
 * Feature: integration-testing
 * 需求：1.1, 1.2, 1.3, 1.4
 */

import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import {
  sendRequestAction,
  setupTestState,
  cleanupTestState,
  validateMessageFormat,
} from './helpers';
import {
  getMessageHistory,
  clearMessageHistory,
  setMessageInterceptor,
  clearMessageInterceptor,
} from './messaging';
import type { RequestActionMessage } from '../../shared/types';

// 设置 chrome mock
beforeAll(() => {
  (global as any).chrome = createChromeMock();
});

// 每个测试前重置状态
beforeEach(async () => {
  resetChromeMock();
  clearMessageInterceptor();
  clearMessageHistory();
  await cleanupTestState();
});

describe('消息通信集成测试', () => {
  describe('Content → Background 消息传递', () => {
    test('应该正确发送 REQUEST_ACTION 消息', async () => {
      // Arrange: 设置消息拦截器
      const capturedRequests: RequestActionMessage[] = [];
      setMessageInterceptor({
        onRequest: (msg) => capturedRequests.push(msg),
      });
      
      // Act: 发送文本提取请求
      await sendRequestAction('text-extract', '测试文本');
      
      // Assert: 验证消息被正确发送
      expect(capturedRequests).toHaveLength(1);
      expect(capturedRequests[0].type).toBe('REQUEST_ACTION');
      expect(capturedRequests[0].payload.action).toBe('text-extract');
      expect(capturedRequests[0].payload.data).toBe('测试文本');
    });
    
    test('应该正确发送不同类型的 action', async () => {
      // Arrange: 清空历史
      clearMessageHistory();
      
      // Act: 发送多个不同类型的请求
      await sendRequestAction('text-extract', '文本');
      await sendRequestAction('table-detect', [['A', 'B']]);
      await sendRequestAction('column-align', [['C', 'D']]);
      await sendRequestAction('csv-export', [['E', 'F']]);
      
      // Assert: 验证所有消息都被记录
      const history = getMessageHistory();
      expect(history.requests).toHaveLength(4);
      expect(history.requests[0].payload.action).toBe('text-extract');
      expect(history.requests[1].payload.action).toBe('table-detect');
      expect(history.requests[2].payload.action).toBe('column-align');
      expect(history.requests[3].payload.action).toBe('csv-export');
    });
    
    test('应该正确传递 data 参数', async () => {
      // Arrange: 准备测试数据
      const testData = {
        text: '复杂数据',
        table: [['A', 'B'], ['C', 'D']],
        nested: { value: 123 },
      };
      
      // Act: 发送带有复杂数据的请求
      await sendRequestAction('text-extract', testData);
      
      // Assert: 验证数据被正确传递
      const history = getMessageHistory();
      expect(history.requests[0].payload.data).toEqual(testData);
    });
    
    test('REQUEST_ACTION 消息应该符合协议格式', async () => {
      // Act: 发送请求
      await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证消息格式
      const history = getMessageHistory();
      const message = history.requests[0];
      
      expect(validateMessageFormat(message, 'REQUEST_ACTION')).toBe(true);
      expect(message).toHaveProperty('type', 'REQUEST_ACTION');
      expect(message).toHaveProperty('payload');
      expect(message.payload).toHaveProperty('action');
    });
  });
  
  describe('Background → Content 响应传递', () => {
    test('应该接收到 ACTION_RESULT 响应', async () => {
      // Act: 发送请求并接收响应
      const response = await sendRequestAction('text-extract', '测试文本');
      
      // Assert: 验证响应存在
      expect(response).toBeDefined();
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
    });
    
    test('成功操作应该返回 status: ok', async () => {
      // Arrange: 设置初始状态（未达到限制）
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送文本提取请求
      const response = await sendRequestAction('text-extract', '测试文本');
      
      // Assert: 验证响应状态
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.text).toBe('测试文本');
    });
    
    test('达到限制应该返回 status: limited', async () => {
      // Arrange: 设置使用次数达到上限（免费策略是 20 次）
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      // Act: 发送请求
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证限制响应
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toContain('免费次数已用完');
    });
    
    test('无 Pro 权限应该返回 status: blocked', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送需要 Pro 权限的请求
      const response = await sendRequestAction('table-detect', [['A', 'B']]);
      
      // Assert: 验证权限阻止响应
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro 功能');
    });
    
    test('ACTION_RESULT 响应应该符合协议格式', async () => {
      // Act: 发送请求并接收响应
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证响应格式
      const resultMessage = {
        type: 'ACTION_RESULT',
        payload: response,
      };
      
      expect(validateMessageFormat(resultMessage, 'ACTION_RESULT')).toBe(true);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
      expect(['ok', 'limited', 'blocked']).toContain(response.status);
      expect(['SHOW_RESULT_PANEL', 'SHOW_LIMIT_PANEL', 'SHOW_PRO_PANEL']).toContain(response.uiAction);
    });
    
    test('响应应该包含正确的 uiData', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送文本提取请求
      const response = await sendRequestAction('text-extract', '测试文本内容');
      
      // Assert: 验证 uiData
      expect(response.uiData).toBeDefined();
      expect(response.uiData?.text).toBe('测试文本内容');
    });
  });
  
  describe('消息格式验证', () => {
    test('应该验证有效的 REQUEST_ACTION 消息', () => {
      const validMessage = {
        type: 'REQUEST_ACTION',
        payload: {
          action: 'text-extract',
          data: '测试',
        },
      };
      
      expect(validateMessageFormat(validMessage, 'REQUEST_ACTION')).toBe(true);
    });
    
    test('应该拒绝无效的 action 类型', () => {
      const invalidMessage = {
        type: 'REQUEST_ACTION',
        payload: {
          action: 'invalid-action',
          data: '测试',
        },
      };
      
      expect(validateMessageFormat(invalidMessage, 'REQUEST_ACTION')).toBe(false);
    });
    
    test('应该拒绝缺少 payload 的消息', () => {
      const invalidMessage = {
        type: 'REQUEST_ACTION',
      };
      
      expect(validateMessageFormat(invalidMessage, 'REQUEST_ACTION')).toBe(false);
    });
    
    test('应该验证有效的 ACTION_RESULT 消息', () => {
      const validMessage = {
        type: 'ACTION_RESULT',
        payload: {
          status: 'ok',
          uiAction: 'SHOW_RESULT_PANEL',
        },
      };
      
      expect(validateMessageFormat(validMessage, 'ACTION_RESULT')).toBe(true);
    });
    
    test('应该拒绝无效的 status', () => {
      const invalidMessage = {
        type: 'ACTION_RESULT',
        payload: {
          status: 'invalid-status',
          uiAction: 'SHOW_RESULT_PANEL',
        },
      };
      
      expect(validateMessageFormat(invalidMessage, 'ACTION_RESULT')).toBe(false);
    });
    
    test('应该拒绝无效的 uiAction', () => {
      const invalidMessage = {
        type: 'ACTION_RESULT',
        payload: {
          status: 'ok',
          uiAction: 'INVALID_ACTION',
        },
      };
      
      expect(validateMessageFormat(invalidMessage, 'ACTION_RESULT')).toBe(false);
    });
  });
  
  describe('异步消息处理', () => {
    test('应该正确处理异步响应', async () => {
      // Act: 发送请求（handleActionRequest 是异步的）
      const startTime = Date.now();
      const response = await sendRequestAction('text-extract', '测试');
      const endTime = Date.now();
      
      // Assert: 验证异步处理完成
      expect(response).toBeDefined();
      expect(endTime - startTime).toBeGreaterThanOrEqual(0);
    });
    
    test('应该按顺序处理多个异步请求', async () => {
      // Arrange: 清空历史
      clearMessageHistory();
      
      // Act: 连续发送多个请求
      const responses = await Promise.all([
        sendRequestAction('text-extract', '请求1'),
        sendRequestAction('text-extract', '请求2'),
        sendRequestAction('text-extract', '请求3'),
      ]);
      
      // Assert: 验证所有请求都得到响应
      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('uiAction');
      });
      
      // 验证消息历史
      const history = getMessageHistory();
      expect(history.requests).toHaveLength(3);
      expect(history.responses).toHaveLength(3);
    });
    
    test('应该正确处理并发请求', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 并发发送多个请求
      const [response1, response2, response3] = await Promise.all([
        sendRequestAction('text-extract', '并发1'),
        sendRequestAction('text-extract', '并发2'),
        sendRequestAction('text-extract', '并发3'),
      ]);
      
      // Assert: 验证所有响应都正确
      expect(response1.status).toBe('ok');
      expect(response2.status).toBe('ok');
      expect(response3.status).toBe('ok');
    });
  });
  
  describe('消息错误处理', () => {
    test('应该处理无效的 action 类型', async () => {
      // Act: 发送无效的 action 类型
      const response = await sendRequestAction('invalid-action' as any, '测试');
      
      // Assert: 验证返回兜底响应
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.message).toBeDefined();
    });
    
    test('无效 action 应该返回错误提示', async () => {
      // Act: 发送未知的 action
      const response = await sendRequestAction('unknown-action' as any, null);
      
      // Assert: 验证错误响应格式
      expect(response).toHaveProperty('status', 'blocked');
      expect(response).toHaveProperty('uiAction', 'SHOW_RESULT_PANEL');
      expect(response.uiData).toHaveProperty('message');
      expect(typeof response.uiData?.message).toBe('string');
    });
    
    test('兜底响应应该符合协议格式', async () => {
      // Act: 触发错误场景
      const response = await sendRequestAction('invalid' as any, {});
      
      // Assert: 验证兜底响应格式
      const resultMessage = {
        type: 'ACTION_RESULT',
        payload: response,
      };
      
      expect(validateMessageFormat(resultMessage, 'ACTION_RESULT')).toBe(true);
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    });
    
    test('错误响应应该包含用户友好的消息', async () => {
      // Act: 发送无效请求
      const response = await sendRequestAction('bad-action' as any, null);
      
      // Assert: 验证错误消息存在且有意义
      expect(response.uiData?.message).toBeDefined();
      expect(response.uiData?.message).not.toBe('');
      expect(typeof response.uiData?.message).toBe('string');
    });
    
    test('多个错误请求应该都返回兜底响应', async () => {
      // Act: 发送多个无效请求
      const responses = await Promise.all([
        sendRequestAction('invalid1' as any, null),
        sendRequestAction('invalid2' as any, null),
        sendRequestAction('invalid3' as any, null),
      ]);
      
      // Assert: 验证所有响应都是兜底响应
      responses.forEach(response => {
        expect(response.status).toBe('blocked');
        expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
        expect(response.uiData?.message).toBeDefined();
      });
    });
    
    test('错误不应该影响后续正常请求', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 先发送错误请求，再发送正常请求
      const errorResponse = await sendRequestAction('invalid' as any, null);
      const normalResponse = await sendRequestAction('text-extract', '正常文本');
      
      // Assert: 验证错误不影响后续请求
      expect(errorResponse.status).toBe('blocked');
      expect(normalResponse.status).toBe('ok');
      expect(normalResponse.uiData?.text).toBe('正常文本');
    });
  });
});
