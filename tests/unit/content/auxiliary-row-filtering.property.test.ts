/**
 * 辅助行过滤属性测试
 * 
 * Feature: table-detection-enhancement
 * Property 2: 占位行过滤正确性
 * Property 3: 辅助行过滤完整性
 * 
 * **Validates: Requirements 1.2, 1.3, 3.4, 3.5**
 * 
 * 测试目标：
 * - 验证占位行（placeholder）能被正确识别和过滤
 * - 验证所有类型的辅助行（测量行、隐藏行、零高度行）都能被过滤
 * - 验证过滤后的表格数据只包含有效数据行
 */

import * as fc from 'fast-check';
import { 
  detectHTMLTable,
  isAuxiliaryRow,
  type UIFramework,
  type AuxiliaryRowType
} from '../../../src/content/detector';

/**
 * 支持的 UI 框架列表
 */
const SUPPORTED_FRAMEWORKS: UIFramework[] = [
  'ant-design',
  'element-ui',
  'element-plus',
  'arco-design',
  'naive-ui',
  'vuetify',
  'material-ui',
  'bootstrap',
  'semantic-ui',
  'unknown'
];

/**
 * 框架特定的占位行类名
 */
const FRAMEWORK_PLACEHOLDER_CLASSES: Record<string, string[]> = {
  'ant-design': ['ant-table-placeholder'],
  'element-ui': ['el-table__empty-block'],
  'element-plus': ['el-table__empty-text'],
  'arco-design': ['arco-table-empty'],
  'naive-ui': ['n-data-table-empty'],
  'vuetify': ['v-data-table__empty-wrapper'],
  'material-ui': ['MuiTableRow-empty']
};

/**
 * 框架特定的测量行类名
 */
const FRAMEWORK_MEASURE_CLASSES: Record<string, string[]> = {
  'ant-design': ['ant-table-measure-row'],
  'arco-design': ['arco-table-tr-measure']
};

/**
 * 通用占位文本
 */
const PLACEHOLDER_TEXTS = [
  '暂无数据',
  '无数据',
  '没有数据',
  'No Data',
  'Empty',
  'No Records',
  'No Results'
];

/**
 * 创建带有占位行的表格
 */
function createTableWithPlaceholder(
  framework: UIFramework,
  placeholderClass: string,
  placeholderText: string = '暂无数据'
): HTMLTableElement {
  const table = document.createElement('table');
  
  // 添加表头
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>姓名</th><th>年龄</th><th>城市</th></tr>';
  table.appendChild(thead);
  
  // 添加占位行
  const tbody = document.createElement('tbody');
  const placeholderRow = document.createElement('tr');
  placeholderRow.className = placeholderClass;
  placeholderRow.innerHTML = `<td colspan="3">${placeholderText}</td>`;
  tbody.appendChild(placeholderRow);
  table.appendChild(tbody);
  
  // 如果有框架，添加框架容器
  if (framework !== 'unknown') {
    const wrapper = document.createElement('div');
    wrapper.className = getFrameworkWrapperClass(framework);
    wrapper.appendChild(table);
    document.body.appendChild(wrapper);
  } else {
    document.body.appendChild(table);
  }
  
  return table;
}

/**
 * 创建带有测量行的表格
 */
function createTableWithMeasureRow(
  framework: UIFramework,
  measureClass: string
): HTMLTableElement {
  const table = document.createElement('table');
  
  // 添加表头
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>姓名</th><th>年龄</th><th>城市</th></tr>';
  table.appendChild(thead);
  
  // 添加测量行
  const tbody = document.createElement('tbody');
  const measureRow = document.createElement('tr');
  measureRow.className = measureClass;
  measureRow.innerHTML = '<td></td><td></td><td></td>';
  tbody.appendChild(measureRow);
  
  // 添加数据行
  const dataRow = document.createElement('tr');
  dataRow.innerHTML = '<td>张三</td><td>25</td><td>北京</td>';
  tbody.appendChild(dataRow);
  
  table.appendChild(tbody);
  
  // 如果有框架，添加框架容器
  if (framework !== 'unknown') {
    const wrapper = document.createElement('div');
    wrapper.className = getFrameworkWrapperClass(framework);
    wrapper.appendChild(table);
    document.body.appendChild(wrapper);
  } else {
    document.body.appendChild(table);
  }
  
  return table;
}



