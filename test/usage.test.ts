/**
 * Usage 模块单元测试
 */

import { checkUsage, consumeUsage, record, FREE_POLICY } from '../src/background/usage';
import * as storage from '../src/background/storage';

// Mock storage 模块
jest.mock('../src/background/storage');

const mockGetFromStorage = storage.getFromStorage as jest.MockedFunction<typeof storage.getFromStorage>;
const mockSetToStorage = storage.setToStorage as jest.MockedFunction<typeof storage.setToStorage>;

describe('Usage 模块', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 默认返回今天的日期
    mockGetFromStorage.mockImplementation((key, defaultValue) => {
      if (key === 'last_usage_date') {
        return Promise.resolve(new Date().toDateString());
      }
      return Promise.resolve(defaultValue);
    });
  });

  describe('checkUsage', () => {
    it('应该允许使用当次数未达到限制时', async () => {
      mockGetFromStorage.mockImplementation((key, defaultValue) => {
        if (key === 'usage_count') return Promise.resolve(5);
        if (key === 'last_usage_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(defaultValue);
      });

      const result = await checkUsage();
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(FREE_POLICY.maxPerDay - 5);
      expect(result.max).toBe(FREE_POLICY.maxPerDay);
    });

    it('应该拒绝使用当次数达到限制时', async () => {
      mockGetFromStorage.mockImplementation((key, defaultValue) => {
        if (key === 'usage_count') return Promise.resolve(FREE_POLICY.maxPerDay);
        if (key === 'last_usage_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(defaultValue);
      });

      const result = await checkUsage();
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('limit-reached');
      expect(result.remaining).toBe(0);
      expect(result.max).toBe(FREE_POLICY.maxPerDay);
    });

    it('应该在新的一天重置次数', async () => {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let resetCalled = false;
      
      mockGetFromStorage.mockImplementation((key, defaultValue) => {
        if (key === 'usage_count') {
          // 重置后返回 0
          return Promise.resolve(resetCalled ? 0 : FREE_POLICY.maxPerDay);
        }
        if (key === 'last_usage_date') return Promise.resolve(yesterday);
        return Promise.resolve(defaultValue);
      });
      
      mockSetToStorage.mockImplementation((key, value) => {
        if (key === 'usage_count' && value === 0) {
          resetCalled = true;
        }
        return Promise.resolve();
      });

      const result = await checkUsage();
      
      // 应该重置为 0
      expect(mockSetToStorage).toHaveBeenCalledWith('usage_count', 0);
      expect(mockSetToStorage).toHaveBeenCalledWith('last_usage_date', new Date().toDateString());
      expect(result.allowed).toBe(true);
    });
  });

  describe('consumeUsage', () => {
    it('应该增加使用次数', async () => {
      mockGetFromStorage.mockImplementation((key, defaultValue) => {
        if (key === 'usage_count') return Promise.resolve(5);
        return Promise.resolve(defaultValue);
      });

      await consumeUsage();
      
      expect(mockSetToStorage).toHaveBeenCalledWith('usage_count', 6);
    });

    it('应该从 0 开始计数', async () => {
      mockGetFromStorage.mockImplementation((key, defaultValue) => {
        if (key === 'usage_count') return Promise.resolve(0);
        return Promise.resolve(defaultValue);
      });

      await consumeUsage();
      
      expect(mockSetToStorage).toHaveBeenCalledWith('usage_count', 1);
    });
  });

  describe('record', () => {
    it('应该记录 select 事件', async () => {
      const stats = {
        selectCount: 5,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: new Date().toDateString()
      };
      
      mockGetFromStorage.mockImplementation((key, defaultValue) => {
        if (key === 'usage_stats') return Promise.resolve(stats);
        if (key === 'last_usage_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(defaultValue);
      });

      await record('select');
      
      expect(mockSetToStorage).toHaveBeenCalledWith('usage_stats', {
        ...stats,
        selectCount: 6
      });
    });

    it('应该记录 table-detect 事件', async () => {
      const stats = {
        selectCount: 0,
        tableDetectCount: 3,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: new Date().toDateString()
      };
      
      mockGetFromStorage.mockImplementation((key, defaultValue) => {
        if (key === 'usage_stats') return Promise.resolve(stats);
        if (key === 'last_usage_date') return Promise.resolve(new Date().toDateString());
        return Promise.resolve(defaultValue);
      });

      await record('table-detect');
      
      expect(mockSetToStorage).toHaveBeenCalledWith('usage_stats', {
        ...stats,
        tableDetectCount: 4
      });
    });

    it('应该处理记录失败', async () => {
      mockGetFromStorage.mockRejectedValue(new Error('Storage error'));

      // 不应该抛出错误
      await expect(record('select')).resolves.not.toThrow();
    });
  });
});
