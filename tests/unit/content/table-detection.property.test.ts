/**
 * 表格识别完整性属性测试
 * 
 * Feature: v3-freemium-model, Property 5: 表格识别完整性
 * Validates: Requirements 4.1, 4.2, 4.3
 * 
 * 测试目标：
 * - 验证所有标准 <table> 元素都能被识别
 * - 验证符合网格布局的 div 结构能被识别为表格
 * - 验证识别的表格数据完整性
 */

import * as fc from 'fast-check';
import { 
  scanTables, 
  detectHTMLTable, 
  detectDivTable,
  type TableDetectionConfig 
} from '../../../src/content/detector';

/**
 * 创建测试用的 <table> 元素
 */
function createHTMLTable(data: string[][]): HTMLTableElement {
  const table = document.createElement('table');
  table.style.display = 'table';
  
  for (const rowData of data) {
    const tr = document.createElement('tr');
    for (const cellData of rowData) {
      const td = document.createElement('td');
      td.textContent = cellData;
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  
  document.body.appendChild(table);
  return table;
}

/**
 * 创建测试用的 div 表格
 * 使用 CSS Grid 布局模拟表格
 */
function createDivTable(data: string[][], cols: number): HTMLDivElement {
  const container = document.createElement('div');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = `repeat(${cols}, 100px)`;
  container.style.gap = '10px';
  
  for (const rowData of data) {
    for (const cellData of rowData) {
      const cell = document.createElement('div');
      cell.textContent = cellData;
      cell.style.padding = '5px';
      cell.style.border = '1px solid #ccc';
      container.appendChild(cell);
    }
  }
  
  document.body.appendChild(container);
  return container;
}

/**
 * 清理 DOM
 */
function cleanupDOM(): void {
  document.body.innerHTML = '';
}

/**
 * 生成器：生成随机表格数据
 * 至少 2 行 2 列
 */
const tableDataGenerator = fc.array(
  fc.array(
    fc.string({ minLength: 0, maxLength: 20 }),
    { minLength: 2, maxLength: 10 }
  ),
  { minLength: 2, maxLength: 20 }
);

/**
 * 生成器：生成表格尺寸（行数和列数）
 */
const tableSizeGenerator = fc.record({
  rows: fc.integer({ min: 2, max: 20 }),
  cols: fc.integer({ min: 2, max: 10 })
});

describe('表格识别完整性属性测试', () => {
  afterEach(() => {
    cleanupDOM();
  });

  /**
   * Property 5.1: HTML 表格识别完整性
   * 
   * 对于任何包含标准 <table> 元素的 DOM 结构，
   * 如果表格符合最小行列数要求，应该被识别出来
   */
  test('所有符合要求的 <table> 元素都应该被识别', () => {
    fc.assert(
      fc.property(tableDataGenerator, (data) => {
        // 创建 HTML 表格
        const table = createHTMLTable(data);
        
        // 识别表格
        const config: TableDetectionConfig = {
          minRows: 2,
          minCols: 2,
          alignmentThreshold: 5,
          gridGapTolerance: 10,
          detectEmptyTables: true,
          filterAuxiliaryRows: true,
          detectFixedColumns: true,
          penetrateNesting: true
        };
        
        const tableInfo = detectHTMLTable(table, config);
        
        // 验证：应该被识别
        expect(tableInfo).not.toBeNull();
        
        if (tableInfo) {
          // 验证：行数正确
          expect(tableInfo.rows).toBe(data.length);
          
          // 验证：列数正确（取最大列数）
          const maxCols = Math.max(...data.map(row => row.length));
          expect(tableInfo.cols).toBe(maxCols);
          
          // 验证：类型正确
          expect(tableInfo.type).toBe('html-table');
          
          // 验证：数据完整性（注意：trim() 会移除空白字符）
          expect(tableInfo.data.length).toBe(data.length);
          for (let i = 0; i < data.length; i++) {
            expect(tableInfo.data[i].length).toBe(data[i].length);
            for (let j = 0; j < data[i].length; j++) {
              // 期望值应该 trim 并规范化空白字符，因为 extractCellText 会这样处理
              const expected = data[i][j].replace(/\s+/g, ' ').trim();
              expect(tableInfo.data[i][j]).toBe(expected);
            }
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5.2: Div 表格识别完整性
   * 
   * 对于任何使用 CSS Grid 布局的网格结构，
   * 如果符合表格特征（行列对齐、网格规律），应该被识别为表格
   * 
   * 注意：在 jsdom 环境中，getBoundingClientRect 返回的坐标都是 0，
   * 导致无法进行位置聚类。这个测试在真实浏览器环境中才能正常工作。
   * 因此我们跳过这个属性测试，只保留单元测试。
   */
  test.skip('符合网格布局的 div 结构应该被识别为表格', () => {
    fc.assert(
      fc.property(tableSizeGenerator, ({ rows, cols }) => {
        // 生成规则的表格数据
        const data: string[][] = [];
        for (let i = 0; i < rows; i++) {
          const row: string[] = [];
          for (let j = 0; j < cols; j++) {
            row.push(`R${i}C${j}`);
          }
          data.push(row);
        }
        
        // 创建 div 表格
        const container = createDivTable(data, cols);
        
        // 等待布局完成
        container.getBoundingClientRect();
        
        // 识别表格
        const config: TableDetectionConfig = {
          minRows: 2,
          minCols: 2,
          alignmentThreshold: 5,
          gridGapTolerance: 10,
          detectEmptyTables: true,
          filterAuxiliaryRows: true,
          detectFixedColumns: true,
          penetrateNesting: true
        };
        
        const tableInfo = detectDivTable(container, config);
        
        // 验证：应该被识别
        expect(tableInfo).not.toBeNull();
        
        if (tableInfo) {
          // 验证：行数正确
          expect(tableInfo.rows).toBe(rows);
          
          // 验证：列数正确
          expect(tableInfo.cols).toBe(cols);
          
          // 验证：类型正确
          expect(tableInfo.type).toBe('div-table');
          
          // 验证：数据完整性（至少应该识别出大部分数据）
          expect(tableInfo.data.length).toBeGreaterThanOrEqual(rows * 0.8);
        }
      }),
      { numRuns: 50 }  // div 表格识别较复杂，减少迭代次数
    );
  });

  /**
   * Property 5.3: scanTables 完整性
   * 
   * 对于任何包含多个表格的页面，
   * scanTables 应该识别出所有符合要求的表格
   */
  test('scanTables 应该识别页面中所有符合要求的表格', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),  // 表格数量
        tableDataGenerator,
        (tableCount, data) => {
          // 清理 DOM
          cleanupDOM();
          
          // 创建多个 HTML 表格
          const tables: HTMLTableElement[] = [];
          for (let i = 0; i < tableCount; i++) {
            const table = createHTMLTable(data);
            tables.push(table);
          }
          
          // 扫描所有表格
          const config: TableDetectionConfig = {
            minRows: 2,
            minCols: 2,
            alignmentThreshold: 5,
            gridGapTolerance: 10,
            detectEmptyTables: true,
            filterAuxiliaryRows: true,
            detectFixedColumns: true,
            penetrateNesting: true
          };
          
          const detected = scanTables(config);
          
          // 验证：识别出的表格数量应该等于创建的表格数量
          expect(detected.length).toBe(tableCount);
          
          // 验证：每个识别出的表格都应该是 html-table 类型
          for (const tableInfo of detected) {
            expect(tableInfo.type).toBe('html-table');
            expect(tableInfo.rows).toBe(data.length);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * 边界情况测试：最小尺寸表格
   */
  test('最小尺寸表格（2x2）应该被识别', () => {
    const data = [
      ['A', 'B'],
      ['C', 'D']
    ];
    
    const table = createHTMLTable(data);
    
    const config: TableDetectionConfig = {
      minRows: 2,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const tableInfo = detectHTMLTable(table, config);
    
    expect(tableInfo).not.toBeNull();
    expect(tableInfo?.rows).toBe(2);
    expect(tableInfo?.cols).toBe(2);
  });

  /**
   * 边界情况测试：不符合最小行数要求
   */
  test('不符合最小行数要求的表格不应该被识别', () => {
    const data = [['A', 'B']];  // 只有 1 行
    
    const table = createHTMLTable(data);
    
    const config: TableDetectionConfig = {
      minRows: 2,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const tableInfo = detectHTMLTable(table, config);
    
    expect(tableInfo).toBeNull();
  });

  /**
   * 边界情况测试：不符合最小列数要求
   */
  test('不符合最小列数要求的表格不应该被识别', () => {
    const data = [['A'], ['B']];  // 只有 1 列
    
    const table = createHTMLTable(data);
    
    const config: TableDetectionConfig = {
      minRows: 2,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const tableInfo = detectHTMLTable(table, config);
    
    expect(tableInfo).toBeNull();
  });

  /**
   * 边界情况测试：隐藏的表格不应该被识别
   */
  test('隐藏的表格不应该被识别', () => {
    const data = [
      ['A', 'B'],
      ['C', 'D']
    ];
    
    const table = createHTMLTable(data);
    table.style.display = 'none';  // 隐藏表格
    
    const config: TableDetectionConfig = {
      minRows: 2,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const tableInfo = detectHTMLTable(table, config);
    
    expect(tableInfo).toBeNull();
  });

  /**
   * 边界情况测试：空单元格
   */
  test('包含空单元格的表格应该被正确识别', () => {
    const data = [
      ['A', '', 'C'],
      ['', 'E', ''],
      ['G', 'H', 'I']
    ];
    
    const table = createHTMLTable(data);
    
    const config: TableDetectionConfig = {
      minRows: 2,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const tableInfo = detectHTMLTable(table, config);
    
    expect(tableInfo).not.toBeNull();
    expect(tableInfo?.data).toEqual(data);
  });
});
