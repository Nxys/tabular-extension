/**
 * 数据清洗模块单元测试
 * 
 * 测试范围：
 * - 基础清洗功能
 * - 每种高级清洗规则
 * - 清洗规则组合
 */

import { basicClean, advancedClean, BASIC_CLEANING, type CleaningRules } from '../../../src/background/cleaner';

describe('cleaner 模块', () => {
  describe('basicClean', () => {
    test('应该去除每行首尾空白', () => {
      const input = ['  hello  ', '\tworld\t', '  test  '];
      const expected = ['hello', 'world', 'test'];
      expect(basicClean(input)).toEqual(expected);
    });

    test('应该处理空字符串', () => {
      const input = ['', '  ', '\t\t'];
      const expected = ['', '', ''];
      expect(basicClean(input)).toEqual(expected);
    });

    test('应该处理空数组', () => {
      expect(basicClean([])).toEqual([]);
    });

    test('应该保持已清洗的数据不变', () => {
      const input = ['hello', 'world', 'test'];
      expect(basicClean(input)).toEqual(input);
    });
  });

  describe('advancedClean - 合并为一行', () => {
    test('应该使用空格合并所有行', () => {
      const input = ['hello', 'world', 'test'];
      const rules: CleaningRules = {
        mergeToSingleLine: true,
        removeDuplicates: false
      };
      const expected = ['hello world test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持合并为一行 + 自定义分隔符', () => {
      const input = ['line1', 'line2', 'line3'];
      const rules: CleaningRules = {
        mergeToSingleLine: true,
        customSeparator: ' | ',
        removeDuplicates: false
      };
      const expected = ['line1 | line2 | line3'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持合并为一行 + 逗号分隔符', () => {
      const input = ['apple', 'banana', 'orange'];
      const rules: CleaningRules = {
        mergeToSingleLine: true,
        customSeparator: ', ',
        removeDuplicates: false
      };
      const expected = ['apple, banana, orange'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持合并为一行 + 空字符串分隔符', () => {
      const input = ['hello', 'world'];
      const rules: CleaningRules = {
        mergeToSingleLine: true,
        customSeparator: '',
        removeDuplicates: false
      };
      const expected = ['helloworld'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持合并为一行 + 换行符分隔符', () => {
      const input = ['line1', 'line2', 'line3'];
      const rules: CleaningRules = {
        mergeToSingleLine: true,
        customSeparator: '\n',
        removeDuplicates: false
      };
      const expected = ['line1\nline2\nline3'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });
  });

  describe('advancedClean - 仅使用自定义分隔符', () => {
    test('应该使用自定义分隔符连接所有行', () => {
      const input = ['line1', 'line2', 'line3'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        customSeparator: ',',
        removeDuplicates: false
      };
      const expected = ['line1,line2,line3'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持管道符作为分隔符', () => {
      const input = ['col1', 'col2', 'col3'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        customSeparator: ' | ',
        removeDuplicates: false
      };
      const expected = ['col1 | col2 | col3'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持制表符作为分隔符', () => {
      const input = ['data1', 'data2', 'data3'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        customSeparator: '\t',
        removeDuplicates: false
      };
      const expected = ['data1\tdata2\tdata3'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持空字符串作为分隔符', () => {
      const input = ['a', 'b', 'c'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        customSeparator: '',
        removeDuplicates: false
      };
      const expected = ['abc'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });
  });

  describe('advancedClean - 去重', () => {
    test('应该移除重复的行', () => {
      const input = ['hello', 'world', 'hello', 'test', 'world'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        removeDuplicates: true
      };
      const expected = ['hello', 'world', 'test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该保持首次出现的顺序', () => {
      const input = ['c', 'a', 'b', 'a', 'c'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        removeDuplicates: true
      };
      const expected = ['c', 'a', 'b'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该区分大小写', () => {
      const input = ['Hello', 'hello', 'HELLO'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        removeDuplicates: true
      };
      // 大小写不同，不应该去重
      expect(advancedClean(input, rules)).toEqual(input);
    });

    test('空数组应该返回空数组', () => {
      const input: string[] = [];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        removeDuplicates: true
      };
      expect(advancedClean(input, rules)).toEqual([]);
    });

    test('应该正确处理单行数据', () => {
      const input = ['hello'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        removeDuplicates: true
      };
      expect(advancedClean(input, rules)).toEqual(['hello']);
    });
  });

  describe('advancedClean - 规则组合', () => {
    test('合并为一行 + 去重（去重在合并后无效）', () => {
      const input = ['hello', 'world', 'hello', 'test'];
      const rules: CleaningRules = {
        mergeToSingleLine: true,
        removeDuplicates: true
      };
      // 先合并为一行，然后去重（但只有一行，去重无效）
      const expected = ['hello world hello test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('合并为一行 + 自定义分隔符 + 去重', () => {
      const input = ['apple', 'banana', 'apple'];
      const rules: CleaningRules = {
        mergeToSingleLine: true,
        customSeparator: ', ',
        removeDuplicates: true
      };
      // 先合并为一行，然后去重（但只有一行，去重无效）
      const expected = ['apple, banana, apple'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('仅自定义分隔符 + 去重（去重在合并后无效）', () => {
      const input = ['line1', 'line2', 'line1'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        customSeparator: ' | ',
        removeDuplicates: true
      };
      // 先使用自定义分隔符合并，然后去重（但只有一行，去重无效）
      const expected = ['line1 | line2 | line1'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('所有规则都不启用', () => {
      const input = ['hello', 'world', 'hello'];
      const rules: CleaningRules = BASIC_CLEANING;
      expect(advancedClean(input, rules)).toEqual(input);
    });

    test('仅去重（不合并）', () => {
      const input = ['hello', 'world', 'hello', 'test', 'world'];
      const rules: CleaningRules = {
        mergeToSingleLine: false,
        removeDuplicates: true
      };
      const expected = ['hello', 'world', 'test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });
  });

  describe('BASIC_CLEANING 常量', () => {
    test('应该定义默认的基础清洗规则', () => {
      expect(BASIC_CLEANING).toEqual({
        mergeToSingleLine: false,
        removeDuplicates: false
      });
    });
  });
});
