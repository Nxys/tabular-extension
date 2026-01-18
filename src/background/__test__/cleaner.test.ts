/**
 * 数据清洗模块单元测试
 * 
 * 测试范围：
 * - 基础清洗功能
 * - 每种高级清洗规则
 * - 清洗规则组合
 */

import { basicClean, advancedClean, BASIC_CLEANING, type CleaningRules } from '../cleaner';

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

  describe('advancedClean - 去空行', () => {
    test('应该移除空行', () => {
      const input = ['hello', '', 'world', '  ', 'test'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeEmptyLines: true
      };
      const expected = ['hello', 'world', 'test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该移除只包含空白的行', () => {
      const input = ['hello', '   ', '\t\t', 'world'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeEmptyLines: true
      };
      const expected = ['hello', 'world'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('不启用时应该保留空行', () => {
      const input = ['hello', '', 'world'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeEmptyLines: false
      };
      expect(advancedClean(input, rules)).toEqual(input);
    });
  });

  describe('advancedClean - 合并多行', () => {
    test('应该使用自定义分隔符合并所有行', () => {
      const input = ['hello', 'world', 'test'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        mergeMultipleLines: true,
        customSeparator: ', '
      };
      const expected = ['hello, world, test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持空字符串作为分隔符', () => {
      const input = ['hello', 'world'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        mergeMultipleLines: true,
        customSeparator: ''
      };
      // 空字符串是有效的分隔符，表示直接连接
      const expected = ['helloworld'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该支持换行符作为分隔符', () => {
      const input = ['line1', 'line2', 'line3'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        mergeMultipleLines: true,
        customSeparator: '\n'
      };
      const expected = ['line1\nline2\nline3'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('未提供分隔符时应该使用默认换行符', () => {
      const input = ['hello', 'world'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        mergeMultipleLines: true
        // customSeparator 未定义，应使用默认换行符
      };
      const expected = ['hello\nworld'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });
  });

  describe('advancedClean - 合并为一行', () => {
    test('应该使用空格合并所有行', () => {
      const input = ['hello', 'world', 'test'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        mergeToSingleLine: true
      };
      const expected = ['hello world test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('合并为一行优先级高于合并多行', () => {
      const input = ['hello', 'world'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        mergeMultipleLines: true,
        customSeparator: ', ',
        mergeToSingleLine: true
      };
      // 当两个选项都启用时，"合并为一行"优先，使用空格而不是自定义分隔符
      const expected = ['hello world'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });
  });

  describe('advancedClean - 去重', () => {
    test('应该移除重复的行', () => {
      const input = ['hello', 'world', 'hello', 'test', 'world'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeDuplicates: true
      };
      const expected = ['hello', 'world', 'test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该保持首次出现的顺序', () => {
      const input = ['c', 'a', 'b', 'a', 'c'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeDuplicates: true
      };
      const expected = ['c', 'a', 'b'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('应该区分大小写', () => {
      const input = ['Hello', 'hello', 'HELLO'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeDuplicates: true
      };
      // 大小写不同，不应该去重
      expect(advancedClean(input, rules)).toEqual(input);
    });

    test('空数组应该返回空数组', () => {
      const input: string[] = [];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeDuplicates: true
      };
      expect(advancedClean(input, rules)).toEqual([]);
    });
  });

  describe('advancedClean - 规则组合', () => {
    test('去空行 + 去重', () => {
      const input = ['hello', '', 'world', 'hello', '  ', 'test'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeEmptyLines: true,
        removeDuplicates: true
      };
      const expected = ['hello', 'world', 'test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('去空行 + 合并为一行', () => {
      const input = ['hello', '', 'world', '  ', 'test'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        removeEmptyLines: true,
        mergeToSingleLine: true
      };
      const expected = ['hello world test'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('合并多行 + 去重（去重在合并后无效）', () => {
      const input = ['hello', 'world', 'hello'];
      const rules: CleaningRules = {
        ...BASIC_CLEANING,
        mergeMultipleLines: true,
        customSeparator: ' ',
        removeDuplicates: true
      };
      // 先合并为一行，然后去重（但只有一行，去重无效）
      const expected = ['hello world hello'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });

    test('所有规则都不启用', () => {
      const input = ['hello', '', 'world', 'hello'];
      const rules: CleaningRules = BASIC_CLEANING;
      expect(advancedClean(input, rules)).toEqual(input);
    });

    test('复杂组合：去空行 + 去重 + 合并为一行', () => {
      const input = ['hello', '', 'world', 'hello', '  ', 'test', 'world'];
      const rules: CleaningRules = {
        removeEmptyLines: true,
        mergeMultipleLines: false,
        mergeToSingleLine: true,
        removeDuplicates: true
      };
      // 执行顺序：去空行 -> 合并为一行 -> 去重
      // 去空行后: ['hello', 'world', 'hello', 'test', 'world']
      // 合并为一行: ['hello world hello test world']
      // 去重: ['hello world hello test world'] (只有一行，去重无效)
      const expected = ['hello world hello test world'];
      expect(advancedClean(input, rules)).toEqual(expected);
    });
  });

  describe('BASIC_CLEANING 常量', () => {
    test('应该定义默认的基础清洗规则', () => {
      expect(BASIC_CLEANING).toEqual({
        removeEmptyLines: false,
        mergeMultipleLines: false,
        mergeToSingleLine: false,
        removeDuplicates: false
      });
    });
  });
});
