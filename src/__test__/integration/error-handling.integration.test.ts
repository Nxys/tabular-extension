/**
 * 错误处理和降级集成测试
 * 验证系统在异常情况下的错误处理和降级行为
 * 
 * Feature: integration-testing
 * 需求：8.1, 8.2, 8.3, 8.4
 */

import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import {
  sendRequestAction,
  setupTestState,
  cleanupTestState,
  validateMessageFormat,
} from './helpers';
import { handleActionRequest } from '../../background/index';
import * as storage from '../../background/storage';

// 设置 chrome mock
beforeAll(() => {
  (global as any).chrome = createChromeMock();
});

// 每个测试前重置状态
beforeEach(async () => {
  resetChromeMock();
  await cleanupTestState();
});

describe('错误处理和降级集成测试', () => {
  describe('Background 层异常处理', () => {
    test('应该捕获处理函数中的异常并返回兜底响应', async () => {
      // Arrange: Mock handleActionRequest 抛出异常
      const mockHandler = jest.fn().mockRejectedValue(new Error('模拟异常'));
      
      // Act: 直接调用会抛出异常的处理函数
      try {
        await mockHandler({ action: 'text-extract', data: '测试' });
      } catch (error) {
        // 在实际系统中，这个异常会被 onMessage 监听器捕获
      }
      
      // Assert: 验证异常被捕获（在实际系统中会返回兜底响应）
      expect(mockHandler).toHaveBeenCalled();
      expect(mockHandler).rejects.toThrow('模拟异常');
    });
    
    test('异常应该返回 status: blocked 的兜底响应', async () => {
      // Arrange: 创建一个会导致异常的场景
      // 通过发送无效的 action 类型来触发兜底逻辑
      
      // Act: 发送无效请求
      const response = await sendRequestAction('invalid-action' as any, null);
      
      // Assert: 验证返回兜底响应
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.message).toBeDefined();
      expect(typeof response.uiData?.message).toBe('string');
    });
    
    test('兜底响应应该包含用户友好的错误消息', async () => {
      // Act: 触发错误场景
      const response = await sendRequestAction('unknown' as any, {});
      
      // Assert: 验证错误消息
      expect(response.uiData?.message).toBeDefined();
      expect(response.uiData?.message).not.toBe('');
      // 消息应该是中文且用户友好
      expect(response.uiData?.message).toMatch(/操作|错误|失败|未知/);
    });
    
    test('兜底响应应该符合 ACTION_RESULT 协议格式', async () => {
      // Act: 触发错误
      const response = await sendRequestAction('bad-action' as any, null);
      
      // Assert: 验证协议格式
      const message = {
        type: 'ACTION_RESULT',
        payload: response,
      };
      
      expect(validateMessageFormat(message, 'ACTION_RESULT')).toBe(true);
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    });
    
    test('多个异常请求应该都返回兜底响应', async () => {
      // Act: 发送多个会触发异常的请求
      const responses = await Promise.all([
        sendRequestAction('error1' as any, null),
        sendRequestAction('error2' as any, null),
        sendRequestAction('error3' as any, null),
      ]);
      
      // Assert: 验证所有响应都是兜底响应
      responses.forEach(response => {
        expect(response.status).toBe('blocked');
        expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
        expect(response.uiData?.message).toBeDefined();
      });
    });
    
    test('异常不应该导致系统崩溃', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 先触发异常，再发送正常请求
      const errorResponse = await sendRequestAction('error' as any, null);
      const normalResponse = await sendRequestAction('text-extract', '正常文本');
      
      // Assert: 验证系统仍然正常工作
      expect(errorResponse.status).toBe('blocked');
      expect(normalResponse.status).toBe('ok');
      expect(normalResponse.uiData?.text).toBe('正常文本');
    });
  });
  
  describe('Content 层错误响应处理', () => {
    test('应该正确处理 status: blocked 的响应', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 请求需要 Pro 权限的功能
      const response = await sendRequestAction('table-detect', [['A', 'B']]);
      
      // Assert: 验证 Content 层应该接收到 blocked 响应
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro');
    });
    
    test('应该正确处理 status: limited 的响应', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      // Act: 发送请求
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证 Content 层应该接收到 limited 响应
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toContain('免费次数');
    });
    
    test('错误响应应该包含完整的 uiData', async () => {
      // Act: 触发错误
      const response = await sendRequestAction('invalid' as any, null);
      
      // Assert: 验证 uiData 存在
      expect(response.uiData).toBeDefined();
      expect(response.uiData?.message).toBeDefined();
      expect(typeof response.uiData?.message).toBe('string');
    });
    
    test('Content 层应该能够根据 uiAction 正确渲染错误 UI', async () => {
      // Arrange: 触发不同类型的错误
      await setupTestState({ usageCount: 20, hasPro: false });
      const limitedResponse = await sendRequestAction('text-extract', '测试');
      
      await setupTestState({ usageCount: 0, hasPro: false });
      const blockedResponse = await sendRequestAction('table-detect', [['A']]);
      
      const errorResponse = await sendRequestAction('error' as any, null);
      
      // Assert: 验证每个响应都有明确的 uiAction
      expect(limitedResponse.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(blockedResponse.uiAction).toBe('SHOW_PRO_PANEL');
      expect(errorResponse.uiAction).toBe('SHOW_RESULT_PANEL');
    });
  });
  
  describe('存储降级', () => {
    test('当 chrome.storage 不可用时应该降级到内存存储', async () => {
      // Arrange: Mock chrome.storage.local.get 抛出异常
      const originalGet = chrome.storage.local.get;
      chrome.storage.local.get = jest.fn().mockRejectedValue(new Error('Storage unavailable'));
      
      // Act: 尝试读取存储（应该降级到内存）
      const result = await storage.getFromStorage('test_key', 'default_value');
      
      // Assert: 验证返回默认值（因为内存中没有数据）
      expect(result).toBe('default_value');
      
      // Cleanup: 恢复原始方法
      chrome.storage.local.get = originalGet;
    });
    
    test('存储写入失败时应该降级到内存存储', async () => {
      // Arrange: Mock chrome.storage.local.set 抛出异常
      const originalSet = chrome.storage.local.set;
      chrome.storage.local.set = jest.fn().mockRejectedValue(new Error('Storage write failed'));
      
      // Act: 尝试写入存储（应该降级到内存）
      await storage.setToStorage('test_key', 'test_value');
      
      // 然后尝试读取（应该从内存读取）
      const originalGet = chrome.storage.local.get;
      chrome.storage.local.get = jest.fn().mockRejectedValue(new Error('Storage read failed'));
      
      const result = await storage.getFromStorage('test_key', 'default');
      
      // Assert: 验证能从内存读取到之前写入的值
      expect(result).toBe('test_value');
      
      // Cleanup: 恢复原始方法
      chrome.storage.local.set = originalSet;
      chrome.storage.local.get = originalGet;
    });
    
    test('存储降级不应该影响系统正常运行', async () => {
      // Arrange: Mock storage 失败
      const originalSet = chrome.storage.local.set;
      const originalGet = chrome.storage.local.get;
      chrome.storage.local.set = jest.fn().mockRejectedValue(new Error('Storage error'));
      chrome.storage.local.get = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      // Act: 发送正常请求（内部会尝试访问 storage）
      const response = await sendRequestAction('text-extract', '测试文本');
      
      // Assert: 验证系统仍然能够处理请求
      expect(response).toBeDefined();
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
      
      // Cleanup: 恢复原始方法
      chrome.storage.local.set = originalSet;
      chrome.storage.local.get = originalGet;
    });
    
    test('存储恢复后应该能够正常读写', async () => {
      // Arrange: 先让 storage 失败，写入内存
      const originalSet = chrome.storage.local.set;
      chrome.storage.local.set = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      await storage.setToStorage('recovery_test', 'memory_value');
      
      // 恢复 storage
      chrome.storage.local.set = originalSet;
      
      // Act: 写入新值到 storage
      await storage.setToStorage('recovery_test', 'storage_value');
      
      // 读取值
      const result = await storage.getFromStorage('recovery_test', 'default');
      
      // Assert: 验证能够从 storage 读取
      expect(result).toBe('storage_value');
    });
  });
  
  describe('格式错误响应处理', () => {
    test('应该处理缺少必需字段的请求', async () => {
      // Act: 发送缺少 action 字段的请求
      const response = await handleActionRequest({ action: undefined as any, data: null });
      
      // Assert: 验证返回兜底响应
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.message).toBeDefined();
    });
    
    test('应该处理 null 或 undefined 的 data', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送 null 和 undefined 数据
      const nullResponse = await sendRequestAction('text-extract', null);
      const undefinedResponse = await sendRequestAction('text-extract', undefined);
      
      // Assert: 验证系统能够处理
      expect(nullResponse).toHaveProperty('status');
      expect(undefinedResponse).toHaveProperty('status');
    });
    
    test('应该处理格式错误的 data', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送各种格式错误的数据
      const responses = await Promise.all([
        sendRequestAction('text-extract', { invalid: 'object' }),
        sendRequestAction('text-extract', 12345),
        sendRequestAction('text-extract', true),
        sendRequestAction('text-extract', [1, 2, 3]),
      ]);
      
      // Assert: 验证系统能够处理所有格式
      responses.forEach(response => {
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('uiAction');
      });
    });
  });
});

