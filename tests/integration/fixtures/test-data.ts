/**
 * 测试数据生成器
 * 为集成测试提供各种测试数据
 */

/**
 * 生成随机表格数据
 * @param rows 行数
 * @param cols 列数
 * @returns 二维数组表示的表格数据
 */
export function generateRandomTableData(
  rows: number,
  cols: number
): string[][] {
  const data: string[][] = [];
  
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      // 生成随机单元格内容：数字、文本或混合
      const type = Math.floor(Math.random() * 3);
      let cellContent: string;
      
      switch (type) {
        case 0: // 纯数字
          cellContent = Math.floor(Math.random() * 10000).toString();
          break;
        case 1: // 纯文本
          cellContent = `单元格${i + 1}-${j + 1}`;
          break;
        case 2: // 混合内容
          cellContent = `数据${Math.floor(Math.random() * 100)}`;
          break;
        default:
          cellContent = `${i}-${j}`;
      }
      
      row.push(cellContent);
    }
    data.push(row);
  }
  
  return data;
}

/**
 * 生成包含特殊字符的表格数据
 * @returns 包含各种特殊字符的表格数据
 */
export function generateSpecialCharTableData(): string[][] {
  return [
    // 第一行：HTML 实体
    ['&lt;标签&gt;', '&amp;符号', '&quot;引号&quot;', '&apos;单引号&apos;'],
    
    // 第二行：Unicode 字符
    ['\u4E2D\u6587', '\u65E5\u672C\u8A9E', '\uD55C\uAD6D\uC5B4', '\u00A9\u00AE\u2122'],
    
    // 第三行：Emoji
    ['😀🎉', '🚀❤️', '👍🌟', '💻📱'],
    
    // 第四行：CSV 特殊字符（逗号、引号、换行）
    ['包含,逗号', '包含"引号"', '包含\n换行', '正常文本'],
    
    // 第五行：混合特殊字符
    ['混合&lt;标签&gt;😀', 'Unicode\u4E2D\u6587🚀', '逗号,引号"混合', '换行\n符号&amp;']
  ];
}

/**
 * 生成超过行数限制的表格数据
 * @param limit 行数限制（默认为 5）
 * @returns 超过限制的表格数据（limit + 3 行）
 */
export function generateOverLimitTableData(limit: number = 5): string[][] {
  const rows = limit + 3; // 超过限制 3 行
  const cols = 4; // 固定 4 列
  const data: string[][] = [];
  
  // 添加表头行
  data.push(['列A', '列B', '列C', '列D']);
  
  // 添加数据行
  for (let i = 1; i < rows; i++) {
    data.push([
      `A${i}`,
      `B${i}`,
      `C${i}`,
      `D${i}`
    ]);
  }
  
  return data;
}
