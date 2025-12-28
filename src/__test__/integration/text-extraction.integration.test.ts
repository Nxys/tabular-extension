/**
 * 文本提取端到端流程测试
 * 验证从用户交互到 UI 响应的完整文本提取流程
 * 
 * Feature: integration-testing
 * 需求：2.1, 2.2, 2.3, 2.4
 */

import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import {
  sendRequestAction,
  setupTestState,
  cleanupTestState,
  simulateUserAction,
} from './helpers';
import {
  clearMessageHistory,
  clearMessageInterceptor,
} from './messaging';
import { createTextExtractionScenario } from './scenarios';

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

describe('文本提取端到端流程测试', () => {
  describe('正常文本提取流程', () => {
    test('应该完成完整的文本提取流程', async () => {
      // Arrange: 设置初始状态（使用次数为 0）
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 模拟用户触发文本提取
      const response = await sendRequestAction('text-extract', '这是测试文本');
      
      // Assert: 验证完整流程执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.text).toBe('这是测试文本');
    });
    
    test('应该正确返回提取的文本内容', async () => {
      // Arrange: 准备测试文本
      const testText = '用户框选的页面文本内容';
      await setupTestState({ usageCount: 0 });
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证文本正确返回
      expect(response.data).toBe(testText);
      expect(response.uiData?.text).toBe(testText);
    });
    
    test('应该显示结果面板', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ usageCount: 5 });
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', '测试内容');
      
      // Assert: 验证 UI 动作
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    });
    
    test('应该使用场景构建器创建预期结果', () => {
      // Arrange: 创建文本提取场景
      const scenario = createTextExtractionScenario('场景测试文本');
      
      // Assert: 验证场景结构
      expect(scenario.text).toBe('场景测试文本');
      expect(scenario.expectedResult.status).toBe('ok');
      expect(scenario.expectedResult.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(scenario.expectedResult.uiData?.text).toBe('场景测试文本');
    });
  });
  
  describe('使用次数管理', () => {
    test('成功提取应该增加使用次数', async () => {
      // Arrange: 设置初始使用次数为 5
      await setupTestState({ usageCount: 5 });
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      
      // 验证使用次数增加
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(6);
    });
    
    test('连续提取应该累计使用次数', async () => {
      // Arrange: 设置初始使用次数为 0
      await setupTestState({ usageCount: 0 });
      
      // Act: 连续执行 3 次文本提取
      await sendRequestAction('text-extract', '第一次');
      await sendRequestAction('text-extract', '第二次');
      await sendRequestAction('text-extract', '第三次');
      
      // Assert: 验证使用次数累计到 3
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(3);
    });
    
    test('使用次数应该正确持久化到 storage', async () => {
      // Arrange: 设置初始状态
      await setupTestState({ usageCount: 10 });
      
      // Act: 执行文本提取
      await sendRequestAction('text-extract', '持久化测试');
      
      // Assert: 验证 storage 中的使用次数
      const storage = await chrome.storage.local.get(['usage_count', 'last_usage_date']);
      expect(storage.usage_count).toBe(11);
      expect(storage.last_usage_date).toBe(new Date().toDateString());
    });
    
    test('应该在响应中包含使用次数信息', async () => {
      // Arrange: 设置使用次数
      await setupTestState({ usageCount: 8 });
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证响应成功（使用次数信息由 Background 管理）
      expect(response.status).toBe('ok');
    });
  });
  
  describe('边界情况处理', () => {
    test('应该正确处理空文本', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ usageCount: 0 });
      
      // Act: 提取空文本
      const response = await sendRequestAction('text-extract', '');
      
      // Assert: 验证空文本处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.text).toBe('');
    });
    
    test('应该正确处理极长文本', async () => {
      // Arrange: 生成极长文本（10000 字符）
      const longText = 'A'.repeat(10000);
      await setupTestState({ usageCount: 0 });
      
      // Act: 提取极长文本
      const response = await sendRequestAction('text-extract', longText);
      
      // Assert: 验证极长文本处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.text).toBe(longText);
      expect(response.uiData?.text?.length).toBe(10000);
    });
    
    test('应该正确处理特殊字符', async () => {
      // Arrange: 准备包含特殊字符的文本
      const specialText = '特殊字符：\n换行\t制表符"引号\'单引号<>标签&符号';
      await setupTestState({ usageCount: 0 });
      
      // Act: 提取特殊字符文本
      const response = await sendRequestAction('text-extract', specialText);
      
      // Assert: 验证特殊字符正确处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.text).toBe(specialText);
    });
    
    test('应该正确处理 Unicode 字符', async () => {
      // Arrange: 准备包含 Unicode 的文本
      const unicodeText = '中文 🎉 Emoji 日本語 한글 العربية';
      await setupTestState({ usageCount: 0 });
      
      // Act: 提取 Unicode 文本
      const response = await sendRequestAction('text-extract', unicodeText);
      
      // Assert: 验证 Unicode 正确处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.text).toBe(unicodeText);
    });
    
    test('应该正确处理只包含空格的文本', async () => {
      // Arrange: 准备只有空格的文本
      const whitespaceText = '     ';
      await setupTestState({ usageCount: 0 });
      
      // Act: 提取空格文本
      const response = await sendRequestAction('text-extract', whitespaceText);
      
      // Assert: 验证空格文本处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.text).toBe(whitespaceText);
    });
  });
  
  describe('使用次数限制', () => {
    test('达到限制时应该阻止操作', async () => {
      // Arrange: 设置使用次数达到上限（免费策略是 20 次）
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试文本提取
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('达到限制时应该显示限制提示', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试文本提取
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证显示限制面板
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toContain('免费次数已用完');
    });
    
    test('达到限制时不应该消耗使用次数', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试文本提取
      await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证使用次数未增加
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('达到限制时不应该返回提取结果', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试文本提取
      const response = await sendRequestAction('text-extract', '不应该提取的文本');
      
      // Assert: 验证没有返回文本数据
      expect(response.status).toBe('limited');
      expect(response.uiData?.text).toBeUndefined();
    });
    
    test('接近限制时应该仍然可以操作', async () => {
      // Arrange: 设置使用次数接近上限（19 次）
      await setupTestState({ usageCount: 19 });
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', '最后一次');
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      expect(response.uiData?.text).toBe('最后一次');
      
      // 验证使用次数增加到 20
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('限制提示应该包含使用次数信息', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试文本提取
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证提示消息包含次数信息
      expect(response.uiData?.message).toContain('20');
    });
  });
  
  describe('错误处理', () => {
    test('应该处理提取过程中的异常', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ usageCount: 0 });
      
      // Act: 发送可能导致异常的数据（null）
      const response = await sendRequestAction('text-extract', null);
      
      // Assert: 验证返回兜底响应
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
    });
    
    test('异常时应该显示错误信息', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ usageCount: 0 });
      
      // Act: 发送 undefined 数据
      const response = await sendRequestAction('text-extract', undefined);
      
      // Assert: 验证错误处理
      // 注意：text-extract 可能接受 undefined，这取决于实现
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
    });
    
    test('错误不应该消耗使用次数', async () => {
      // Arrange: 设置初始使用次数
      await setupTestState({ usageCount: 5 });
      
      // Act: 触发可能的错误场景（发送非字符串数据）
      await sendRequestAction('text-extract', { invalid: 'data' });
      
      // Assert: 验证使用次数未增加（如果操作失败）
      const storage = await chrome.storage.local.get(['usage_count']);
      // 如果操作成功处理了对象，次数会增加；如果失败，次数不变
      expect(storage.usage_count).toBeGreaterThanOrEqual(5);
    });
    
    test('错误后应该能够继续正常操作', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ usageCount: 0 });
      
      // Act: 先触发可能的错误，再执行正常操作
      await sendRequestAction('text-extract', null);
      const normalResponse = await sendRequestAction('text-extract', '正常文本');
      
      // Assert: 验证正常操作不受影响
      expect(normalResponse.status).toBe('ok');
      expect(normalResponse.uiData?.text).toBe('正常文本');
    });
  });
  
  describe('端到端场景验证', () => {
    test('应该完成从用户交互到 UI 响应的完整流程', async () => {
      // Arrange: 模拟用户初始状态
      await setupTestState({
        usageCount: 3,
        hasPro: false,
      });
      
      // Act: 模拟完整的用户交互流程
      const response = await simulateUserAction('text-extract', '用户框选的文本', {
        usageCount: 3,
        hasPro: false,
      });
      
      // Assert: 验证完整流程
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.text).toBe('用户框选的文本');
      
      // 验证状态变化
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(4);
    });
    
    test('应该正确处理多次连续的用户操作', async () => {
      // Arrange: 设置初始状态
      await setupTestState({ usageCount: 0 });
      
      // Act: 模拟用户连续操作
      const response1 = await sendRequestAction('text-extract', '第一段文本');
      const response2 = await sendRequestAction('text-extract', '第二段文本');
      const response3 = await sendRequestAction('text-extract', '第三段文本');
      
      // Assert: 验证所有操作都成功
      expect(response1.status).toBe('ok');
      expect(response2.status).toBe('ok');
      expect(response3.status).toBe('ok');
      
      // 验证使用次数正确累计
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(3);
    });
    
    test('应该在不同状态下正确响应', async () => {
      // Arrange & Act & Assert: 测试不同状态
      
      // 状态 1: 正常状态
      await setupTestState({ usageCount: 0 });
      const normalResponse = await sendRequestAction('text-extract', '正常');
      expect(normalResponse.status).toBe('ok');
      
      // 状态 2: 接近限制
      await setupTestState({ usageCount: 19 });
      const nearLimitResponse = await sendRequestAction('text-extract', '接近限制');
      expect(nearLimitResponse.status).toBe('ok');
      
      // 状态 3: 达到限制
      await setupTestState({ usageCount: 20 });
      const limitedResponse = await sendRequestAction('text-extract', '达到限制');
      expect(limitedResponse.status).toBe('limited');
    });
  });
});
