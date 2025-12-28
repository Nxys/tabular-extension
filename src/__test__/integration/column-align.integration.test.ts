/**
 * 列对齐端到端流程测试
 * 验证从用户交互到 UI 响应的完整列对齐流程
 * 
 * Feature: integration-testing
 * 需求：4.1, 4.2, 4.3, 4.4
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

describe('列对齐端到端流程测试', () => {
  describe('正常列对齐流程', () => {
    test('应该完成完整的列对齐流程（有 Pro 权限）', async () => {
      // Arrange: 设置有 Pro 权限且未达到使用限制
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableData = [
        ['姓名', '年龄', '城市'],
        ['张三', '25', '北京'],
        ['李四', '30', '上海'],
      ];
      
      // Act: 模拟用户触发列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证完整流程执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.table).toEqual(tableData);
    });
    
    test('应该正确返回对齐后的表格数据', async () => {
      // Arrange: 准备测试表格
      const testTable = [
        ['A', 'B', 'C'],
        ['1', '2', '3'],
      ];
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 执行列对齐
      const response = await sendRequestAction('column-align', testTable);
      
      // Assert: 验证表格正确返回
      expect(response.data).toEqual(testTable);
      expect(response.uiData?.table).toEqual(testTable);
    });
    
    test('应该显示结果面板', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableData = [['A', 'B']];
      
      // Act: 执行列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证 UI 动作
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    });
    
    test('应该记录使用统计（不消耗次数）', async () => {
      // Arrange: 设置初始使用次数
      await setupTestState({
        usageCount: 5,
        hasPro: true,
      });
      
      const tableData = [['X', 'Y']];
      
      // Act: 执行列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      
      // 验证使用次数未增加（column-align 不消耗次数）
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(5);
    });
  });
  
  describe('Pro 权限检查', () => {
    test('没有 Pro 权限时应该阻止操作', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const tableData = [['A', 'B']];
      
      // Act: 尝试列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
    });
    
    test('没有 Pro 权限时应该显示 Pro 提示', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const tableData = [['X', 'Y']];
      
      // Act: 尝试列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证显示 Pro 面板
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro 功能');
    });
    
    test('没有 Pro 权限时不应该返回对齐结果', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const tableData = [['不应该对齐', '的数据']];
      
      // Act: 尝试列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证没有返回表格数据
      expect(response.status).toBe('blocked');
      expect(response.uiData?.table).toBeUndefined();
    });
    
    test('没有 Pro 权限时不应该记录使用统计', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 5,
        hasPro: false,
      });
      
      const tableData = [['A', 'B']];
      
      // Act: 尝试列对齐
      await sendRequestAction('column-align', tableData);
      
      // Assert: 验证使用次数未变化
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(5);
    });
  });
  
  describe('使用次数限制优先级', () => {
    test('达到使用限制时应该优先显示限制提示', async () => {
      // Arrange: 设置使用次数达到上限且无 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      const tableData = [['A', 'B']];
      
      // Act: 尝试列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证优先显示限制提示（而不是 Pro 提示）
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('达到限制时即使有 Pro 权限也应该阻止', async () => {
      // Arrange: 设置使用次数达到上限但有 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: true,
      });
      
      const tableData = [['X', 'Y']];
      
      // Act: 尝试列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证操作被限制阻止
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('限制优先级应该高于 Pro 权限检查', async () => {
      // Arrange: 设置达到限制且无 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      const tableData = [['A', 'B']];
      
      // Act: 尝试列对齐
      const response = await sendRequestAction('column-align', tableData);
      
      // Assert: 验证返回限制提示而不是 Pro 提示
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toContain('免费次数已用完');
    });
  });
  
  describe('错误处理', () => {
    test('应该处理无效的表格数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 发送无效数据（null）
      const response = await sendRequestAction('column-align', null);
      
      // Assert: 验证返回响应（可能是兜底响应或正常处理）
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
    });
    
    test('应该处理空表格', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 发送空表格
      const response = await sendRequestAction('column-align', []);
      
      // Assert: 验证空表格处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.table).toEqual([]);
    });
    
    test('应该处理非数组数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 发送非数组数据
      const response = await sendRequestAction('column-align', 'invalid data');
      
      // Assert: 验证返回响应
      expect(response).toHaveProperty('status');
      expect(response).toHaveProperty('uiAction');
    });
    
    test('应该处理不规则的表格数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // 不规则表格（行长度不一致）
      const irregularTable = [
        ['A', 'B', 'C'],
        ['1', '2'],
        ['X', 'Y', 'Z', 'W'],
      ];
      
      // Act: 发送不规则表格
      const response = await sendRequestAction('column-align', irregularTable);
      
      // Assert: 验证处理不规则表格
      expect(response.status).toBe('ok');
      expect(response.uiData?.table).toEqual(irregularTable);
    });
    
    test('错误不应该消耗使用次数', async () => {
      // Arrange: 设置初始使用次数
      await setupTestState({
        usageCount: 5,
        hasPro: true,
      });
      
      // Act: 触发可能的错误场景
      await sendRequestAction('column-align', null);
      
      // Assert: 验证使用次数未增加（column-align 本身就不消耗次数）
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(5);
    });
    
    test('错误后应该能够继续正常操作', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 先触发可能的错误，再执行正常操作
      await sendRequestAction('column-align', null);
      const normalResponse = await sendRequestAction('column-align', [['A', 'B']]);
      
      // Assert: 验证正常操作不受影响
      expect(normalResponse.status).toBe('ok');
      expect(normalResponse.uiData?.table).toEqual([['A', 'B']]);
    });
  });
  
  describe('端到端场景验证', () => {
    test('应该完成从用户交互到 UI 响应的完整流程', async () => {
      // Arrange: 模拟用户初始状态
      const tableData = [
        ['产品', '价格', '库存'],
        ['苹果', '5.00', '100'],
        ['香蕉', '3.50', '150'],
      ];
      
      // Act: 模拟完整的用户交互流程
      const response = await simulateUserAction('column-align', tableData, {
        usageCount: 3,
        hasPro: true,
      });
      
      // Assert: 验证完整流程
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.table).toEqual(tableData);
      
      // 验证使用次数未增加（column-align 不消耗次数）
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(3);
    });
    
    test('应该正确处理多次连续的列对齐操作', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 模拟用户连续操作
      const response1 = await sendRequestAction('column-align', [['A', 'B']]);
      const response2 = await sendRequestAction('column-align', [['C', 'D']]);
      const response3 = await sendRequestAction('column-align', [['E', 'F']]);
      
      // Assert: 验证所有操作都成功
      expect(response1.status).toBe('ok');
      expect(response2.status).toBe('ok');
      expect(response3.status).toBe('ok');
      
      // 验证使用次数未增加（column-align 不消耗次数）
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(0);
    });
    
    test('应该在不同权限状态下正确响应', async () => {
      // Arrange & Act & Assert: 测试不同权限状态
      
      // 状态 1: 有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      const withProResponse = await sendRequestAction('column-align', [['A', 'B']]);
      expect(withProResponse.status).toBe('ok');
      
      // 状态 2: 无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      const withoutProResponse = await sendRequestAction('column-align', [['C', 'D']]);
      expect(withoutProResponse.status).toBe('blocked');
      
      // 状态 3: 达到使用限制
      await setupTestState({
        usageCount: 20,
        hasPro: true,
      });
      const limitedResponse = await sendRequestAction('column-align', [['E', 'F']]);
      expect(limitedResponse.status).toBe('limited');
    });
    
    test('应该正确处理大型表格数据', async () => {
      // Arrange: 生成大型表格（100 行 x 10 列）
      const largeTable: string[][] = [];
      for (let i = 0; i < 100; i++) {
        const row: string[] = [];
        for (let j = 0; j < 10; j++) {
          row.push(`Cell_${i}_${j}`);
        }
        largeTable.push(row);
      }
      
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 对齐大型表格
      const response = await sendRequestAction('column-align', largeTable);
      
      // Assert: 验证大型表格处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.table).toEqual(largeTable);
      expect(response.uiData?.table?.length).toBe(100);
    });
    
    test('应该正确处理包含特殊字符的表格', async () => {
      // Arrange: 准备包含特殊字符的表格
      const specialTable = [
        ['姓名', '邮箱', '备注'],
        ['张三', 'test@example.com', '特殊字符：\n换行\t制表符'],
        ['李四', 'user@test.com', '符号：<>&"\''],
      ];
      
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 对齐包含特殊字符的表格
      const response = await sendRequestAction('column-align', specialTable);
      
      // Assert: 验证特殊字符正确处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.table).toEqual(specialTable);
    });
  });
});
