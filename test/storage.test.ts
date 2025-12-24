/**
 * Storage 模块单元测试
 */

import { getFromStorage, setToStorage, removeFromStorage } from '../src/background/storage';

// Mock chrome.storage.local
const mockStorage = new Map<string, unknown>();

global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys: string[]) => {
        const result: Record<string, unknown> = {};
        keys.forEach(key => {
          if (mockStorage.has(key)) {
            result[key] = mockStorage.get(key);
          }
        });
        return Promise.resolve(result);
      }),
      set: jest.fn((items: Record<string, unknown>) => {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value);
        });
        return Promise.resolve();
      }),
      remove: jest.fn((keys: string | string[]) => {
        const keyArray = Array.isArray(keys) ? keys : [keys];
        keyArray.forEach(key => mockStorage.delete(key));
        return Promise.resolve();
      })
    }
  }
} as any;

describe('Storage 模块', () => {
  beforeEach(() => {
    mockStorage.clear();
    jest.clearAllMocks();
  });

  describe('getFromStorage', () => {
    it('应该返回存储的值', async () => {
      mockStorage.set('test_key', 'test_value');
      const result = await getFromStorage('test_key', 'default');
      expect(result).toBe('test_value');
    });

    it('应该返回默认值当键不存在时', async () => {
      const result = await getFromStorage('non_existent', 'default');
      expect(result).toBe('default');
    });

    it('应该处理数字类型', async () => {
      mockStorage.set('count', 42);
      const result = await getFromStorage('count', 0);
      expect(result).toBe(42);
    });

    it('应该处理对象类型', async () => {
      const obj = { foo: 'bar', num: 123 };
      mockStorage.set('obj', obj);
      const result = await getFromStorage('obj', {});
      expect(result).toEqual(obj);
    });
  });

  describe('setToStorage', () => {
    it('应该保存值到存储', async () => {
      await setToStorage('test_key', 'test_value');
      expect(mockStorage.get('test_key')).toBe('test_value');
    });

    it('应该覆盖已存在的值', async () => {
      mockStorage.set('test_key', 'old_value');
      await setToStorage('test_key', 'new_value');
      expect(mockStorage.get('test_key')).toBe('new_value');
    });

    it('应该保存复杂对象', async () => {
      const obj = { a: 1, b: { c: 2 } };
      await setToStorage('obj', obj);
      expect(mockStorage.get('obj')).toEqual(obj);
    });
  });

  describe('removeFromStorage', () => {
    it('应该删除存储的值', async () => {
      mockStorage.set('test_key', 'test_value');
      await removeFromStorage('test_key');
      expect(mockStorage.has('test_key')).toBe(false);
    });

    it('应该处理不存在的键', async () => {
      await expect(removeFromStorage('non_existent')).resolves.not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该在 storage 失败时使用内存降级', async () => {
      // 模拟 storage 失败
      (chrome.storage.local.get as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));
      
      const result = await getFromStorage('test_key', 'default');
      expect(result).toBe('default');
    });

    it('应该在 set 失败时使用内存降级', async () => {
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(setToStorage('test_key', 'value')).resolves.not.toThrow();
    });
  });
});
