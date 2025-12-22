/**
 * 列对齐模块的属性测试
 * 
 * Feature: table-pro-features, Property 2: 列对齐的一致性
 * 验证：需求 2.4, 2.8
 */

import fc from 'fast-check';
import { alignTable, getDisplayWidth } from '../src/content/table/align';
import type { Table } from '../src/content/table/detect';

/**
 * 生成随机表格（包含中英文）
 * 
 * @param numColumns 列数量
 * @param numRows 行数量
 * @returns Table 对象
 */
function generateTable(numColumns: number, numRows: number): fc.Arbitrary<Table> {
  return fc.record({
    columns: fc.constant(numColumns),
    rows: fc.array(
      fc.array(
        fc.record({
          text: fc.oneof(
            fc.string({ minLength: 1, maxLength: 10 }), // ASCII 文本
            fc.stringOf(fc.constantFrom('中', '文', '字', '符', '测', '试')), // 中文文本
            fc.tuple(
              fc.string({ minLength: 1, maxLength: 5 }),
              fc.stringOf(fc.constantFrom('中', '文', '字'))
            ).map(([ascii, chinese]) => ascii + chinese) // 混合文本
          ),
          col: fc.integer({ min: 0, max: numColumns - 1 })
        }),
        { minLength: numColumns, maxLength: numColumns }
      ).map(cells => {
        // 确保每行包含所有列，且列索引唯一
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
 * 生成包含纯 ASCII 文本的表格
 */
function generateASCIITable(numColumns: number, numRows: number): fc.Arbitrary<Table> {
  return fc.record({
    columns: fc.constant(numColumns),
    rows: fc.array(
      fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 10 }),
          col: fc.integer({ min: 0, max: numColumns - 1 })
        }),
        { minLength: numColumns, maxLength: numColumns }
      ).map(cells => cells.map((cell, colIndex) => ({ ...cell, col: colIndex }))),
      { minLength: numRows, maxLength: numRows }
    )
  });
}

/**
 * 生成包含纯中文的表格
 */
function generateChineseTable(numColumns: number, numRows: number): fc.Arbitrary<Table> {
  return fc.record({
    columns: fc.constant(numColumns),
    rows: fc.array(
      fc.array(
        fc.record({
          text: fc.stringOf(fc.constantFrom('中', '文', '字', '符', '测', '试', '表', '格'), { minLength: 1, maxLength: 5 }),
          col: fc.integer({ min: 0, max: numColumns - 1 })
        }),
        { minLength: numColumns, maxLength: numColumns }
      ).map(cells => cells.map((cell, colIndex) => ({ ...cell, col: colIndex }))),
      { minLength: numRows, maxLength: numRows }
    )
  });
}

describe('列对齐属性测试', () => {
  /**
   * Property 2: 列对齐的一致性
   * 
   * 对于任何表格，alignTable 函数应该生成每列宽度一致的输出：
   * 1. 同一列的所有单元格具有相同的显示宽度（通过空格补齐）
   * 2. 中文字符按 2 个字符宽度计算
   * 3. ASCII 字符按 1 个字符宽度计算
   * 4. 列之间有适当的间距
   */
  test('Property 2: alignTable 生成每列宽度一致的输出', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // 列数量
        fc.integer({ min: 2, max: 10 }), // 行数量
        (numColumns, numRows) => {
          // 生成包含中英文的随机表格
          const table = fc.sample(generateTable(numColumns, numRows), 1)[0];
          
          // 执行列对齐
          const aligned = alignTable(table);
          
          // 验证 1: 输出行数正确
          expect(aligned.length).toBe(numRows);
          
          // 验证 2: 每行的列数正确
          for (const row of aligned) {
            expect(row.length).toBe(numColumns);
          }
          
          // 验证 3: 每列的所有单元格宽度一致
          for (let colIndex = 0; colIndex < numColumns; colIndex++) {
            const columnWidths = aligned.map(row => getDisplayWidth(row[colIndex]));
            
            // 所有单元格的宽度应该相同（包括空格补齐）
            const firstWidth = columnWidths[0];
            for (const width of columnWidths) {
              expect(width).toBe(firstWidth);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.1: 中文字符宽度计算正确
   * 
   * 对于包含中文字符的表格，中文字符应该按 2 个字符宽度计算
   */
  test('Property 2.1: alignTable 正确处理中文字符宽度', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 2, max: 10 }),
        (numColumns, numRows) => {
          // 生成包含纯中文的表格
          const table = fc.sample(generateChineseTable(numColumns, numRows), 1)[0];
          
          // 执行列对齐
          const aligned = alignTable(table);
          
          // 验证：每列宽度一致
          for (let colIndex = 0; colIndex < numColumns; colIndex++) {
            const columnWidths = aligned.map(row => getDisplayWidth(row[colIndex]));
            const firstWidth = columnWidths[0];
            
            for (const width of columnWidths) {
              expect(width).toBe(firstWidth);
            }
          }
          
          // 验证：中文字符的显示宽度是 ASCII 的 2 倍
          // 例如："中" 的宽度应该是 2，"a" 的宽度应该是 1
          expect(getDisplayWidth('中')).toBe(2);
          expect(getDisplayWidth('a')).toBe(1);
          expect(getDisplayWidth('中文')).toBe(4);
          expect(getDisplayWidth('abc')).toBe(3);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.2: ASCII 文本对齐正确
   * 
   * 对于包含纯 ASCII 文本的表格，对齐应该正确
   */
  test('Property 2.2: alignTable 正确处理纯 ASCII 文本', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 2, max: 10 }),
        (numColumns, numRows) => {
          // 生成包含纯 ASCII 的表格
          const table = fc.sample(generateASCIITable(numColumns, numRows), 1)[0];
          
          // 执行列对齐
          const aligned = alignTable(table);
          
          // 验证：每列宽度一致
          for (let colIndex = 0; colIndex < numColumns; colIndex++) {
            const columnWidths = aligned.map(row => getDisplayWidth(row[colIndex]));
            const firstWidth = columnWidths[0];
            
            for (const width of columnWidths) {
              expect(width).toBe(firstWidth);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: 列间距存在
   * 
   * 对于任何表格，对齐后的每列应该有适当的间距（至少 2 个空格）
   */
  test('Property 2.3: alignTable 确保列之间有适当间距', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 2, max: 10 }),
        (numColumns, numRows) => {
          const table = fc.sample(generateTable(numColumns, numRows), 1)[0];
          
          // 执行列对齐
          const aligned = alignTable(table);
          
          // 验证：每个单元格末尾至少有 2 个空格（列间距）
          for (const row of aligned) {
            for (let colIndex = 0; colIndex < numColumns - 1; colIndex++) {
              const cell = row[colIndex];
              // 检查单元格末尾是否有空格
              expect(cell.endsWith('  ')).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.4: 空表格处理
   * 
   * 对于空表格，alignTable 应该返回空数组
   */
  test('Property 2.4: alignTable 正确处理空表格', () => {
    const emptyTable1: Table = { columns: 0, rows: [] };
    const emptyTable2: Table = { columns: 3, rows: [] };
    
    expect(alignTable(emptyTable1)).toEqual([]);
    expect(alignTable(emptyTable2)).toEqual([]);
  });
});