/**
 * 创建带有多种辅助行的表格
 */
function createTableWithMixedAuxiliaryRows(
  framework: UIFramework
): HTMLTableElement {
  const table = document.createElement('table');
  
  // 添加表头
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>姓名</th><th>年龄</th><th>城市</th></tr>';
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  
  // 添加测量行（如果框架支持）
  const measureClasses = FRAMEWORK_MEASURE_CLASSES[framework];
  if (measureClasses && measureClasses.length > 0) {
    const measureRow = document.createElement('tr');
    measureRow.className = measureClasses[0];
    measureRow.innerHTML = '<td></td><td></td><td></td>';
    tbody.appendChild(measureRow);
  }
  
  // 添加隐藏行
  const hiddenRow = document.createElement('tr');
  hiddenRow.setAttribute('aria-hidden', 'true');
  hiddenRow.innerHTML = '<td>Hidden</td><td>0</td><td>Hidden</td>';
  tbody.appendChild(hiddenRow);
  
  // 添加数据行
  const dataRow1 = document.createElement('tr');
  dataRow1.innerHTML = '<td>张三</td><td>25</td><td>北京</td>';
  tbody.appendChild(dataRow1);
  
  const dataRow2 = document.createElement('tr');
  dataRow2.innerHTML = '<td>李四</td><td>30</td><td>上海</td>';
  tbody.appendChild(dataRow2);
  
  table.appendChild(tbody);
  
  // 如果有框架，添加框架容器
  if (framework !== 'unknown') {
    const wrapper = document.createElement('div');
    wrapper.className = getFrameworkWrapperClass(framework);
    wrapper.appendChild(table);
    document.body.appendChild(wrapper);
  } else {
    document.body.appendChild(table);
  }
  
  return table;
}

/**
 * 获取框架的包装器类名
 */
function getFrameworkWrapperClass(framework: UIFramework): string {
  const wrapperClasses: Record<string, string> = {
    'ant-design': 'ant-table-wrapper',
    'element-ui': 'el-table',
    'element-plus': 'el-table',
    'arco-design': 'arco-table',
    'naive-ui': 'n-data-table',
    'vuetify': 'v-data-table',
    'material-ui': 'MuiTable-root',
    'bootstrap': 'table-responsive',
    'semantic-ui': 'ui.table'
  };
  return wrapperClasses[framework] || 'table-wrapper';
}

/**
 * 清理 DOM
 */
function cleanupDOM(): void {
  document.body.innerHTML = '';
}

/**
 * 生成器：生成框架类型
 */
const frameworkGenerator = fc.constantFrom(...SUPPORTED_FRAMEWORKS);

/**
 * 生成器：生成占位文本
 */
const placeholderTextGenerator = fc.constantFrom(...PLACEHOLDER_TEXTS);

