/**
 * 使用次数管理集成测试
 * 验证使用次数在多个操作中的累计、失败操作不消耗次数等行为
 * 
 * Feature: integration-testing
 * 需求：6.1, 6.2, 6.3, 6.4
 */

import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import {
  sendRequestAction,
  setupTestState,
  cleanupTestState,
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

describe('使用次数管理集成测试', () => {
  describe('跨天重置使用次数', () => {
    beforeEach(() => {
      // 使用真实的定时器进行跨天测试
      jest.useRealTimers();
    });
    
    afterEach(() => {
      // 恢复真实定时器
      jest.useRealTimers();
    });
    
    test('跨天后使用次数应该重置为 0', async () => {
      // Arrange: 设置昨天的使用次数为 15
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await setupTestState({
        usageCount: 15,
        usageDate: yesterday.toDateString(),
      });
      
      // Act: 执行今天的第一次操作
      const response = await sendRequestAction('text-extract', '新的一天');
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      
      // 验证使用次数已重置并累计为 1
      const storage = await chrome.storage.local.get(['usage_count', 'last_usage_date']);
      expect(storage.usage_count).toBe(1);
      expect(storage.last_usage_date).toBe(new Date().toDateString());
    });
    
    test('跨天后达到上限的用户应该可以继续使用', async () => {
      // Arrange: 设置昨天的使用次数达到上限
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await setupTestState({
        usageCount: 20,
        usageDate: yesterday.toDateString(),
      });
      
      // Act: 执行今天的操作
      const response = await sendRequestAction('text-extract', '新的一天可以使用');
      
      // Assert: 验证操作成功（使用次数已重置）
      expect(response.status).toBe('ok');
      
      // 验证使用次数重置为 1
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(1);
    });
    
    test('跨天重置应该更新日期记录', async () => {
      // Arrange: 设置昨天的状态
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await setupTestState({
        usageCount: 10,
        usageDate: yesterday.toDateString(),
      });
      
      // Act: 执行今天的操作
      await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证日期已更新为今天
      const storage = await chrome.storage.local.get(['last_usage_date']);
      expect(storage.last_usage_date).toBe(new Date().toDateString());
    });
    
    test('同一天内多次操作不应该重置使用次数', async () => {
      // Arrange: 设置今天的使用次数为 5
      await setupTestState({
        usageCount: 5,
        usageDate: new Date().toDateString(),
      });
      
      // Act: 执行多次操作
      await sendRequestAction('text-extract', '操作1');
      await sendRequestAction('text-extract', '操作2');
      await sendRequestAction('text-extract', '操作3');
      
      // Assert: 验证使用次数累计而不是重置
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(8);
    });
    
    test('跨多天后使用次数应该重置', async () => {
      // Arrange: 设置 3 天前的使用次数
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      await setupTestState({
        usageCount: 18,
        usageDate: threeDaysAgo.toDateString(),
      });
      
      // Act: 执行今天的操作
      const response = await sendRequestAction('text-extract', '跨多天');
      
      // Assert: 验证使用次数已重置
      expect(response.status).toBe('ok');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(1);
    });
    
    test('跨天重置应该清空统计数据', async () => {
      // Arrange: 设置昨天的统计数据
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await setupTestState({
        usageCount: 10,
        usageDate: yesterday.toDateString(),
      });
      
      // 设置昨天的统计数据
      await chrome.storage.local.set({
        usage_stats: {
          selectCount: 5,
          tableDetectCount: 3,
          columnAlignCount: 1,
          csvExportCount: 1,
          lastDate: yesterday.toDateString(),
        },
      });
      
      // Act: 执行今天的操作
      await sendRequestAction('text-extract', '新的一天');
      
      // Assert: 验证统计数据已重置（text-extract 会记录一次 select）
      const storage = await chrome.storage.local.get(['usage_stats']);
      expect(storage.usage_stats.selectCount).toBe(1); // 今天的第一次操作
      expect(storage.usage_stats.tableDetectCount).toBe(0);
      expect(storage.usage_stats.columnAlignCount).toBe(0);
      expect(storage.usage_stats.csvExportCount).toBe(0);
      expect(storage.usage_stats.lastDate).toBe(new Date().toDateString());
    });
    
    test('首次使用时应该初始化日期', async () => {
      // Arrange: 清空所有存储（模拟首次使用）
      await chrome.storage.local.clear();
      
      // Act: 执行第一次操作
      const response = await sendRequestAction('text-extract', '首次使用');
      
      // Assert: 验证操作成功并初始化日期
      expect(response.status).toBe('ok');
      const storage = await chrome.storage.local.get(['usage_count', 'last_usage_date']);
      expect(storage.usage_count).toBe(1);
      expect(storage.last_usage_date).toBe(new Date().toDateString());
    });
    
    test('跨天边界测试：午夜前后', async () => {
      // Arrange: 设置昨天 23:59 的使用次数
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 59, 59, 999);
      await setupTestState({
        usageCount: 19,
        usageDate: yesterday.toDateString(),
      });
      
      // Act: 执行今天 00:00 的操作
      const response = await sendRequestAction('text-extract', '午夜后');
      
      // Assert: 验证使用次数已重置
      expect(response.status).toBe('ok');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(1);
    });
  });
  
  describe('使用次数累计', () => {
    test('连续成功操作应该正确累计使用次数', async () => {
      // Arrange: 设置初始使用次数为 0
      await setupTestState({ usageCount: 0 });
      
      // Act: 连续执行 5 次文本提取操作
      await sendRequestAction('text-extract', '第一次');
      await sendRequestAction('text-extract', '第二次');
      await sendRequestAction('text-extract', '第三次');
      await sendRequestAction('text-extract', '第四次');
      await sendRequestAction('text-extract', '第五次');
      
      // Assert: 验证使用次数累计到 5
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(5);
    });
    
    test('不同类型的操作应该累计使用次数', async () => {
      // Arrange: 设置初始状态（有 Pro 权限以便测试所有操作）
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 执行不同类型的操作
      await sendRequestAction('text-extract', '文本提取');
      await sendRequestAction('table-detect', [['A', 'B'], ['C', 'D']]);
      await sendRequestAction('text-extract', '再次文本提取');
      
      // Assert: 验证使用次数累计
      // text-extract 消耗次数，table-detect 消耗次数
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(3);
    });
    
    test('从非零初始值开始应该正确累计', async () => {
      // Arrange: 设置初始使用次数为 10
      await setupTestState({ usageCount: 10 });
      
      // Act: 执行 3 次操作
      await sendRequestAction('text-extract', '操作1');
      await sendRequestAction('text-extract', '操作2');
      await sendRequestAction('text-extract', '操作3');
      
      // Assert: 验证使用次数从 10 累计到 13
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(13);
    });
    
    test('大量连续操作应该正确累计', async () => {
      // Arrange: 设置初始使用次数为 0
      await setupTestState({ usageCount: 0 });
      
      // Act: 执行 15 次操作
      for (let i = 0; i < 15; i++) {
        await sendRequestAction('text-extract', `操作${i + 1}`);
      }
      
      // Assert: 验证使用次数累计到 15
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(15);
    });
    
    test('使用次数应该持久化到 storage', async () => {
      // Arrange: 设置初始状态
      await setupTestState({ usageCount: 5 });
      
      // Act: 执行操作
      await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证 storage 中的使用次数
      const storage = await chrome.storage.local.get(['usage_count', 'last_usage_date']);
      expect(storage.usage_count).toBe(6);
      expect(storage.last_usage_date).toBe(new Date().toDateString());
    });
    
    test('每次操作后使用次数应该立即更新', async () => {
      // Arrange: 设置初始状态
      await setupTestState({ usageCount: 0 });
      
      // Act & Assert: 每次操作后检查使用次数
      await sendRequestAction('text-extract', '第一次');
      let storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(1);
      
      await sendRequestAction('text-extract', '第二次');
      storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(2);
      
      await sendRequestAction('text-extract', '第三次');
      storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(3);
    });
  });
  
  describe('失败操作不消耗次数', () => {
    test('达到限制的操作不应该消耗使用次数', async () => {
      // Arrange: 设置使用次数达到上限（20 次）
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试执行操作
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证操作被阻止且使用次数未增加
      expect(response.status).toBe('limited');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('被 Pro 权限阻止的操作不应该消耗使用次数', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 5,
        hasPro: false,
      });
      
      // Act: 尝试执行需要 Pro 权限的操作
      const response = await sendRequestAction('table-detect', [['A', 'B']]);
      
      // Assert: 验证操作被阻止且使用次数未增加
      expect(response.status).toBe('blocked');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(5);
    });
    
    test('连续失败操作都不应该消耗使用次数', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 连续尝试多次操作
      await sendRequestAction('text-extract', '尝试1');
      await sendRequestAction('text-extract', '尝试2');
      await sendRequestAction('text-extract', '尝试3');
      
      // Assert: 验证使用次数保持不变
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('成功和失败操作混合时应该只累计成功的次数', async () => {
      // Arrange: 设置初始使用次数为 18
      await setupTestState({ usageCount: 18 });
      
      // Act: 执行混合操作
      const response1 = await sendRequestAction('text-extract', '成功1'); // 18 -> 19
      const response2 = await sendRequestAction('text-extract', '成功2'); // 19 -> 20
      const response3 = await sendRequestAction('text-extract', '失败1'); // 20，被阻止
      const response4 = await sendRequestAction('text-extract', '失败2'); // 20，被阻止
      
      // Assert: 验证响应状态
      expect(response1.status).toBe('ok');
      expect(response2.status).toBe('ok');
      expect(response3.status).toBe('limited');
      expect(response4.status).toBe('limited');
      
      // 验证使用次数只累计成功的操作
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('失败后再成功应该正确累计', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 先失败，然后重置后成功
      const failedResponse = await sendRequestAction('text-extract', '失败');
      expect(failedResponse.status).toBe('limited');
      
      // 重置使用次数（模拟跨天）
      await setupTestState({ usageCount: 0 });
      const successResponse = await sendRequestAction('text-extract', '成功');
      
      // Assert: 验证成功操作消耗次数
      expect(successResponse.status).toBe('ok');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(1);
    });
    
    test('Pro 权限阻止的多种操作都不应该消耗次数', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 5,
        hasPro: false,
      });
      
      // Act: 尝试多种需要 Pro 权限的操作
      await sendRequestAction('table-detect', [['A']]);
      await sendRequestAction('column-align', [['B']]);
      await sendRequestAction('csv-export', [['C']]);
      
      // Assert: 验证使用次数保持不变
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(5);
    });
  });
  
  describe('达到上限阻止操作', () => {
    test('达到上限时应该阻止所有需要消耗次数的操作', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({
        usageCount: 20,
        hasPro: true,
      });
      
      // Act: 尝试不同类型的操作
      const textResponse = await sendRequestAction('text-extract', '文本');
      const tableResponse = await sendRequestAction('table-detect', [['表格']]);
      
      // Assert: 验证所有操作都被阻止
      expect(textResponse.status).toBe('limited');
      expect(tableResponse.status).toBe('limited');
    });
    
    test('达到上限时应该显示限制面板', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试操作
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证显示限制面板
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toContain('免费次数已用完');
    });
    
    test('达到上限时应该返回正确的限制信息', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试操作
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证限制信息
      expect(response.status).toBe('limited');
      expect(response.uiData?.message).toContain('20');
      expect(response.uiData?.message).toContain('明天将自动重置');
    });
    
    test('接近上限但未达到时应该允许操作', async () => {
      // Arrange: 设置使用次数为 19（接近上限 20）
      await setupTestState({ usageCount: 19 });
      
      // Act: 执行操作
      const response = await sendRequestAction('text-extract', '最后一次');
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      
      // 验证使用次数增加到 20
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('达到上限后不应该返回操作结果', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试文本提取
      const response = await sendRequestAction('text-extract', '不应该提取的文本');
      
      // Assert: 验证没有返回文本数据
      expect(response.status).toBe('limited');
      expect(response.uiData?.text).toBeUndefined();
      expect(response.data).toBeUndefined();
    });
    
    test('使用次数限制应该优先于 Pro 权限检查', async () => {
      // Arrange: 设置使用次数达到上限且无 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      // Act: 尝试需要 Pro 权限的操作
      const response = await sendRequestAction('table-detect', [['测试']]);
      
      // Assert: 验证优先显示使用次数限制
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
  });
  
  describe('边界情况', () => {
    test('使用次数为 0 时应该允许操作', async () => {
      // Arrange: 设置使用次数为 0
      await setupTestState({ usageCount: 0 });
      
      // Act: 执行操作
      const response = await sendRequestAction('text-extract', '第一次使用');
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(1);
    });
    
    test('使用次数为 19 时应该允许最后一次操作', async () => {
      // Arrange: 设置使用次数为 19
      await setupTestState({ usageCount: 19 });
      
      // Act: 执行最后一次操作
      const response = await sendRequestAction('text-extract', '最后一次');
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('使用次数为 20 时应该阻止操作', async () => {
      // Arrange: 设置使用次数为 20
      await setupTestState({ usageCount: 20 });
      
      // Act: 尝试操作
      const response = await sendRequestAction('text-extract', '超出限制');
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('limited');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('使用次数超过上限时应该阻止操作', async () => {
      // Arrange: 设置使用次数超过上限（异常情况）
      await setupTestState({ usageCount: 25 });
      
      // Act: 尝试操作
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证操作被阻止
      expect(response.status).toBe('limited');
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(25);
    });
  });
  
  describe('跨操作类型的使用次数管理', () => {
    test('不同操作类型应该共享使用次数限制', async () => {
      // Arrange: 设置初始使用次数为 18，有 Pro 权限
      await setupTestState({
        usageCount: 18,
        hasPro: true,
      });
      
      // Act: 执行不同类型的操作
      const response1 = await sendRequestAction('text-extract', '文本'); // 18 -> 19
      const response2 = await sendRequestAction('table-detect', [['表格']]); // 19 -> 20
      const response3 = await sendRequestAction('text-extract', '再次文本'); // 20，被阻止
      
      // Assert: 验证前两次成功，第三次被阻止
      expect(response1.status).toBe('ok');
      expect(response2.status).toBe('ok');
      expect(response3.status).toBe('limited');
      
      // 验证使用次数
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(20);
    });
    
    test('Pro 功能和免费功能应该共享使用次数', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 混合执行 Pro 功能和免费功能
      await sendRequestAction('text-extract', '免费功能');
      await sendRequestAction('table-detect', [['Pro功能']]);
      await sendRequestAction('text-extract', '再次免费');
      
      // Assert: 验证使用次数累计
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(3);
    });
  });
});
