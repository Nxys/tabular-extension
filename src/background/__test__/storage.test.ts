/**
 * storage.ts 单元测试
 * 
 * 测试范围：
 * - getFromStorage() 正常读取
 * - getFromStorage() 默认值处理
 * - setToStorage() 正常写入
 * - removeFromStorage() 删除操作
 * - chrome.storage 失败时的内存降级
 */

import { getFromStorage, setToStorage, removeFromStorage } from '../storage';

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
});
