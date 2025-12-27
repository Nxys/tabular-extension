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
});
