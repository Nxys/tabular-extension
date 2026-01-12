/**
 * 集成测试基础设施验证测试
 * 验证辅助函数、场景构建器、消息模拟器和数据生成器是否正常工作
 */

import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import {
  sendRequestAction,
  setupTestState,
  cleanupTestState,
  waitForAsync,
  validateMessageFormat,
} from './helpers';
import {
  createTextExtractionScenario,
  createTableDetectionScenario,
  createUsageLimitScenario,
} from './scenarios';
import {
  setMessageInterceptor,
  clearMessageInterceptor,
  getMessageHistory,
  clearMessageHistory,
} from './messaging';
import {
  generateRandomText,
  generateRandomTable,
  generateBoundaryText,
  generateBoundaryTable,
} from './generators';

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

describe('集成测试基础设施', () => {
  describe('辅助函数库', () => {
    test('setupTestState 应该正确设置测试状态', async () => {
      await setupTestState({
        usageCount: 5,  // 已废弃，但保留参数兼容性
        hasPro: true,
      });
      
      const storage = await chrome.storage.local.get(['pro_state']);
      // 注意：不再检查 usage_count，因为新模型不使用它
      expect(storage.pro_state.isPro).toBe(true);
    });
    
    test('cleanupTestState 应该清理测试环境', async () => {
      await setupTestState({
        usageCount: 5,  // 已废弃，但保留参数兼容性
        hasPro: true,
      });
      
      await cleanupTestState();
      
      const storage = await chrome.storage.local.get(['pro_state']);
      // 注意：不再检查 usage_count，因为新模型不使用它
      expect(storage.pro_state.isPro).toBe(false);
    });
    
    test('waitForAsync 应该等待指定时间', async () => {
      const start = Date.now();
      await waitForAsync(50);
      const end = Date.now();
      
      expect(end - start).toBeGreaterThanOrEqual(50);
    });
    
    test('validateMessageFormat 应该验证 REQUEST_ACTION 格式', () => {
      const validMessage = {
        type: 'REQUEST_ACTION',
        payload: {
          action: 'text-extract',
          data: 'test',
        },
      };
      
      expect(validateMessageFormat(validMessage, 'REQUEST_ACTION')).toBe(true);
      
      const invalidMessage = {
        type: 'INVALID',
        payload: {},
      };
      
      expect(validateMessageFormat(invalidMessage, 'REQUEST_ACTION')).toBe(false);
    });
    
    test('validateMessageFormat 应该验证 ACTION_RESULT 格式', () => {
      const validMessage = {
        type: 'ACTION_RESULT',
        payload: {
          status: 'ok',
          uiAction: 'SHOW_RESULT_PANEL',
        },
      };
      
      expect(validateMessageFormat(validMessage, 'ACTION_RESULT')).toBe(true);
      
      const invalidMessage = {
        type: 'ACTION_RESULT',
        payload: {
          status: 'invalid',
        },
      };
      
      expect(validateMessageFormat(invalidMessage, 'ACTION_RESULT')).toBe(false);
    });
  });
  
  describe('场景构建器', () => {
    test('createTextExtractionScenario 应该创建文本提取场景', () => {
      const scenario = createTextExtractionScenario('测试文本');
      
      expect(scenario.text).toBe('测试文本');
      expect(scenario.expectedResult.status).toBe('ok');
      expect(scenario.expectedResult.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(scenario.expectedResult.uiData?.text).toBe('测试文本');
    });
    
    test('createTableDetectionScenario 应该创建有 Pro 权限的场景', () => {
      const table = [['A', 'B'], ['C', 'D']];
      const scenario = createTableDetectionScenario(table, true);
      
      expect(scenario.table).toEqual(table);
      expect(scenario.hasPro).toBe(true);
      expect(scenario.expectedResult.status).toBe('ok');
      expect(scenario.expectedResult.uiAction).toBe('SHOW_RESULT_PANEL');
    });
    
    test('createTableDetectionScenario 应该创建无 Pro 权限的场景', () => {
      const table = [['A', 'B'], ['C', 'D']];
      const scenario = createTableDetectionScenario(table, false);
      
      expect(scenario.table).toEqual(table);
      expect(scenario.hasPro).toBe(false);
      expect(scenario.expectedResult.status).toBe('blocked');
      expect(scenario.expectedResult.uiAction).toBe('SHOW_PRO_PANEL');
    });
    
    test('createUsageLimitScenario 应该创建使用次数限制场景', () => {
      const scenario = createUsageLimitScenario(10, 'text-extract');
      
      expect(scenario.currentUsage).toBe(10);
      expect(scenario.maxUsage).toBe(10);
      expect(scenario.action).toBe('text-extract');
      expect(scenario.expectedResult.status).toBe('limited');
      expect(scenario.expectedResult.uiAction).toBe('SHOW_LIMIT_PANEL');
    });
  });
  
  describe('消息通信模拟器', () => {
    test('应该记录消息历史', async () => {
      await sendRequestAction('text-extract', '测试');
      
      const history = getMessageHistory();
      expect(history.requests).toHaveLength(1);
      expect(history.responses).toHaveLength(1);
      expect(history.requests[0].payload.action).toBe('text-extract');
    });
    
    test('应该清除消息历史', async () => {
      await sendRequestAction('text-extract', '测试');
      clearMessageHistory();
      
      const history = getMessageHistory();
      expect(history.requests).toHaveLength(0);
      expect(history.responses).toHaveLength(0);
    });
    
    test('应该触发消息拦截器', async () => {
      const requests: any[] = [];
      const responses: any[] = [];
      
      setMessageInterceptor({
        onRequest: (msg) => requests.push(msg),
        onResponse: (res) => responses.push(res),
      });
      
      await sendRequestAction('text-extract', '测试');
      
      expect(requests).toHaveLength(1);
      expect(responses).toHaveLength(1);
      
      clearMessageInterceptor();
    });
  });
  
  describe('测试数据生成器', () => {
    test('generateRandomText 应该生成指定长度的文本', () => {
      const text = generateRandomText(50);
      expect(text).toHaveLength(50);
    });
    
    test('generateRandomTable 应该生成指定大小的表格', () => {
      const table = generateRandomTable(3, 4);
      expect(table).toHaveLength(3);
      expect(table[0]).toHaveLength(4);
    });
    
    test('generateBoundaryText 应该生成边界值文本', () => {
      const boundary = generateBoundaryText();
      
      expect(boundary.empty).toBe('');
      expect(boundary.single).toBe('A');
      expect(boundary.long).toHaveLength(10000);
      expect(boundary.special).toContain('<');
    });
    
    test('generateBoundaryTable 应该生成边界值表格', () => {
      const boundary = generateBoundaryTable();
      
      expect(boundary.empty).toEqual([]);
      expect(boundary.single).toEqual([['A']]);
      expect(boundary.large).toHaveLength(100);
      expect(boundary.large[0]).toHaveLength(100);
    });
  });
});
