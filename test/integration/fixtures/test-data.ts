/**
 * 测试数据生成器
 * 为集成测试提供各种测试数据
 */

/**
 * 生成随机表格数据
 */
export function generateRandomTableData(rows: number, cols: number): string[][] {
  const data: string[][] = [];
  
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(`R${i}C${j}`);
    }
    data.push(row);
  }
  
  return data;
}

/**
 * 生成包含特殊字符的表格数据
 */
export function generateSpecialCharTableData(): string[][] {
  return [
    ['姓名', '描述', '备注'],
    ['张三', '包含逗号,的文本', '正常文本'],
    ['李四', '包含"引号"的文本', '特殊字符'],
    ['王五', '包含\n换行的文本', 'emoji: 😀'],
    ['赵六', 'HTML: <div>标签</div>', '&amp; 实体']
  ];
}

/**
 * 生成超过行数限制的表格数据
 */
export function generateOverLimitTableData(limit: number): string[][] {
  const data: string[][] = [['列1', '列2', '列3']];
  
  for (let i = 0; i < limit + 5; i++) {
    data.push([`数据${i}-1`, `数据${i}-2`, `数据${i}-3`]);
  }
  
  return data;
}

/**
 * 生成空表格数据
 */
export function generateEmptyTableData(): string[][] {
  return [];
}

/**
 * 生成单行表格数据
 */
export function generateSingleRowTableData(): string[][] {
  return [['单元格1', '单元格2', '单元格3']];
}

/**
 * 生成单列表格数据
 */
export function generateSingleColumnTableData(): string[][] {
  return [['行1'], ['行2'], ['行3'], ['行4'], ['行5']];
}

/**
 * 生成大型表格数据
 */
export function generateLargeTableData(rows: number, cols: number): string[][] {
  const data: string[][] = [];
  
  // 添加表头
  const header: string[] = [];
  for (let j = 0; j < cols; j++) {
    header.push(`列${j + 1}`);
  }
  data.push(header);
  
  // 添加数据行
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) {
      row.push(`数据${i + 1}-${j + 1}`);
    }
    data.push(row);
  }
  
  return data;
}
