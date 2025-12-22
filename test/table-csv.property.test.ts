/**
 * CSV 导出模块的属性测试
 * 
 * Feature: table-pro-features, Property 3: CSV 转义的正确性
 * 验证：需求 3.3, 3.4, 3.5
 * 
 * Feature: table-pro-features, Property 5: CSV 往返一致性
 * 验证：需求 3.9
 */

import fc from 'fast-check';
import { toCSV, escapeCSVField } from '../src/content/table/csv';
import type { Table } from '../src/content/table/detect';

/**
 * 生成包含特殊字符的随机表格
 * 
 * 特殊字符包括：引号、逗号、换行符
 * 
 * @param numColumns 列数量
 * @param numRows 行数量
 * @returns Table 对象
 */
function generateTableWithSpecialChars(
  numColumns: number,
  numRows: number
): fc.Arbitrary<Table> {
  return fc.record({
    columns: fc.constant(numColumns),
    rows: fc.array(
      fc.array(
        fc.record({
          text: fc.oneof(
            // 包含引号的文本
            fc.string({ minLength: 1 }).map(s => `${s}"quote"${s}`),
            // 包含逗号的文本
            fc.string({ minLength: 1 }).map(s => `${s},comma,${s}`),
            // 包含换行符的文本
            fc.string({ minLength: 1 }).map(s => `${s}\nline\nbreak\n${s}`),
            // 包含多种特殊字符的文本
            fc.string({ minLength: 1 }).map(s => `${s}"quote",comma\nbreak${s}`),
            // 普通文本（非空）
            fc.string({ minLength: 1, maxLength: 20 })
          ),
          col: fc.integer({ min: 0, max: numColumns - 1 })
        }),
        { minLength: numColumns, maxLength: numColumns }
      ).map((cells) => {
        // 确保每个单元格有正确的列索引
        return cells.map((cell, colIndex) => ({
          ...cell,
          col: colIndex
        }));
      }),
      { minLength: numRows, maxLength: numRows }
    )
  });
}

/**
 * 生成简单的随机表格（不包含特殊字符）
 * 
 * 用于往返测试
 * 
 * @param numColumns 列数量
 * @param numRows 行数量
 * @returns Table 对象
 */
function generateSimpleTable(
  numColumns: number,
  numRows: number
): fc.Arbitrary<Table> {
  return fc.record({
    columns: fc.constant(numColumns),
    rows: fc.array(
      fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 20 }).filter(s => !/[",\n\r]/.test(s)),
          col: fc.integer({ min: 0, max: numColumns - 1 })
        }),
        { minLength: numColumns, maxLength: numColumns }
      ).map((cells) => {
        // 确保每个单元格有正确的列索引
        return cells.map((cell, colIndex) => ({
          ...cell,
          col: colIndex
        }));
      }),
      { minLength: numRows, maxLength: numRows }
    )
  });
}

/**
 * 简单的 CSV 解析器
 * 
 * 用于往返测试
 * 注意：这是一个改进的实现，能够正确处理引号内的换行符
 * 
 * @param csv CSV 字符串
 * @returns 二维字符串数组
 */
function parseCSV(csv: string): string[][] {
  if (csv === '') {
    return [];
  }

  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csv.length) {
    const char = csv[i];

    if (char === '"') {
      if (inQuotes && i + 1 < csv.length && csv[i + 1] === '"') {
        // 双引号转义
        currentField += '"';
        i += 2;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      currentRow.push(currentField);
      currentField = '';
      i++;
    } else if ((char === '\n' || (char === '\r' && i + 1 < csv.length && csv[i + 1] === '\n')) && !inQuotes) {
      // 行分隔符（不在引号内）
      currentRow.push(currentField);
      result.push(currentRow);
      currentRow = [];
      currentField = '';
      
      // 处理 \r\n
      if (char === '\r' && i + 1 < csv.length && csv[i + 1] === '\n') {
        i += 2;
      } else {
        i++;
      }
    } else {
      // 普通字符（包括引号内的换行符）
      currentField += char;
      i++;
    }
  }

  // 添加最后一个字段和行
  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField);
    result.push(currentRow);
  }

  return result;
}

