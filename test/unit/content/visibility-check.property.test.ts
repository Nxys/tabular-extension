/**
 * 可见性检查属性测试
 * 
 * Feature: table-detection-enhancement
 * Property 11: 可见性过滤完整性
 * Property 12: 父元素可见性递归检查
 * Property 20: 可见性缓存有效性
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 9.2**
 * 
 * 测试目标：
 * - 验证不可见的表格（display:none, visibility:hidden, opacity:0）被正确跳过
 * - 验证父元素不可见时，子表格也被跳过
 * - 验证可见性缓存能够避免重复计算，提升性能
 */

import * as fc from 'fast-check';
import { 
  detectHTMLTable,
  scanTables,
  clearVisibilityCache
} from '../../../src/content/detector';

/**
 * 不可见样式类型
 */
type InvisibleStyle = 
  | 'display-none'
  | 'visibility-hidden'
  | 'opacity-zero';

/**
 * 创建带有指定可见性样式的表格
 */
function createTableWithVisibility(
  style: InvisibleStyle | 'visible',
  applyToParent: boolean = false
): { table: HTMLTableElement; wrapper?: HTMLDivElement } {
  const table = document.createElement('table');
  
  // 添加表头
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>姓名</th><th>年龄</th><th>城市</th></tr>';
  table.appendChild(thead);
  
  // 添加数据行
  const tbody = document.createElement('tbody');
  tbody.innerHTML = `
    <tr><td>张三</td><td>25</td><td>北京</td></tr>
    <tr><td>李四</td><td>30</td><td>上海</td></tr>
  `;
  table.appendChild(tbody);
  
  // 应用样式
  const styleMap: Record<InvisibleStyle | 'visible', string> = {
    'display-none': 'display: none;',
    'visibility-hidden': 'visibility: hidden;',
    'opacity-zero': 'opacity: 0;',
    'visible': 'display: block;'
  };
  
  if (applyToParent) {
    // 创建父容器并应用样式
    const wrapper = document.createElement('div');
    wrapper.style.cssText = styleMap[style];
    wrapper.appendChild(table);
    document.body.appendChild(wrapper);
    return { table, wrapper };
  } else {
    // 直接应用样式到表格
    table.style.cssText = styleMap[style];
    document.body.appendChild(table);
    return { table };
  }
}

/**
 * 创建嵌套的不可见容器
 */
