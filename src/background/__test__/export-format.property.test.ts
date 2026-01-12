/**
 * 导出格式正确性属性测试
 * 
 * Feature: v3-freemium-model, Property 6: 导出格式正确性（round-trip）
 * Validates: Requirements 5.6, 5.7
 * 
 * 测试目标：
 * - 验证 CSV 导出的 round-trip 正确性
 * - 对于任何表格数据，导出为 CSV 后再解析，应该得到等价的数据
 */

import * as fc from 'fast-check';
import { toCSV } from '../exporter.js';

/**
 * 解析 CSV 字符串为二维数组
 * 
 * 遵循 RFC 4180 标准：
 * 1. 字段用逗号分隔
 * 2. 双引号包裹的字段可以包含逗号、换行符
 * 3. 字段内的双引号转义为两个双引号
 * 4. 行以 CRLF 或 LF 结尾
 * 
 * @param csv - CSV 格式字符串
 * @returns 二维数组
 */
function parseCSV(csv: string): string[][] {
  // 处理空字符串
  if (csv.length === 0) {
    return [];
  }
  
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];
    const nextChar = csv[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // 转义的双引号
          currentField += '"';
          i += 2;
          continue;
        } else {
          // 引号结束
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        // 引号内的普通字符
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        // 引号开始
        inQuotes = true;
        i++;
        continue;
      } else if (char === ',') {
        // 字段分隔符
        currentRow.push(currentField);
        currentField = '';
        i++;
        continue;
      } else if (char === '\r' && nextChar === '\n') {
        // CRLF 行结束
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i += 2;
        continue;
      } else if (char === '\n') {
        // LF 行结束
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      } else {
        // 普通字符
        currentField += char;
        i++;
        continue;
      }
    }
  }

  // 处理最后一个字段和行（如果有未完成的行）
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

/**
 * 生成器：生成随机表格数据
 * 
 * 特点：
 * - 包含各种特殊字符（逗号、双引号、换行符）
 * - 包含空字符串
 * - 包含纯数字和纯字母
 * - 行列数随机
 */
const tableDataGenerator = fc.array(
  fc.array(
    fc.oneof(
      fc.string(),                           // 普通字符串
      fc.constant(''),                       // 空字符串
      fc.constant('hello,world'),            // 包含逗号
      fc.constant('say "hello"'),            // 包含双引号
      fc.constant('line1\nline2'),           // 包含换行符
      fc.constant('a,b\nc,d'),               // 包含逗号和换行符
      fc.constant('""'),                     // 双引号
      fc.constant('a""b'),                   // 包含转义双引号
      fc.integer().map(n => String(n)),      // 数字字符串
      fc.constant('   '),                    // 空白字符
      fc.constant('\r\n'),                   // CRLF
    ),
    { minLength: 1, maxLength: 10 }
  ),
  { minLength: 1, maxLength: 20 }
);

describe('导出格式正确性属性测试', () => {
  /**
   * Property 6: 导出格式正确性（round-trip）
   * 
   * 对于任何表格数据，导出为 CSV 后再解析，应该得到等价的数据
   */
  test('CSV round-trip 保持数据等价性', () => {
    fc.assert(
      fc.property(tableDataGenerator, (data) => {
        // 导出为 CSV
        const csv = toCSV(data);
        
        // 解析 CSV
        const parsed = parseCSV(csv);
        
        // 验证行数相同
        expect(parsed.length).toBe(data.length);
        
        // 验证每行的列数和内容相同
        for (let i = 0; i < data.length; i++) {
          expect(parsed[i].length).toBe(data[i].length);
          for (let j = 0; j < data[i].length; j++) {
            expect(parsed[i][j]).toBe(data[i][j]);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 边界情况测试：空表格
   */
  test('空表格的 round-trip', () => {
    const data: string[][] = [];
    const csv = toCSV(data);
    const parsed = parseCSV(csv);
    expect(parsed).toEqual([]);
  });

  /**
   * 边界情况测试：单个空字段
   */
  test('单个空字段的 round-trip', () => {
    const data = [['']];
    const csv = toCSV(data);
    const parsed = parseCSV(csv);
    expect(parsed).toEqual(data);
  });

  /**
   * 边界情况测试：包含所有特殊字符的字段
   */
  test('特殊字符字段的 round-trip', () => {
    const data = [
      ['hello,world', 'say "hello"', 'line1\nline2'],
      ['a,b\nc,d', '""', 'normal']
    ];
    const csv = toCSV(data);
    const parsed = parseCSV(csv);
    expect(parsed).toEqual(data);
  });
});