describe('CSV 导出属性测试', () => {
  /**
   * Property 3: CSV 转义的正确性
   * 
   * 对于任何表格，toCSV 函数应该正确处理所有特殊字符：
   * 1. 字段包含引号时，引号被转义为双引号，整个字段用引号包裹
   * 2. 字段包含逗号时，整个字段用引号包裹
   * 3. 字段包含换行符时，整个字段用引号包裹
   * 4. 生成的 CSV 可以被标准 CSV 解析器正确解析
   */
  test('Property 3: toCSV 正确转义特殊字符', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // 列数量
        fc.integer({ min: 1, max: 10 }), // 行数量
        (numColumns, numRows) => {
          // 生成包含特殊字符的表格
          const table = fc.sample(generateTableWithSpecialChars(numColumns, numRows), 1)[0];
          
          // 转换为 CSV
          const csv = toCSV(table);
          
          // 验证 1: CSV 不为空（除非表格为空）
          if (table.rows.length > 0) {
            expect(csv.length).toBeGreaterThan(0);
          }
          
          // 验证 2: 可以被 CSV 解析器解析
          let parsed: string[][];
          try {
            parsed = parseCSV(csv);
          } catch (error) {
            throw new Error(`CSV 解析失败: ${error}`);
          }
          
          // 验证 3: 解析后的行数正确
          expect(parsed.length).toBe(table.rows.length);
          
          // 验证 4: 解析后的列数正确
          for (const row of parsed) {
            expect(row.length).toBe(table.columns);
          }
          
          // 验证 5: 解析后的内容正确（特殊字符被正确还原）
          for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
            const originalRow = table.rows[rowIndex];
            const parsedRow = parsed[rowIndex];
            
            // 按列索引排序原始单元格
            const sortedCells = [...originalRow].sort((a, b) => a.col - b.col);
            
            for (let colIndex = 0; colIndex < table.columns; colIndex++) {
              const cell = sortedCells.find(c => c.col === colIndex);
              const expectedText = cell?.text || '';
              const actualText = parsedRow[colIndex];
              
              expect(actualText).toBe(expectedText);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.1: 引号转义的正确性
   * 
   * 对于任何包含引号的文本，escapeCSVField 应该：
   * 1. 将引号转义为双引号
   * 2. 整个字段用引号包裹
   */
  test('Property 3.1: escapeCSVField 正确转义引号', () => {
    fc.assert(
      fc.property(
        fc.string().map(s => `${s}"quote"${s}`),
        (text) => {
          const escaped = escapeCSVField(text);
          
          // 验证 1: 结果以引号开始和结束
          expect(escaped.startsWith('"')).toBe(true);
          expect(escaped.endsWith('"')).toBe(true);
          
          // 验证 2: 内部的引号被转义为双引号
          const inner = escaped.slice(1, -1); // 去掉外层引号
          const originalQuoteCount = (text.match(/"/g) || []).length;
          const escapedQuoteCount = (inner.match(/""/g) || []).length;
          expect(escapedQuoteCount).toBe(originalQuoteCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.2: 逗号处理的正确性
   * 
   * 对于任何包含逗号的文本，escapeCSVField 应该用引号包裹
   */
  test('Property 3.2: escapeCSVField 正确处理逗号', () => {
    fc.assert(
      fc.property(
        fc.string().map(s => `${s},comma,${s}`),
        (text) => {
          const escaped = escapeCSVField(text);
          
          // 验证：结果以引号开始和结束
          expect(escaped.startsWith('"')).toBe(true);
          expect(escaped.endsWith('"')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: 换行符处理的正确性
   * 
   * 对于任何包含换行符的文本，escapeCSVField 应该用引号包裹
   */
  test('Property 3.3: escapeCSVField 正确处理换行符', () => {
    fc.assert(
      fc.property(
        fc.string().map(s => `${s}\nline\nbreak\n${s}`),
        (text) => {
          const escaped = escapeCSVField(text);
          
          // 验证：结果以引号开始和结束
          expect(escaped.startsWith('"')).toBe(true);
          expect(escaped.endsWith('"')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: CSV 往返一致性
   * 
   * 对于任何简单表格（不包含特殊字符），将其转换为 CSV 后再解析回来，
   * 应该得到等价的表格结构
   */
  test('Property 5: CSV 往返保持一致性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // 列数量
        fc.integer({ min: 1, max: 10 }), // 行数量
        (numColumns, numRows) => {
          // 生成简单表格（不包含特殊字符）
          const table = fc.sample(generateSimpleTable(numColumns, numRows), 1)[0];
          
          // 转换为 CSV
          const csv = toCSV(table);
          
          // 解析回来
          const parsed = parseCSV(csv);
          
          // 验证 1: 行数一致
          expect(parsed.length).toBe(table.rows.length);
          
          // 验证 2: 列数一致
          for (const row of parsed) {
            expect(row.length).toBe(table.columns);
          }
          
          // 验证 3: 内容一致
          for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
            const originalRow = table.rows[rowIndex];
            const parsedRow = parsed[rowIndex];
            
            // 按列索引排序原始单元格
            const sortedCells = [...originalRow].sort((a, b) => a.col - b.col);
            
            for (let colIndex = 0; colIndex < table.columns; colIndex++) {
              const cell = sortedCells.find(c => c.col === colIndex);
              const expectedText = cell?.text || '';
              const actualText = parsedRow[colIndex];
              
              expect(actualText).toBe(expectedText);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
