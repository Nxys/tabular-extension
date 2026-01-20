/**
 * 空表格检测完整性属性测试
 * 
 * Feature: table-detection-enhancement, Property 1: 空表格检测完整性
 * Validates: Requirements 1.1, 1.4
 * 
 * 测试目标：
 * - 验证只包含表头的 HTML 表格能被识别
 * - 验证空表格返回至少包含表头行的数据
 * - 验证空表格的 isEmpty 标志正确设置
 */

import * as fc from 'fast-check';
import {
  detectHTMLTable,
  type TableDetectionConfig
} from '../../../src/content/detector';

/**
 * 生成器：生成表头数据（列名数组）
 */
const headerGenerator = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }),
  { minLength: 2, maxLength: 10 }
);

/**
 * 生成器：生成空表格配置（是否包含占位行、测量行等）
 */
const emptyTableConfigGenerator = fc.record({
  hasPlaceholderRow: fc.boolean(),
  hasMeasureRow: fc.boolean(),
  framework: fc.constantFrom('ant-design', 'element-ui', 'element-plus', 'unknown')
});

/**
 * 创建只有表头的 HTML 表格
 */
function createEmptyTable(
  headers: string[],
  config: {
    hasPlaceholderRow: boolean;
    hasMeasureRow: boolean;
    framework: string;
  }
): HTMLTableElement {
  const table = document.createElement('table');
  table.style.display = 'table';
  
  // 添加框架容器
  const wrapper = document.createElement('div');
  if (config.framework === 'ant-design') {
    wrapper.className = 'ant-table-wrapper';
  } else if (config.framework === 'element-ui') {
    wrapper.className = 'el-table';
  } else if (config.framework === 'element-plus') {
    wrapper.className = 'el-table__inner-wrapper';
  }
  
  // 创建表头
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const header of headers) {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // 创建表体
  const tbody = document.createElement('tbody');
  
  // 可选：添加测量行
  if (config.hasMeasureRow) {
    const measureRow = document.createElement('tr');
    measureRow.setAttribute('aria-hidden', 'true');
    
    if (config.framework === 'ant-design') {
      measureRow.className = 'ant-table-measure-row';
    }
    
    measureRow.style.height = '0px';
    
    for (let i = 0; i < headers.length; i++) {
      const td = document.createElement('td');
      td.style.padding = '0';
      td.style.border = '0';
      td.style.height = '0';
      measureRow.appendChild(td);
    }
    
    tbody.appendChild(measureRow);
  }
  
  // 可选：添加占位行
  if (config.hasPlaceholderRow) {
    const placeholderRow = document.createElement('tr');
    
    if (config.framework === 'ant-design') {
      placeholderRow.className = 'ant-table-placeholder';
    } else if (config.framework === 'element-ui') {
      placeholderRow.className = 'el-table__empty-block';
    } else if (config.framework === 'element-plus') {
      placeholderRow.className = 'el-table__empty-text';
    }
    
    const td = document.createElement('td');
    td.setAttribute('colspan', headers.length.toString());
    td.textContent = '暂无数据';
    placeholderRow.appendChild(td);
    
    tbody.appendChild(placeholderRow);
  }
  
  table.appendChild(tbody);
  
  // 添加到 DOM
  wrapper.appendChild(table);
  document.body.appendChild(wrapper);
  
  return table;
}

/**
 * 清理 DOM
 */
function cleanupDOM(): void {
  document.body.innerHTML = '';
}

