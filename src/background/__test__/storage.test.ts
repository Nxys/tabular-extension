/**
 * storage.ts 单元测试
 * 
 * 测试范围：
 * - getFromStorage() 正常读取
 * - getFromStorage() 默认值处理
 * - setToStorage() 正常写入
 * - removeFromStorage() 删除操作
 * - chrome.storage 失败时的内存降级
 * - 属性测试：存储往返一致性
 */

import { getFromStorage, setToStorage, removeFromStorage } from '../storage';
import * as fc from 'fast-check';

describe('storage.ts', () => {
  beforeEach(() => {
    // 清空 chrome.storage.local 的 mock 数据
    if (global.chrome?.storage?.local) {
      (global.chrome.storage.local as any).data?.clear();
    }
  });

  describe('getFromStorage', () => {
    it('应该返回存储的值', async () => {
      // Arrange
      await chrome.storage.local.set({ testKey: 'testValue' });
      
      // Act
      const result = await getFromStorage('testKey', 'default');
      
      // Assert
      expect(result).toBe('testValue');
    });

    it('应该返回默认值当键不存在时', async () => {
      // Arrange - 无需设置
      
      // Act
      const result = await getFromStorage('nonExistent', 'default');
      
      // Assert
      expect(result).toBe('default');
    });

    it('应该降级到内存存储当 chrome.storage 失败时', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const getSpy = jest.spyOn(chrome.storage.local, 'get');
      // @ts-ignore - Mock 错误场景
      getSpy.mockRejectedValueOnce(new Error('Storage failed'));
      
      // Act
      const result = await getFromStorage('testKey', 'default');
      
      // Assert
      expect(result).toBe('default');
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it('应该从内存降级存储读取之前写入的值', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      // 第一次 set 失败，写入内存
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValueOnce(new Error('Storage failed'));
      await setToStorage('memoryKey', 'memoryValue');
      
      // 第二次 get 失败，从内存读取
      const getSpy = jest.spyOn(chrome.storage.local, 'get');
      // @ts-ignore - Mock 错误场景
      getSpy.mockRejectedValueOnce(new Error('Storage failed'));
      
      // Act
      const result = await getFromStorage('memoryKey', 'default');
      
      // Assert
      expect(result).toBe('memoryValue');
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });
  });

  describe('setToStorage', () => {
    it('应该正常写入数据', async () => {
      // Arrange & Act
      await setToStorage('testKey', 'testValue');
      
      // Assert
      const result = await getFromStorage('testKey', 'default');
      expect(result).toBe('testValue');
    });

    it('应该写入不同类型的数据', async () => {
      // Arrange & Act
      await setToStorage('stringKey', 'string');
      await setToStorage('numberKey', 123);
      await setToStorage('booleanKey', true);
      await setToStorage('objectKey', { foo: 'bar' });
      
      // Assert
      expect(await getFromStorage('stringKey', '')).toBe('string');
      expect(await getFromStorage('numberKey', 0)).toBe(123);
      expect(await getFromStorage('booleanKey', false)).toBe(true);
      expect(await getFromStorage('objectKey', {})).toEqual({ foo: 'bar' });
    });

    it('应该降级到内存存储当 chrome.storage 失败时', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValueOnce(new Error('Storage failed'));
      
      // Act
      await setToStorage('testKey', 'testValue');
      
      // Assert
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });
  });

  describe('removeFromStorage', () => {
    it('应该删除存储的数据', async () => {
      // Arrange
      await setToStorage('testKey', 'testValue');
      
      // Act
      await removeFromStorage('testKey');
      
      // Assert
      const result = await getFromStorage('testKey', 'default');
      expect(result).toBe('default');
    });

    it('应该降级到内存存储当 chrome.storage 失败时', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const removeSpy = jest.spyOn(chrome.storage.local, 'remove');
      // @ts-ignore - Mock 错误场景
      removeSpy.mockRejectedValueOnce(new Error('Storage failed'));
      
      // Act
      await removeFromStorage('testKey');
      
      // Assert
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });
  });

  describe('错误处理和内存降级', () => {
    it('应该在 chrome.storage 失败时输出包含键名的错误日志', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const getSpy = jest.spyOn(chrome.storage.local, 'get');
      // @ts-ignore - Mock 错误场景
      getSpy.mockRejectedValueOnce(new Error('Storage API unavailable'));
      
      // Act
      await getFromStorage('testKey', 'default');
      
      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('testKey'),
        expect.any(Error)
      );
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it('应该在内存降级后保持数据一致性', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟 chrome.storage 完全失败
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      const getSpy = jest.spyOn(chrome.storage.local, 'get');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValue(new Error('Storage failed'));
      // @ts-ignore - Mock 错误场景
      getSpy.mockRejectedValue(new Error('Storage failed'));
      
      // Act - 写入多个值到内存
      await setToStorage('key1', 'value1');
      await setToStorage('key2', 123);
      await setToStorage('key3', { nested: 'object' });
      
      // Assert - 验证可以从内存读取
      expect(await getFromStorage('key1', 'default')).toBe('value1');
      expect(await getFromStorage('key2', 0)).toBe(123);
      expect(await getFromStorage('key3', {})).toEqual({ nested: 'object' });
      
      // Cleanup
      consoleWarnSpy.mockRestore();
      setSpy.mockRestore();
      getSpy.mockRestore();
    });

    it('应该在内存降级后支持删除操作', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟 chrome.storage 完全失败
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      const getSpy = jest.spyOn(chrome.storage.local, 'get');
      const removeSpy = jest.spyOn(chrome.storage.local, 'remove');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValue(new Error('Storage failed'));
      // @ts-ignore - Mock 错误场景
      getSpy.mockRejectedValue(new Error('Storage failed'));
      // @ts-ignore - Mock 错误场景
      removeSpy.mockRejectedValue(new Error('Storage failed'));
      
      // Act - 写入、删除、再读取
      await setToStorage('tempKey', 'tempValue');
      expect(await getFromStorage('tempKey', 'default')).toBe('tempValue');
      
      await removeFromStorage('tempKey');
      
      // Assert - 删除后应该返回默认值
      expect(await getFromStorage('tempKey', 'default')).toBe('default');
      
      // Cleanup
      consoleWarnSpy.mockRestore();
      setSpy.mockRestore();
      getSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('应该在内存降级后处理覆盖写入', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟 chrome.storage 完全失败
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      const getSpy = jest.spyOn(chrome.storage.local, 'get');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValue(new Error('Storage failed'));
      // @ts-ignore - Mock 错误场景
      getSpy.mockRejectedValue(new Error('Storage failed'));
      
      // Act - 多次写入同一个键
      await setToStorage('overwriteKey', 'value1');
      expect(await getFromStorage('overwriteKey', 'default')).toBe('value1');
      
      await setToStorage('overwriteKey', 'value2');
      expect(await getFromStorage('overwriteKey', 'default')).toBe('value2');
      
      await setToStorage('overwriteKey', 'value3');
      
      // Assert - 应该返回最后写入的值
      expect(await getFromStorage('overwriteKey', 'default')).toBe('value3');
      
      // Cleanup
      consoleWarnSpy.mockRestore();
      setSpy.mockRestore();
      getSpy.mockRestore();
    });

    it('应该为每个失败的操作输出错误日志', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 模拟所有操作失败
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      const getSpy = jest.spyOn(chrome.storage.local, 'get');
      const removeSpy = jest.spyOn(chrome.storage.local, 'remove');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValue(new Error('Storage failed'));
      // @ts-ignore - Mock 错误场景
      getSpy.mockRejectedValue(new Error('Storage failed'));
      // @ts-ignore - Mock 错误场景
      removeSpy.mockRejectedValue(new Error('Storage failed'));
      
      // Act
      await setToStorage('key1', 'value1');
      await getFromStorage('key2', 'default');
      await removeFromStorage('key3');
      
      // Assert - 应该输出 3 次错误日志
      expect(consoleWarnSpy).toHaveBeenCalledTimes(3);
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('key1'),
        expect.any(Error)
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('key2'),
        expect.any(Error)
      );
      expect(consoleWarnSpy).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining('key3'),
        expect.any(Error)
      );
      
      // Cleanup
      consoleWarnSpy.mockRestore();
      setSpy.mockRestore();
      getSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it('应该在 chrome.storage 恢复后继续使用 chrome.storage', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 第一次操作失败，使用内存降级
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValueOnce(new Error('Storage failed'));
      await setToStorage('key1', 'value1');
      
      // 第二次操作成功，恢复使用 chrome.storage
      setSpy.mockRestore();
      await setToStorage('key2', 'value2');
      
      // Act & Assert - key2 应该在 chrome.storage 中
      const result = await chrome.storage.local.get(['key2']);
      expect(result.key2).toBe('value2');
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });
  });

  describe('属性测试', () => {
    /**
     * 属性测试：存储往返一致性
     * Feature: unit-testing, Property 2: 存储往返一致性
     * 验证：需求 4.4
     * 
     * 对于任意的键值对 (key, value)，调用 setToStorage(key, value) 
     * 然后调用 getFromStorage(key, defaultValue) 应该返回与 value 相等的结果。
     * 
     * 注意：排除危险键（__proto__、constructor、prototype）以防止原型污染
     */
    it('存储然后读取应该返回相同的值', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成存储键：非空字符串，长度 1-50，排除危险键
          fc.string({ minLength: 1, maxLength: 50 })
            .filter(key => !['__proto__', 'constructor', 'prototype'].includes(key)),
          // 生成存储值：字符串、数字、布尔值或对象
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.object()
          ),
          async (key, value) => {
            // Arrange & Act
            await setToStorage(key, value);
            const result = await getFromStorage(key, null);
            
            // Assert
            expect(result).toEqual(value);
          }
        ),
        { numRuns: 100 } // 配置 100 次迭代
      );
    });
  });
});
