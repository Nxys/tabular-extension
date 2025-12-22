/**
 * Storage 模块单元测试
 * 
 * 测试范围：
 * 1. getUsageCount 返回正确的计数
 * 2. incrementUsage 正确增加计数
 * 3. resetIfNewDay 在日期变化时重置计数
 * 4. resetIfNewDay 在同一天不重置计数
 * 5. storage 访问失败时的降级策略
 * 6. saveStats 和 getStats 函数（第三版新增）
 * 7. 跨天重置包含事件统计
 * 
 * 验证需求：3.6, 3.7, 14.4, 14.5, 14.10
 */

import { getUsageCount, incrementUsage, resetIfNewDay, saveStats, getStats } from '../src/content/usage/storage';
import type { UsageStats } from '../src/content/usage/usage';

describe('Storage 模块单元测试', () => {
  // 保存原始的 Date 对象
  const RealDate = Date;
  
  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
    
    // 重置 chrome.storage.local mock
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
    (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
    
    // 恢复真实的 Date
    global.Date = RealDate;
  });

  afterEach(() => {
    // 确保恢复真实的 Date
    global.Date = RealDate;
  });

  describe('getUsageCount', () => {
    it('应该返回存储中的使用次数', async () => {
      // 模拟存储中有 5 次使用记录
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        usage_count: 5
      });

      const count = await getUsageCount();
      
      expect(count).toBe(5);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['usage_count']);
    });

    it('应该在没有存储数据时返回 0', async () => {
      // 模拟存储为空
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      const count = await getUsageCount();
      
      expect(count).toBe(0);
    });

    it('应该在存储访问失败时使用内存降级并返回 0', async () => {
      // 模拟存储访问失败
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const count = await getUsageCount();
      
      expect(count).toBe(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Storage access failed, using memory fallback',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('incrementUsage', () => {
    it('应该正确增加使用次数', async () => {
      // 模拟当前使用次数为 3
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        usage_count: 3
      });

      await incrementUsage();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_count: 4
      });
    });

    it('应该从 0 开始增加使用次数', async () => {
      // 模拟存储为空（首次使用）
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      await incrementUsage();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_count: 1
      });
    });

    it('应该在存储访问失败时使用内存降级', async () => {
      // 模拟存储访问失败
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await incrementUsage();
      
      // 应该记录警告（注意：incrementUsage 内部调用 getUsageCount，所以会有两次警告）
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Storage access failed, using memory fallback',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('resetIfNewDay', () => {
    it('应该在日期变化时重置使用次数', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 模拟存储中的日期是昨天
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        last_usage_date: 'Sun Jan 14 2024'
      });

      await resetIfNewDay();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_count: 0,
        last_usage_date: mockToday.toDateString(),
        usage_stats: {
          selectCount: 0,
          tableDetectCount: 0,
          columnAlignCount: 0,
          csvExportCount: 0,
          lastDate: mockToday.toDateString()
        }
      });
    });

    it('应该在同一天不重置使用次数', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 模拟存储中的日期是今天
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        last_usage_date: mockToday.toDateString()
      });

      await resetIfNewDay();
      
      // 不应该调用 set（因为日期相同）
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it('应该在首次使用时初始化日期和计数', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 模拟存储为空（首次使用）
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      await resetIfNewDay();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_count: 0,
        last_usage_date: mockToday.toDateString(),
        usage_stats: {
          selectCount: 0,
          tableDetectCount: 0,
          columnAlignCount: 0,
          csvExportCount: 0,
          lastDate: mockToday.toDateString()
        }
      });
    });

    it('应该在存储访问失败时使用内存降级', async () => {
      // 模拟存储访问失败
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await resetIfNewDay();
      
      // 应该记录警告
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Date reset failed, using memory fallback',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('应该在日期格式异常时视为新的一天并重置', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 模拟存储中的日期格式异常（null）
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        last_usage_date: null
      });

      await resetIfNewDay();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_count: 0,
        last_usage_date: mockToday.toDateString(),
        usage_stats: {
          selectCount: 0,
          tableDetectCount: 0,
          columnAlignCount: 0,
          csvExportCount: 0,
          lastDate: mockToday.toDateString()
        }
      });
    });
  });

  describe('降级策略集成测试', () => {
    it('应该在存储完全不可用时使用内存降级完成完整流程', async () => {
      // 模拟所有存储操作都失败
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage not available')
      );
      (chrome.storage.local.set as jest.Mock).mockRejectedValue(
        new Error('Storage not available')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // 重置日期（应该使用内存降级）
      await resetIfNewDay();
      
      // 获取使用次数（应该返回 0，因为内存降级初始值为 0）
      const count1 = await getUsageCount();
      expect(count1).toBe(0);
      
      // 增加使用次数（应该使用内存降级，内存中的值会增加到 1）
      await incrementUsage();
      
      // 再次获取使用次数（应该返回 1，从内存中读取）
      // 注意：内存降级是模块级别的单例，所以会保持状态
      const count2 = await getUsageCount();
      expect(count2).toBe(1);

      // 应该记录了多次警告
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('属性测试', () => {
    /**
     * 属性 3：跨天重置
     * Feature: usage-limit-system, Property 3: 跨天重置
     * 
     * 对于任意日期变化（从日期A到日期B，其中A ≠ B），
     * 调用 resetIfNewDay 后，使用次数应该被重置为 0
     * 
     * 验证需求：3.7, 8.5
     */
    it('属性 3：跨天重置 - 对于任意日期变化，调用 resetIfNewDay 后使用次数应该为 0', async () => {
      // 运行 100 次迭代以验证属性
      const iterations = 100;
      
      for (let i = 0; i < iterations; i++) {
        // 生成随机的日期对 (dateA, dateB)，确保它们不同
        const baseYear = 2020 + Math.floor(Math.random() * 5); // 2020-2024
        const baseMonth = Math.floor(Math.random() * 12); // 0-11
        const baseDay = 1 + Math.floor(Math.random() * 28); // 1-28 (避免月份边界问题)
        
        const dateA = new RealDate(baseYear, baseMonth, baseDay);
        
        // 生成不同的日期B（在dateA基础上加1-30天）
        const daysOffset = 1 + Math.floor(Math.random() * 30);
        const dateB = new RealDate(baseYear, baseMonth, baseDay + daysOffset);
        
        // 生成随机的初始使用次数（0-50）
        const randomUsageCount = Math.floor(Math.random() * 51);
        
        // 模拟存储中的日期是 dateA，使用次数是随机值
        (chrome.storage.local.get as jest.Mock).mockResolvedValue({
          last_usage_date: dateA.toDateString(),
          usage_count: randomUsageCount
        });
        
        // 模拟当前日期为 dateB
        const mockDate = jest.fn(() => dateB) as any;
        mockDate.prototype = RealDate.prototype;
        global.Date = mockDate;
        
        // 调用 resetIfNewDay
        await resetIfNewDay();
        
        // 验证：应该调用 set 方法重置使用次数为 0
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
          usage_count: 0,
          last_usage_date: dateB.toDateString(),
          usage_stats: {
            selectCount: 0,
            tableDetectCount: 0,
            columnAlignCount: 0,
            csvExportCount: 0,
            lastDate: dateB.toDateString()
          }
        });
        
        // 恢复真实的 Date
        global.Date = RealDate;
        
        // 清理 mock 以便下次迭代
        jest.clearAllMocks();
        (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
        (chrome.storage.local.set as jest.Mock).mockResolvedValue(undefined);
      }
    });
  });

  describe('saveStats 和 getStats（第三版新增）', () => {
    it('应该正确保存使用统计', async () => {
      const stats: UsageStats = {
        selectCount: 5,
        tableDetectCount: 3,
        columnAlignCount: 2,
        csvExportCount: 1,
        lastDate: 'Mon Jan 15 2024'
      };

      await saveStats(stats);
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_stats: stats
      });
    });

    it('应该正确获取使用统计', async () => {
      const mockStats: UsageStats = {
        selectCount: 10,
        tableDetectCount: 5,
        columnAlignCount: 3,
        csvExportCount: 2,
        lastDate: 'Mon Jan 15 2024'
      };

      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        usage_stats: mockStats
      });

      const stats = await getStats();
      
      expect(stats).toEqual(mockStats);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['usage_stats']);
    });

    it('应该在没有存储数据时返回默认统计', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 模拟存储为空
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      const stats = await getStats();
      
      expect(stats).toEqual({
        selectCount: 0,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: mockToday.toDateString()
      });

      // 恢复真实的 Date
      global.Date = RealDate;
    });

    it('应该在存储访问失败时使用内存降级保存统计', async () => {
      // 模拟存储访问失败
      (chrome.storage.local.set as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const stats: UsageStats = {
        selectCount: 5,
        tableDetectCount: 3,
        columnAlignCount: 2,
        csvExportCount: 1,
        lastDate: 'Mon Jan 15 2024'
      };

      await saveStats(stats);
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to save usage stats, using memory fallback',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });

    it('应该在存储访问失败时使用内存降级获取统计', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 先重置内存降级状态（通过调用 resetIfNewDay）
      // 这会确保内存降级中的 usageStats 被初始化
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );
      await resetIfNewDay();

      // 清除之前的 mock 调用记录
      jest.clearAllMocks();

      // 再次模拟存储访问失败
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const stats = await getStats();
      
      // 应该返回默认值（从内存降级中获取，已经被 resetIfNewDay 初始化为 0）
      expect(stats).toEqual({
        selectCount: 0,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: mockToday.toDateString()
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to get usage stats, using memory fallback',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();

      // 恢复真实的 Date
      global.Date = RealDate;
    });
  });

  describe('跨天重置包含事件统计', () => {
    it('应该在跨天重置时同时重置事件统计', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 模拟存储中的日期是昨天，有一些使用统计
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        last_usage_date: 'Sun Jan 14 2024',
        usage_count: 10,
        usage_stats: {
          selectCount: 10,
          tableDetectCount: 5,
          columnAlignCount: 3,
          csvExportCount: 2,
          lastDate: 'Sun Jan 14 2024'
        }
      });

      await resetIfNewDay();
      
      // 验证：应该重置所有计数和统计
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        usage_count: 0,
        last_usage_date: mockToday.toDateString(),
        usage_stats: {
          selectCount: 0,
          tableDetectCount: 0,
          columnAlignCount: 0,
          csvExportCount: 0,
          lastDate: mockToday.toDateString()
        }
      });

      // 恢复真实的 Date
      global.Date = RealDate;
    });

    it('应该在存储失败时使用内存降级重置事件统计', async () => {
      // 模拟当前日期
      const mockToday = new Date('2024-01-15');
      const mockDate = jest.fn(() => mockToday) as any;
      mockDate.prototype = RealDate.prototype;
      global.Date = mockDate;

      // 模拟存储访问失败
      (chrome.storage.local.get as jest.Mock).mockRejectedValue(
        new Error('Storage access failed')
      );

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await resetIfNewDay();
      
      // 应该记录警告
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Date reset failed, using memory fallback',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();

      // 恢复真实的 Date
      global.Date = RealDate;
    });
  });
});
