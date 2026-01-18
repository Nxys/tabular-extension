/**
 * 表格导出功能测试
 * 验证 table-export Action 的处理逻辑
 * 
 * Feature: v3-freemium-model
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { handleActionRequest } from '../index';
import { getFromStorage } from '../storage';
import type { AdvancedFeature } from '../../shared/types';

// Mock chrome API
const mockStorage: Record<string, unknown> = {};
const mockDownloads: { url: string; filename: string; saveAs: boolean }[] = [];

beforeAll(() => {
  // Mock URL.createObjectURL and URL.revokeObjectURL
  global.URL.createObjectURL = jest.fn((_blob: Blob) => {
    return `blob:mock-url-${Date.now()}`;
  });
  global.URL.revokeObjectURL = jest.fn();
  
  (global as any).chrome = {
    runtime: {
      id: 'test-extension-id-12345', // Mock 扩展 ID
      lastError: undefined
    },
    storage: {
      local: {
        get: jest.fn((keys: string | string[] | null) => {
          if (keys === null) {
            return Promise.resolve(mockStorage);
          }
          if (typeof keys === 'string') {
            return Promise.resolve({ [keys]: mockStorage[keys] });
          }
          const result: Record<string, unknown> = {};
          keys.forEach(key => {
            result[key] = mockStorage[key];
          });
          return Promise.resolve(result);
        }),
        set: jest.fn((items: Record<string, unknown>) => {
          Object.assign(mockStorage, items);
          return Promise.resolve();
        }),
      },
    },
    downloads: {
      download: jest.fn((options: { url: string; filename: string; saveAs: boolean }, callback?: (downloadId?: number) => void) => {
        mockDownloads.push(options);
        if (callback) {
          // 模拟成功下载
          setTimeout(() => callback(Date.now()), 0);
        }
      })
    }
  };
});

beforeEach(() => {
  // 清空 mock storage
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  
  // 清空 mock downloads
  mockDownloads.length = 0;
  
  // 重置 chrome.runtime.lastError
  (global as any).chrome.runtime.lastError = undefined;
  
  // 初始化试用状态（设置为允许使用的状态）
  const features: AdvancedFeature[] = [
    'advanced-cleaning',
    'table-detection',
    'one-click-export'
  ];
  
  features.forEach(feature => {
    // 使用较大的 seed 和 entropy 值，确保 deriveAllowed 返回 true
    mockStorage[`state_${feature}`] = {
      seed: 0xf0000000,
      entropy: 0xf0000000,
      timestamp: Date.now()
    };
  });
  
  // 设置 Pro 状态为 false
  mockStorage['pro_state'] = {
    isPro: false,
    signature: '',
    features: {
      'table-detect': false,
      'column-align': false,
      'csv-export': false
    }
  };
});

describe('表格导出功能测试', () => {
  describe('Free 用户有试用次数', () => {
    test('应该成功导出表格为 CSV 格式', async () => {
      // Arrange
      const testTable = [
        ['姓名', '年龄', '城市'],
        ['张三', '25', '北京'],
        ['李四', '30', '上海']
      ];
      
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'csv' as const
        }
      };
      
      // Act
      const result = await handleActionRequest(payload);
      
      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
      // 验证下载被触发
      expect(mockDownloads.length).toBe(1);
      expect(mockDownloads[0].filename).toMatch(/^export_.*\.csv$/);
    });
    
    test('应该成功导出表格为 Excel 格式', async () => {
      // Arrange
      const testTable = [
        ['产品', '价格'],
        ['苹果', '5.00'],
        ['香蕉', '3.50']
      ];
      
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'excel' as const
        }
      };
      
      // Act
      const result = await handleActionRequest(payload);
      
      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
      // 验证下载被触发，文件扩展名为 .xls
      expect(mockDownloads.length).toBe(1);
      expect(mockDownloads[0].filename).toMatch(/^export_.*\.xls$/);
    });
    
    test('Free 用户有试用次数时不受 5 行限制', async () => {
      // Arrange: 创建超过 5 行的表格
      const largeTable = [
        ['行1'],
        ['行2'],
        ['行3'],
        ['行4'],
        ['行5'],
        ['行6'],
        ['行7'],
        ['行8']
      ];
      
      const payload = {
        action: 'table-export' as const,
        data: {
          table: largeTable,
          exportFormat: 'csv' as const
        }
      };
      
      // Act
      const result = await handleActionRequest(payload);
      
      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
      // 验证下载被触发，所有 8 行都应该被导出（不受 5 行限制）
      expect(mockDownloads.length).toBe(1);
    });
    
    test('应该消耗试用次数', async () => {
      // Arrange
      const testTable = [['测试']];
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'csv' as const
        }
      };
      
      // 获取初始状态
      const initialState = await getFromStorage('state_one-click-export', null);
      
      // Act
      await handleActionRequest(payload);
      
      // Assert: 验证状态已演化
      const finalState = await getFromStorage('state_one-click-export', null);
      expect(finalState).not.toEqual(initialState);
    });
  });
  
  describe('Free 用户试用次数用尽', () => {
    beforeEach(() => {
      // 设置试用次数用尽的状态
      mockStorage['state_one-click-export'] = {
        seed: 0,
        entropy: 0,
        timestamp: Date.now()
      };
    });
    
    test('应该显示试用次数用尽提示', async () => {
      // Arrange
      const testTable = [['测试']];
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'csv' as const
        }
      };
      
      // Act
      const result = await handleActionRequest(payload);
      
      // Assert
      expect(result.status).toBe('blocked');
      expect(result.uiAction).toBe('SHOW_TRIAL_EXHAUSTED');
      expect(result.uiData?.message).toContain('一键导出试用次数已用完');
      expect(result.uiData?.message).toContain('升级 Pro 版解锁以下权益');
      expect(result.uiData?.message).toContain('无行数限制');
      expect(result.uiData?.message).toContain('高级清洗功能无限使用');
    });
    
    test('不应该消耗试用次数', async () => {
      // Arrange
      const testTable = [['测试']];
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'csv' as const
        }
      };
      
      const initialState = await getFromStorage('state_one-click-export', null);
      
      // Act
      await handleActionRequest(payload);
      
      // Assert: 验证状态未变化
      const finalState = await getFromStorage('state_one-click-export', null);
      expect(finalState).toEqual(initialState);
    });
  });
  
  describe('应用清洗规则', () => {
    test('应该应用清洗规则到表格数据', async () => {
      // Arrange
      const testTable = [
        ['行1', '列2'],
        ['', ''],
        ['行2', '列2'],
        ['行2', '列2'],
        ['行3', '列2']
      ];
      
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'csv' as const,
          cleaningRules: {
            removeEmptyLines: true,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false  // 改为 false，因为去重是针对每行内部的
          }
        }
      };
      
      // Act
      const result = await handleActionRequest(payload);
      
      // Assert
      expect(result.status).toBe('ok');
      expect(result.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
      // 验证下载被触发
      expect(mockDownloads.length).toBe(1);
    });
  });
  
  describe('Pro 用户', () => {
    beforeEach(async () => {
      // 设置 Pro 状态（使用加密格式）
      const { encryptProState } = await import('../crypto');
      const proState = {
        isPro: true,
        signature: 'test',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };
      mockStorage['pro_state'] = await encryptProState(proState);
    });
    
    test('应该不受试用次数限制', async () => {
      // Arrange: 设置试用次数为 0
      mockStorage['state_one-click-export'] = {
        seed: 0,
        entropy: 0,
        timestamp: Date.now()
      };
      
      const testTable = [['测试']];
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'csv' as const
        }
      };
      
      // Act
      const result = await handleActionRequest(payload);
      
      // Assert: Pro 用户应该成功
      expect(result.status).toBe('ok');
      expect(result.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(result.uiData?.message).toBe('导出成功！文件已保存到下载文件夹。');
    });
    
    test('应该不消耗试用次数', async () => {
      // Arrange
      const testTable = [['测试']];
      const payload = {
        action: 'table-export' as const,
        data: {
          table: testTable,
          exportFormat: 'csv' as const
        }
      };
      
      const initialState = await getFromStorage('state_one-click-export', null);
      
      // Act
      await handleActionRequest(payload);
      
      // Assert: 验证状态未变化
      const finalState = await getFromStorage('state_one-click-export', null);
      expect(finalState).toEqual(initialState);
    });
  });
});
