/**
 * Pro 权限检查集成测试
 * 验证 Pro 权限检查在不同功能中的一致性
 * 
 * Feature: integration-testing
 * 需求：7.1, 7.2, 7.3, 7.4
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
import type { ActionType } from '../../shared/types';

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

describe('Pro 权限检查集成测试', () => {
  // 需要 Pro 权限的功能列表
  const proFeatures: ActionType[] = ['table-detect', 'column-align', 'csv-export'];
  
  describe('有 Pro 权限时的正常执行（需求 7.2）', () => {
    test('有 Pro 权限时表格检测应该正常执行', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['姓名', '年龄'],
        ['张三', '25'],
      ];
      
      // Act: 执行表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证正常执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toEqual(testTable);
    });
    
    test('有 Pro 权限时列对齐应该正常执行', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['A', 'B'],
        ['C', 'D'],
      ];
      
      // Act: 执行列对齐
      const response = await sendRequestAction('column-align', testTable);
      
      // Assert: 验证正常执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toBeDefined();
    });
    
    test('有 Pro 权限时 CSV 导出应该正常执行', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['产品', '价格'],
        ['苹果', '5.00'],
      ];
      
      // Act: 执行 CSV 导出
      const response = await sendRequestAction('csv-export', testTable);
      
      // Assert: 验证正常执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.csv).toBeDefined();
    });
    
    test('所有 Pro 功能在有权限时都应该返回 ok 状态', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testData = [['测试', '数据']];
      
      // Act & Assert: 测试所有 Pro 功能
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        expect(response.status).toBe('ok');
        expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      }
    });
    
    test('有 Pro 权限时应该返回实际的功能结果', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['列1', '列2'],
        ['值1', '值2'],
      ];
      
      // Act: 执行表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证返回实际结果
      expect(response.data).toEqual(testTable);
      expect(response.data).not.toBeUndefined();
    });
    
    test('有 Pro 权限时应该显示结果面板而不是 Pro 面板', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testData = [['测试']];
      
      // Act & Assert: 验证所有 Pro 功能都显示结果面板
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
        expect(response.uiAction).not.toBe('SHOW_PRO_PANEL');
      }
    });
  });
  
  describe('没有 Pro 权限时的阻止行为（需求 7.1）', () => {
    test('没有 Pro 权限时表格检测应该被阻止', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testTable = [['A', 'B']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro');
    });
    
    test('没有 Pro 权限时列对齐应该被阻止', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testTable = [['A', 'B']];
      
      // Act: 尝试列对齐
      const response = await sendRequestAction('column-align', testTable);
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro');
    });
    
    test('没有 Pro 权限时 CSV 导出应该被阻止', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testTable = [['A', 'B']];
      
      // Act: 尝试 CSV 导出
      const response = await sendRequestAction('csv-export', testTable);
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro');
    });
    
    test('所有 Pro 功能在没有权限时都应该返回 blocked 状态', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testData = [['测试']];
      
      // Act & Assert: 测试所有 Pro 功能
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        expect(response.status).toBe('blocked');
        expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      }
    });
    
    test('没有 Pro 权限时应该显示 Pro 提示消息', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testData = [['测试']];
      
      // Act & Assert: 验证所有 Pro 功能都显示提示消息
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        expect(response.uiData?.message).toBeDefined();
        expect(response.uiData?.message).toContain('Pro');
      }
    });
    
    test('没有 Pro 权限时不应该返回功能结果', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testTable = [['不应该', '返回']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证没有返回功能结果
      expect(response.status).toBe('blocked');
      expect(response.data).toBeUndefined();
    });
  });
  
  describe('权限状态变化后的行为（需求 7.3）', () => {
    test('从无权限变为有权限后应该立即生效', async () => {
      // Arrange: 初始状态为没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testTable = [['测试', '数据']];
      
      // Act: 第一次操作（没有权限）
      const response1 = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作被阻止
      expect(response1.status).toBe('blocked');
      expect(response1.uiAction).toBe('SHOW_PRO_PANEL');
      
      // Act: 更新权限状态为有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 第二次操作（有权限）
      const response2 = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作成功
      expect(response2.status).toBe('ok');
      expect(response2.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response2.data).toEqual(testTable);
    });
    
    test('从有权限变为无权限后应该立即生效', async () => {
      // Arrange: 初始状态为有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [['测试', '数据']];
      
      // Act: 第一次操作（有权限）
      const response1 = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作成功
      expect(response1.status).toBe('ok');
      expect(response1.uiAction).toBe('SHOW_RESULT_PANEL');
      
      // Act: 更新权限状态为没有 Pro 权限
      await setupTestState({
        usageCount: 1, // 保持使用次数
        hasPro: false,
      });
      
      // Act: 第二次操作（无权限）
      const response2 = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作被阻止
      expect(response2.status).toBe('blocked');
      expect(response2.uiAction).toBe('SHOW_PRO_PANEL');
    });
    
    test('权限变化应该影响所有 Pro 功能', async () => {
      // Arrange: 初始状态为没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testData = [['测试']];
      
      // Act & Assert: 验证所有功能都被阻止
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        expect(response.status).toBe('blocked');
      }
      
      // Act: 更新为有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act & Assert: 验证所有功能都可以执行
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        expect(response.status).toBe('ok');
      }
    });
    
    test('权限变化不应该影响使用次数统计', async () => {
      // Arrange: 初始状态为有 Pro 权限，使用次数为 5
      await setupTestState({
        usageCount: 5,
        hasPro: true,
      });
      
      const testTable = [['测试']];
      
      // Act: 执行一次操作
      await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证使用次数增加
      let storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(6);
      
      // Act: 更新权限状态为无权限
      await setupTestState({
        usageCount: 6, // 保持使用次数
        hasPro: false,
      });
      
      // Act: 尝试执行操作（应该被阻止）
      await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证使用次数未增加
      storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(6);
    });
    
    test('多次权限状态切换应该每次都立即生效', async () => {
      // Arrange: 准备测试数据
      const testTable = [['测试']];
      
      // 循环测试多次权限切换
      for (let i = 0; i < 3; i++) {
        // Act: 设置为有权限
        await setupTestState({
          usageCount: 0,
          hasPro: true,
        });
        
        const responseWithPro = await sendRequestAction('table-detect', testTable);
        
        // Assert: 验证有权限时成功
        expect(responseWithPro.status).toBe('ok');
        
        // Act: 设置为无权限
        await setupTestState({
          usageCount: 1,
          hasPro: false,
        });
        
        const responseWithoutPro = await sendRequestAction('table-detect', testTable);
        
        // Assert: 验证无权限时被阻止
        expect(responseWithoutPro.status).toBe('blocked');
      }
    });
    
    test('权限变化应该在下一次操作时立即反映', async () => {
      // Arrange: 初始状态为有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [['测试']];
      
      // Act: 执行操作（有权限）
      const response1 = await sendRequestAction('table-detect', testTable);
      expect(response1.status).toBe('ok');
      
      // Act: 立即更新权限状态
      await setupTestState({
        usageCount: 1,
        hasPro: false,
      });
      
      // Act: 立即执行下一次操作（无权限）
      const response2 = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证权限变化立即生效
      expect(response2.status).toBe('blocked');
      expect(response2.uiAction).toBe('SHOW_PRO_PANEL');
    });
  });
  
  describe('权限优先级测试（需求 7.4）', () => {
    test('使用次数限制应该优先于 Pro 权限检查', async () => {
      // Arrange: 设置使用次数达到上限且没有 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证优先显示使用次数限制提示
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiAction).not.toBe('SHOW_PRO_PANEL');
    });
    
    test('即使有 Pro 权限，达到使用限制时也应该显示限制提示', async () => {
      // Arrange: 设置使用次数达到上限但有 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: true,
      });
      
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证显示限制提示
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('所有 Pro 功能都应该遵循相同的优先级规则', async () => {
      // Arrange: 设置使用次数达到上限且没有 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      const testData = [['测试']];
      
      // Act & Assert: 验证所有 Pro 功能都优先显示限制提示
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        expect(response.status).toBe('limited');
        expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      }
    });
    
    test('未达到限制且没有 Pro 权限时应该显示 Pro 提示', async () => {
      // Arrange: 设置使用次数未达上限但没有 Pro 权限
      await setupTestState({
        usageCount: 5,
        hasPro: false,
      });
      
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证显示 Pro 提示
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
    });
    
    test('未达到限制且有 Pro 权限时应该正常执行', async () => {
      // Arrange: 设置使用次数未达上限且有 Pro 权限
      await setupTestState({
        usageCount: 5,
        hasPro: true,
      });
      
      const testTable = [['测试']];
      
      // Act: 执行表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证正常执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    });
  });
  
  describe('Pro 权限一致性验证', () => {
    test('不同 Pro 功能应该使用相同的权限检查逻辑', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testData = [['测试']];
      const responses: any[] = [];
      
      // Act: 执行所有 Pro 功能
      for (const feature of proFeatures) {
        const response = await sendRequestAction(feature, testData);
        responses.push(response);
      }
      
      // Assert: 验证所有响应的 status 和 uiAction 一致
      for (const response of responses) {
        expect(response.status).toBe('blocked');
        expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      }
    });
    
    test('Pro 权限检查应该在业务逻辑执行前进行', async () => {
      // Arrange: 设置没有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证操作被阻止且没有返回业务结果
      expect(response.status).toBe('blocked');
      expect(response.data).toBeUndefined();
      
      // 验证使用次数未增加（说明业务逻辑未执行）
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(0);
    });
    
    test('Pro 权限检查应该在使用次数检查之后进行', async () => {
      // Arrange: 设置使用次数达到上限且没有 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      const testTable = [['测试']];
      
      // Act: 尝试表格检测
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证优先显示使用次数限制（说明使用次数检查在前）
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
  });
  
  describe('端到端场景验证', () => {
    test('应该完成从权限检查到 UI 响应的完整流程', async () => {
      // Arrange: 模拟用户初始状态（有 Pro 权限）
      const testTable = [
        ['产品', '价格'],
        ['苹果', '5.00'],
      ];
      
      // Act: 模拟完整的用户交互流程
      const response = await simulateUserAction('table-detect', testTable, {
        usageCount: 0,
        hasPro: true,
      });
      
      // Assert: 验证完整流程
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toEqual(testTable);
    });
    
    test('应该正确处理权限状态在多次操作中的变化', async () => {
      // Arrange: 准备测试数据
      const testTable = [['测试']];
      
      // 场景 1: 有权限，正常执行
      await setupTestState({ usageCount: 0, hasPro: true });
      const response1 = await sendRequestAction('table-detect', testTable);
      expect(response1.status).toBe('ok');
      
      // 场景 2: 权限被撤销，操作被阻止
      await setupTestState({ usageCount: 1, hasPro: false });
      const response2 = await sendRequestAction('table-detect', testTable);
      expect(response2.status).toBe('blocked');
      
      // 场景 3: 权限恢复，正常执行
      await setupTestState({ usageCount: 1, hasPro: true });
      const response3 = await sendRequestAction('table-detect', testTable);
      expect(response3.status).toBe('ok');
      
      // 场景 4: 达到使用限制，即使有权限也被阻止
      await setupTestState({ usageCount: 20, hasPro: true });
      const response4 = await sendRequestAction('table-detect', testTable);
      expect(response4.status).toBe('limited');
    });
    
    test('应该在不同 Pro 功能间保持权限状态一致', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testData = [['测试', '数据']];
      
      // Act: 依次执行所有 Pro 功能
      const tableResponse = await sendRequestAction('table-detect', testData);
      const alignResponse = await sendRequestAction('column-align', testData);
      const csvResponse = await sendRequestAction('csv-export', testData);
      
      // Assert: 验证所有功能都正常执行
      expect(tableResponse.status).toBe('ok');
      expect(alignResponse.status).toBe('ok');
      expect(csvResponse.status).toBe('ok');
      
      // Act: 撤销 Pro 权限
      await setupTestState({
        usageCount: 3,
        hasPro: false,
      });
      
      // Act: 再次执行所有 Pro 功能
      const tableResponse2 = await sendRequestAction('table-detect', testData);
      const alignResponse2 = await sendRequestAction('column-align', testData);
      const csvResponse2 = await sendRequestAction('csv-export', testData);
      
      // Assert: 验证所有功能都被阻止
      expect(tableResponse2.status).toBe('blocked');
      expect(alignResponse2.status).toBe('blocked');
      expect(csvResponse2.status).toBe('blocked');
    });
  });
});
