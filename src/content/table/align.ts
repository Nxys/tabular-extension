import type { Table } from './detect';

/**
 * 计算字符串显示宽度
 * 
 * 中文字符按 2 个字符计算，ASCII 按 1 个字符计算
 * 这是为了在等宽字体中正确对齐
 * 
 * @param text 文本字符串
 * @returns 显示宽度
 */
export function getDisplayWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    // Unicode > 0x7F 视为宽字符（包括中文）
    width += char.charCodeAt(0) > 0x7F ? 2 : 1;
  }
  return width;
}

/**
 * 对齐表格
 * 
 * 计算每列最大宽度，使用空格补齐
 * 处理中文字符（按 2 个字符宽度计算）
 * 
 * @param table 表格结构
 * @returns 对齐后的二维字符串数组
 */
export function alignTable(table: Table): string[][] {
  // 边界情况：空表格
  if (table.columns === 0 || table.rows.length === 0) {
    return [];
  }

  // 1. 计算每列的最大宽度
  const columnWidths: number[] = new Array(table.columns).fill(0);
  
  for (const row of table.rows) {
    for (const cell of row) {
      const width = getDisplayWidth(cell.text);
      if (width > columnWidths[cell.col]) {
        columnWidths[cell.col] = width;
      }
    }
  }

  // 2. 生成对齐后的文本
  const aligned: string[][] = [];
  
  for (const row of table.rows) {
    // 按列索引排序单元格
    const sortedCells = [...row].sort((a, b) => a.col - b.col);
    
    const alignedRow: string[] = [];
    for (let col = 0; col < table.columns; col++) {
      // 查找当前列的单元格
      const cell = sortedCells.find(c => c.col === col);
      const text = cell?.text || '';
      const width = getDisplayWidth(text);
      const padding = columnWidths[col] - width;
      
      // 右侧补齐空格，+2 为列间距
      alignedRow.push(text + ' '.repeat(Math.max(0, padding + 2)));
    }
    
    aligned.push(alignedRow);
  }

  return aligned;
}
