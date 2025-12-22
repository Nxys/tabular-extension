/**
 * Pro Gate 集成 Usage 信号测试
 * 
 * 测试范围：
 * 1. allow 函数使用 usage 信号
 * 2. 异常使用模式检测
 * 3. 绕过 usage 信号无效（Property 10）
 * 4. 多点防护仍然有效
 * 5. usage 不是唯一判断条件
 * 
 * 验证需求：15.1, 15.2, 15.3, 15.4, 15.5
 */

import { allow } from '../src/content/pro/gate';
import { record, getRecentStats } from '../src/content/usage/usage';

// Mock chrome.storage.local
const mockStorage: { [key: string]: any } = {};

global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys: string | string[]) => {
        const result: { [key: string]: any } = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];
        
        for (const key of keyArray) {
          if (key in mockStorage) {
            result[key] = mockStorage[key];
          }
        }
        
        return Promise.resolve(result);
      }),
      set: jest.fn((items: { [key: string]: any }) => {
        Object.assign(mockStorage, items);
        return Promise.resolve();
      }),
      remove: jest.fn((keys: string | string[]) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        for (const key of keyArray) {
          delete mockStorage[key];
        }
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
        return Promise.resolve();
      })
    }
  }
} as any;

describe('Pro Gate 集成 Usage 信号测试', () => {
  beforeEach(() => {
    // 清空 mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    jest.clearAllMocks();
    
    // 设置默认的今日日期
    const today = new Date().toDateString();
    mockStorage['usage_stats'] = {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: today
    };
  });

  describe('allow 函数使用 usage 信号', () => {
    it('正常使用模式下 Pro 用户应该可以使用功能', async () => {
      // 设置 Pro 用户状态
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      // 设置正常的使用统计
      mockStorage['usage_stats'] = {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 5,
        csvExportCount: 3,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(true);
    });

    it('allow 函数应该能够访问 usage 统计数据', async () => {
      // 设置 Pro 用户状态
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      // 记录一些事件
      await record('select');
      await record('table-detect');
      await record('column-align');

      // 验证统计数据被正确记录
      const stats = await getRecentStats();
      expect(stats.selectCount).toBe(1);
      expect(stats.tableDetectCount).toBe(1);
      expect(stats.columnAlignCount).toBe(1);

      // allow 函数应该能够使用这些统计数据
      const result = await allow('table-detect');
      expect(result).toBe(true);
    });
  });

  describe('异常使用模式检测', () => {
    it('异常高频的表格检测应该被拒绝', async () => {
      // 设置 Pro 用户状态
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      // 设置异常高频的使用统计（超过阈值 1000）
      mockStorage['usage_stats'] = {
        selectCount: 100,
        tableDetectCount: 1500,  // 异常高频
        columnAlignCount: 50,
        csvExportCount: 30,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(false);
    });

    it('异常高频的列对齐应该被拒绝', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      mockStorage['usage_stats'] = {
        selectCount: 100,
        tableDetectCount: 50,
        columnAlignCount: 1500,  // 异常高频
        csvExportCount: 30,
        lastDate: new Date().toDateString()
      };

      const result = await allow('column-align');
      expect(result).toBe(false);
    });

    it('异常高频的 CSV 导出应该被拒绝', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      mockStorage['usage_stats'] = {
        selectCount: 100,
        tableDetectCount: 50,
        columnAlignCount: 50,
        csvExportCount: 1500,  // 异常高频
        lastDate: new Date().toDateString()
      };

      const result = await allow('csv-export');
      expect(result).toBe(false);
    });

    it('正常频率的使用应该被允许', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      // 设置正常频率的使用统计（低于阈值 1000）
      mockStorage['usage_stats'] = {
        selectCount: 100,
        tableDetectCount: 50,
        columnAlignCount: 50,
        csvExportCount: 30,
        lastDate: new Date().toDateString()
      };

      const detectResult = await allow('table-detect');
      const alignResult = await allow('column-align');
      const csvResult = await allow('csv-export');

      expect(detectResult).toBe(true);
      expect(alignResult).toBe(true);
      expect(csvResult).toBe(true);
    });
  });

  describe('绕过 usage 信号无效（Property 10）', () => {
    /**
     * Feature: table-pro-features, Property 10: Pro Gate 多点防护有效性
     * 
     * 验证即使绕过 usage 信号，也无法通过其他检查点
     */
    it('即使 usage 统计为 0，没有签名也无法使用功能', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: '',  // 无效签名
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      // 设置正常的 usage 统计
      mockStorage['usage_stats'] = {
        selectCount: 0,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(false);
    });

    it('即使 usage 统计正常，签名过短也无法使用功能', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'short',  // 签名过短
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      mockStorage['usage_stats'] = {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 5,
        csvExportCount: 3,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(false);
    });

    it('即使 usage 统计正常，功能未启用也无法使用', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': false,  // 功能未启用
          'column-align': false,
          'csv-export': false
        }
      };

      mockStorage['usage_stats'] = {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 5,
        csvExportCount: 3,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(false);
    });

    it('即使 usage 统计正常，不是 Pro 用户也无法使用', async () => {
      mockStorage['pro_state'] = {
        isPro: false,  // 不是 Pro 用户
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      mockStorage['usage_stats'] = {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 5,
        csvExportCount: 3,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(false);
    });
  });

  describe('多点防护仍然有效', () => {
    it('所有检查点都通过才能使用功能', async () => {
      // 设置完整的 Pro 状态
      mockStorage['pro_state'] = {
        isPro: true,                              // ✓ Pro 用户
        signature: 'valid-signature-1234567890',  // ✓ 有效签名
        features: {
          'table-detect': true,                   // ✓ 功能启用
          'column-align': true,
          'csv-export': true
        }
      };

      // 设置正常的 usage 统计
      mockStorage['usage_stats'] = {
        selectCount: 10,
        tableDetectCount: 5,                      // ✓ 正常频率
        columnAlignCount: 5,
        csvExportCount: 3,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(true);
    });

    it('任何一个检查点失败都会拒绝访问', async () => {
      // 测试 1: isPro 失败
      mockStorage['pro_state'] = {
        isPro: false,
        signature: 'valid-signature-1234567890',
        features: { 'table-detect': true, 'column-align': true, 'csv-export': true }
      };
      mockStorage['usage_stats'] = {
        selectCount: 10, tableDetectCount: 5, columnAlignCount: 5, csvExportCount: 3,
        lastDate: new Date().toDateString()
      };
      expect(await allow('table-detect')).toBe(false);

      // 测试 2: 签名失败
      mockStorage['pro_state'] = {
        isPro: true,
        signature: '',
        features: { 'table-detect': true, 'column-align': true, 'csv-export': true }
      };
      expect(await allow('table-detect')).toBe(false);

      // 测试 3: 功能未启用
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: { 'table-detect': false, 'column-align': true, 'csv-export': true }
      };
      expect(await allow('table-detect')).toBe(false);

      // 测试 4: usage 异常
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: { 'table-detect': true, 'column-align': true, 'csv-export': true }
      };
      mockStorage['usage_stats'] = {
        selectCount: 100, tableDetectCount: 1500, columnAlignCount: 50, csvExportCount: 30,
        lastDate: new Date().toDateString()
      };
      expect(await allow('table-detect')).toBe(false);
    });
  });

  describe('usage 不是唯一判断条件', () => {
    it('usage 正常但其他条件不满足时应该拒绝', async () => {
      // 设置正常的 usage 统计
      mockStorage['usage_stats'] = {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 5,
        csvExportCount: 3,
        lastDate: new Date().toDateString()
      };

      // 但是没有 Pro 状态
      mockStorage['pro_state'] = {
        isPro: false,
        signature: '',
        features: {
          'table-detect': false,
          'column-align': false,
          'csv-export': false
        }
      };

      const result = await allow('table-detect');
      expect(result).toBe(false);
    });

    it('usage 异常但是免费用户时应该拒绝（不是因为 usage）', async () => {
      // 设置异常的 usage 统计
      mockStorage['usage_stats'] = {
        selectCount: 100,
        tableDetectCount: 1500,
        columnAlignCount: 1500,
        csvExportCount: 1500,
        lastDate: new Date().toDateString()
      };

      // 免费用户
      mockStorage['pro_state'] = {
        isPro: false,
        signature: '',
        features: {
          'table-detect': false,
          'column-align': false,
          'csv-export': false
        }
      };

      const result = await allow('table-detect');
      // 应该被拒绝，但不是因为 usage，而是因为不是 Pro 用户
      expect(result).toBe(false);
    });

    it('Pro 用户 + 有效签名 + 功能启用 + 正常 usage = 允许', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      mockStorage['usage_stats'] = {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 5,
        csvExportCount: 3,
        lastDate: new Date().toDateString()
      };

      const result = await allow('table-detect');
      expect(result).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('usage stats 读取失败应该安全处理', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      // 删除 usage_stats
      delete mockStorage['usage_stats'];

      // 应该使用默认值，不抛出错误
      const result = await allow('table-detect');
      expect(result).toBe(true);
    });

    it('usage stats 格式错误应该安全处理', async () => {
      mockStorage['pro_state'] = {
        isPro: true,
        signature: 'valid-signature-1234567890',
        features: {
          'table-detect': true,
          'column-align': true,
          'csv-export': true
        }
      };

      // 设置错误格式的 usage_stats
      mockStorage['usage_stats'] = null;

      // 应该使用默认值，不抛出错误
      const result = await allow('table-detect');
      expect(result).toBe(true);
    });
  });
});