describe('辅助行过滤属性测试', () => {
  afterEach(() => {
    cleanupDOM();
  });

  /**
   * Property 2.1: 占位行识别正确性
   * 
   * **Validates: Requirements 1.2**
   * 
   * 对于任何包含框架特定占位行类名的表格行，
   * isAuxiliaryRow 应该识别为 'placeholder' 类型
   */
  test('对于任何框架特定的占位行类名，应该识别为 placeholder', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const placeholderClasses = FRAMEWORK_PLACEHOLDER_CLASSES[framework];
          if (!placeholderClasses || placeholderClasses.length === 0) {
            return true; // 跳过没有占位行类名的框架
          }
          
          // 测试该框架的所有占位行类名
          for (const placeholderClass of placeholderClasses) {
            cleanupDOM();
            const table = createTableWithPlaceholder(framework, placeholderClass);
            const rows = table.querySelectorAll('tr');
            
            // 找到占位行（第二行，索引为 1）
            const placeholderRow = rows[1] as HTMLTableRowElement;
            const result = isAuxiliaryRow(placeholderRow, framework);
            
            // 验证：应该识别为 placeholder
            expect(result).toBe('placeholder');
          }
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 2.2: 占位文本识别正确性
   * 
   * **Validates: Requirements 1.2**
   * 
   * 对于任何包含占位文本（如"暂无数据"）的单列单元格行，
   * isAuxiliaryRow 应该识别为 'placeholder' 类型
   */
  test('对于任何占位文本，应该识别为 placeholder', () => {
    fc.assert(
      fc.property(
        placeholderTextGenerator,
        (placeholderText) => {
          cleanupDOM();
          
          const table = document.createElement('table');
          table.innerHTML = `
            <tr><th>姓名</th><th>年龄</th></tr>
            <tr><td colspan="2">${placeholderText}</td></tr>
          `;
          document.body.appendChild(table);
          
          const rows = table.querySelectorAll('tr');
          const placeholderRow = rows[1] as HTMLTableRowElement;
          const result = isAuxiliaryRow(placeholderRow);
          
          // 验证：应该识别为 placeholder
          expect(result).toBe('placeholder');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2.3: 占位行过滤后表格数据正确性
   * 
   * **Validates: Requirements 1.3**
   * 
   * 对于任何包含占位行的表格，
   * detectHTMLTable 应该过滤掉占位行，只返回表头数据
   */
  test('对于包含占位行的表格，应该过滤占位行并正确提取表头', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        placeholderTextGenerator,
        (framework, placeholderText) => {
          const placeholderClasses = FRAMEWORK_PLACEHOLDER_CLASSES[framework];
          if (!placeholderClasses || placeholderClasses.length === 0) {
            return true; // 跳过没有占位行类名的框架
          }
          
          cleanupDOM();
          const placeholderClass = placeholderClasses[0];
          const table = createTableWithPlaceholder(framework, placeholderClass, placeholderText);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该成功检测表格
          expect(result).not.toBeNull();
          
          if (result) {
            // 验证：只有表头行（1 行）
            expect(result.rows).toBe(1);
            
            // 验证：数据数组只包含表头
            expect(result.data.length).toBe(1);
            expect(result.data[0]).toEqual(['姓名', '年龄', '城市']);
            
            // 验证：应该标记为空表格
            expect(result.isEmpty).toBe(true);
          }
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3.1: 测量行识别正确性
   * 
   * **Validates: Requirements 3.4**
   * 
   * 对于任何包含框架特定测量行类名的表格行，
   * isAuxiliaryRow 应该识别为 'measure' 类型
   */
  test('对于任何框架特定的测量行类名，应该识别为 measure', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const measureClasses = FRAMEWORK_MEASURE_CLASSES[framework];
          if (!measureClasses || measureClasses.length === 0) {
            return true; // 跳过没有测量行类名的框架
          }
          
          // 测试该框架的所有测量行类名
          for (const measureClass of measureClasses) {
            cleanupDOM();
            const table = createTableWithMeasureRow(framework, measureClass);
            const rows = table.querySelectorAll('tbody tr');
            
            // 找到测量行（第一行，索引为 0）
            const measureRow = rows[0] as HTMLTableRowElement;
            const result = isAuxiliaryRow(measureRow, framework);
            
            // 验证：应该识别为 measure
            expect(result).toBe('measure');
          }
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 3.2: 隐藏行识别正确性
   * 
   * **Validates: Requirements 3.5**
   * 
   * 对于任何带有 aria-hidden="true" 属性的表格行，
   * isAuxiliaryRow 应该识别为 'hidden' 类型
   */
  test('对于任何 aria-hidden="true" 的行，应该识别为 hidden', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // 隐藏行的位置
        (hiddenRowIndex) => {
          cleanupDOM();
          
          const table = document.createElement('table');
          const thead = document.createElement('thead');
          thead.innerHTML = '<tr><th>姓名</th><th>年龄</th></tr>';
          table.appendChild(thead);
          
          const tbody = document.createElement('tbody');
          
          // 添加多行，其中一行是隐藏行
          for (let i = 0; i <= hiddenRowIndex; i++) {
            const row = document.createElement('tr');
            if (i === hiddenRowIndex) {
              row.setAttribute('aria-hidden', 'true');
              row.innerHTML = '<td>Hidden</td><td>0</td>';
            } else {
              row.innerHTML = `<td>用户${i}</td><td>${20 + i}</td>`;
            }
            tbody.appendChild(row);
          }
          
          table.appendChild(tbody);
          document.body.appendChild(table);
          
          const rows = tbody.querySelectorAll('tr');
          const hiddenRow = rows[hiddenRowIndex] as HTMLTableRowElement;
          const result = isAuxiliaryRow(hiddenRow);
          
          // 验证：应该识别为 hidden
          expect(result).toBe('hidden');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.3: 辅助行过滤完整性
   * 
   * **Validates: Requirements 3.4, 3.5**
   * 
   * 对于任何包含多种辅助行的表格，
   * detectHTMLTable 应该过滤掉所有辅助行，只保留有效数据行
   */
  test('对于包含多种辅助行的表格，应该过滤所有辅助行', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          cleanupDOM();
          const table = createTableWithMixedAuxiliaryRows(framework);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该成功检测表格
          expect(result).not.toBeNull();
          
          if (result) {
            // 验证：应该有 3 行（1 表头 + 2 数据行）
            expect(result.rows).toBe(3);
            
            // 验证：数据数组应该只包含表头和数据行，不包含辅助行
            expect(result.data.length).toBe(3);
            expect(result.data[0]).toEqual(['姓名', '年龄', '城市']);
            expect(result.data[1]).toEqual(['张三', '25', '北京']);
            expect(result.data[2]).toEqual(['李四', '30', '上海']);
            
            // 验证：不应该标记为空表格（因为有数据行）
            expect(result.isEmpty).toBe(false);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.4: 通用辅助行类名识别
   * 
   * **Validates: Requirements 3.4**
   * 
   * 对于任何包含通用辅助行类名模式的行（不依赖框架），
   * isAuxiliaryRow 应该正确识别辅助行类型
   */
  test('对于通用辅助行类名，应该正确识别', () => {
    const genericAuxiliaryClasses = [
      { className: 'placeholder-row', expectedType: 'placeholder' as AuxiliaryRowType },
      { className: 'empty-row', expectedType: 'placeholder' as AuxiliaryRowType },
      { className: 'no-data-row', expectedType: 'placeholder' as AuxiliaryRowType },
      { className: 'measure-row', expectedType: 'measure' as AuxiliaryRowType },
      { className: 'sizing-row', expectedType: 'measure' as AuxiliaryRowType },
      { className: 'layout-row', expectedType: 'measure' as AuxiliaryRowType }
    ];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...genericAuxiliaryClasses),
        (testCase) => {
          cleanupDOM();
          
          const table = document.createElement('table');
          table.innerHTML = `
            <tr><th>姓名</th><th>年龄</th></tr>
            <tr class="${testCase.className}"><td>Test</td><td>0</td></tr>
          `;
          document.body.appendChild(table);
          
          const rows = table.querySelectorAll('tr');
          const auxiliaryRow = rows[1] as HTMLTableRowElement;
          const result = isAuxiliaryRow(auxiliaryRow);
          
          // 验证：应该识别为预期的辅助行类型
          expect(result).toBe(testCase.expectedType);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.5: 非辅助行不被误判
   * 
   * **Validates: Requirements 3.4, 3.5**
   * 
   * 对于任何正常的数据行（不包含辅助行特征），
   * isAuxiliaryRow 应该返回 null
   */
  test('对于正常数据行，不应该被识别为辅助行', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 100 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (name, age, city) => {
          cleanupDOM();
          
          const table = document.createElement('table');
          table.innerHTML = `
            <tr><th>姓名</th><th>年龄</th><th>城市</th></tr>
            <tr><td>${name}</td><td>${age}</td><td>${city}</td></tr>
          `;
          document.body.appendChild(table);
          
          const rows = table.querySelectorAll('tr');
          const dataRow = rows[1] as HTMLTableRowElement;
          const result = isAuxiliaryRow(dataRow);
          
          // 验证：不应该被识别为辅助行
          expect(result).toBeNull();
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.6: 辅助行过滤的确定性
   * 
   * **Validates: Requirements 3.4, 3.5**
   * 
   * 对于任何表格行，多次调用 isAuxiliaryRow 应该返回相同结果
   */
  test('对于同一行，多次识别应该返回相同结果', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const placeholderClasses = FRAMEWORK_PLACEHOLDER_CLASSES[framework];
          if (!placeholderClasses || placeholderClasses.length === 0) {
            return true;
          }
          
          cleanupDOM();
          const table = createTableWithPlaceholder(framework, placeholderClasses[0]);
          const rows = table.querySelectorAll('tr');
          const placeholderRow = rows[1] as HTMLTableRowElement;
          
          // 多次识别
          const result1 = isAuxiliaryRow(placeholderRow, framework);
          const result2 = isAuxiliaryRow(placeholderRow, framework);
          const result3 = isAuxiliaryRow(placeholderRow, framework);
          
          // 验证：结果应该相同
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
          expect(result1).toBe('placeholder');
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.7: 辅助行过滤不影响列数计算
   * 
   * **Validates: Requirements 3.4, 3.5**
   * 
   * 对于任何包含辅助行的表格，
   * 过滤辅助行后的列数应该与表头列数一致
   */
  test('过滤辅助行后，列数应该与表头一致', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        fc.integer({ min: 2, max: 10 }), // 列数
        (framework, colCount) => {
          cleanupDOM();
          
          // 创建表格
          const table = document.createElement('table');
          const thead = document.createElement('thead');
          const headerRow = document.createElement('tr');
          for (let i = 0; i < colCount; i++) {
            const th = document.createElement('th');
            th.textContent = `列${i + 1}`;
            headerRow.appendChild(th);
          }
          thead.appendChild(headerRow);
          table.appendChild(thead);
          
          const tbody = document.createElement('tbody');
          
          // 添加辅助行
          const auxiliaryRow = document.createElement('tr');
          auxiliaryRow.setAttribute('aria-hidden', 'true');
          for (let i = 0; i < colCount; i++) {
            const td = document.createElement('td');
            td.textContent = 'Hidden';
            auxiliaryRow.appendChild(td);
          }
          tbody.appendChild(auxiliaryRow);
          
          // 添加数据行
          const dataRow = document.createElement('tr');
          for (let i = 0; i < colCount; i++) {
            const td = document.createElement('td');
            td.textContent = `数据${i + 1}`;
            dataRow.appendChild(td);
          }
          tbody.appendChild(dataRow);
          
          table.appendChild(tbody);
          
          // 如果有框架，添加框架容器
          if (framework !== 'unknown') {
            const wrapper = document.createElement('div');
            wrapper.className = getFrameworkWrapperClass(framework);
            wrapper.appendChild(table);
            document.body.appendChild(wrapper);
          } else {
            document.body.appendChild(table);
          }
          
          const result = detectHTMLTable(table);
          
          // 验证：应该成功检测表格
          expect(result).not.toBeNull();
          
          if (result) {
            // 验证：列数应该与表头一致
            expect(result.cols).toBe(colCount);
            
            // 验证：每行数据的列数都应该一致
            for (const row of result.data) {
              expect(row.length).toBe(colCount);
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3.8: 只有辅助行的表格应该被识别为空表格
   * 
   * **Validates: Requirements 1.2, 1.3**
   * 
   * 对于任何只包含表头和辅助行（没有数据行）的表格，
   * detectHTMLTable 应该识别为空表格
   */
  test('只有表头和辅助行的表格应该被识别为空表格', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const placeholderClasses = FRAMEWORK_PLACEHOLDER_CLASSES[framework];
          if (!placeholderClasses || placeholderClasses.length === 0) {
            return true;
          }
          
          cleanupDOM();
          const table = createTableWithPlaceholder(framework, placeholderClasses[0]);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该成功检测表格
          expect(result).not.toBeNull();
          
          if (result) {
            // 验证：应该标记为空表格
            expect(result.isEmpty).toBe(true);
            
            // 验证：只有表头行
            expect(result.rows).toBe(1);
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
