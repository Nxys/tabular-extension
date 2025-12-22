/**
 * 表格检测模块的属性测试
 * 
 * Feature: table-pro-features, Property 1: 表格列识别的正确性
 * 验证：需求 1.4, 1.5, 1.6, 1.8
 */

import fc from 'fast-check';
import { detectTable } from '../src/content/table/detect';
import { TextItem } from '../src/content/extractor/collect';

/**
 * 生成随机的 DOMRect
 * 
 * @param x X 坐标
 * @param y Y 坐标
 * @param width 宽度
 * @param height 高度
 * @returns DOMRect 对象
 */
function createDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({})
  } as DOMRect;
}

/**
 * 生成具有明显列对齐特征的表格数据
 * 
 * @param numColumns 列数量（2-5）
 * @param numRows 行数量（1-10）
 * @param columnSpacing 列间距（像素）
 * @param maxOffset 每列内的最大 X 偏移（像素）
 * @returns TextItem[][] 视觉行数组
 */
function generateAlignedTableData(
  numColumns: number,
  numRows: number,
  columnSpacing: number = 150,  // 增加列间距
  maxOffset: number = 10
): fc.Arbitrary<TextItem[][]> {
  return fc.tuple(
    // 生成列的基准 X 坐标
    fc.array(fc.integer({ min: 0, max: 800 }), { minLength: numColumns, maxLength: numColumns })
      .map(positions => positions.sort((a, b) => a - b)) // 确保列从左到右排列
      .map(positions => {
        // 确保列之间有足够的间距
        const adjusted: number[] = [];
        for (let i = 0; i < positions.length; i++) {
          if (i === 0) {
            adjusted.push(positions[i]);
          } else {
            adjusted.push(Math.max(adjusted[i - 1] + columnSpacing, positions[i]));
          }
        }
        return adjusted;
      }),
    // 生成每个单元格的文本内容
    fc.array(
      fc.array(fc.string({ minLength: 1, maxLength: 10 }), { minLength: numColumns, maxLength: numColumns }),  // 减小文本长度
      { minLength: numRows, maxLength: numRows }
    )
  ).map(([columnXPositions, rowsData]) => {
    // 构建 TextItem[][]
    const lines: TextItem[][] = [];
    
    for (let rowIndex = 0; rowIndex < rowsData.length; rowIndex++) {
      const row: TextItem[] = [];
      const rowData = rowsData[rowIndex];
      const baseY = rowIndex * 30; // 行间距 30px
      
      for (let colIndex = 0; colIndex < numColumns; colIndex++) {
        const baseX = columnXPositions[colIndex];
        // 在列内添加小的随机偏移（模拟真实场景）
        const offsetX = Math.random() * maxOffset - maxOffset / 2;
        const x = baseX + offsetX;
        const text = rowData[colIndex] || `cell-${rowIndex}-${colIndex}`;
        
        // 限制单元格宽度为固定值，避免过宽
        const width = Math.min(text.length * 8, 60);
        
        row.push({
          text,
          rect: createDOMRect(x, baseY, width, 20)
        });
      }
      
      lines.push(row);
    }
    
    return lines;
  });
}

describe('表格检测属性测试', () => {
  /**
   * Property 1: 表格列识别的正确性
   * 
   * 对于任何包含明显列对齐特征的视觉行数据，detectTable 函数应该：
   * 1. 正确识别列的数量
   * 2. 将每个文本项分配到正确的列
   * 3. 不修改输入数据（保持输入不变性）
   */
  test('Property 1: detectTable 正确识别列数量和单元格分配', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // 列数量
        fc.integer({ min: 1, max: 10 }), // 行数量
        (numColumns, numRows) => {
          // 生成表格数据
          const lines = fc.sample(generateAlignedTableData(numColumns, numRows), 1)[0];
          
          // 深度克隆输入，用于验证不变性
          const originalLines = JSON.parse(JSON.stringify(lines));
          
          // 执行表格检测
          const table = detectTable(lines);
          
          // 验证 1: 列数量正确
          expect(table.columns).toBe(numColumns);
          
          // 验证 2: 行数量正确
          expect(table.rows.length).toBe(numRows);
          
          // 验证 3: 每行的单元格数量正确
          for (const row of table.rows) {
            expect(row.length).toBe(numColumns);
          }
          
          // 验证 4: 单元格分配正确（每列的单元格应该有相同的 col 值）
          for (let colIndex = 0; colIndex < numColumns; colIndex++) {
            const colCells = table.rows.flatMap(row => row.filter(cell => cell.col === colIndex));
            expect(colCells.length).toBe(numRows);
          }
          
          // 验证 5: 输入不变性（输入数据未被修改）
          expect(JSON.stringify(lines)).toBe(JSON.stringify(originalLines));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.1: 列对齐偏移容差
   * 
   * 对于任何表格，即使列内的 X 坐标有小的偏移（< 15px），
   * 也应该被识别为同一列
   */
  test('Property 1.1: detectTable 正确处理列内的 X 坐标偏移', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // 列数量
        fc.integer({ min: 2, max: 10 }), // 行数量
        (numColumns, numRows) => {
          // 生成带有小偏移的表格数据（maxOffset = 10px，远小于 30px 阈值）
          const lines = fc.sample(generateAlignedTableData(numColumns, numRows, 150, 10), 1)[0];
          
          // 执行表格检测
          const table = detectTable(lines);
          
          // 验证：列数量应该正确（偏移不应该导致列分裂）
          expect(table.columns).toBe(numColumns);
          
          // 验证：每列应该包含所有行的单元格
          for (let colIndex = 0; colIndex < numColumns; colIndex++) {
            const colCells = table.rows.flatMap(row => row.filter(cell => cell.col === colIndex));
            expect(colCells.length).toBe(numRows);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: 输入不变性
   * 
   * 对于任何输入，detectTable 不应该修改输入数据
   */
  test('Property 1.2: detectTable 保持输入不变性', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (numColumns, numRows) => {
          const lines = fc.sample(generateAlignedTableData(numColumns, numRows), 1)[0];
          
          // 深度克隆
          const clone = JSON.parse(JSON.stringify(lines));
          
          // 执行检测
          detectTable(lines);
          
          // 验证输入未被修改
          expect(JSON.stringify(lines)).toBe(JSON.stringify(clone));
        }
      ),
      { numRuns: 100 }
    );
  });
});