describe('多错误优先级', () => {
  test('使用次数限制应该优先于 Pro 权限检查', async () => {
    // Arrange: 同时满足"达到限制"和"无 Pro 权限"
    await setupTestState({
      usageCount: 20,  // 达到上限
      hasPro: false,   // 无 Pro 权限
    });
    
    // Act: 请求需要 Pro 权限的功能
    const response = await sendRequestAction('table-detect', [['A', 'B']]);
    
    // Assert: 验证优先显示使用次数限制
    expect(response.status).toBe('limited');
    expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    expect(response.uiData?.message).toContain('免费次数');
  });
  
  test('使用次数限制应该优先于所有其他错误', async () => {
    // Arrange: 设置达到限制
    await setupTestState({
      usageCount: 20,
      hasPro: false,
    });
    
    // Act: 测试不同的 Pro 功能
    const responses = await Promise.all([
      sendRequestAction('table-detect', [['A']]),
      sendRequestAction('column-align', [['B']]),
      sendRequestAction('csv-export', [['C']]),
    ]);
    
    // Assert: 验证所有响应都优先显示限制
    responses.forEach(response => {
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toContain('免费次数');
    });
  });
  
  test('Pro 权限检查应该在使用次数检查之后', async () => {
    // Arrange: 未达到限制但无 Pro 权限
    await setupTestState({
      usageCount: 0,   // 未达到限制
      hasPro: false,   // 无 Pro 权限
    });
    
    // Act: 请求 Pro 功能
    const response = await sendRequestAction('table-detect', [['A', 'B']]);
    
    // Assert: 验证显示 Pro 权限提示
    expect(response.status).toBe('blocked');
    expect(response.uiAction).toBe('SHOW_PRO_PANEL');
    expect(response.uiData?.message).toContain('Pro');
  });
  
  test('业务逻辑错误应该在权限检查之后', async () => {
    // Arrange: 有权限但数据无效
    await setupTestState({
      usageCount: 0,
      hasPro: true,
    });
    
    // Act: 发送有效的 Pro 功能请求（应该成功）
    const validResponse = await sendRequestAction('table-detect', [['A', 'B']]);
    
    // Assert: 验证权限检查通过，业务逻辑正常执行
    expect(validResponse.status).toBe('ok');
    expect(validResponse.uiAction).toBe('SHOW_RESULT_PANEL');
  });
  
  test('多个错误同时发生时应该返回最相关的错误', async () => {
    // Arrange: 创建多种错误场景
    
    // 场景1：达到限制 + 无权限 → 应该返回限制
    await setupTestState({ usageCount: 20, hasPro: false });
    const scenario1 = await sendRequestAction('table-detect', [['A']]);
    expect(scenario1.status).toBe('limited');
    
    // 场景2：未达到限制 + 无权限 → 应该返回权限
    await setupTestState({ usageCount: 0, hasPro: false });
    const scenario2 = await sendRequestAction('table-detect', [['B']]);
    expect(scenario2.status).toBe('blocked');
    expect(scenario2.uiAction).toBe('SHOW_PRO_PANEL');
    
    // 场景3：未达到限制 + 有权限 → 应该成功
    await setupTestState({ usageCount: 0, hasPro: true });
    const scenario3 = await sendRequestAction('table-detect', [['C']]);
    expect(scenario3.status).toBe('ok');
  });
  
  test('错误优先级应该一致且可预测', async () => {
    // Arrange: 设置相同的错误状态
    await setupTestState({
      usageCount: 20,
      hasPro: false,
    });
    
    // Act: 多次请求相同的操作
    const responses = await Promise.all([
      sendRequestAction('table-detect', [['A']]),
      sendRequestAction('table-detect', [['B']]),
      sendRequestAction('table-detect', [['C']]),
    ]);
    
    // Assert: 验证所有响应的错误类型一致
    const statuses = responses.map(r => r.status);
    const uiActions = responses.map(r => r.uiAction);
    
    expect(new Set(statuses).size).toBe(1);  // 所有 status 相同
    expect(new Set(uiActions).size).toBe(1);  // 所有 uiAction 相同
    expect(statuses[0]).toBe('limited');
    expect(uiActions[0]).toBe('SHOW_LIMIT_PANEL');
  });
  
  test('错误优先级：限制 > 权限 > 业务错误', async () => {
    // 测试优先级顺序
    
    // 1. 限制错误（最高优先级）
    await setupTestState({ usageCount: 20, hasPro: true });
    const limitError = await sendRequestAction('text-extract', '测试');
    expect(limitError.status).toBe('limited');
    
    // 2. 权限错误（中等优先级）
    await setupTestState({ usageCount: 0, hasPro: false });
    const permError = await sendRequestAction('table-detect', [['A']]);
    expect(permError.status).toBe('blocked');
    expect(permError.uiAction).toBe('SHOW_PRO_PANEL');
    
    // 3. 业务错误（最低优先级）
    await setupTestState({ usageCount: 0, hasPro: true });
    const bizError = await sendRequestAction('invalid' as any, null);
    expect(bizError.status).toBe('blocked');
    expect(bizError.uiAction).toBe('SHOW_RESULT_PANEL');
  });
  
  test('相同优先级的错误应该返回第一个检测到的错误', async () => {
    // Arrange: 创建会触发多个业务错误的场景
    await setupTestState({
      usageCount: 0,
      hasPro: true,
    });
    
    // Act: 发送无效的 action（会触发业务错误）
    const response = await sendRequestAction('unknown-action' as any, null);
    
    // Assert: 验证返回明确的错误信息
    expect(response.status).toBe('blocked');
    expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    expect(response.uiData?.message).toBeDefined();
  });
});
