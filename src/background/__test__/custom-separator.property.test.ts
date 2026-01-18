/**
 * 自定义分隔符属性测试
 * 
 * Feature: ui-ux-improvements, Property 1: 自定义分隔符应用
 * Validates: Requirements 1.1, 1.4
 * 
 * 属性：对于任何文本数组和自定义分隔符，当启用"合并多行"并提供分隔符时，
 * 清洗结果应该是使用该分隔符连接的单个字符串
 */

import * as fc from 'fast-check';
import { advancedClean, type CleaningRules } from '../cleaner';

describe('Property 1: 自定义分隔符应用', () => {
  /**
   * 生成随机字符串数组（模拟数据行）
   */
  const dataArbitrary = fc.array(
    fc.string({ maxLength: 50 }),
    { minLength: 1, maxLength: 20 }
  );

  /**
   * 生成随机分隔符（包括常见的特殊字符）
   */
  const separatorArbitrary = fc.oneof(
    fc.string({ maxLength: 10 }),           // 任意字符串
    fc.constant(''),                         // 空字符串
    fc.constant(', '),                       // 逗号+空格
    fc.constant('; '),                       // 分号+空格
    fc.constant(' | '),                      // 管道符
    fc.constant('\n'),                       // 换行符
    fc.constant('\t'),                       // 制表符
    fc.constant(' - '),                      // 短横线
    fc.constant(' / ')                       // 斜杠
  );

  test('对于任何文本数组和自定义分隔符，启用合并多行时应该使用指定分隔符连接', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        separatorArbitrary,
        (data, separator) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: separator,
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 验证结果是单行
          expect(result.length).toBe(1);

          // 验证结果使用指定分隔符连接
          const expected = data.join(separator);
          expect(result[0]).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何文本数组，启用合并多行但未提供分隔符时应该使用默认换行符', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        (data) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            // customSeparator 未定义，应使用默认换行符
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 验证结果是单行
          expect(result.length).toBe(1);

          // 验证结果使用默认换行符连接
          const expected = data.join('\n');
          expect(result[0]).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何文本数组，空字符串分隔符应该直接连接所有行', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        (data) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: '',
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 验证结果是单行
          expect(result.length).toBe(1);

          // 验证结果是直接连接（无分隔符）
          const expected = data.join('');
          expect(result[0]).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何文本数组和分隔符，合并结果应该可以通过split还原（可逆性）', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        // 使用不包含在数据中的分隔符，确保可逆性
        fc.constant('|||SEPARATOR|||'),
        (data, separator) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: separator,
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 验证可以通过split还原
          const restored = result[0].split(separator);
          expect(restored).toEqual(data);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何文本数组，自定义分隔符应该优先于合并为一行', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        separatorArbitrary,
        (data, separator) => {
          // 同时启用合并多行和合并为一行
          const rulesWithBoth: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: separator,
            mergeToSingleLine: true,  // 同时启用
            removeDuplicates: false
          };

          // 只启用合并为一行
          const rulesOnlySingleLine: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: false,
            mergeToSingleLine: true,
            removeDuplicates: false
          };

          const resultWithBoth = advancedClean(data, rulesWithBoth);
          const resultOnlySingleLine = advancedClean(data, rulesOnlySingleLine);

          // 当两个选项都启用时，mergeToSingleLine优先，应该使用空格而不是自定义分隔符
          expect(resultWithBoth).toEqual(resultOnlySingleLine);
          expect(resultWithBoth[0]).toBe(data.join(' '));
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于任何文本数组和分隔符，合并后的长度应该符合预期', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        separatorArbitrary,
        (data, separator) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: separator,
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          const result = advancedClean(data, rules);

          // 计算预期长度
          const totalDataLength = data.reduce((sum, line) => sum + line.length, 0);
          const separatorLength = separator.length * (data.length - 1);
          const expectedLength = totalDataLength + separatorLength;

          // 验证结果长度
          expect(result[0].length).toBe(expectedLength);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('对于包含特殊字符的分隔符，应该正确处理而不产生错误', () => {
    fc.assert(
      fc.property(
        dataArbitrary,
        fc.oneof(
          fc.constant('\n\n'),      // 多个换行符
          fc.constant('\t\t'),      // 多个制表符
          fc.constant('\\n'),       // 转义的换行符字符串
          fc.constant('\\t'),       // 转义的制表符字符串
          fc.constant('$$$'),       // 特殊字符
          fc.constant('***'),       // 星号
          fc.constant('...'),       // 省略号
          fc.constant('<br>'),      // HTML标签
          fc.constant('&nbsp;')     // HTML实体
        ),
        (data, separator) => {
          const rules: CleaningRules = {
            removeEmptyLines: false,
            mergeMultipleLines: true,
            customSeparator: separator,
            mergeToSingleLine: false,
            removeDuplicates: false
          };

          // 应该不抛出错误
          expect(() => {
            const result = advancedClean(data, rules);
            expect(result.length).toBe(1);
            expect(result[0]).toBe(data.join(separator));
          }).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});
