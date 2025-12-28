/**
 * 表格检测端到端流程测试
 * 验证从用户交互到 UI 响应的完整表格检测流程
 * 
 * Feature: integration-testing
 * 需求：3.1, 3.2, 3.3, 3.4
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
import { createTableDetectionScenario } from './scenarios';
import { generateRandomTable, generateBoundaryTable } from './generators';

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

describe('表格检测端到端流程测试', () => {
  describe('正常表格检测流程（有 Pro 权限）', () => {
    test('应该完成完整的表格检测流程', async () => {
      // Arrange: 设置有 Pro 权限且使用次数未达上限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['姓名', '年龄', '城市'],
        ['张三', '25', '北京'],
        ['李四', '30', '上海'],
      ];
      
      // Act: 模拟用户触发表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证完整流程执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toEqual(testTable);
    });
    
    test('应该正确返回检测的表格数据', async () => {
      // Arrange: 准备测试表格
      const testTable = [
        ['产品', '价格', '库存'],
        ['苹果', '5.00', '100'],
        ['香蕉', '3.50', '150'],
      ];
      await setupTestState({ usageCount: 0, hasPro: true });
      
      // Act: 执行表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证表格正确返回
      expect(response.data).toEqual(testTable);
      expect(response.status).toBe('ok');
    });
    
    test('应该显示结果面板', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ usageCount: 5, hasPro: true });
      const testTable = [['A', 'B'], ['C', 'D']];
      
      // Act: 执行表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证 UI 动作
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    });
    
    test('成功检测应该增加使用次数', async () => {
      // Arrange: 设置初始使用次数为 5
      await setupTestState({ usageCount: 5, hasPro: true });
      const testTable = [['测试']];
      
      // Act: 执行表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      
      // 验证使用次数增加
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(6);
    });
    
    test('应该使用场景构建器创建预期结果', () => {
      // Arrange: 创建表格检测场景（有 Pro 权限）
      const testTable = [['A', 'B'], ['C', 'D']];
      const scenario = createTableDetectionScenario(testTable, true);
      
      // Assert: 验证场景结构
      expect(scenario.table).toEqual(testTable);
      expect(scenario.hasPro).toBe(true);
      expect(scenario.expectedResult.status).toBe('ok');
      expect(scenario.expectedResult.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(scenario.expectedResult.data).toEqual(testTable);
    });
  });
  
  describe('Pro 权限检查', () => {
    test('没有 Pro 权限时应该阻止操作', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testTable = [['A', 'B'], ['C', 'D']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
    });
    
    test('没有 Pro 权限时应该显示 Pro 提示', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({ usageCount: 0, hasPro: false });
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证显示 Pro 面板
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro');
    });
    
    test('没有 Pro 权限时不应该消耗使用次数', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({ usageCount: 5, hasPro: false });
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证使用次数未增加
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(5);
    });
    
    test('没有 Pro 权限时不应该返回检测结果', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({ usageCount: 0, hasPro: false });
      const testTable = [['不应该', '返回'], ['的', '数据']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证没有返回表格数据
      expect(response.status).toBe('blocked');
      expect(response.data).toBeUndefined();
    });
    
    test('应该使用场景构建器创建无权限场景', () => {
      // Arrange: 创建表格检测场景（无 Pro 权限）
      const testTable = [['A', 'B'], ['C', 'D']];
      const scenario = createTableDetectionScenario(testTable, false);
      
      // Assert: 验证场景结构
      expect(scenario.table).toEqual(testTable);
      expect(scenario.hasPro).toBe(false);
      expect(scenario.expectedResult.status).toBe('blocked');
      expect(scenario.expectedResult.uiAction).toBe('SHOW_PRO_PANEL');
      expect(scenario.expectedResult.uiData?.message).toContain('Pro');
    });
  });
  
  describe('使用次数限制优先级', () => {
    test('同时满足限制和无权限时应该优先显示限制提示', async () => {
      // Arrange: 设置使用次数达到上限且没有 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证优先显示限制提示
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('达到限制时应该显示限制面板而不是 Pro 面板', async () => {
      // Arrange: 设置使用次数达到上限且没有 Pro 权限
      await setupTestState({ usageCount: 20, hasPro: false });
      const testTable = [['A', 'B']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证显示限制面板
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiAction).not.toBe('SHOW_PRO_PANEL');
    });
    
    test('达到限制时不应该消耗使用次数', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20, hasPro: false });
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证使用次数未增加
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('有 Pro 权限但达到限制时也应该显示限制提示', async () => {
      // Arrange: 设置使用次数达到上限但有 Pro 权限
      await setupTestState({ usageCount: 20, hasPro: true });
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证显示限制提示（使用次数限制优先于 Pro 权限）
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
  });
  
  describe('边界情况处理', () => {
    test('应该正确处理空表格', async () => {
      // Arrange: 设置正常状态
      await setupTestState({ usageCount: 0, hasPro: true });
      const emptyTable: string[][] = [];
      
      // Act: 检测空表格
      const response = await sendRequestAction('table-detect', emptyTable);
      
      // Assert: 验证空表格处理
      expect(response.status).toBe('ok');
      expect(response.data).toEqual(emptyTable);
    });
    
    test('应该正确处理单元格表格', async () => {
      // Arrange: 准备单元格表格
      const singleCellTable = [['A']];
      await setupTestState({ usageCount: 0, hasPro: true });
      
      // Act: 检测单元格表格
      const response = await sendRequestAction('table-detect', singleCellTable);
      
      // Assert: 验证单元格表格处理
      expect(response.status).toBe('ok');
      expect(response.data).toEqual(singleCellTable);
    });
    
    test('应该正确处理极大表格', async () => {
      // Arrange: 生成极大表格（100x100）
      const largeTable = generateBoundaryTable().large;
      await setupTestState({ usageCount: 0, hasPro: true });
      
      // Act: 检测极大表格
      const response = await sendRequestAction('table-detect', largeTable);
      
      // Assert: 验证极大表格处理
      expect(response.status).toBe('ok');
      expect(response.data).toEqual(largeTable);
      expect((response.data as string[][]).length).toBe(100);
      expect((response.data as string[][])[0].length).toBe(100);
    });
    
    test('应该正确处理包含特殊字符的表格', async () => {
      // Arrange: 准备包含特殊字符的表格
      const specialTable = [
        ['特殊\n换行', '制表\t符', '"引号"'],
        ['<标签>', '&符号', '\'单引号\''],
      ];
      await setupTestState({ usageCount: 0, hasPro: true });
      
      // Act: 检测特殊字符表格
      const response = await sendRequestAction('table-detect', specialTable);
      
      // Assert: 验证特殊字符正确处理
      expect(response.status).toBe('ok');
      expect(response.data).toEqual(specialTable);
    });
    
    test('应该正确处理不规则表格（行长度不一致）', async () => {
      // Arrange: 准备不规则表格
      const irregularTable = [
        ['A', 'B', 'C'],
        ['D', 'E'],
        ['F', 'G', 'H', 'I'],
      ];
      await setupTestState({ usageCount: 0, hasPro: true });
      
      // Act: 检测不规则表格
      const response = await sendRequestAction('table-detect', irregularTable);
      
      // Assert: 验证不规则表格处理
      expect(response.status).toBe('ok');
      expect(response.data).toEqual(irregularTable);
    });
    
    test('应该正确处理包含空字符串的表格', async () => {
      // Arrange: 准备包含空字符串的表格
      const tableWithEmpty = [
        ['', 'B', ''],
        ['D', '', 'F'],
      ];
      await setupTestState({ usageCount: 0, hasPro: true });
      
      // Act: 检测包含空字符串的表格
      const response = await sendRequestAction('table-detect', tableWithEmpty);
      
      // Assert: 验证空字符串正确处理
      expect(response.status).toBe('ok');
      expect(response.data).toEqual(tableWithEmpty);
    });
  });
  
  describe('端到端场景验证', () => {
    test('应该完成从用户交互到 UI 响应的完整流程', async () => {
      // Arrange: 模拟用户初始状态
      const testTable = [
        ['列1', '列2', '列3'],
        ['数据1', '数据2', '数据3'],
      ];
      
      // Act: 模拟完整的用户交互流程
      const response = await simulateUserAction('table-detect', testTable, {
        usageCount: 3,
        hasPro: true,
      });
      
      // Assert: 验证完整流程
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toEqual(testTable);
      
      // 验证状态变化
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(4);
    });
    
    test('应该正确处理多次连续的表格检测操作', async () => {
      // Arrange: 设置初始状态
      await setupTestState({ usageCount: 0, hasPro: true });
      
      const table1 = [['A', 'B']];
      const table2 = [['C', 'D']];
      const table3 = [['E', 'F']];
      
      // Act: 模拟用户连续操作
      const response1 = await sendRequestAction('table-detect', table1);
      const response2 = await sendRequestAction('table-detect', table2);
      const response3 = await sendRequestAction('table-detect', table3);
      
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
      
      // 状态 1: 有 Pro 权限，正常状态
      await setupTestState({ usageCount: 0, hasPro: true });
      const normalResponse = await sendRequestAction('table-detect', [['正常']]);
      expect(normalResponse.status).toBe('ok');
      
      // 状态 2: 没有 Pro 权限
      await setupTestState({ usageCount: 0, hasPro: false });
      const noProResponse = await sendRequestAction('table-detect', [['无权限']]);
      expect(noProResponse.status).toBe('blocked');
      expect(noProResponse.uiAction).toBe('SHOW_PRO_PANEL');
      
      // 状态 3: 达到使用限制
      await setupTestState({ usageCount: 20, hasPro: true });
      const limitedResponse = await sendRequestAction('table-detect', [['达到限制']]);
      expect(limitedResponse.status).toBe('limited');
      expect(limitedResponse.uiAction).toBe('SHOW_LIMIT_PANEL');
      
      // 状态 4: 同时满足限制和无权限（限制优先）
      await setupTestState({ usageCount: 20, hasPro: false });
      const bothResponse = await sendRequestAction('table-detect', [['两者都满足']]);
      expect(bothResponse.status).toBe('limited');
      expect(bothResponse.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('应该正确处理随机生成的表格', async () => {
      // Arrange: 生成随机表格
      const randomTable = generateRandomTable(5, 4);
      await setupTestState({ usageCount: 0, hasPro: true });
      
      // Act: 检测随机表格
      const response = await sendRequestAction('table-detect', randomTable);
      
      // Assert: 验证随机表格处理
      expect(response.status).toBe('ok');
      expect(response.data).toEqual(randomTable);
      expect((response.data as string[][]).length).toBe(5);
      expect((response.data as string[][])[0].length).toBe(4);
    });
  });
});
