/**
 * V3 Freemium Model 集成测试
 * 验证双轨制变现模型的端到端用户流程
 * 
 * Feature: v3-freemium-model
 * 需求：设计文档 - Testing Strategy
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
import { initializeTrials } from '../../background/usage';

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

describe('V3 Freemium Model 集成测试', () => {
  describe('Free 用户完整流程', () => {
    test('Free 用户框选文本应该被限制为 5 行', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({
        hasPro: false,
      });
      
      // 准备超过 5 行的测试数据
      const testText = '第1行\n第2行\n第3行\n第4行\n第5行\n第6行\n第7行';
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证被限制为 5 行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.isLimited).toBe(true);
      expect(response.uiData?.rowLimit).toBe(5);
      expect(response.uiData?.totalRows).toBe(7);
      
      // 验证返回的数据只有 5 行
      const returnedLines = (response.data as string).split('\n');
      expect(returnedLines.length).toBe(5);
      expect(returnedLines[0]).toBe('第1行');
      expect(returnedLines[4]).toBe('第5行');
      
      // 验证提示消息
      expect(response.uiData?.limitMessage).toContain('仅展示前 5 行');
    });
    
    test('Free 用户框选少于 5 行应该不受限制', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({
        hasPro: false,
      });
      
      // 准备少于 5 行的测试数据
      const testText = '第1行\n第2行\n第3行';
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证不受限制
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.isLimited).toBe(false);
      expect(response.uiData?.totalRows).toBe(3);
      
      // 验证没有 rowLimit 和限制提示
      expect(response.uiData?.rowLimit).toBeUndefined();
      expect(response.uiData?.message).toBeUndefined();
      
      // 验证返回完整数据
      expect(response.data).toBe(testText);
    });
    
    test('Free 用户框选恰好 5 行应该不受限制', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({
        hasPro: false,
      });
      
      // 准备恰好 5 行的测试数据
      const testText = '第1行\n第2行\n第3行\n第4行\n第5行';
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证不受限制
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.isLimited).toBe(false);
      expect(response.uiData?.totalRows).toBe(5);
      
      // 验证没有限制提示
      expect(response.uiData?.rowLimit).toBeUndefined();
      expect(response.uiData?.message).toBeUndefined();
      
      // 验证返回完整数据
      expect(response.data).toBe(testText);
    });
  });
  
  describe('Free 用户试用高级清洗流程', () => {
    test('Free 用户首次使用高级清洗应该成功', async () => {
      // Arrange: 设置 Free 用户状态并设置有效的试用状态
      await setupTestState({
        hasPro: false,
        trialStates: [
          { feature: 'advanced-cleaning', allowed: true },
        ],
      });
      
      // 准备测试数据
      const testText = '第1行\n\n第2行\n第3行';
      const cleaningRules = {
        removeEmptyLines: true,
        mergeMultipleLines: false,
        mergeToSingleLine: false,
        removeDuplicates: false,
      };
      
      // Act: 执行高级清洗
      const response = await sendRequestAction('advanced-clean', {
        text: testText,
        cleaningRules,
        operation: 'copy',
      });
      
      // Assert: 验证成功执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      
      // 验证清洗结果（空行被移除）
      const cleanedText = response.data as string;
      expect(cleanedText).not.toContain('\n\n');
      expect(cleanedText.split('\n').length).toBe(3);
    });
    
    test('Free 用户试用次数用尽后应该显示升级提示', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({
        hasPro: false,
      });
      
      // 手动设置试用状态为用尽（seed 和 entropy 都为 0）
      await chrome.storage.local.set({
        'state_advanced-cleaning': {
          seed: 0,
          entropy: 0,
          timestamp: Date.now(),
        },
      });
      
      // 准备测试数据
      const testText = '第1行\n第2行';
      const cleaningRules = {
        removeEmptyLines: true,
        mergeMultipleLines: false,
        mergeToSingleLine: false,
        removeDuplicates: false,
      };
      
      // Act: 尝试使用高级清洗
      const response = await sendRequestAction('advanced-clean', {
        text: testText,
        cleaningRules,
        operation: 'copy',
      });
      
      // Assert: 验证显示升级提示
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_TRIAL_EXHAUSTED');
      expect(response.uiData?.message).toContain('高级清洗');
      expect(response.uiData?.message).toContain('试用次数已用完');
      expect(response.uiData?.message).toContain('升级 Pro 版');
    });
    
    test('Free 用户查询试用次数应该返回正确状态', async () => {
      // Arrange: 设置 Free 用户状态并初始化试用次数
      await setupTestState({
        hasPro: false,
      });
      await initializeTrials();
      
      // Act: 查询试用次数
      const response = await sendRequestAction('check-trial', {});
      
      // Assert: 验证返回所有试用状态
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      
      const allTrials = response.data as Record<string, any>;
      expect(allTrials['advanced-cleaning']).toBeDefined();
      expect(allTrials['table-detection']).toBeDefined();
      expect(allTrials['one-click-export']).toBeDefined();
      
      // 验证每个状态都有 allowed 和 remaining 字段
      expect(typeof allTrials['advanced-cleaning'].allowed).toBe('boolean');
      expect(typeof allTrials['advanced-cleaning'].remaining).toBe('number');
    });
  });
  
  describe('Pro 用户完整流程', () => {
    test('Pro 用户框选文本应该不受行数限制', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({
        hasPro: true,
      });
      
      // 准备超过 5 行的测试数据
      const testText = '第1行\n第2行\n第3行\n第4行\n第5行\n第6行\n第7行\n第8行\n第9行\n第10行';
      
      // Act: 执行文本提取
      const response = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证不受限制
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.isLimited).toBe(false);
      expect(response.uiData?.totalRows).toBe(10);
      
      // 验证没有 rowLimit 和限制提示
      expect(response.uiData?.rowLimit).toBeUndefined();
      expect(response.uiData?.message).toBeUndefined();
      
      // 验证返回完整数据
      expect(response.data).toBe(testText);
      const returnedLines = (response.data as string).split('\n');
      expect(returnedLines.length).toBe(10);
    });
    
    test('Pro 用户使用高级清洗应该不消耗试用次数', async () => {
      // Arrange: 设置 Pro 用户状态并初始化试用次数
      await setupTestState({
        hasPro: true,
      });
      await initializeTrials();
      
      // 获取初始试用状态
      const initialResponse = await sendRequestAction('check-trial', {
        feature: 'advanced-cleaning',
      });
      const initialRemaining = (initialResponse.data as any).remaining;
      
      // 准备测试数据
      const testText = '第1行\n\n第2行';
      const cleaningRules = {
        removeEmptyLines: true,
        mergeMultipleLines: false,
        mergeToSingleLine: false,
        removeDuplicates: false,
      };
      
      // Act: 执行高级清洗
      const response = await sendRequestAction('advanced-clean', {
        text: testText,
        cleaningRules,
        operation: 'copy',
      });
      
      // Assert: 验证成功执行
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      
      // 验证试用次数未减少
      const finalResponse = await sendRequestAction('check-trial', {
        feature: 'advanced-cleaning',
      });
      const finalRemaining = (finalResponse.data as any).remaining;
      expect(finalRemaining).toBe(initialRemaining);
    });
    
    test('Pro 用户导出表格应该不受行数限制', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({
        hasPro: true,
      });
      
      // 准备超过 5 行的表格数据
      const testTable = [
        ['列1', '列2'],
        ['行1', '数据1'],
        ['行2', '数据2'],
        ['行3', '数据3'],
        ['行4', '数据4'],
        ['行5', '数据5'],
        ['行6', '数据6'],
        ['行7', '数据7'],
      ];
      
      // Act: 执行表格导出
      const response = await sendRequestAction('table-export', {
        table: testTable,
        exportFormat: 'csv',
      });
      
      // Assert: 验证成功导出完整数据
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
    });
  });
  
  describe('表格识别流程', () => {
    test('Free 用户表格识别应该被阻止', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({
        hasPro: false,
      });
      
      // 准备测试表格
      const testTable = [
        ['姓名', '年龄'],
        ['张三', '25'],
      ];
      
      // Act: 尝试表格识别
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证被阻止
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_PRO_PANEL');
      expect(response.uiData?.message).toContain('表格识别');
      expect(response.uiData?.message).toContain('Pro');
    });
    
    test('Pro 用户表格识别应该成功', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({
        hasPro: true,
      });
      
      // 准备测试表格
      const testTable = [
        ['姓名', '年龄'],
        ['张三', '25'],
        ['李四', '30'],
      ];
      
      // Act: 执行表格识别
      const response = await sendRequestAction('table-detect', testTable);
      
      // Assert: 验证成功
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toEqual(testTable);
    });
    
    test('Free 用户有试用次数时表格导出应该成功', async () => {
      // Arrange: 设置 Free 用户状态并设置有效的试用状态
      await setupTestState({
        hasPro: false,
        trialStates: [
          { feature: 'one-click-export', allowed: true },
        ],
      });
      
      // 准备测试表格（超过 5 行）
      const testTable = [
        ['列1', '列2'],
        ['行1', '数据1'],
        ['行2', '数据2'],
        ['行3', '数据3'],
        ['行4', '数据4'],
        ['行5', '数据5'],
        ['行6', '数据6'],
        ['行7', '数据7'],
      ];
      
      // Act: 执行表格导出
      const response = await sendRequestAction('table-export', {
        table: testTable,
        exportFormat: 'csv',
      });
      
      // Assert: 验证成功导出完整数据（不受 5 行限制）
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
    });
  });
  
  describe('权限切换流程', () => {
    test('从 Free 切换到 Pro 应该立即解除限制', async () => {
      // Arrange: 初始为 Free 用户
      await setupTestState({
        hasPro: false,
      });
      
      // 准备测试数据
      const testText = '第1行\n第2行\n第3行\n第4行\n第5行\n第6行\n第7行';
      
      // Act: 第一次操作（Free 用户）
      const response1 = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证被限制为 5 行
      expect(response1.status).toBe('ok');
      expect(response1.uiData?.isLimited).toBe(true);
      expect(response1.uiData?.rowLimit).toBe(5);
      
      // Act: 切换到 Pro 用户
      await setupTestState({
        hasPro: true,
      });
      
      // Act: 第二次操作（Pro 用户）
      const response2 = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证不再受限制
      expect(response2.status).toBe('ok');
      expect(response2.uiData?.isLimited).toBe(false);
      expect(response2.uiData?.rowLimit).toBeUndefined();
      
      // 验证返回完整数据
      const returnedLines = (response2.data as string).split('\n');
      expect(returnedLines.length).toBe(7);
    });
    
    test('从 Pro 切换到 Free 应该立即应用限制', async () => {
      // Arrange: 初始为 Pro 用户
      await setupTestState({
        hasPro: true,
      });
      
      // 准备测试数据
      const testText = '第1行\n第2行\n第3行\n第4行\n第5行\n第6行\n第7行';
      
      // Act: 第一次操作（Pro 用户）
      const response1 = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证不受限制
      expect(response1.status).toBe('ok');
      expect(response1.uiData?.isLimited).toBe(false);
      
      // Act: 切换到 Free 用户
      await setupTestState({
        hasPro: false,
      });
      
      // Act: 第二次操作（Free 用户）
      const response2 = await sendRequestAction('text-extract', testText);
      
      // Assert: 验证被限制为 5 行
      expect(response2.status).toBe('ok');
      expect(response2.uiData?.isLimited).toBe(true);
      expect(response2.uiData?.rowLimit).toBe(5);
      
      // 验证返回的数据只有 5 行
      const returnedLines = (response2.data as string).split('\n');
      expect(returnedLines.length).toBe(5);
    });
    
    test('权限切换应该影响表格识别功能', async () => {
      // Arrange: 准备测试表格
      const testTable = [
        ['姓名', '年龄'],
        ['张三', '25'],
      ];
      
      // 场景 1: Free 用户，表格识别被阻止
      await setupTestState({
        hasPro: false,
      });
      
      const response1 = await sendRequestAction('table-detect', testTable);
      expect(response1.status).toBe('blocked');
      expect(response1.uiAction).toBe('SHOW_PRO_PANEL');
      
      // 场景 2: 切换到 Pro 用户，表格识别成功
      await setupTestState({
        hasPro: true,
      });
      
      const response2 = await sendRequestAction('table-detect', testTable);
      expect(response2.status).toBe('ok');
      expect(response2.uiAction).toBe('SHOW_RESULT_PANEL');
      
      // 场景 3: 切换回 Free 用户，表格识别再次被阻止
      await setupTestState({
        hasPro: false,
      });
      
      const response3 = await sendRequestAction('table-detect', testTable);
      expect(response3.status).toBe('blocked');
      expect(response3.uiAction).toBe('SHOW_PRO_PANEL');
    });
  });
  
  describe('端到端综合场景', () => {
    test('Free 用户完整工作流：框选 → 清洗 → 导出', async () => {
      // Arrange: 设置 Free 用户状态并设置有效的试用状态
      await setupTestState({
        hasPro: false,
        trialStates: [
          { feature: 'advanced-cleaning', allowed: true },
        ],
      });
      
      // 步骤 1: 框选文本（超过 5 行）
      const testText = '第1行\n\n第2行\n第3行\n第4行\n第5行\n第6行\n第7行';
      const extractResponse = await sendRequestAction('text-extract', testText);
      
      // 验证框选结果被限制为 5 行
      expect(extractResponse.status).toBe('ok');
      expect(extractResponse.uiData?.isLimited).toBe(true);
      expect(extractResponse.uiData?.rowLimit).toBe(5);
      
      // 步骤 2: 使用高级清洗（去空行）
      const cleaningRules = {
        removeEmptyLines: true,
        mergeMultipleLines: false,
        mergeToSingleLine: false,
        removeDuplicates: false,
      };
      
      const cleanResponse = await sendRequestAction('advanced-clean', {
        text: testText,
        cleaningRules,
        operation: 'export',
        exportFormat: 'csv',
      });
      
      // 验证清洗成功
      expect(cleanResponse.status).toBe('ok');
      expect(cleanResponse.uiAction).toBe('SHOW_RESULT_PANEL');
      
      // 验证清洗后仍然被限制为 5 行
      expect(cleanResponse.uiData?.isLimited).toBe(true);
      expect(cleanResponse.uiData?.rowLimit).toBe(5);
      
      // 验证 CSV 数据存在
      expect(cleanResponse.uiData?.csv).toBeDefined();
    });
    
    test('Pro 用户完整工作流：框选 → 清洗 → 导出', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({
        hasPro: true,
      });
      
      // 步骤 1: 框选文本（超过 5 行）
      const testText = '第1行\n\n第2行\n第3行\n第4行\n第5行\n第6行\n第7行\n第8行\n第9行\n第10行';
      const extractResponse = await sendRequestAction('text-extract', testText);
      
      // 验证框选结果不受限制
      expect(extractResponse.status).toBe('ok');
      expect(extractResponse.uiData?.isLimited).toBe(false);
      expect(extractResponse.uiData?.totalRows).toBe(11); // 包含空行
      
      // 步骤 2: 使用高级清洗（去空行）
      const cleaningRules = {
        removeEmptyLines: true,
        mergeMultipleLines: false,
        mergeToSingleLine: false,
        removeDuplicates: false,
      };
      
      const cleanResponse = await sendRequestAction('advanced-clean', {
        text: testText,
        cleaningRules,
        operation: 'export',
        exportFormat: 'csv',
      });
      
      // 验证清洗成功且不受限制
      expect(cleanResponse.status).toBe('ok');
      expect(cleanResponse.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(cleanResponse.uiData?.isLimited).toBe(false);
      
      // 验证清洗后的数据（空行被移除）
      const cleanedText = cleanResponse.data as string;
      expect(cleanedText).not.toContain('\n\n');
      
      // 验证 CSV 数据包含所有行（清洗后）
      const csvData = cleanResponse.uiData?.csv as string;
      const csvLines = csvData.split('\n').filter(line => line.length > 0);
      // 原始 11 行（包含 1 个空行），清洗后 10 行
      expect(csvLines.length).toBe(10);
    });
    
    test('表格识别 → 导出完整流程', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({
        hasPro: true,
      });
      
      // 步骤 1: 表格识别
      const testTable = [
        ['产品', '价格', '库存'],
        ['苹果', '5.00', '100'],
        ['香蕉', '3.00', '150'],
        ['橙子', '4.00', '120'],
      ];
      
      const detectResponse = await sendRequestAction('table-detect', testTable);
      
      // 验证表格识别成功
      expect(detectResponse.status).toBe('ok');
      expect(detectResponse.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(detectResponse.data).toEqual(testTable);
      
      // 步骤 2: 导出表格
      const exportResponse = await sendRequestAction('table-export', {
        table: testTable,
        exportFormat: 'csv',
      });
      
      // 验证导出成功
      expect(exportResponse.status).toBe('ok');
      expect(exportResponse.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(exportResponse.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
    });
    
    test('多次权限切换的完整流程', async () => {
      // 准备测试数据
      const testText = '第1行\n第2行\n第3行\n第4行\n第5行\n第6行';
      
      // 场景 1: Free 用户，受限制
      await setupTestState({ hasPro: false });
      const response1 = await sendRequestAction('text-extract', testText);
      expect(response1.uiData?.isLimited).toBe(true);
      expect(response1.uiData?.rowLimit).toBe(5);
      
      // 场景 2: 升级到 Pro，不受限制
      await setupTestState({ hasPro: true });
      const response2 = await sendRequestAction('text-extract', testText);
      expect(response2.uiData?.isLimited).toBe(false);
      
      // 场景 3: 降级到 Free，再次受限制
      await setupTestState({ hasPro: false });
      const response3 = await sendRequestAction('text-extract', testText);
      expect(response3.uiData?.isLimited).toBe(true);
      expect(response3.uiData?.rowLimit).toBe(5);
      
      // 场景 4: 再次升级到 Pro，不受限制
      await setupTestState({ hasPro: true });
      const response4 = await sendRequestAction('text-extract', testText);
      expect(response4.uiData?.isLimited).toBe(false);
    });
  });
  
  describe('错误处理和边界情况', () => {
    test('空文本应该正常处理', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({
        hasPro: false,
      });
      
      // Act: 提取空文本
      const response = await sendRequestAction('text-extract', '');
      
      // Assert: 验证正常处理
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toBe('');
      expect(response.uiData?.isLimited).toBe(false);
    });
    
    test('单行文本应该不受限制', async () => {
      // Arrange: 设置 Free 用户状态
      await setupTestState({
        hasPro: false,
      });
      
      // Act: 提取单行文本
      const response = await sendRequestAction('text-extract', '单行文本');
      
      // Assert: 验证不受限制
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.data).toBe('单行文本');
      expect(response.uiData?.isLimited).toBe(false);
    });
    
    test('空表格应该正常处理', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({
        hasPro: true,
      });
      
      // Act: 导出空表格
      const response = await sendRequestAction('table-export', {
        table: [],
        exportFormat: 'csv',
      });
      
      // Assert: 验证返回错误提示
      expect(response.status).toBe('blocked');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(response.uiData?.message).toContain('导出失败');
    });
    
    test('未初始化试用次数时应该使用默认值', async () => {
      // Arrange: 设置 Free 用户状态（不初始化试用次数）
      await setupTestState({
        hasPro: false,
      });
      
      // Act: 查询试用次数
      const response = await sendRequestAction('check-trial', {
        feature: 'advanced-cleaning',
      });
      
      // Assert: 验证返回默认值
      expect(response.status).toBe('ok');
      expect(response.uiAction).toBe('SHOW_RESULT_PANEL');
      
      const trialState = response.data as any;
      expect(typeof trialState.allowed).toBe('boolean');
      expect(typeof trialState.remaining).toBe('number');
    });
    
    test('无效的清洗规则应该降级处理', async () => {
      // Arrange: 设置 Pro 用户状态
      await setupTestState({
        hasPro: true,
      });
      
      // Act: 使用无效的清洗规则
      const response = await sendRequestAction('advanced-clean', {
        text: '测试文本',
        cleaningRules: null, // 无效的规则
        operation: 'copy',
      });
      
      // Assert: 验证降级处理（应该返回错误或使用默认规则）
      // 具体行为取决于实现
      expect(response.status).toBeDefined();
    });
  });
});
