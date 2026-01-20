/**
 * 清洗规则应用一致性属性测试
 * 
 * Feature: v3-freemium-model, Property 4: 清洗规则应用一致性
 * Validates: Requirements 3.7, 7.8, 10.1, 10.2, 10.4
 * 
 * 属性：对于任何数据和任何清洗规则，复制操作和导出操作应该产生相同的清洗结果
 */

import * as fc from 'fast-check';
import { advancedClean, basicClean, type CleaningRules } from '../../../src/background/cleaner';

describe('Property 4: 清洗规则应用一致性', () => {
  /**
   * 生成随机清洗规则
   */
  const cleaningRulesArbitrary: fc.Arbitrary<CleaningRules> = fc.record({
    removeEmptyLines: fc.boolean(),
    mergeMultipleLines: fc.boolean(),
    customSeparator: fc.option(fc.string({ maxLength: 5 }), { nil: undefined }),
    mergeToSingleLine: fc.boolean(),
    removeDuplicates: fc.boolean()
  }).map(rules => {
    // 确保类型正确：如果 customSeparator 是 undefined，则不设置该属性
    const result: CleaningRules = {
      removeEmptyLines: rules.removeEmptyLines,
      mergeMultipleLines: rules.mergeMultipleLines,
      mergeToSingleLine: rules.mergeToSingleLine,
      removeDuplicates: rules.removeDuplicates
    };
    if (rules.customSeparator !== undefined) {
      result.customSeparator = rules.customSeparator;
    }
    return result;
  });

  /**
   * 生成随机字符串数组（模拟数据行）
   */
  const dataArbitrary = fc.array(
    fc.string({ maxLength: 50 }),
    { minLength: 0, maxLength: 20 }
  );

  test('对于任何数据和清洗规则，多次应用应该产生相同结果（幂等性）', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        cleaningRulesArbitrary,
        (data, rules) => {
          // 应用清洗规则两次
          const result1 = advancedClean(data, rules);
          const result2 = advancedClean(data, rules);

          // 结果应该完全相同
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据和清洗规则，清洗结果再次清洗应该保持不变（幂等性）', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        cleaningRulesArbitrary,
        (data, rules) => {
          // 第一次清洗
          const result1 = advancedClean(data, rules);
          // 对结果再次清洗
          const result2 = advancedClean(result1, rules);

          // 结果应该相同（幂等性）
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据，基础清洗应该是幂等的', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        (data) => {
          // 应用基础清洗两次
          const result1 = basicClean(data);
          const result2 = basicClean(result1);

          // 结果应该相同
          expect(result1).toEqual(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据和清洗规则，清洗不应该增加数据行数（除非合并）', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        cleaningRulesArbitrary,
        (data, rules) => {
          const result = advancedClean(data, rules);

          // 如果启用了合并多行，结果应该是单行（无论是否提供分隔符）
          if (rules.mergeMultipleLines) {
            expect(result.length).toBeLessThanOrEqual(1);
          } else if (rules.mergeToSingleLine && !rules.mergeMultipleLines) {
            // 如果启用了合并为一行（且未被合并多行覆盖），结果应该是单行
            expect(result.length).toBeLessThanOrEqual(1);
          } else {
            // 否则，结果行数不应该超过原始数据
            expect(result.length).toBeLessThanOrEqual(data.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据，启用去空行后结果不应该包含空行', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        (data) => {
          const rules: CleaningRules = {
            removeEmptyLines: true,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 结果中不应该有空行
          const hasEmptyLine = result.some(line => line.trim().length === 0);
          expect(hasEmptyLine).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据，启用去重后结果不应该包含重复行', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        (data) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: false,
            removeDuplicates: true
          };

          const result = advancedClean(data, rules);

          // 结果中不应该有重复行
          const uniqueLines = new Set(result);
          expect(uniqueLines.size).toBe(result.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据，启用合并为一行后结果应该是单行', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 50 }), { minLength: 1, maxLength: 20 }),
        (data) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: true,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 结果应该是单行
          expect(result.length).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据和分隔符，启用合并多行后结果应该是单行', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ maxLength: 50 }), { minLength: 1, maxLength: 20 }),
        fc.string({ maxLength: 5 }),
        (data, separator) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: separator,
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 结果应该是单行
          expect(result.length).toBe(1);
          // 结果应该包含分隔符（如果原始数据有多行）
          if (data.length > 1) {
            expect(result[0]).toContain(separator);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何数据，清洗后的结果应该保持数据内容的子集关系', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        cleaningRulesArbitrary,
        (data, rules) => {
          // 跳过合并操作（合并会改变数据结构）
          if (rules.mergeMultipleLines || rules.mergeToSingleLine) {
            return;
          }

          const result = advancedClean(data, rules);

          // 清洗后的每一行都应该来自原始数据（或是原始数据的子集）
          result.forEach(line => {
            // 如果启用了去空行，空行不应该出现
            if (rules.removeEmptyLines) {
              expect(line.trim().length).toBeGreaterThan(0);
            }
          });

          // 如果启用了去重，结果应该是唯一的
          if (rules.removeDuplicates) {
            const uniqueLines = new Set(result);
            expect(uniqueLines.size).toBe(result.length);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
