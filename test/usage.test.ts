/**
 * Usage 模块单元测试和属性测试
 * 
 * 测试范围：
 * 1. checkUsage 在未达限制时返回 allowed: true
 * 2. checkUsage 在达到限制时返回 allowed: false
 * 3. consumeUsage 正确增加计数
 * 4. checkUsage 幂等性（属性测试）
 * 
 * 验证需求：1.5, 8.2, 8.3
 */

import { checkUsage, consumeUsage } from '../src/content/usage/usage';
import * as storage from '../src/content/usage/storage';
import * as fc from 'fast-check';

// Mock storage 模块
jest.mock('../src/content/usage/storage');

describe('Usage 模块单元测试', () => {
  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();
  });

  describe('checkUsage', () => {
    it('应该在未达限制时返回 allowed: true', async () => {
      // Mock storage 模块的返回值
      // resetIfNewDay 不需要返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      // 模拟当前使用次数为 10（未达到 20 的限制）
      (storage.getUsageCount as jest.Mock).mockResolvedValue(10);

      const result = await checkUsage();

      // 验证结果
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10); // 20 - 10 = 10
      expect(result.reason).toBeUndefined();

      // 验证调用了必要的 storage 函数
      expect(storage.resetIfNewDay).toHaveBeenCalledTimes(1);
      expect(storage.getUsageCount).toHaveBeenCalledTimes(1);
    });

    it('应该在达到限制时返回 allowed: false', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      // 模拟当前使用次数为 20（达到限制）
      (storage.getUsageCount as jest.Mock).mockResolvedValue(20);

      const result = await checkUsage();

      // 验证结果
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('limit-reached');
      expect(result.remaining).toBe(0);

      // 验证调用了必要的 storage 函数
      expect(storage.resetIfNewDay).toHaveBeenCalledTimes(1);
      expect(storage.getUsageCount).toHaveBeenCalledTimes(1);
    });

    it('应该在超过限制时返回 allowed: false', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      // 模拟当前使用次数为 25（超过限制）
      (storage.getUsageCount as jest.Mock).mockResolvedValue(25);

      const result = await checkUsage();

      // 验证结果
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('limit-reached');
      expect(result.remaining).toBe(0);
    });

    it('应该在使用次数为 0 时返回 allowed: true', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      // 模拟首次使用（使用次数为 0）
      (storage.getUsageCount as jest.Mock).mockResolvedValue(0);

      const result = await checkUsage();

      // 验证结果
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20); // 20 - 0 = 20
      expect(result.reason).toBeUndefined();
    });

    it('应该在使用次数为 19 时返回 allowed: true', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      // 模拟使用次数为 19（临界值，未达到限制）
      (storage.getUsageCount as jest.Mock).mockResolvedValue(19);

      const result = await checkUsage();

      // 验证结果
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1); // 20 - 19 = 1
      expect(result.reason).toBeUndefined();
    });

    it('应该在每次调用时先调用 resetIfNewDay', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(5);

      await checkUsage();

      // 验证调用顺序：resetIfNewDay 应该在 getUsageCount 之前被调用
      const resetCall = (storage.resetIfNewDay as jest.Mock).mock.invocationCallOrder[0];
      const getCountCall = (storage.getUsageCount as jest.Mock).mock.invocationCallOrder[0];
      
      expect(resetCall).toBeLessThan(getCountCall);
    });

    it('应该返回符合 UsageState 接口的对象', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(5);

      const result = await checkUsage();

      // 验证返回对象的结构
      expect(result).toHaveProperty('allowed');
      expect(typeof result.allowed).toBe('boolean');
      
      if (result.allowed) {
        expect(result).toHaveProperty('remaining');
        expect(typeof result.remaining).toBe('number');
      } else {
        expect(result).toHaveProperty('reason');
        expect(result.reason).toBe('limit-reached');
        expect(result).toHaveProperty('remaining');
        expect(result.remaining).toBe(0);
      }
    });
  });

  describe('consumeUsage', () => {
    it('应该正确增加计数', async () => {
      // Mock storage 模块的 incrementUsage
      (storage.incrementUsage as jest.Mock).mockResolvedValue(undefined);
      
      // Mock record 函数需要的其他 storage 函数
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getStats as jest.Mock).mockResolvedValue({
        selectCount: 0,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: new Date().toDateString()
      });
      (storage.saveStats as jest.Mock).mockResolvedValue(undefined);

      await consumeUsage();

      // 验证调用了 incrementUsage
      expect(storage.incrementUsage).toHaveBeenCalledTimes(1);
    });

    it('应该不返回任何值', async () => {
      // Mock storage 模块的 incrementUsage
      (storage.incrementUsage as jest.Mock).mockResolvedValue(undefined);
      
      // Mock record 函数需要的其他 storage 函数
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getStats as jest.Mock).mockResolvedValue({
        selectCount: 0,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: new Date().toDateString()
      });
      (storage.saveStats as jest.Mock).mockResolvedValue(undefined);

      const result = await consumeUsage();

      // 验证返回值为 undefined
      expect(result).toBeUndefined();
    });

    it('应该能够连续调用多次', async () => {
      // Mock storage 模块的 incrementUsage
      (storage.incrementUsage as jest.Mock).mockResolvedValue(undefined);
      
      // Mock record 函数需要的其他 storage 函数
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getStats as jest.Mock).mockResolvedValue({
        selectCount: 0,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: new Date().toDateString()
      });
      (storage.saveStats as jest.Mock).mockResolvedValue(undefined);

      // 连续调用 3 次
      await consumeUsage();
      await consumeUsage();
      await consumeUsage();

      // 验证 incrementUsage 被调用了 3 次
      expect(storage.incrementUsage).toHaveBeenCalledTimes(3);
    });
  });

  describe('checkUsage 幂等性', () => {
    it('应该在不调用 consumeUsage 的情况下多次返回相同结果', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(15);

      // 连续调用 checkUsage 3 次
      const result1 = await checkUsage();
      const result2 = await checkUsage();
      const result3 = await checkUsage();

      // 验证三次调用返回相同的结果
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // 验证所有结果都是 allowed: true
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result3.allowed).toBe(true);

      // 验证 remaining 都相同
      expect(result1.remaining).toBe(5);
      expect(result2.remaining).toBe(5);
      expect(result3.remaining).toBe(5);
    });

    it('应该在达到限制时多次返回相同的拒绝结果', async () => {
      // Mock storage 模块的返回值
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(20);

      // 连续调用 checkUsage 3 次
      const result1 = await checkUsage();
      const result2 = await checkUsage();
      const result3 = await checkUsage();

      // 验证三次调用返回相同的结果
      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);

      // 验证所有结果都是 allowed: false
      expect(result1.allowed).toBe(false);
      expect(result2.allowed).toBe(false);
      expect(result3.allowed).toBe(false);

      // 验证 reason 都相同
      expect(result1.reason).toBe('limit-reached');
      expect(result2.reason).toBe('limit-reached');
      expect(result3.reason).toBe('limit-reached');
    });
  });

  describe('边界值测试', () => {
    it('应该正确处理使用次数为 0 的情况', async () => {
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(0);

      const result = await checkUsage();

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20);
    });

    it('应该正确处理使用次数为 19 的情况（临界值）', async () => {
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(19);

      const result = await checkUsage();

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it('应该正确处理使用次数为 20 的情况（刚好达到限制）', async () => {
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(20);

      const result = await checkUsage();

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('limit-reached');
      expect(result.remaining).toBe(0);
    });

    it('应该正确处理使用次数为 21 的情况（超过限制）', async () => {
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(21);

      const result = await checkUsage();

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('limit-reached');
      expect(result.remaining).toBe(0);
    });
  });

  describe('模块依赖验证', () => {
    it('应该只依赖 storage 模块，不依赖 UI 组件', async () => {
      // 这个测试主要是文档性质的，验证 usage 模块的设计原则
      // 实际的依赖检查在代码审查和架构验证阶段进行
      
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(10);

      await checkUsage();

      // 验证只调用了 storage 模块的函数
      expect(storage.resetIfNewDay).toHaveBeenCalled();
      expect(storage.getUsageCount).toHaveBeenCalled();
    });

    it('应该不直接访问 chrome.storage.local', async () => {
      // usage 模块应该通过 storage 模块间接访问存储
      // 这个测试验证 usage 模块不直接使用 chrome API
      
      (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
      (storage.getUsageCount as jest.Mock).mockResolvedValue(10);

      await checkUsage();

      // 如果 usage 模块直接访问 chrome.storage.local，
      // 这个测试会失败（因为我们只 mock 了 storage 模块）
      expect(storage.resetIfNewDay).toHaveBeenCalled();
      expect(storage.getUsageCount).toHaveBeenCalled();
    });
  });

  /**
   * 属性测试：使用次数限制
   * 
   * Feature: usage-limit-system, Property 4: 使用次数限制
   * 
   * 对于任意使用次数 n，当 n < 20 时，checkUsage 应该返回 allowed: true；
   * 当 n >= 20 时，checkUsage 应该返回 allowed: false
   * 
   * 验证需求：8.2, 8.3
   */
  describe('属性测试：使用次数限制', () => {
    it('对于任意使用次数 n，当 n < 20 时 allowed 为 true，当 n >= 20 时 allowed 为 false', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成任意使用次数（0-30，覆盖限制前后的情况）
          fc.integer({ min: 0, max: 30 }),
          async (n) => {
            // Mock storage 模块的返回值
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getUsageCount as jest.Mock).mockResolvedValue(n);

            // 调用 checkUsage
            const result = await checkUsage();

            // 验证使用次数限制属性
            if (n < 20) {
              // 未达限制：应该允许使用
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBe(20 - n);
              expect(result.reason).toBeUndefined();
            } else {
              // 达到或超过限制：应该拒绝使用
              expect(result.allowed).toBe(false);
              expect(result.reason).toBe('limit-reached');
              expect(result.remaining).toBe(0);
            }

            // 清理 mock 调用记录，为下一次迭代做准备
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100, // 至少运行 100 次迭代
          verbose: true  // 显示详细信息
        }
      );
    });

    it('对于临界值 19 和 20，应该正确区分允许和拒绝', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成临界值附近的使用次数（18-21）
          fc.integer({ min: 18, max: 21 }),
          async (n) => {
            // Mock storage 模块的返回值
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getUsageCount as jest.Mock).mockResolvedValue(n);

            // 调用 checkUsage
            const result = await checkUsage();

            // 验证临界值的正确性
            if (n < 20) {
              expect(result.allowed).toBe(true);
              expect(result.remaining).toBeGreaterThan(0);
            } else {
              expect(result.allowed).toBe(false);
              expect(result.remaining).toBe(0);
            }

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('对于任意使用次数，remaining 应该正确计算', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 30 }),
          async (n) => {
            // Mock storage 模块的返回值
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getUsageCount as jest.Mock).mockResolvedValue(n);

            // 调用 checkUsage
            const result = await checkUsage();

            // 验证 remaining 的计算
            if (n < 20) {
              // 未达限制：remaining = 20 - n
              expect(result.remaining).toBe(20 - n);
              expect(result.remaining).toBeGreaterThan(0);
            } else {
              // 达到或超过限制：remaining = 0
              expect(result.remaining).toBe(0);
            }

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('对于任意使用次数，allowed 和 reason 应该保持一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 30 }),
          async (n) => {
            // Mock storage 模块的返回值
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getUsageCount as jest.Mock).mockResolvedValue(n);

            // 调用 checkUsage
            const result = await checkUsage();

            // 验证 allowed 和 reason 的一致性
            if (result.allowed) {
              // 允许使用时，不应该有 reason
              expect(result.reason).toBeUndefined();
            } else {
              // 拒绝使用时，应该有 reason
              expect(result.reason).toBe('limit-reached');
            }

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });
  });

  /**
   * 属性测试：使用次数递增
   * 
   * Feature: usage-limit-system, Property 5: 使用次数递增
   * 
   * 对于任意初始使用次数 n，调用 consumeUsage 后，使用次数应该为 n + 1
   * 
   * 验证需求：12.5
   */
  describe('属性测试：使用次数递增', () => {
    it('对于任意初始使用次数 n，调用 consumeUsage 后使用次数应该为 n + 1', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成任意初始使用次数（0-19，因为只有未达限制时才会调用 consumeUsage）
          fc.integer({ min: 0, max: 19 }),
          async (initialCount) => {
            // 模拟初始状态
            let currentCount = initialCount;
            
            // Mock storage 模块
            (storage.getUsageCount as jest.Mock).mockResolvedValue(currentCount);
            (storage.incrementUsage as jest.Mock).mockImplementation(async () => {
              // 模拟 incrementUsage 的行为：增加计数
              currentCount = currentCount + 1;
            });
            
            // Mock record 函数需要的其他 storage 函数
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getStats as jest.Mock).mockResolvedValue({
              selectCount: 0,
              tableDetectCount: 0,
              columnAlignCount: 0,
              csvExportCount: 0,
              lastDate: new Date().toDateString()
            });
            (storage.saveStats as jest.Mock).mockResolvedValue(undefined);

            // 记录调用前的使用次数
            const before = await storage.getUsageCount();
            
            // 调用 consumeUsage
            await consumeUsage();
            
            // 验证 incrementUsage 被调用
            expect(storage.incrementUsage).toHaveBeenCalledTimes(1);
            
            // 模拟再次获取使用次数（应该已经增加了）
            (storage.getUsageCount as jest.Mock).mockResolvedValue(currentCount);
            const after = await storage.getUsageCount();
            
            // 验证使用次数递增属性：after = before + 1
            expect(after).toBe(before + 1);
            expect(currentCount).toBe(initialCount + 1);

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100, // 至少运行 100 次迭代
          verbose: true  // 显示详细信息
        }
      );
    });

    it('对于任意初始使用次数，连续调用 consumeUsage 应该正确累加', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成初始使用次数和调用次数
          fc.integer({ min: 0, max: 15 }),
          fc.integer({ min: 1, max: 5 }),
          async (initialCount, callTimes) => {
            // 模拟初始状态
            let currentCount = initialCount;
            
            // Mock storage 模块
            (storage.incrementUsage as jest.Mock).mockImplementation(async () => {
              currentCount = currentCount + 1;
            });
            
            // Mock record 函数需要的其他 storage 函数
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getStats as jest.Mock).mockResolvedValue({
              selectCount: 0,
              tableDetectCount: 0,
              columnAlignCount: 0,
              csvExportCount: 0,
              lastDate: new Date().toDateString()
            });
            (storage.saveStats as jest.Mock).mockResolvedValue(undefined);

            // 连续调用 consumeUsage
            for (let i = 0; i < callTimes; i++) {
              await consumeUsage();
            }
            
            // 验证 incrementUsage 被调用了正确的次数
            expect(storage.incrementUsage).toHaveBeenCalledTimes(callTimes);
            
            // 验证最终的使用次数
            expect(currentCount).toBe(initialCount + callTimes);

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('对于任意初始使用次数，consumeUsage 应该调用 incrementUsage 和 record', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 19 }),
          async (_initialCount) => {
            // Mock storage 模块
            (storage.incrementUsage as jest.Mock).mockResolvedValue(undefined);
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getStats as jest.Mock).mockResolvedValue({
              selectCount: 0,
              tableDetectCount: 0,
              columnAlignCount: 0,
              csvExportCount: 0,
              lastDate: new Date().toDateString()
            });
            (storage.saveStats as jest.Mock).mockResolvedValue(undefined);

            // 调用 consumeUsage
            await consumeUsage();
            
            // 验证 incrementUsage 被调用一次（兼容性）
            expect(storage.incrementUsage).toHaveBeenCalledTimes(1);
            
            // 验证 record 相关的函数被调用（新功能）
            expect(storage.resetIfNewDay).toHaveBeenCalled();
            expect(storage.getStats).toHaveBeenCalled();
            expect(storage.saveStats).toHaveBeenCalled();

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('对于边界值（19），调用 consumeUsage 后应该变为 20', async () => {
      // 这是一个特殊的边界值测试
      const initialCount = 19;
      let currentCount = initialCount;
      
      // Mock storage 模块
      (storage.incrementUsage as jest.Mock).mockImplementation(async () => {
        currentCount = currentCount + 1;
      });

      // 调用 consumeUsage
      await consumeUsage();
      
      // 验证使用次数从 19 增加到 20（达到限制）
      expect(currentCount).toBe(20);
      expect(storage.incrementUsage).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * 属性测试：checkUsage 幂等性
   * 
   * Feature: usage-limit-system, Property 1: checkUsage 幂等性
   * 
   * 对于任意系统状态（使用次数 0-30），在不调用 consumeUsage 的情况下，
   * 多次调用 checkUsage 应该返回相同的 UsageState
   * 
   * 验证需求：1.5
   */
  describe('属性测试：checkUsage 幂等性', () => {
    it('对于任意使用次数，多次调用 checkUsage 应该返回相同结果', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成任意使用次数（0-30，覆盖限制前后的情况）
          fc.integer({ min: 0, max: 30 }),
          async (usageCount) => {
            // Mock storage 模块的返回值
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getUsageCount as jest.Mock).mockResolvedValue(usageCount);

            // 连续调用 checkUsage 3 次
            const result1 = await checkUsage();
            const result2 = await checkUsage();
            const result3 = await checkUsage();

            // 验证三次调用返回相同的结果
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);

            // 验证结果的正确性
            if (usageCount < 20) {
              // 未达限制
              expect(result1.allowed).toBe(true);
              expect(result1.remaining).toBe(20 - usageCount);
              expect(result1.reason).toBeUndefined();
            } else {
              // 达到或超过限制
              expect(result1.allowed).toBe(false);
              expect(result1.reason).toBe('limit-reached');
              expect(result1.remaining).toBe(0);
            }

            // 清理 mock 调用记录，为下一次迭代做准备
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100, // 至少运行 100 次迭代
          verbose: true  // 显示详细信息
        }
      );
    });

    it('对于任意使用次数，checkUsage 不应该修改状态', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 30 }),
          async (usageCount) => {
            // Mock storage 模块的返回值
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getUsageCount as jest.Mock).mockResolvedValue(usageCount);

            // 调用 checkUsage
            await checkUsage();

            // 验证 checkUsage 没有调用 incrementUsage（不修改状态）
            expect(storage.incrementUsage).not.toHaveBeenCalled();

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });

    it('对于任意使用次数，多次调用 checkUsage 应该调用相同次数的 storage 函数', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 30 }),
          async (usageCount) => {
            // Mock storage 模块的返回值
            (storage.resetIfNewDay as jest.Mock).mockResolvedValue(undefined);
            (storage.getUsageCount as jest.Mock).mockResolvedValue(usageCount);

            // 连续调用 checkUsage 3 次
            await checkUsage();
            await checkUsage();
            await checkUsage();

            // 验证每次调用都会调用 resetIfNewDay 和 getUsageCount
            expect(storage.resetIfNewDay).toHaveBeenCalledTimes(3);
            expect(storage.getUsageCount).toHaveBeenCalledTimes(3);

            // 验证没有调用 incrementUsage
            expect(storage.incrementUsage).not.toHaveBeenCalled();

            // 清理 mock 调用记录
            jest.clearAllMocks();
          }
        ),
        { 
          numRuns: 100,
          verbose: true
        }
      );
    });
  });
});
