/**
 * 测试数据生成器
 * 提供随机数据和边界值生成功能
 */

/**
 * 生成随机文本
 * @param length 文本长度，默认 100
 * @returns 随机文本
 */
export function generateRandomText(length: number = 100): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 生成随机表格
 * @param rows 行数，默认 3
 * @param cols 列数，默认 3
 * @returns 随机表格数据
 */
export function generateRandomTable(
  rows: number = 3,
  cols: number = 3
): string[][] {
  const table: string[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(`Cell_${i}_${j}_${Math.random().toString(36).substring(7)}`);
    }
    table.push(row);
  }
  return table;
}

/**
 * 生成边界值文本
 * @returns 包含各种边界情况的文本对象
 */
export function generateBoundaryText(): {
  empty: string;
  single: string;
  long: string;
  special: string;
} {
  return {
    empty: '',
    single: 'A',
    long: 'A'.repeat(10000),
    special: '特殊字符: <>&"\'`\n\t\r',
  };
}

/**
 * 生成边界值表格
 * @returns 包含各种边界情况的表格对象
 */
export function generateBoundaryTable(): {
  empty: string[][];
  single: string[][];
  large: string[][];
} {
  return {
    empty: [],
    single: [['A']],
    large: Array(100).fill(null).map((_, i) =>
      Array(100).fill(null).map((_, j) => `Cell_${i}_${j}`)
    ),
  };
}