function createNestedInvisibleTable(
  depth: number,
  invisibleLevel: number,
  style: InvisibleStyle
): HTMLTableElement {
  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr><th>列1</th><th>列2</th></tr></thead>
    <tbody><tr><td>数据1</td><td>数据2</td></tr></tbody>
  `;
  
  let current: HTMLElement = table;
  
  // 创建嵌套容器
  for (let i = 0; i < depth; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = `level-${i}`;
    
    // 在指定层级应用不可见样式
    if (i === invisibleLevel) {
      const styleMap: Record<InvisibleStyle, string> = {
        'display-none': 'display: none;',
        'visibility-hidden': 'visibility: hidden;',
        'opacity-zero': 'opacity: 0;'
      };
      wrapper.style.cssText = styleMap[style];
    }
    
    wrapper.appendChild(current);
    current = wrapper;
  }
  
  document.body.appendChild(current);
  return table;
}

/**
 * 创建多个表格用于缓存测试
 */
function createMultipleTables(count: number): HTMLTableElement[] {
  const tables: HTMLTableElement[] = [];
  
  for (let i = 0; i < count; i++) {
    const table = document.createElement('table');
    table.className = `table-${i}`;
    table.innerHTML = `
      <thead><tr><th>列1</th><th>列2</th></tr></thead>
      <tbody><tr><td>数据${i}-1</td><td>数据${i}-2</td></tr></tbody>
    `;
    document.body.appendChild(table);
    tables.push(table);
  }
  
  return tables;
}

/**
 * 清理 DOM
 */
function cleanupDOM(): void {
  document.body.innerHTML = '';
  clearVisibilityCache();
}

/**
 * 生成器：生成不可见样式类型
 */
const invisibleStyleGenerator = fc.constantFrom<InvisibleStyle>(
  'display-none',
  'visibility-hidden',
  'opacity-zero'
);

describe('可见性检查属性测试', () => {
  afterEach(() => {
    cleanupDOM();
  });

  /**
   * Property 11.1: display:none 表格过滤
   * 
   * **Validates: Requirements 6.1**
   * 
   * 对于任何 display:none 的表格，
   * detectHTMLTable 应该返回 null（跳过该表格）
   */
  test('对于 display:none 的表格，应该返回 null', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // 是否应用到父元素
        (applyToParent) => {
          cleanupDOM();
          const { table } = createTableWithVisibility('display-none', applyToParent);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该返回 null（表格不可见）
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.2: visibility:hidden 表格过滤
   * 
   * **Validates: Requirements 6.2**
   * 
   * 对于任何 visibility:hidden 的表格，
   * detectHTMLTable 应该返回 null（跳过该表格）
   */
  test('对于 visibility:hidden 的表格，应该返回 null', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // 是否应用到父元素
        (applyToParent) => {
          cleanupDOM();
          const { table } = createTableWithVisibility('visibility-hidden', applyToParent);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该返回 null（表格不可见）
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.3: opacity:0 表格过滤
   * 
   * **Validates: Requirements 6.3**
   * 
   * 对于任何 opacity:0 的表格，
   * detectHTMLTable 应该返回 null（跳过该表格）
   */
  test('对于 opacity:0 的表格，应该返回 null', () => {
    fc.assert(
      fc.property(
        fc.boolean(), // 是否应用到父元素
        (applyToParent) => {
          cleanupDOM();
          const { table } = createTableWithVisibility('opacity-zero', applyToParent);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该返回 null（表格不可见）
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.4: 可见表格不被过滤
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3**
   * 
   * 对于任何可见的表格（没有不可见样式），
   * detectHTMLTable 应该成功检测并返回表格信息
   */
  test('对于可见的表格，应该成功检测', () => {
    fc.assert(
      fc.property(
        fc.constant('visible'),
        () => {
          cleanupDOM();
          const { table } = createTableWithVisibility('visible');
          
          const result = detectHTMLTable(table);
          
          // 验证：应该成功检测表格
          expect(result).not.toBeNull();
          
          if (result) {
            expect(result.rows).toBe(3); // 1 表头 + 2 数据行
            expect(result.cols).toBe(3);
            expect(result.data.length).toBe(3);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.5: 不可见样式类型的完整性
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3**
   * 
   * 对于任何不可见样式类型（display:none, visibility:hidden, opacity:0），
   * detectHTMLTable 都应该返回 null
   */
  test('对于任何不可见样式，都应该返回 null', () => {
    fc.assert(
      fc.property(
        invisibleStyleGenerator,
        (style) => {
          cleanupDOM();
          const { table } = createTableWithVisibility(style);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该返回 null
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.1: 父元素不可见时子表格被跳过
   * 
   * **Validates: Requirements 6.5**
   * 
   * 对于任何嵌套在不可见父元素中的表格，
   * detectHTMLTable 应该返回 null（递归检查父元素可见性）
   */
  test('对于嵌套在不可见父元素中的表格，应该返回 null', () => {
    fc.assert(
      fc.property(
        invisibleStyleGenerator,
        fc.integer({ min: 1, max: 5 }), // 嵌套深度
        fc.integer({ min: 0, max: 4 }), // 不可见层级
        (style, depth, invisibleLevel) => {
          // 确保不可见层级在有效范围内
          const actualInvisibleLevel = Math.min(invisibleLevel, depth - 1);
          
          cleanupDOM();
          const table = createNestedInvisibleTable(depth, actualInvisibleLevel, style);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该返回 null（父元素不可见）
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.2: 递归检查深度的正确性
   * 
   * **Validates: Requirements 6.5**
   * 
   * 对于任何嵌套深度的表格，
   * 可见性检查应该递归检查所有父元素直到 document.body
   */
  test('可见性检查应该递归检查所有父元素', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // 嵌套深度
        (depth) => {
          cleanupDOM();
          
          // 创建可见的嵌套表格
          const table = document.createElement('table');
          table.innerHTML = `
            <thead><tr><th>列1</th><th>列2</th></tr></thead>
            <tbody><tr><td>数据1</td><td>数据2</td></tr></tbody>
          `;
          
          let current: HTMLElement = table;
          for (let i = 0; i < depth; i++) {
            const wrapper = document.createElement('div');
            wrapper.className = `level-${i}`;
            wrapper.appendChild(current);
            current = wrapper;
          }
          
          document.body.appendChild(current);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该成功检测（所有父元素都可见）
          expect(result).not.toBeNull();
          
          if (result) {
            expect(result.rows).toBe(2); // 1 表头 + 1 数据行
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12.3: 父元素可见性优先级
   * 
   * **Validates: Requirements 6.5**
   * 
   * 对于任何表格，如果任何祖先元素不可见，
   * 则表格应该被跳过，无论表格本身的样式如何
   */
  test('父元素不可见时，表格本身的样式不影响结果', () => {
    fc.assert(
      fc.property(
        invisibleStyleGenerator,
        invisibleStyleGenerator,
        (parentStyle, tableStyle) => {
          cleanupDOM();
          
          // 创建不可见的父容器
          const wrapper = document.createElement('div');
          const styleMap: Record<InvisibleStyle, string> = {
            'display-none': 'display: none;',
            'visibility-hidden': 'visibility: hidden;',
            'opacity-zero': 'opacity: 0;'
          };
          wrapper.style.cssText = styleMap[parentStyle];
          
          // 创建表格（可能有自己的不可见样式）
          const table = document.createElement('table');
          table.style.cssText = styleMap[tableStyle];
          table.innerHTML = `
            <thead><tr><th>列1</th><th>列2</th></tr></thead>
            <tbody><tr><td>数据1</td><td>数据2</td></tr></tbody>
          `;
          
          wrapper.appendChild(table);
          document.body.appendChild(wrapper);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该返回 null（父元素不可见）
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20.1: 可见性缓存避免重复计算
   * 
   * **Validates: Requirements 9.2**
   * 
   * 对于任何表格，多次检测可见性应该使用缓存，
   * 避免重复计算（通过检测结果一致性验证）
   */
  test('多次检测同一表格应该返回一致结果（使用缓存）', () => {
    fc.assert(
      fc.property(
        invisibleStyleGenerator.map(s => s as InvisibleStyle | 'visible').chain(s => 
          fc.constant(s).chain(style => 
            fc.record({ style: fc.constant(style) })
          )
        ).chain(() => fc.oneof(
          invisibleStyleGenerator,
          fc.constant('visible' as const)
        )),
        (style) => {
          cleanupDOM();
          const { table } = createTableWithVisibility(
            style as InvisibleStyle | 'visible'
          );
          
          // 第一次检测
          const result1 = detectHTMLTable(table);
          
          // 第二次检测（应该使用缓存）
          const result2 = detectHTMLTable(table);
          
          // 第三次检测（应该使用缓存）
          const result3 = detectHTMLTable(table);
          
          // 验证：结果应该一致
          if (result1 === null) {
            expect(result2).toBeNull();
            expect(result3).toBeNull();
          } else {
            expect(result2).not.toBeNull();
            expect(result3).not.toBeNull();
            
            if (result2 && result3) {
              expect(result2.rows).toBe(result1.rows);
              expect(result3.rows).toBe(result1.rows);
              expect(result2.cols).toBe(result1.cols);
              expect(result3.cols).toBe(result1.cols);
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20.2: 缓存在多表格扫描中的有效性
   * 
   * **Validates: Requirements 9.2**
   * 
   * 对于任何包含多个表格的页面，
   * scanTables 应该使用缓存避免重复计算可见性
   */
  test('扫描多个表格时应该使用缓存提升性能', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }), // 表格数量
        (tableCount) => {
          cleanupDOM();
          createMultipleTables(tableCount);
          
          // 第一次扫描
          const result1 = scanTables();
          
          // 第二次扫描（应该使用缓存）
          const result2 = scanTables();
          
          // 验证：结果应该一致
          expect(result1.length).toBe(tableCount);
          expect(result2.length).toBe(tableCount);
          
          // 验证：每个表格的信息应该一致
          for (let i = 0; i < tableCount; i++) {
            expect(result2[i].rows).toBe(result1[i].rows);
            expect(result2[i].cols).toBe(result1[i].cols);
          }
          
          // 注意：在测试环境中，性能差异可能不明显
          // 这里主要验证结果一致性，而不是性能提升
          // 实际的性能提升需要在真实浏览器环境中测试
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 20.3: 缓存清理后重新计算
   * 
   * **Validates: Requirements 9.2**
   * 
   * 对于任何表格，清理缓存后应该重新计算可见性
   */
  test('清理缓存后应该重新计算可见性', () => {
    fc.assert(
      fc.property(
        fc.constant('visible'),
        () => {
          cleanupDOM();
          const { table } = createTableWithVisibility('visible');
          
          // 第一次检测（建立缓存）
          const result1 = detectHTMLTable(table);
          expect(result1).not.toBeNull();
          
          // 清理缓存
          clearVisibilityCache();
          
          // 修改表格样式为不可见
          table.style.display = 'none';
          
          // 第二次检测（应该重新计算，因为缓存已清理）
          const result2 = detectHTMLTable(table);
          
          // 验证：应该返回 null（表格现在不可见）
          expect(result2).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20.4: 缓存不影响不同元素的检测
   * 
   * **Validates: Requirements 9.2**
   * 
   * 对于任何多个不同的表格，
   * 缓存应该为每个表格独立存储，不互相影响
   */
  test('缓存应该为每个表格独立存储', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // 表格数量
        (tableCount) => {
          cleanupDOM();
          
          // 创建多个表格，部分可见，部分不可见
          const tables: HTMLTableElement[] = [];
          const expectedResults: boolean[] = [];
          
          for (let i = 0; i < tableCount; i++) {
            const isVisible = i % 2 === 0; // 偶数索引可见，奇数索引不可见
            const style = isVisible ? 'visible' : 'display-none';
            const { table } = createTableWithVisibility(
              style as InvisibleStyle | 'visible'
            );
            tables.push(table);
            expectedResults.push(isVisible);
          }
          
          // 检测所有表格
          const results = tables.map(table => detectHTMLTable(table));
          
          // 验证：每个表格的检测结果应该符合预期
          for (let i = 0; i < tableCount; i++) {
            if (expectedResults[i]) {
              expect(results[i]).not.toBeNull();
            } else {
              expect(results[i]).toBeNull();
            }
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11.6: scanTables 过滤所有不可见表格
   * 
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4**
   * 
   * 对于任何包含可见和不可见表格的页面，
   * scanTables 应该只返回可见的表格
   */
  test('scanTables 应该只返回可见的表格', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // 可见表格数量
        fc.integer({ min: 1, max: 5 }), // 不可见表格数量
        (visibleCount, invisibleCount) => {
          cleanupDOM();
          
          // 创建可见表格
          for (let i = 0; i < visibleCount; i++) {
            createTableWithVisibility('visible');
          }
          
          // 创建不可见表格
          const invisibleStyles: InvisibleStyle[] = [
            'display-none',
            'visibility-hidden',
            'opacity-zero'
          ];
          for (let i = 0; i < invisibleCount; i++) {
            const style = invisibleStyles[i % invisibleStyles.length];
            createTableWithVisibility(style);
          }
          
          const result = scanTables();
          
          // 验证：应该只返回可见的表格
          expect(result.length).toBe(visibleCount);
          
          // 验证：所有返回的表格都应该有有效数据
          for (const table of result) {
            expect(table.rows).toBeGreaterThan(0);
            expect(table.cols).toBeGreaterThan(0);
            expect(table.data.length).toBeGreaterThan(0);
          }
          
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12.4: 混合可见性的嵌套结构
   * 
   * **Validates: Requirements 6.5**
   * 
   * 对于任何包含多层嵌套的结构，
   * 只要有一层不可见，整个子树的表格都应该被跳过
   */
  test('嵌套结构中任何一层不可见都会导致表格被跳过', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // 嵌套深度
        fc.integer({ min: 0, max: 4 }), // 不可见层级
        invisibleStyleGenerator,
        (depth, invisibleLevel, style) => {
          const actualInvisibleLevel = Math.min(invisibleLevel, depth - 1);
          
          cleanupDOM();
          const table = createNestedInvisibleTable(depth, actualInvisibleLevel, style);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该返回 null
          expect(result).toBeNull();
          
          // 同时验证 scanTables 也应该跳过这个表格
          const scanResult = scanTables();
          expect(scanResult.length).toBe(0);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
