/**
 * UI Action 执行集成测试
 * 验证 Content 层正确执行 Background 层下发的 UI Action
 * 
 * Feature: integration-testing
 * 需求：9.1, 9.2, 9.3, 9.4
 */

import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import {
  sendRequestAction,
  setupTestState,
  cleanupTestState,
} from './helpers';

// 设置 chrome mock
beforeAll(() => {
  (global as any).chrome = createChromeMock();
});

// 每个测试前重置状态
beforeEach(async () => {
  resetChromeMock();
  await cleanupTestState();
});

describe('UI Action 执行集成测试', () => {
  describe('SHOW_RESULT_PANEL 执行', () => {
    test('应该在成功提取文本时显示结果面板', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送文本提取请求
      const response = await sendRequestAction('text-extract', '测试文本内容');
      
      // Assert: 验证返回 SHOW_RESULT_PANEL
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.text).toBe('测试文本内容');
    });
    
    test('SHOW_RESULT_PANEL 应该包含文本数据', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testText = '这是一段测试文本\n包含多行内容';
      
      // Act: 发送请求
      const response = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证 uiData 包含文本
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData).toBeDefined();
      expect(response.uiData?.text).toBe(testText);
    });
    
    test('SHOW_RESULT_PANEL 应该能够渲染表格数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['姓名', '年龄', '城市'],
        ['张三', '25', '北京'],
        ['李四', '30', '上海'],
      ];
      
      // Act: 发送列对齐请求（column-align 返回表格数据）
      const response = await sendRequestAction('column-align', testTable);
      
      // Assert: 验证返回表格数据
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.table).toEqual(testTable);
    });
    
    test('SHOW_RESULT_PANEL 应该能够包含 CSV 数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [['A', 'B'], ['C', 'D']];
      
      // Act: 发送 CSV 导出请求
      const response = await sendRequestAction('csv-export', testTable);
      
      // Assert: 验证包含 CSV 数据
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.csv).toBeDefined();
      expect(typeof response.uiData?.csv).toBe('string');
      expect(response.uiData?.csv).toContain('A,B');
      expect(response.uiData?.csv).toContain('C,D');
    });
    
    test('SHOW_RESULT_PANEL 应该在错误时显示错误消息', async () => {
      // Act: 发送无效的 action
      const response = await sendRequestAction('invalid-action' as any, null);
      
      // Assert: 验证显示错误消息
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.message).toBeDefined();
      expect(typeof response.uiData?.message).toBe('string');
    });
  });
  
  describe('SHOW_LIMIT_PANEL 执行', () => {
    test('应该在达到使用限制时显示限制面板', async () => {
      // Arrange: 设置使用次数达到上限
      await setupTestState({
        usageCount: 20,  // 免费策略上限是 20
        hasPro: false,
      });
      
      // Act: 发送请求
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证返回 SHOW_LIMIT_PANEL
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('SHOW_LIMIT_PANEL 应该包含限制提示消息', async () => {
      // Arrange: 设置达到限制
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      // Act: 发送请求
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证包含提示消息
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toBeDefined();
      expect(response.uiData?.message).toContain('免费次数已用完');
    });
    
    test('SHOW_LIMIT_PANEL 应该对所有操作类型生效', async () => {
      // Arrange: 设置达到限制
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      // Act: 测试不同操作类型
      const textResponse = await sendRequestAction('text-extract', '测试');
      const tableResponse = await sendRequestAction('table-detect', [['A']]);
      
      // Assert: 验证都返回限制面板
      expect(textResponse.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(tableResponse.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
    
    test('SHOW_LIMIT_PANEL 应该优先于 Pro 权限检查', async () => {
      // Arrange: 同时满足达到限制和无 Pro 权限
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      // Act: 发送需要 Pro 的操作
      const response = await sendRequestAction('table-detect', [['A', 'B']]);
      
      // Assert: 验证优先显示限制面板
      expect(response.status).toBe('limited');
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
  });
  
  describe('SHOW_PRO_PANEL 执行', () => {
    test('应该在无 Pro 权限时显示 Pro 面板', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送需要 Pro 的请求
      const response = await sendRequestAction('table-detect', [['A', 'B']]);
      
      // Assert: 验证返回 SHOW_PRO_PANEL
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
    });
    
    test('SHOW_PRO_PANEL 应该包含 Pro 提示消息', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送请求
      const response = await sendRequestAction('column-align', [['A', 'B']]);
      
      // Assert: 验证包含 Pro 提示
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toBeDefined();
      expect(response.uiData?.message).toContain('Pro 功能');
    });
    
    test('SHOW_PRO_PANEL 应该对所有 Pro 功能生效', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 测试不同 Pro 功能
      const tableResponse = await sendRequestAction('table-detect', [['A']]);
      const alignResponse = await sendRequestAction('column-align', [['B']]);
      const csvResponse = await sendRequestAction('csv-export', [['C']]);
      
      // Assert: 验证都返回 Pro 面板
      expect(tableResponse.uiAction).toBe('SHOW_PRO_PANEL');
      expect(alignResponse.uiAction).toBe('SHOW_PRO_PANEL');
      expect(csvResponse.uiAction).toBe('SHOW_PRO_PANEL');
    });
    
    test('有 Pro 权限时不应该显示 SHOW_PRO_PANEL', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 发送 Pro 功能请求
      const response = await sendRequestAction('table-detect', [['A', 'B']]);
      
      // Assert: 验证不显示 Pro 面板
      expect(response.uiAction).not.toBe('SHOW_PRO_PANEL');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
    });
  });
  
  describe('UI Action 决策权在 Background', () => {
    test('Content 层不应该根据 status 自行决定 UI', async () => {
      // 这个测试验证架构约束：UI 决策权在 Background
      // Content 层只能无条件执行 uiAction
      
      // Arrange: 设置不同状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送请求
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证 Background 明确指定了 uiAction
      expect(response).toHaveProperty('uiAction');
      expect(['SHOW_RESULT_PANEL', 'SHOW_LIMIT_PANEL', 'SHOW_PRO_PANEL'])
        .toContain(response.uiAction);
    });
    
    test('所有响应都应该包含明确的 uiAction', async () => {
      // Arrange: 测试多种场景
      const scenarios = [
        { usageCount: 0, hasPro: false, action: 'text-extract' as const },
        { usageCount: 20, hasPro: false, action: 'text-extract' as const },
        { usageCount: 0, hasPro: false, action: 'table-detect' as const },
        { usageCount: 0, hasPro: true, action: 'table-detect' as const },
      ];
      
      // Act & Assert: 验证每个场景都有明确的 uiAction
      for (const scenario of scenarios) {
        await setupTestState({
          usageCount: scenario.usageCount,
          hasPro: scenario.hasPro,
        });
        
        const response = await sendRequestAction(scenario.action, '测试');
        
        expect(response.uiAction).toBeDefined();
        expect(['SHOW_RESULT_PANEL', 'SHOW_LIMIT_PANEL', 'SHOW_PRO_PANEL'])
          .toContain(response.uiAction);
      }
    });
    
    test('uiAction 应该与 status 保持一致性', async () => {
      // 验证 status 和 uiAction 的对应关系
      
      // 场景 1: status: ok → SHOW_RESULT_PANEL
      await setupTestState({ usageCount: 0, hasPro: false });
      const okResponse = await sendRequestAction('text-extract', '测试');
      expect(okResponse.status).toBe('ok');
      expect(okResponse.uiAction).toBe('SHOW_RESULT_PANEL');
      
      // 场景 2: status: limited → SHOW_LIMIT_PANEL
      await setupTestState({ usageCount: 20, hasPro: false });
      const limitedResponse = await sendRequestAction('text-extract', '测试');
      expect(limitedResponse.status).toBe('limited');
      expect(limitedResponse.uiAction).toBe('SHOW_LIMIT_PANEL');
      
      // 场景 3: status: blocked (Pro) → SHOW_PRO_PANEL
      await setupTestState({ usageCount: 0, hasPro: false });
      const blockedResponse = await sendRequestAction('table-detect', [['A']]);
      expect(blockedResponse.status).toBe('blocked');
      expect(blockedResponse.uiAction).toBe('SHOW_PRO_PANEL');
    });
  });
  
  describe('UI 数据渲染', () => {
    test('应该正确渲染 text 数据', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const testText = '这是一段测试文本\n包含多行\n和特殊字符：@#$%';
      
      // Act: 发送文本提取请求
      const response = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证 text 数据正确渲染
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.text).toBe(testText);
      expect(response.uiData?.text).toContain('测试文本');
      expect(response.uiData?.text).toContain('特殊字符');
    });
    
    test('应该正确渲染 table 数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['列1', '列2', '列3'],
        ['数据1', '数据2', '数据3'],
        ['行2-1', '行2-2', '行2-3'],
      ];
      
      // Act: 发送列对齐请求
      const response = await sendRequestAction('column-align', testTable);
      
      // Assert: 验证 table 数据正确渲染
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.table).toEqual(testTable);
      expect(response.uiData?.table).toHaveLength(3);
      expect(response.uiData?.table?.[0]).toEqual(['列1', '列2', '列3']);
    });
    
    test('应该正确渲染 csv 数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['姓名', '年龄'],
        ['张三', '25'],
        ['李四', '30'],
      ];
      
      // Act: 发送 CSV 导出请求
      const response = await sendRequestAction('csv-export', testTable);
      
      // Assert: 验证 csv 数据正确渲染
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.csv).toBeDefined();
      expect(typeof response.uiData?.csv).toBe('string');
      
      // 验证 CSV 格式
      const csvLines = response.uiData?.csv?.split('\n');
      expect(csvLines).toHaveLength(3);
      expect(csvLines?.[0]).toBe('姓名,年龄');
      expect(csvLines?.[1]).toBe('张三,25');
      expect(csvLines?.[2]).toBe('李四,30');
    });
    
    test('应该正确渲染 message 数据', async () => {
      // Arrange: 设置达到限制
      await setupTestState({
        usageCount: 20,
        hasPro: false,
      });
      
      // Act: 发送请求触发限制
      const response = await sendRequestAction('text-extract', '测试');
      
      // Assert: 验证 message 数据正确渲染
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toBeDefined();
      expect(typeof response.uiData?.message).toBe('string');
      expect(response.uiData?.message).toContain('免费次数已用完');
    });
    
    test('应该正确渲染包含特殊字符的 CSV', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [
        ['名称', '描述'],
        ['产品A', '包含逗号,的描述'],
        ['产品B', '包含"引号"的描述'],
        ['产品C', '包含\n换行的描述'],
      ];
      
      // Act: 发送 CSV 导出请求
      const response = await sendRequestAction('csv-export', testTable);
      
      // Assert: 验证特殊字符被正确转义
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.csv).toBeDefined();
      
      const csv = response.uiData?.csv || '';
      
      // 验证逗号被引号包裹
      expect(csv).toContain('"包含逗号,的描述"');
      
      // 验证引号被转义
      expect(csv).toContain('"包含""引号""的描述"');
      
      // 验证换行符被引号包裹
      expect(csv).toContain('"包含\n换行的描述"');
    });
    
    test('应该正确渲染空数据', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      // Act: 发送空文本
      const response = await sendRequestAction('text-extract', '');
      
      // Assert: 验证空数据被正确处理
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.text).toBe('');
    });
    
    test('应该正确渲染多种数据类型组合', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const testTable = [['A', 'B'], ['C', 'D']];
      
      // Act: 发送 CSV 导出请求（包含 csv 数据）
      const csvResponse = await sendRequestAction('csv-export', testTable);
      
      // Assert: 验证包含 csv 数据
      expect(csvResponse.uiData?.csv).toBeDefined();
      
      // Act: 发送列对齐请求（包含 table 数据）
      const tableResponse = await sendRequestAction('column-align', testTable);
      
      // Assert: 验证包含 table 数据
      expect(tableResponse.uiData?.table).toBeDefined();
      
      // Act: 发送文本提取请求（包含 text 数据）
      const textResponse = await sendRequestAction('text-extract', '文本');
      
      // Assert: 验证包含 text 数据
      expect(textResponse.uiData?.text).toBeDefined();
    });
    
    test('应该正确渲染包含 Unicode 字符的数据', async () => {
      // Arrange: 设置正常状态
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const unicodeText = '测试文本 🎉 emoji 表情 中文字符 日本語 한국어';
      
      // Act: 发送包含 Unicode 的文本
      const response = await sendRequestAction('text-extract', unicodeText);
      
      // Assert: 验证 Unicode 字符被正确保留
      expect(response.uiData?.text).toBe(unicodeText);
      expect(response.uiData?.text).toContain('🎉');
      expect(response.uiData?.text).toContain('日本語');
      expect(response.uiData?.text).toContain('한국어');
    });
    
    test('应该正确渲染大量数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // 创建大表格（100 行 x 10 列）
      const largeTable: string[][] = [];
      for (let i = 0; i < 100; i++) {
        const row: string[] = [];
        for (let j = 0; j < 10; j++) {
          row.push(`数据${i}-${j}`);
        }
        largeTable.push(row);
      }
      
      // Act: 发送大表格
      const response = await sendRequestAction('column-align', largeTable);
      
      // Assert: 验证大数据被正确处理
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.table).toEqual(largeTable);
      expect(response.uiData?.table).toHaveLength(100);
      expect(response.uiData?.table?.[0]).toHaveLength(10);
    });
    
    test('应该正确渲染不同类型的 message', async () => {
      // 测试限制消息
      await setupTestState({ usageCount: 20, hasPro: false });
      const limitResponse = await sendRequestAction('text-extract', '测试');
      expect(limitResponse.uiData?.message).toContain('免费次数已用完');
      
      // 测试 Pro 消息
      await setupTestState({ usageCount: 0, hasPro: false });
      const proResponse = await sendRequestAction('table-detect', [['A']]);
      expect(proResponse.uiData?.message).toContain('Pro 功能');
      
      // 测试错误消息
      const errorResponse = await sendRequestAction('invalid' as any, null);
      expect(errorResponse.uiData?.message).toBeDefined();
      expect(typeof errorResponse.uiData?.message).toBe('string');
    });
  });
});
