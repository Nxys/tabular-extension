/**
 * usage.ts 单元测试
 * 
 * 测试范围：
 * - checkUsage() 初始状态
 * - consumeUsage() 递增逻辑
 * - record() 事件记录
 * - 使用次数达到上限的行为
 * - 跨天重置逻辑
 */

import { checkUsage, consumeUsage, record, FREE_POLICY, type UsageStats } from '../usage';
import { getFromStorage, setToStorage } from '../storage';

describe('usage.ts', () => {
  beforeEach(async () => {
    // 清空存储
    if (global.chrome?.storage?.local) {
      (global.chrome.storage.local as any).data?.clear();
    }
    
    // 设置固定日期
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('checkUsage', () => {
    it('应该返回初始状态（允许使用，剩余20次）', async () => {
      // Act
      const state = await checkUsage();
      
      // Assert
      expect(state.allowed).toBe(true);
      expect(state.remaining).toBe(20);
      expect(state.max).toBe(FREE_POLICY.maxPerDay);
      expect(state.reason).toBeUndefined();
    });

    it('应该返回正确的剩余次数', async () => {
      // Arrange
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const state = await checkUsage();
      
      // Assert
      expect(state.allowed).toBe(true);
      expect(state.remaining).toBe(15);
      expect(state.max).toBe(20);
    });

    it('应该返回不允许使用当达到上限时', async () => {
      // Arrange
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const state = await checkUsage();
      
      // Assert
      expect(state.allowed).toBe(false);
      expect(state.reason).toBe('limit-reached');
      expect(state.remaining).toBe(0);
      expect(state.max).toBe(20);
    });

    it('应该返回不允许使用当超过上限时', async () => {
      // Arrange
      await setToStorage('usage_count', 25);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      const state = await checkUsage();
      
      // Assert
      expect(state.allowed).toBe(false);
      expect(state.reason).toBe('limit-reached');
      expect(state.remaining).toBe(0);
    });
  });

  describe('consumeUsage', () => {
    it('应该递增使用次数', async () => {
      // Arrange
      await setToStorage('usage_count', 0);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await consumeUsage();
      
      // Assert
      const count = await getFromStorage('usage_count', 0);
      expect(count).toBe(1);
    });

    it('应该连续递增使用次数', async () => {
      // Arrange
      await setToStorage('usage_count', 0);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await consumeUsage();
      await consumeUsage();
      await consumeUsage();
      
      // Assert
      const count = await getFromStorage('usage_count', 0);
      expect(count).toBe(3);
    });

    it('应该从当前次数继续递增', async () => {
      // Arrange
      await setToStorage('usage_count', 10);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await consumeUsage();
      
      // Assert
      const count = await getFromStorage('usage_count', 0);
      expect(count).toBe(11);
    });
  });

  describe('record', () => {
    it('应该记录 select 事件', async () => {
      // Arrange
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await record('select');
      
      // Assert
      const stats = await getFromStorage<UsageStats | null>('usage_stats', null);
      expect(stats).toBeDefined();
      expect(stats!.selectCount).toBe(1);
      expect(stats!.tableDetectCount).toBe(0);
      expect(stats!.columnAlignCount).toBe(0);
      expect(stats!.csvExportCount).toBe(0);
    });

    it('应该记录 table-detect 事件', async () => {
      // Arrange
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await record('table-detect');
      
      // Assert
      const stats = await getFromStorage<UsageStats | null>('usage_stats', null);
      expect(stats!.tableDetectCount).toBe(1);
    });

    it('应该记录 column-align 事件', async () => {
      // Arrange
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await record('column-align');
      
      // Assert
      const stats = await getFromStorage<UsageStats | null>('usage_stats', null);
      expect(stats!.columnAlignCount).toBe(1);
    });

    it('应该记录 csv-export 事件', async () => {
      // Arrange
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await record('csv-export');
      
      // Assert
      const stats = await getFromStorage<UsageStats | null>('usage_stats', null);
      expect(stats!.csvExportCount).toBe(1);
    });

    it('应该累积记录多个事件', async () => {
      // Arrange
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Act
      await record('select');
      await record('select');
      await record('table-detect');
      
      // Assert
      const stats = await getFromStorage<UsageStats | null>('usage_stats', null);
      expect(stats!.selectCount).toBe(2);
      expect(stats!.tableDetectCount).toBe(1);
    });

    it('应该优雅降级当记录失败时', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValueOnce(new Error('Storage failed'));
      
      // Act & Assert - 不应该抛出异常
      await expect(record('select')).resolves.not.toThrow();
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });
  });

  describe('错误处理', () => {
    it('应该在 record() 失败时不影响主流程', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // 设置初始状态
      await setToStorage('usage_count', 5);
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // Mock getFromStorage 在获取 usage_stats 时抛出错误
      const getFromStorageSpy = jest.spyOn(require('../storage'), 'getFromStorage');
      // @ts-ignore - Mock 实现
      getFromStorageSpy.mockImplementation(async (key: string, defaultValue: any) => {
        if (key === 'usage_stats') {
          throw new Error('Storage failed');
        }
        // 其他键正常返回
        return require('../storage').getFromStorage(key, defaultValue);
      });
      
      // Act - 记录事件失败
      await record('select');
      
      // Assert - 主流程不受影响
      // 1. record() 不抛出异常，错误被记录
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      // 2. 使用次数检查仍然正常工作
      getFromStorageSpy.mockRestore();
      const state = await checkUsage();
      expect(state.allowed).toBe(true);
      expect(state.remaining).toBe(15);
      
      // 3. 消耗使用次数仍然正常工作
      await consumeUsage();
      const count = await getFromStorage('usage_count', 0);
      expect(count).toBe(6);
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it('应该在 record() 失败后仍能继续记录其他事件', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const setSpy = jest.spyOn(chrome.storage.local, 'set');
      
      await setToStorage('last_usage_date', new Date().toDateString());
      
      // 第一次调用失败
      // @ts-ignore - Mock 错误场景
      setSpy.mockRejectedValueOnce(new Error('Storage failed'));
      
      // Act
      await record('select'); // 失败
      
      // 恢复 mock 以便后续调用成功
      setSpy.mockRestore();
      
      await record('table-detect'); // 成功
      
      // Assert
      expect(consoleWarnSpy).toHaveBeenCalled();
      
      const stats = await getFromStorage<UsageStats | null>('usage_stats', null);
      expect(stats).toBeDefined();
      expect(stats!.tableDetectCount).toBe(1);
      
      // Cleanup
      consoleWarnSpy.mockRestore();
    });

    it('应该在 record() 失败时记录错误信息', async () => {
      // Arrange
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock setToStorage 在设置 usage_stats 时失败
      const setToStorageSpy = jest.spyOn(require('../storage'), 'setToStorage');
      const testError = new Error('Test storage error');
      
      // @ts-ignore - Mock 实现
      setToStorageSpy.mockImplementation(async (key: string, value: any) => {
        if (key === 'usage_stats') {
          throw testError;
        }
        return require('../storage').setToStorage(key, value);
      });
      
      // Act
      await record('csv-export');
      
      // Assert - 验证错误信息被记录
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to record usage event',
        'csv-export',
        testError
      );
      
      // Cleanup
      consoleWarnSpy.mockRestore();
      setToStorageSpy.mockRestore();
    });
  });

  describe('跨天重置', () => {
    it('应该在新的一天重置使用次数', async () => {
      // Arrange - 第一天
      await setToStorage('usage_count', 15);
      await setToStorage('last_usage_date', new Date('2024-01-01').toDateString());
      
      // Act - 切换到第二天
      jest.setSystemTime(new Date('2024-01-02'));
      const state = await checkUsage();
      
      // Assert
      expect(state.remaining).toBe(20);
      const count = await getFromStorage('usage_count', -1);
      expect(count).toBe(0);
    });

    it('应该在新的一天重置统计数据', async () => {
      // Arrange - 第一天
      await setToStorage('usage_stats', {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 3,
        csvExportCount: 2,
        lastDate: new Date('2024-01-01').toDateString()
      });
      await setToStorage('last_usage_date', new Date('2024-01-01').toDateString());
      
      // Act - 切换到第二天
      jest.setSystemTime(new Date('2024-01-02'));
      await checkUsage();
      
      // Assert
      const stats = await getFromStorage<UsageStats | null>('usage_stats', null);
      expect(stats!.selectCount).toBe(0);
      expect(stats!.tableDetectCount).toBe(0);
      expect(stats!.columnAlignCount).toBe(0);
      expect(stats!.csvExportCount).toBe(0);
      expect(stats!.lastDate).toBe(new Date('2024-01-02').toDateString());
    });

    it('应该在同一天不重置使用次数', async () => {
      // Arrange
      await setToStorage('usage_count', 10);
      await setToStorage('last_usage_date', new Date('2024-01-01').toDateString());
      
      // Act - 同一天多次调用
      await checkUsage();
      await checkUsage();
      
      // Assert
      const count = await getFromStorage('usage_count', -1);
      expect(count).toBe(10);
    });

    it('应该在跨天后允许继续使用', async () => {
      // Arrange - 第一天用完所有次数
      await setToStorage('usage_count', 20);
      await setToStorage('last_usage_date', new Date('2024-01-01').toDateString());
      
      let state = await checkUsage();
      expect(state.allowed).toBe(false);
      
      // Act - 切换到第二天
      jest.setSystemTime(new Date('2024-01-02'));
      state = await checkUsage();
      
      // Assert
      expect(state.allowed).toBe(true);
      expect(state.remaining).toBe(20);
    });
  });

  describe('属性测试', () => {
    /**
     * 属性测试：使用次数单调性
     * Feature: unit-testing, Property 1: 使用次数单调性
     * 验证：需求 4.3
     * 
     * 对于任意的操作序列（不包含跨天重置），使用次数应该单调递增，
     * 即每次调用 consumeUsage() 后，使用次数应该比之前增加 1。
     */
    it('使用次数应该单调递增', async () => {
      const fc = require('fast-check');
      
      await fc.assert(
        fc.asyncProperty(
          // 生成操作序列：1 到 50 次 consumeUsage 调用
          fc.integer({ min: 1, max: 50 }),
          async (numOperations: number) => {
            // Arrange - 设置初始状态（同一天）
            const today = new Date('2024-01-01').toDateString();
            await setToStorage('usage_count', 0);
            await setToStorage('last_usage_date', today);
            
            // Act - 执行操作序列并记录每次的使用次数
            const counts: number[] = [];
            for (let i = 0; i < numOperations; i++) {
              await consumeUsage();
              const count = await getFromStorage('usage_count', 0);
              counts.push(count);
            }
            
            // Assert - 验证单调性
            // 1. 每次使用次数应该比前一次多 1
            for (let i = 1; i < counts.length; i++) {
              expect(counts[i]).toBe(counts[i - 1] + 1);
            }
            
            // 2. 最终使用次数应该等于操作次数
            expect(counts[counts.length - 1]).toBe(numOperations);
            
            // 3. 第一次使用次数应该是 1
            expect(counts[0]).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