describe('空表格检测完整性属性测试', () => {
  afterEach(() => {
    cleanupDOM();
  });

  /**
   * Property 1: 空表格检测完整性
   * 
   * 对于任何只包含表头的 HTML 表格，检测器应该识别该表格
   * 并返回至少包含表头行的表格数据
   */
  test('属性 1：空表格检测完整性 - 只有表头的表格应该被识别', () => {
    fc.assert(
      fc.property(headerGenerator, emptyTableConfigGenerator, (headers, config) => {
        // 创建空表格
        const table = createEmptyTable(headers, config);
        
        // 检测配置
        const detectionConfig: TableDetectionConfig = {
          minRows: 1,
          minCols: 2,
          alignmentThreshold: 5,
          gridGapTolerance: 10,
          detectEmptyTables: true,
          filterAuxiliaryRows: true,
          detectFixedColumns: true,
          penetrateNesting: true
        };
        
        // 检测表格
        const result = detectHTMLTable(table, detectionConfig);
        
        // 验证：应该被识别
        expect(result).not.toBeNull();
        
        if (result) {
          // 验证：至少有一行数据（表头）
          expect(result.data.length).toBeGreaterThanOrEqual(1);
          
          // 验证：表头数据正确
          expect(result.data[0].length).toBe(headers.length);
          for (let i = 0; i < headers.length; i++) {
            // extractCellText 会 trim 空白字符，所以期望值也需要 trim
            const expectedText = headers[i].replace(/\s+/g, ' ').trim();
            expect(result.data[0][i]).toBe(expectedText);
          }
          
          // 验证：isEmpty 标志正确
          if (config.hasPlaceholderRow || config.hasMeasureRow) {
            // 如果有占位行或测量行，应该被标记为空表格
            expect(result.isEmpty).toBe(true);
          }
          
          // 验证：行数正确（只有表头，辅助行被过滤）
          expect(result.rows).toBe(1);
          
          // 验证：列数正确
          expect(result.cols).toBe(headers.length);
          
          // 验证：框架识别正确
          if (config.framework !== 'unknown') {
            expect(result.framework).toBe(config.framework);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.1: 空表格最小行数要求
   * 
   * 当配置 minRows = 1 时，只有表头的表格应该被识别
   */
  test('属性 1.1：空表格应该满足 minRows = 1 的要求', () => {
    fc.assert(
      fc.property(headerGenerator, (headers) => {
        // 创建只有表头的表格
        const table = document.createElement('table');
        table.style.display = 'table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        for (const header of headers) {
          const th = document.createElement('th');
          th.textContent = header;
          headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        document.body.appendChild(table);
        
        // 配置 minRows = 1
        const config: TableDetectionConfig = {
          minRows: 1,
          minCols: 2,
          alignmentThreshold: 5,
          gridGapTolerance: 10,
          detectEmptyTables: true,
          filterAuxiliaryRows: true,
          detectFixedColumns: true,
          penetrateNesting: true
        };
        
        const result = detectHTMLTable(table, config);
        
        // 验证：应该被识别
        expect(result).not.toBeNull();
        
        if (result) {
          expect(result.rows).toBe(1);
          expect(result.data.length).toBe(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.2: 占位行过滤
   * 
   * 包含占位行的空表格应该过滤掉占位行，只保留表头
   */
  test('属性 1.2：占位行应该被过滤', () => {
    fc.assert(
      fc.property(headerGenerator, (headers) => {
        // 创建带占位行的表格
        const wrapper = document.createElement('div');
        wrapper.className = 'ant-table-wrapper';
        
        const table = document.createElement('table');
        table.style.display = 'table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        for (const header of headers) {
          const th = document.createElement('th');
          th.textContent = header;
          headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        const placeholderRow = document.createElement('tr');
        placeholderRow.className = 'ant-table-placeholder';
        const td = document.createElement('td');
        td.setAttribute('colspan', headers.length.toString());
        td.textContent = '暂无数据';
        placeholderRow.appendChild(td);
        tbody.appendChild(placeholderRow);
        table.appendChild(tbody);
        
        wrapper.appendChild(table);
        document.body.appendChild(wrapper);
        
        const config: TableDetectionConfig = {
          minRows: 1,
          minCols: 2,
          alignmentThreshold: 5,
          gridGapTolerance: 10,
          detectEmptyTables: true,
          filterAuxiliaryRows: true,
          detectFixedColumns: true,
          penetrateNesting: true
        };
        
        const result = detectHTMLTable(table, config);
        
        // 验证：占位行被过滤
        expect(result).not.toBeNull();
        
        if (result) {
          // 只有表头，没有占位行
          expect(result.rows).toBe(1);
          expect(result.data.length).toBe(1);
          expect(result.isEmpty).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 1.3: 测量行过滤
   * 
   * 包含测量行的空表格应该过滤掉测量行，只保留表头
   */
  test('属性 1.3：测量行应该被过滤', () => {
    fc.assert(
      fc.property(headerGenerator, (headers) => {
        // 创建带测量行的表格
        const wrapper = document.createElement('div');
        wrapper.className = 'ant-table-wrapper';
        
        const table = document.createElement('table');
        table.style.display = 'table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        for (const header of headers) {
          const th = document.createElement('th');
          th.textContent = header;
          headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        const measureRow = document.createElement('tr');
        measureRow.className = 'ant-table-measure-row';
        measureRow.setAttribute('aria-hidden', 'true');
        measureRow.style.height = '0px';
        
        for (let i = 0; i < headers.length; i++) {
          const td = document.createElement('td');
          td.style.padding = '0';
          td.style.border = '0';
          measureRow.appendChild(td);
        }
        
        tbody.appendChild(measureRow);
        table.appendChild(tbody);
        
        wrapper.appendChild(table);
        document.body.appendChild(wrapper);
        
        const config: TableDetectionConfig = {
          minRows: 1,
          minCols: 2,
          alignmentThreshold: 5,
          gridGapTolerance: 10,
          detectEmptyTables: true,
          filterAuxiliaryRows: true,
          detectFixedColumns: true,
          penetrateNesting: true
        };
        
        const result = detectHTMLTable(table, config);
        
        // 验证：测量行被过滤
        expect(result).not.toBeNull();
        
        if (result) {
          // 只有表头，没有测量行
          expect(result.rows).toBe(1);
          expect(result.data.length).toBe(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * 边界情况：不启用空表格检测时，空表格不应该被标记为空
   */
  test('边界情况：detectEmptyTables = false 时不标记空表格', () => {
    const headers = ['列1', '列2', '列3'];
    const table = createEmptyTable(headers, {
      hasPlaceholderRow: true,
      hasMeasureRow: false,
      framework: 'ant-design'
    });
    
    const config: TableDetectionConfig = {
      minRows: 1,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: false,  // 不检测空表格
      filterAuxiliaryRows: true,
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const result = detectHTMLTable(table, config);
    
    expect(result).not.toBeNull();
    if (result) {
      // isEmpty 应该为 false（因为未启用空表格检测）
      expect(result.isEmpty).toBe(false);
    }
  });

  /**
   * 边界情况：不过滤辅助行时，占位行应该被包含在数据中
   */
  test('边界情况：filterAuxiliaryRows = false 时包含辅助行', () => {
    const headers = ['列1', '列2'];
    const wrapper = document.createElement('div');
    wrapper.className = 'ant-table-wrapper';
    
    const table = document.createElement('table');
    table.style.display = 'table';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const header of headers) {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    const placeholderRow = document.createElement('tr');
    placeholderRow.className = 'ant-table-placeholder';
    const td = document.createElement('td');
    td.setAttribute('colspan', '2');
    td.textContent = '暂无数据';
    placeholderRow.appendChild(td);
    tbody.appendChild(placeholderRow);
    table.appendChild(tbody);
    
    wrapper.appendChild(table);
    document.body.appendChild(wrapper);
    
    const config: TableDetectionConfig = {
      minRows: 1,
      minCols: 2,
      alignmentThreshold: 5,
      gridGapTolerance: 10,
      detectEmptyTables: true,
      filterAuxiliaryRows: false,  // 不过滤辅助行
      detectFixedColumns: true,
      penetrateNesting: true
    };
    
    const result = detectHTMLTable(table, config);
    
    expect(result).not.toBeNull();
    if (result) {
      // 应该包含表头和占位行
      expect(result.rows).toBe(2);
      expect(result.data.length).toBe(2);
    }
  });
});
