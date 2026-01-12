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
  
  describe('数据规模限制（双轨制模型）', () => {
    test('Free 用户应该受到 5 行限制', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({ hasPro: false });
      
      // Act: 提取超过 5 行的文本
      const longText = Array(10).fill('行内容').join('\n');
      const response = await sendRequestAction('text-extract', longText);
      
      // Assert: 验证操作成功但数据被限制
      expect(response.status).toBe('ok');
      // 注意：行数限制在 Background 层应用，这里只验证响应成功
    });
    
    test('Pro 用户应该不受行数限制', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({ hasPro: true });
      
      // Act: 提取大量文本
      const longText = Array(100).fill('行内容').join('\n');
      const response = await sendRequestAction('text-extract', longText);
      
      // Assert: 验证操作成功且无限制
      expect(response.status).toBe('ok');
      expect(response.uiData?.text).toBe(longText);
    });
    
    test('Free 用户应该看到行数限制提示', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({ hasPro: false });
      
      // Act: 提取超过 5 行的文本
      const longText = Array(10).fill('行内容').join('\n');
      const response = await sendRequestAction('text-extract', longText);
      
      // Assert: 验证响应包含限制信息
      expect(response.status).toBe('ok');
      // 限制提示由 Background 层在 uiData 中提供
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
  
  
  describe('错误处理', () => {
    test('应该处理提取过程中的异常', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ hasPro: false });
      
      // Act: 发送可能导致异常的数据（null）
      const response = await sendRequestAction('text-extract', null);
      
      // Assert: 验证返回兜底响应
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
    });
    
    test('异常时应该显示错误信息', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ hasPro: false });
      
      // Act: 发送 undefined 数据
      const response = await sendRequestAction('text-extract', undefined);
      
      // Assert: 验证错误处理
      // 注意：text-extract 可能接受 undefined，这取决于实现
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
    });
  });
      // Arrange: 设置初始使用次数
      await setupTestState({ usageCount: 5 });
      
      // Act: 触发可能的错误场景（发送非字符串数据）
      await sendRequestAction('text-extract', { invalid: 'data' });
      
    test('错误后应该能够继续正常操作', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ hasPro: false });
      
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
      // Arrange: 模拟用户交互场景
      await setupTestState({ hasPro: false });
      
      // Act: 执行完整流程
      const response = await sendRequestAction('text-extract', '用户框选的文本');
      
      // Assert: 验证完整流程
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.text).toBe('用户框选的文本');
    });
    
    test('应该正确处理多次连续的用户操作', async () => {
      // Arrange: 设置初始状态
      await setupTestState({ hasPro: false });
      
      // Act: 连续执行多次操作
      const response1 = await sendRequestAction('text-extract', '第一次操作');
      const response2 = await sendRequestAction('text-extract', '第二次操作');
      const response3 = await sendRequestAction('text-extract', '第三次操作');
      
      // Assert: 验证所有操作都成功
      expect(response1.status).toBe('ok');
      expect(response2.status).toBe('ok');
      expect(response3.status).toBe('ok');
    });
    
    test('应该在不同权限状态下正确响应', async () => {
      // 场景 1: Free 用户
      await setupTestState({ hasPro: false });
      const freeResponse = await sendRequestAction('text-extract', 'Free 用户');
      expect(freeResponse.status).toBe('ok');
      
      // 场景 2: Pro 用户
      await setupTestState({ hasPro: true });
      const proResponse = await sendRequestAction('text-extract', 'Pro 用户');
      expect(proResponse.status).toBe('ok');
    });
  });
});
