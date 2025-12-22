import type { Table } from './detect';

/**
 * 转义 CSV 字段
 * 
 * 遵循 RFC 4180 标准：
 * - 字段包含引号时，引号转义为双引号，整个字段用引号包裹
 * - 字段包含逗号时，整个字段用引号包裹
 * - 字段包含换行符时，整个字段用引号包裹
 * 
 * @param text 原始文本
 * @returns 转义后的 CSV 字段
 */
export function escapeCSVField(text: string): string {
  // 检查是否需要引号包裹
  const needsQuotes = /[",\n\r]/.test(text);
  
  if (needsQuotes) {
    // 引号转义为双引号
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  
  return text;
}

/**
 * 转换为 CSV 格式
 * 
 * 遵循 RFC 4180 标准：
 * - 自动处理字段中的引号（双引号转义）
 * - 自动处理字段中的逗号（使用引号包裹）
 * - 自动处理字段中的换行符（使用引号包裹）
 * - 生成 UTF-8 编码的 CSV 字符串
 * 
 * @param table 表格结构
 * @returns CSV 字符串
 */
export function toCSV(table: Table): string {
  // 边界情况：空表格
  if (table.columns === 0 || table.rows.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  for (const row of table.rows) {
    // 按列索引排序单元格
    const sortedCells = [...row].sort((a, b) => a.col - b.col);
    
    // 填充缺失的列（某些行可能缺少某些列的数据）
    const fields: string[] = [];
    for (let col = 0; col < table.columns; col++) {
      const cell = sortedCells.find(c => c.col === col);
      fields.push(escapeCSVField(cell?.text || ''));
    }
    
    lines.push(fields.join(','));
  }
  
  return lines.join('\n');
}
