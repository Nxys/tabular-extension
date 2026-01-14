/**
 * 行数限制属性测试
 * 
 * Feature: v3-freemium-model, Property 1: Free 用户行数限制一致性
 * 
 * 测试范围：
 * - Free 用户总是被限制为 5 行（对于任何超过 5 行的数据）
 * - Pro 用户从不被限制
 */

import * as fc from 'fast-check';
import { setToStorage } from '../storage';
import { handleActionRequest } from '../index';

describe('Property 1: Free 用户行数限制一致性', () => {
  beforeEach(() => {
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

  /**
   * Property 1: Free 用户行数限制一致性
   * 
   * 对于任何 Free 用户和任何基础能力操作（框选、复制、导出），
   * 当数据超过 5 行时，系统输出应该被限制为前 5 行。
   * 
   * Validates: Requirements 1.3, 2.2, 2.3, 2.4
   */
  it('对于任何超过 5 行的数据，Free 用户总是被限制为 5 行', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成至少 6 行的数据
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 6, maxLength: 100 }),
        async (lines) => {
          // Arrange
          const data = lines.join('\n');
          const payload = {
            action: 'text-extract' as const,
            data
          };

          // Act
          const result = await handleActionRequest(payload);

          // Assert
          // 1. 返回的数据应该被限制为 5 行
          const resultLines = (result.data as string).split('\n');
          expect(resultLines.length).toBeLessThanOrEqual(5);
          
          // 2. 返回的数据应该是前 5 行
          const expectedData = lines.slice(0, 5).join('\n');
          expect(result.data).toBe(expectedData);
          
          // 3. uiData 应该标记为已限制
          expect(result.uiData?.isLimited).toBe(true);
          expect(result.uiData?.rowLimit).toBe(5);
          expect(result.uiData?.totalRows).toBe(lines.length);
          
          // 4. 应该包含限制提示文案
          expect(result.uiData?.limitMessage).toContain('仅展示前 5 行');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1 (补充): Free 用户少于等于 5 行时不限制
   * 
   * 对于任何 Free 用户，当数据少于等于 5 行时，
   * 系统应该返回完整数据，不进行限制。
   * 
   * Validates: Requirements 1.3, 2.2
   */
  it('对于任何少于等于 5 行的数据，Free 用户不被限制', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成 1-5 行的数据
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        async (lines) => {
          // Arrange
          const data = lines.join('\n');
          const payload = {
            action: 'text-extract' as const,
            data
          };

          // Act
          const result = await handleActionRequest(payload);

          // Assert
          // 1. 返回的数据应该是完整数据
          expect(result.data).toBe(data);
          
          // 2. uiData 应该标记为未限制
          expect(result.uiData?.isLimited).toBe(false);
          expect(result.uiData?.totalRows).toBe(lines.length);
          
          // 3. 不应该包含限制提示文案
          expect(result.uiData?.message).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1 (补充): Pro 用户从不被限制
   * 
   * 对于任何 Pro 用户和任何数据（无论多少行），
   * 系统应该返回完整数据，不进行限制。
   * 
   * Validates: Requirements 1.3, 2.6
   */
  it('对于任何数据，Pro 用户从不被限制', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成任意行数的数据（1-100 行）
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 100 }),
        async (lines) => {
          // Arrange
          // 启用 Pro
          await setToStorage('pro_state', {
            isPro: true,
            signature: 'test',
            features: {
              'table-detect': true,
              'column-align': true,
              'csv-export': true
            }
          });
          
          const data = lines.join('\n');
          const payload = {
            action: 'text-extract' as const,
            data
          };

          // Act
          const result = await handleActionRequest(payload);

          // Assert
          // 1. 返回的数据应该是完整数据
          expect(result.data).toBe(data);
          
          // 2. uiData 应该标记为未限制
          expect(result.uiData?.isLimited).toBe(false);
          expect(result.uiData?.totalRows).toBe(lines.length);
          
          // 3. 不应该包含限制提示文案
          expect(result.uiData?.message).toBeUndefined();
          
          // 清理 Pro 状态
          await setToStorage('pro_state', {
            isPro: false,
            signature: '',
            features: {
              'table-detect': false,
              'column-align': false,
              'csv-export': false
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1 (补充): 行数限制的一致性
   * 
   * 对于任何数据，Free 用户的输出行数应该是 min(输入行数, 5)
   * 
   * Validates: Requirements 1.3, 2.2, 2.3, 2.4
   */
  it('Free 用户的输出行数总是 min(输入行数, 5)', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成任意行数的数据（1-100 行）
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 100 }),
        async (lines) => {
          // Arrange
          const data = lines.join('\n');
          const payload = {
            action: 'text-extract' as const,
            data
          };

          // Act
          const result = await handleActionRequest(payload);

          // Assert
          const resultLines = (result.data as string).split('\n');
          const expectedLineCount = Math.min(lines.length, 5);
          expect(resultLines.length).toBe(expectedLineCount);
        }
      ),
      { numRuns: 100 }
    );
  });
});
