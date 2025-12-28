/**
 * CSV 导出端到端流程测试
 * 验证从用户交互到 UI 响应的完整 CSV 导出流程
 * 
 * Feature: integration-testing
 * 需求：5.1, 5.2, 5.3, 5.4
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

describe('CSV 导出端到端流程测试', () => {
  describe('正常 CSV 导出流程', () => {
    test('应该完成完整的 CSV 导出流程（有 Pro 权限）', async () => {
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
      
      // Act: 模拟用户触发 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
      // Assert: 验证完整流程执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.csv).toBeDefined();
      expect(typeof response.uiData?.csv).toBe('string');
    });
    
    test('应该正确生成 CSV 格式', async () => {
      // Arrange: 准备测试表格
      const testTable = [
        ['A', 'B', 'C'],
        ['1', '2', '3'],
      ];
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 执行 CSV 导出
      const response = await sendRequestAction('csv-export', testTable);
      
      // Assert: 验证 CSV 格式
      expect(response.uiData?.csv).toBe('A,B,C\n1,2,3');
    });
    
    test('应该显示结果面板', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableData = [['A', 'B']];
      
      // Act: 执行 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
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
      
      // Act: 执行 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
      // Assert: 验证操作成功
      expect(response.status).toBe('ok');
      
      // 验证使用次数未增加（csv-export 不消耗次数）
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
      
      // Act: 尝试 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
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
      
      // Act: 尝试 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
      // Assert: 验证显示 Pro 面板
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('Pro 功能');
    });
    
    test('没有 Pro 权限时不应该返回 CSV 数据', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      
      const tableData = [['不应该导出', '的数据']];
      
      // Act: 尝试 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
      // Assert: 验证没有返回 CSV 数据
      expect(response.status).toBe('blocked');
      expect(response.uiData?.csv).toBeUndefined();
    });
    
    test('没有 Pro 权限时不应该记录使用统计', async () => {
      // Arrange: 设置无 Pro 权限
      await setupTestState({
        usageCount: 5,
        hasPro: false,
      });
      
      const tableData = [['A', 'B']];
      
      // Act: 尝试 CSV 导出
      await sendRequestAction('csv-export', tableData);
      
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
      
      // Act: 尝试 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
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
      
      // Act: 尝试 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
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
      
      // Act: 尝试 CSV 导出
      const response = await sendRequestAction('csv-export', tableData);
      
      // Assert: 验证返回限制提示而不是 Pro 提示
      expect(response.uiAction).toBe('SHOW_LIMIT_PANEL');
      expect(response.uiData?.message).toContain('免费次数已用完');
    });
  });
  
  describe('CSV 特殊字符转义', () => {
    test('应该正确转义逗号', async () => {
      // Arrange: 准备包含逗号的表格
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableWithComma = [
        ['姓名', '地址'],
        ['张三', '北京市,朝阳区'],
        ['李四', '上海市,浦东新区'],
      ];
      
      // Act: 导出 CSV
      const response = await sendRequestAction('csv-export', tableWithComma);
      
      // Assert: 验证逗号被正确转义（用引号包裹）
      expect(response.status).toBe('ok');
      expect(response.uiData?.csv).toContain('"北京市,朝阳区"');
      expect(response.uiData?.csv).toContain('"上海市,浦东新区"');
    });
    
    test('应该正确转义引号', async () => {
      // Arrange: 准备包含引号的表格
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableWithQuote = [
        ['标题', '内容'],
        ['测试', '他说"你好"'],
        ['示例', '"引号"测试'],
      ];
      
      // Act: 导出 CSV
      const response = await sendRequestAction('csv-export', tableWithQuote);
      
      // Assert: 验证引号被正确转义（双引号变成两个双引号）
      expect(response.status).toBe('ok');
      expect(response.uiData?.csv).toContain('他说""你好""');
      expect(response.uiData?.csv).toContain('""引号""测试');
    });
    
    test('应该正确转义换行符', async () => {
      // Arrange: 准备包含换行符的表格
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableWithNewline = [
        ['标题', '描述'],
        ['项目A', '第一行\n第二行'],
        ['项目B', '多行\n文本\n内容'],
      ];
      
      // Act: 导出 CSV
      const response = await sendRequestAction('csv-export', tableWithNewline);
      
      // Assert: 验证换行符被正确处理（用引号包裹）
      expect(response.status).toBe('ok');
      expect(response.uiData?.csv).toContain('"第一行\n第二行"');
      expect(response.uiData?.csv).toContain('"多行\n文本\n内容"');
    });
    
    test('应该正确处理混合特殊字符', async () => {
      // Arrange: 准备包含多种特殊字符的表格
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableWithMixed = [
        ['字段', '值'],
        ['复杂', '包含,逗号和"引号"'],
        ['多行', '第一行,有逗号\n第二行"有引号"'],
      ];
      
      // Act: 导出 CSV
      const response = await sendRequestAction('csv-export', tableWithMixed);
      
      // Assert: 验证所有特殊字符都被正确转义
      expect(response.status).toBe('ok');
      const csv = response.uiData?.csv || '';
      
      // 验证包含逗号和引号的字段被引号包裹，且引号被转义
      expect(csv).toContain('"包含,逗号和""引号"""');
      
      // 验证多行且包含特殊字符的字段被正确处理
      expect(csv).toContain('"第一行,有逗号\n第二行""有引号"""');
    });
    
    test('应该正确处理空字符串', async () => {
      // Arrange: 准备包含空字符串的表格
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableWithEmpty = [
        ['A', 'B', 'C'],
        ['1', '', '3'],
        ['', '5', ''],
      ];
      
      // Act: 导出 CSV
      const response = await sendRequestAction('csv-export', tableWithEmpty);
      
      // Assert: 验证空字符串被正确处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.csv).toBe('A,B,C\n1,,3\n,5,');
    });
    
    test('应该正确处理只包含空格的字段', async () => {
      // Arrange: 准备包含空格的表格
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const tableWithSpaces = [
        ['A', 'B'],
        ['  ', '  空格  '],
      ];
      
      // Act: 导出 CSV
      const response = await sendRequestAction('csv-export', tableWithSpaces);
      
      // Assert: 验证空格被保留
      expect(response.status).toBe('ok');
      const csv = response.uiData?.csv || '';
      expect(csv).toContain('  ');
      expect(csv).toContain('  空格  ');
    });
    
    test('CSV 应该可以被标准解析器解析', async () => {
      // Arrange: 准备包含各种特殊字符的复杂表格
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      const complexTable = [
        ['姓名', '邮箱', '地址', '备注'],
        ['张三', 'test@example.com', '北京市,朝阳区', '普通用户'],
        ['李四', 'user@test.com', '上海市,浦东新区', '他说"你好"'],
        ['王五', 'admin@test.com', '广州市,天河区', '多行\n备注\n信息'],
      ];
      
      // Act: 导出 CSV
      const response = await sendRequestAction('csv-export', complexTable);
      
      // Assert: 验证 CSV 格式正确
      expect(response.status).toBe('ok');
      const csv = response.uiData?.csv || '';
      
      // 验证 CSV 包含正确的行数（标题行 + 3 数据行）
      const lines = csv.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(4);
      
      // 验证特殊字符都被正确转义
      expect(csv).toContain('"北京市,朝阳区"');
      expect(csv).toContain('他说""你好""');
      expect(csv).toContain('"多行\n备注\n信息"');
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
      const response = await sendRequestAction('csv-export', null);
      
      // Assert: 验证返回响应
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
      const response = await sendRequestAction('csv-export', []);
      
      // Assert: 验证空表格处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.csv).toBe('');
    });
    
    test('应该处理非数组数据', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 发送非数组数据
      const response = await sendRequestAction('csv-export', 'invalid data');
      
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
      
      // Act: 导出不规则表格
      const response = await sendRequestAction('csv-export', irregularTable);
      
      // Assert: 验证处理不规则表格
      expect(response.status).toBe('ok');
      expect(response.uiData?.csv).toBeDefined();
    });
    
    test('错误不应该消耗使用次数', async () => {
      // Arrange: 设置初始使用次数
      await setupTestState({
        usageCount: 5,
        hasPro: true,
      });
      
      // Act: 触发可能的错误场景
      await sendRequestAction('csv-export', null);
      
      // Assert: 验证使用次数未增加（csv-export 本身就不消耗次数）
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
      await sendRequestAction('csv-export', null);
      const normalResponse = await sendRequestAction('csv-export', [['A', 'B']]);
      
      // Assert: 验证正常操作不受影响
      expect(normalResponse.status).toBe('ok');
      expect(normalResponse.uiData?.csv).toBe('A,B');
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
      const response = await simulateUserAction('csv-export', tableData, {
        usageCount: 3,
        hasPro: true,
      });
      
      // Assert: 验证完整流程
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.csv).toBe('产品,价格,库存\n苹果,5.00,100\n香蕉,3.50,150');
      
      // 验证使用次数未增加（csv-export 不消耗次数）
      const storage = await chrome.storage.local.get(['usage_count']);
      expect(storage.usage_count).toBe(3);
    });
    
    test('应该正确处理多次连续的 CSV 导出操作', async () => {
      // Arrange: 设置有 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 模拟用户连续操作
      const response1 = await sendRequestAction('csv-export', [['A', 'B']]);
      const response2 = await sendRequestAction('csv-export', [['C', 'D']]);
      const response3 = await sendRequestAction('csv-export', [['E', 'F']]);
      
      // Assert: 验证所有操作都成功
      expect(response1.status).toBe('ok');
      expect(response2.status).toBe('ok');
      expect(response3.status).toBe('ok');
      
      // 验证使用次数未增加（csv-export 不消耗次数）
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
      const withProResponse = await sendRequestAction('csv-export', [['A', 'B']]);
      expect(withProResponse.status).toBe('ok');
      
      // 状态 2: 无 Pro 权限
      await setupTestState({
        usageCount: 0,
        hasPro: false,
      });
      const withoutProResponse = await sendRequestAction('csv-export', [['C', 'D']]);
      expect(withoutProResponse.status).toBe('blocked');
      
      // 状态 3: 达到使用限制
      await setupTestState({
        usageCount: 20,
        hasPro: true,
      });
      const limitedResponse = await sendRequestAction('csv-export', [['E', 'F']]);
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
      
      // Act: 导出大型表格
      const response = await sendRequestAction('csv-export', largeTable);
      
      // Assert: 验证大型表格处理
      expect(response.status).toBe('ok');
      expect(response.uiData?.csv).toBeDefined();
      
      // 验证 CSV 包含正确的行数
      const lines = (response.uiData?.csv || '').split('\n');
      expect(lines.length).toBe(100);
    });
    
    test('应该正确处理包含特殊字符的复杂表格', async () => {
      // Arrange: 准备包含各种特殊字符的表格
      const complexTable = [
        ['姓名', '邮箱', '备注'],
        ['张三', 'test@example.com', '特殊字符：\n换行\t制表符'],
        ['李四', 'user@test.com', '符号：<>&"\''],
        ['王五', 'admin@test.com', '地址：北京市,朝阳区'],
      ];
      
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 导出包含特殊字符的表格
      const response = await sendRequestAction('csv-export', complexTable);
      
      // Assert: 验证特殊字符正确处理
      expect(response.status).toBe('ok');
      const csv = response.uiData?.csv || '';
      
      // 验证换行符被保留并用引号包裹
      expect(csv).toContain('"特殊字符：\n换行\t制表符"');
      
      // 验证逗号被转义
      expect(csv).toContain('"地址：北京市,朝阳区"');
    });
    
    test('应该正确处理中文和 Unicode 字符', async () => {
      // Arrange: 准备包含中文和 Unicode 的表格
      const unicodeTable = [
        ['中文', 'Emoji', 'Unicode'],
        ['你好', '😀🎉', '测试'],
        ['世界', '✓✗', '数据'],
      ];
      
      await setupTestState({
        usageCount: 0,
        hasPro: true,
      });
      
      // Act: 导出包含 Unicode 的表格
      const response = await sendRequestAction('csv-export', unicodeTable);
      
      // Assert: 验证 Unicode 字符正确处理
      expect(response.status).toBe('ok');
      const csv = response.uiData?.csv || '';
      expect(csv).toContain('你好');
      expect(csv).toContain('😀🎉');
      expect(csv).toContain('✓✗');
    });
  });
});
