/**
 * 表格 Pro 功能集成测试
 * 
 * 测试完整的 Pro pipeline 流程，包括：
 * - 免费版用户尝试使用表格功能
 * - Pro 用户使用表格功能
 * - 完整 Pro pipeline 流程
 * - 权限绕过尝试
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('表格 Pro 功能集成测试', () => {
  let mockChrome: any;
  let originalChrome: any;

  beforeEach(() => {
    // 保存原始的 chrome 对象
    originalChrome = (global as any).chrome;

    // 模拟 chrome.storage API
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      }
    };

    (global as any).chrome = mockChrome;

    // 清理 DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    // 恢复原始的 chrome 对象
    (global as any).chrome = originalChrome;
    
    // 清理 DOM
    document.body.innerHTML = '';
  });

  describe('免费版用户尝试使用表格功能', () => {
    test('免费版用户应该看到 Pro 升级提示', async () => {
      // 模拟免费版用户状态
      mockChrome.storage.local.get.mockImplementation((keys: string[]) => {
        if (keys.includes('pro_state')) {
          return Promise.resolve({
            pro_state: {
              isPro: false,
              signature: '',
              features: {
                'table-detect': false,
                'column-align': false,
                'csv-export': false
              }
            }
          });
        }
        return Promise.resolve({});
      });

      // 动态导入模块以使用模拟的 chrome
      const { allow } = await import('../src/content/pro/gate');

      // 测试表格检测权限
      const canDetect = await allow('table-detect');
      expect(canDetect).toBe(false);

      // 测试列对齐权限
      const canAlign = await allow('column-align');
      expect(canAlign).toBe(false);

      // 测试 CSV 导出权限
      const canExport = await allow('csv-export');
      expect(canExport).toBe(false);
    });

    test('免费版用户应该无法绕过单个权限检查', async () => {
      // 模拟免费版用户状态，但尝试启用单个功能
      mockChrome.storage.local.get.mockImplementation((keys: string[]) => {
        if (keys.includes('pro_state')) {
          return Promise.resolve({
            pro_state: {
              isPro: false,
              signature: '',
              features: {
                'table-detect': true, // 尝试绕过
                'column-align': false,
                'csv-export': false
              }
            }
          });
        }
        return Promise.resolve({});
      });

      const { allow } = await import('../src/content/pro/gate');

      // 即使 feature 设置为 true，isPro 为 false 时仍然应该拒绝
      const canDetect = await allow('table-detect');
      expect(canDetect).toBe(false);
    });
  });

  describe('Pro 用户使用表格功能', () => {
    test('Pro 用户应该能够使用所有表格功能', async () => {
      // 模拟 Pro 用户状态
      mockChrome.storage.local.get.mockImplementation((keys: string[]) => {
        if (keys.includes('pro_state')) {
          return Promise.resolve({
            pro_state: {
              isPro: true,
              signature: 'valid-signature-12345678', // 至少 16 个字符
              features: {
                'table-detect': true,
                'column-align': true,
                'csv-export': true
              }
            }
          });
        }
        return Promise.resolve({});
      });

      const { allow } = await import('../src/content/pro/gate');

      // 测试表格检测权限
      const canDetect = await allow('table-detect');
      expect(canDetect).toBe(true);

      // 测试列对齐权限
      const canAlign = await allow('column-align');
      expect(canAlign).toBe(true);

      // 测试 CSV 导出权限
      const canExport = await allow('csv-export');
      expect(canExport).toBe(true);
    });

    test('Pro 用户应该能够使用部分功能', async () => {
      // 模拟 Pro 用户状态，但只启用部分功能
      mockChrome.storage.local.get.mockImplementation((keys: string[]) => {
        if (keys.includes('pro_state')) {
          return Promise.resolve({
            pro_state: {
              isPro: true,
              signature: 'valid-signature-12345678',
              features: {
                'table-detect': true,
                'column-align': true,
                'csv-export': false // 未启用
              }
            }
          });
        }
        return Promise.resolve({});
      });

      const { allow } = await import('../src/content/pro/gate');

      // 表格检测和列对齐应该可用
      expect(await allow('table-detect')).toBe(true);
      expect(await allow('column-align')).toBe(true);

      // CSV 导出应该不可用
      expect(await allow('csv-export')).toBe(false);
    });
  });

  describe('完整 Pro pipeline 流程', () => {
    test('应该正确执行表格检测流程', async () => {
      const { detectTable } = await import('../src/content/table/detect');

      // 辅助函数：创建 DOMRect 对象
      const createDOMRect = (left: number, top: number, width: number, height: number): DOMRect => {
        return {
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          x: left,
          y: top,
          toJSON: () => ({})
        } as DOMRect;
      };

      // 创建模拟的视觉行数据（2 列表格）
      const lines = [
        [
          { text: '姓名', rect: createDOMRect(10, 10, 40, 20) },
          { text: '年龄', rect: createDOMRect(100, 10, 40, 20) }
        ],
        [
          { text: '张三', rect: createDOMRect(10, 40, 40, 20) },
          { text: '25', rect: createDOMRect(100, 40, 40, 20) }
        ]
      ];

      const table = detectTable(lines);

      // 验证表格结构
      expect(table.columns).toBe(2);
      expect(table.rows.length).toBe(2);
      expect(table.rows[0].length).toBe(2);
      expect(table.rows[0][0].text).toBe('姓名');
      expect(table.rows[0][1].text).toBe('年龄');
    });

    test('应该正确执行列对齐流程', async () => {
      const { detectTable } = await import('../src/content/table/detect');
      const { alignTable } = await import('../src/content/table/align');

      // 辅助函数：创建 DOMRect 对象
      const createDOMRect = (left: number, top: number, width: number, height: number): DOMRect => {
        return {
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          x: left,
          y: top,
          toJSON: () => ({})
        } as DOMRect;
      };

      // 创建模拟的视觉行数据（使用相同长度的文本以便验证对齐）
      const lines = [
        [
          { text: 'Name', rect: createDOMRect(10, 10, 40, 20) },
          { text: 'Age', rect: createDOMRect(100, 10, 40, 20) }
        ],
        [
          { text: 'John', rect: createDOMRect(10, 40, 40, 20) },
          { text: '25', rect: createDOMRect(100, 40, 40, 20) }
        ]
      ];

      const table = detectTable(lines);
      const aligned = alignTable(table);

      // 验证对齐结果
      expect(aligned.length).toBe(2);
      expect(aligned[0].length).toBe(2);
      
      // 验证每列的宽度一致（通过空格补齐）
      const col0Width = aligned[0][0].length;
      const col1Width = aligned[0][1].length;
      
      // 第二行的列宽应该与第一行相同
      expect(aligned[1][0].length).toBe(col0Width);
      expect(aligned[1][1].length).toBe(col1Width);
      
      // 验证对齐后的文本包含原始内容
      expect(aligned[0][0]).toContain('Name');
      expect(aligned[0][1]).toContain('Age');
      expect(aligned[1][0]).toContain('John');
      expect(aligned[1][1]).toContain('25');
    });

    test('应该正确执行 CSV 导出流程', async () => {
      const { detectTable } = await import('../src/content/table/detect');
      const { toCSV } = await import('../src/content/table/csv');

      // 辅助函数：创建 DOMRect 对象
      const createDOMRect = (left: number, top: number, width: number, height: number): DOMRect => {
        return {
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          x: left,
          y: top,
          toJSON: () => ({})
        } as DOMRect;
      };

      // 创建模拟的视觉行数据
      const lines = [
        [
          { text: '姓名', rect: createDOMRect(10, 10, 40, 20) },
          { text: '年龄', rect: createDOMRect(100, 10, 40, 20) }
        ],
        [
          { text: '张三', rect: createDOMRect(10, 40, 40, 20) },
          { text: '25', rect: createDOMRect(100, 40, 40, 20) }
        ]
      ];

      const table = detectTable(lines);
      const csv = toCSV(table);

      // 验证 CSV 格式
      expect(csv).toContain('姓名,年龄');
      expect(csv).toContain('张三,25');
      
      // 验证行数
      const csvLines = csv.split('\n');
      expect(csvLines.length).toBe(2);
    });
  });

  describe('权限绕过尝试', () => {
    test('无效签名应该被拒绝', async () => {
      // 模拟无效签名的 Pro 用户
      mockChrome.storage.local.get.mockImplementation((keys: string[]) => {
        if (keys.includes('pro_state')) {
          return Promise.resolve({
            pro_state: {
              isPro: true,
              signature: '', // 空签名
              features: {
                'table-detect': true,
                'column-align': true,
                'csv-export': true
              }
            }
          });
        }
        return Promise.resolve({});
      });

      const { allow } = await import('../src/content/pro/gate');

      // 所有功能都应该被拒绝
      expect(await allow('table-detect')).toBe(false);
      expect(await allow('column-align')).toBe(false);
      expect(await allow('csv-export')).toBe(false);
    });

    test('签名过短应该被拒绝', async () => {
      // 模拟签名过短的 Pro 用户
      mockChrome.storage.local.get.mockImplementation((keys: string[]) => {
        if (keys.includes('pro_state')) {
          return Promise.resolve({
            pro_state: {
              isPro: true,
              signature: 'short', // 签名太短（< 16 字符）
              features: {
                'table-detect': true,
                'column-align': true,
                'csv-export': true
              }
            }
          });
        }
        return Promise.resolve({});
      });

      const { allow } = await import('../src/content/pro/gate');

      // 所有功能都应该被拒绝
      expect(await allow('table-detect')).toBe(false);
      expect(await allow('column-align')).toBe(false);
      expect(await allow('csv-export')).toBe(false);
    });

    test('storage 读取失败应该默认拒绝', async () => {
      // 模拟 storage 读取失败
      mockChrome.storage.local.get.mockImplementation(() => {
        return Promise.reject(new Error('Storage error'));
      });

      const { allow } = await import('../src/content/pro/gate');

      // 所有功能都应该被拒绝
      expect(await allow('table-detect')).toBe(false);
      expect(await allow('column-align')).toBe(false);
      expect(await allow('csv-export')).toBe(false);
    });
  });

  describe('策略映射测试', () => {
    test('text 模式应该映射到 free pipeline', async () => {
      const { resolvePipeline } = await import('../src/content/pro/strategy');

      const pipeline = resolvePipeline('text');
      expect(pipeline).toBe('free');
    });

    test('table 模式应该映射到 pro pipeline', async () => {
      const { resolvePipeline } = await import('../src/content/pro/strategy');

      const pipeline = resolvePipeline('table');
      expect(pipeline).toBe('pro');
    });
  });

  describe('边界情况测试', () => {
    // 辅助函数：创建 DOMRect 对象
    const createDOMRect = (left: number, top: number, width: number, height: number): DOMRect => {
      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({})
      } as DOMRect;
    };

    test('空表格应该回退到 free pipeline', async () => {
      const { detectTable } = await import('../src/content/table/detect');

      // 空输入
      const emptyLines: any[] = [];
      const table = detectTable(emptyLines);

      expect(table.columns).toBe(0);
      expect(table.rows.length).toBe(0);
    });

    test('单列表格应该正确处理', async () => {
      const { detectTable } = await import('../src/content/table/detect');

      // 单列数据
      const lines = [
        [{ text: '标题', rect: createDOMRect(10, 10, 40, 20) }],
        [{ text: '内容1', rect: createDOMRect(10, 40, 40, 20) }],
        [{ text: '内容2', rect: createDOMRect(10, 70, 40, 20) }]
      ];

      const table = detectTable(lines);

      expect(table.columns).toBe(1);
      expect(table.rows.length).toBe(3);
    });

    test('多列表格应该正确识别', async () => {
      const { detectTable } = await import('../src/content/table/detect');

      // 3 列数据
      const lines = [
        [
          { text: '列1', rect: createDOMRect(10, 10, 40, 20) },
          { text: '列2', rect: createDOMRect(100, 10, 40, 20) },
          { text: '列3', rect: createDOMRect(200, 10, 40, 20) }
        ],
        [
          { text: 'A', rect: createDOMRect(10, 40, 40, 20) },
          { text: 'B', rect: createDOMRect(100, 40, 40, 20) },
          { text: 'C', rect: createDOMRect(200, 40, 40, 20) }
        ]
      ];

      const table = detectTable(lines);

      expect(table.columns).toBe(3);
      expect(table.rows.length).toBe(2);
      expect(table.rows[0].length).toBe(3);
    });
  });
});
