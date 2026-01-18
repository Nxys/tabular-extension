/**
 * UI 框架识别通用性属性测试
 * 
 * Feature: table-detection-enhancement, Property 8: UI 框架识别通用性
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 * 
 * 测试目标：
 * - 验证所有已知 UI 框架的表格容器都能被正确识别
 * - 验证框架特定的检测规则能被正确应用
 * - 验证框架识别的完整性和准确性
 */

import * as fc from 'fast-check';
import { 
  detectFramework,
  getFrameworkSignature,
  applyFrameworkRules,
  detectHTMLTable,
  type UIFramework
} from '../detector.js';

/**
 * 支持的 UI 框架列表（排除 unknown）
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
  'semantic-ui'
];

/**
 * 框架特征类名映射
 * 每个框架至少有一个特征类名
 * 注意：这些类名必须与 detector.ts 中的 FRAMEWORK_SIGNATURES 模式匹配
 */
const FRAMEWORK_CLASS_NAMES: Record<UIFramework, string[]> = {
  'ant-design': ['ant-table-wrapper', 'ant-table', 'ant-table-container'],
  'element-ui': ['el-table', 'el-table__header-wrapper'],
  'element-plus': ['el-table__inner-wrapper', 'el-table__body-wrapper'],
  'arco-design': ['arco-table', 'arco-table-container', 'arco-table-content'],
  'naive-ui': ['n-data-table', 'n-data-table-wrapper', 'n-data-table-base-table'],
  'vuetify': ['v-data-table', 'v-table', 'v-data-table__wrapper'],
  'material-ui': ['MuiTable-root', 'MuiDataGrid-root', 'MuiTable'],
  'bootstrap': ['table', 'table-responsive', 'table-bordered'],
  'semantic-ui': ['ui.table'],
  'unknown': []
};

/**
 * 框架特定的空表格标识类名
 * 这些类名用于标识占位行或空表格行
 */
const FRAMEWORK_EMPTY_TABLE_CLASSES: Record<string, string[]> = {
  'ant-design': ['ant-table-placeholder'],
  'element-ui': ['el-table__empty-block'],
  'element-plus': ['el-table__empty-text'],
  'arco-design': ['arco-table-empty'],
  'naive-ui': ['n-data-table-empty'],
  'vuetify': ['v-data-table__empty-wrapper'],
  'material-ui': ['MuiTableRow-empty'],
  'bootstrap': [],
  'semantic-ui': []
};

/**
 * 框架特定的固定列标识类名
 */
const FRAMEWORK_FIXED_COLUMN_CLASSES: Record<string, string[]> = {
  'ant-design': ['ant-table-cell-fix-left', 'ant-table-cell-fix-right'],
  'element-ui': ['el-table-fixed-column', 'is-fixed'],
  'element-plus': ['el-table__fixed', 'is-fixed'],
  'arco-design': ['arco-table-col-fixed-left', 'arco-table-col-fixed-right'],
  'naive-ui': ['n-data-table-td--fixed-left', 'n-data-table-td--fixed-right'],
  'vuetify': ['v-data-table__td--fixed'],
  'material-ui': ['MuiTableCell--stickyHeader', 'MuiDataGrid-cell--pinnedLeft'],
  'bootstrap': ['table-fixed'],
  'semantic-ui': ['fixed']
};

/**
 * 创建带有框架特征的表格容器
 */
function createFrameworkTable(
  _framework: UIFramework,
  className: string,
  nestingLevel: number = 0
): { wrapper: HTMLElement; table: HTMLTableElement } {
  // 创建最外层容器
  const wrapper = document.createElement('div');
  wrapper.className = className;
  
  // 创建嵌套层级
  let current = wrapper;
  for (let i = 0; i < nestingLevel; i++) {
    const nested = document.createElement('div');
    current.appendChild(nested);
    current = nested;
  }
  
  // 创建表格
  const table = document.createElement('table');
  table.innerHTML = `
    <tr><th>Name</th><th>Age</th></tr>
    <tr><td>Alice</td><td>25</td></tr>
    <tr><td>Bob</td><td>30</td></tr>
  `;
  
  current.appendChild(table);
  document.body.appendChild(wrapper);
  
  return { wrapper, table };
}

/**
 * 创建带有空表格标识的表格
 */
function createEmptyFrameworkTable(
  framework: UIFramework,
  emptyClassName: string
): HTMLTableElement {
  const classNames = FRAMEWORK_CLASS_NAMES[framework];
  if (classNames.length === 0) {
    throw new Error(`Framework ${framework} has no class names`);
  }
  
  const wrapper = document.createElement('div');
  wrapper.className = classNames[0];
  
  const table = document.createElement('table');
  table.innerHTML = `
    <tr><th>Name</th><th>Age</th></tr>
    <tr class="${emptyClassName}"><td colspan="2">暂无数据</td></tr>
  `;
  
  wrapper.appendChild(table);
  document.body.appendChild(wrapper);
  
  return table;
}

/**
 * 创建带有固定列标识的表格
 */
function createFixedColumnFrameworkTable(
  framework: UIFramework,
  fixedClassName: string
): HTMLTableElement {
  const classNames = FRAMEWORK_CLASS_NAMES[framework];
  if (classNames.length === 0) {
    throw new Error(`Framework ${framework} has no class names`);
  }
  
  const wrapper = document.createElement('div');
  wrapper.className = classNames[0];
  
  const table = document.createElement('table');
  table.innerHTML = `
    <tr>
      <th class="${fixedClassName}">Name</th>
      <th>Age</th>
      <th>City</th>
    </tr>
    <tr>
      <td class="${fixedClassName}">Alice</td>
      <td>25</td>
      <td>Beijing</td>
    </tr>
    <tr>
      <td class="${fixedClassName}">Bob</td>
      <td>30</td>
      <td>Shanghai</td>
    </tr>
  `;
  
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

/**
 * 生成器：生成支持的框架类型
 */
const frameworkGenerator = fc.constantFrom(...SUPPORTED_FRAMEWORKS);

describe('UI 框架识别通用性属性测试', () => {
  afterEach(() => {
    cleanupDOM();
  });

  /**
   * Property 8.1: 框架类名识别完整性
   * 
   * **Validates: Requirements 4.1**
   * 
   * 对于任何已知 UI 框架的特征类名，
   * detectFramework 应该正确识别框架类型
   */
  test('对于任何已知框架的特征类名，应该正确识别框架类型', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        fc.integer({ min: 0, max: 2 }), // 选择该框架的第几个类名
        (framework, classIndex) => {
          const classNames = FRAMEWORK_CLASS_NAMES[framework];
          if (classNames.length === 0) return true; // 跳过没有类名的框架
          
          const className = classNames[Math.min(classIndex, classNames.length - 1)];
          const { table } = createFrameworkTable(framework, className);
          
          const detected = detectFramework(table);
          
          // 验证：应该识别为正确的框架
          expect(detected).toBe(framework);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.2: 框架识别嵌套穿透性
   * 
   * **Validates: Requirements 4.1**
   * 
   * 对于任何嵌套层级（0-8 层）的框架表格容器，
   * detectFramework 应该能够向上遍历并正确识别框架类型
   * 注意：最多遍历 10 层，所以从表格开始算，嵌套 0-8 层都应该能识别
   */
  test('对于任何嵌套层级的框架容器，应该正确识别框架类型', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        fc.integer({ min: 0, max: 8 }), // 嵌套 0-8 层，加上表格本身不超过 10 层
        (framework, nestingLevel) => {
          const classNames = FRAMEWORK_CLASS_NAMES[framework];
          if (classNames.length === 0) return true;
          
          const { table } = createFrameworkTable(framework, classNames[0], nestingLevel);
          
          const detected = detectFramework(table);
          
          // 验证：应该识别为正确的框架（最多向上遍历 10 层）
          expect(detected).toBe(framework);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.3: 框架特征配置完整性
   * 
   * **Validates: Requirements 4.2**
   * 
   * 对于任何支持的 UI 框架，
   * getFrameworkSignature 应该返回有效的特征配置
   */
  test('对于任何支持的框架，应该返回有效的特征配置', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const signature = getFrameworkSignature(framework);
          
          // 验证：特征配置应该存在
          expect(signature).toBeDefined();
          expect(signature.classPatterns).toBeDefined();
          expect(signature.containerSelectors).toBeDefined();
          expect(signature.auxiliaryRowPatterns).toBeDefined();
          expect(signature.fixedColumnPatterns).toBeDefined();
          
          // 验证：至少有一个类名模式
          expect(signature.classPatterns.length).toBeGreaterThan(0);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.4: 框架空表格识别正确性
   * 
   * **Validates: Requirements 4.3**
   * 
   * 对于任何包含框架特定空表格标识的表格，
   * applyFrameworkRules 应该正确识别为空表格
   */
  test('对于任何包含框架特定空表格标识的表格，应该识别为空表格', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const emptyClasses = FRAMEWORK_EMPTY_TABLE_CLASSES[framework];
          if (emptyClasses.length === 0) return true; // 跳过没有空表格标识的框架
          
          // 测试该框架的所有空表格标识
          for (const emptyClass of emptyClasses) {
            cleanupDOM();
            const table = createEmptyFrameworkTable(framework, emptyClass);
            
            const result = applyFrameworkRules(table, framework);
            
            // 验证：应该识别为空表格
            expect(result.isEmpty).toBe(true);
            expect(result.framework).toBe(framework);
          }
          return true;
        }
      ),
      { numRuns: 50 } // 减少迭代次数，因为内部有循环
    );
  });

  /**
   * Property 8.5: 框架固定列识别正确性
   * 
   * **Validates: Requirements 4.4**
   * 
   * 对于任何包含框架特定固定列标识的表格，
   * applyFrameworkRules 应该正确识别固定列
   */
  test('对于任何包含框架特定固定列标识的表格，应该识别固定列', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const fixedClasses = FRAMEWORK_FIXED_COLUMN_CLASSES[framework];
          if (fixedClasses.length === 0) return true; // 跳过没有固定列标识的框架
          
          // 测试该框架的第一个固定列标识
          const fixedClass = fixedClasses[0];
          cleanupDOM();
          const table = createFixedColumnFrameworkTable(framework, fixedClass);
          
          const result = applyFrameworkRules(table, framework);
          
          // 验证：应该识别固定列
          expect(result.hasFixedColumns).toBe(true);
          expect(result.framework).toBe(framework);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.6: 未知框架降级处理
   * 
   * **Validates: Requirements 4.5**
   * 
   * 对于任何没有框架特征类名的表格，
   * detectFramework 应该返回 'unknown'
   */
  test('对于没有框架特征的表格，应该返回 unknown', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }), // 嵌套层级
        (nestingLevel) => {
          // 创建没有框架特征的表格
          let current: HTMLElement = document.body;
          for (let i = 0; i < nestingLevel; i++) {
            const div = document.createElement('div');
            div.className = `custom-wrapper-${i}`;
            current.appendChild(div);
            current = div;
          }
          
          const table = document.createElement('table');
          table.innerHTML = `
            <tr><th>Name</th><th>Age</th></tr>
            <tr><td>Alice</td><td>25</td></tr>
          `;
          current.appendChild(table);
          
          const detected = detectFramework(table);
          
          // 验证：应该返回 unknown
          expect(detected).toBe('unknown');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.7: 框架识别与表格检测集成
   * 
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
   * 
   * 对于任何已知框架的表格，
   * detectHTMLTable 应该正确识别框架并应用框架规则
   */
  test('detectHTMLTable 应该正确识别框架并应用框架规则', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const classNames = FRAMEWORK_CLASS_NAMES[framework];
          if (classNames.length === 0) return true;
          
          const { table } = createFrameworkTable(framework, classNames[0]);
          
          const result = detectHTMLTable(table);
          
          // 验证：应该成功检测表格
          expect(result).not.toBeNull();
          
          if (result) {
            // 验证：框架类型正确
            expect(result.framework).toBe(framework);
            
            // 验证：表格数据正确
            expect(result.rows).toBeGreaterThanOrEqual(2);
            expect(result.cols).toBeGreaterThanOrEqual(2);
            expect(result.type).toBe('html-table');
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.8: 框架识别的确定性
   * 
   * **Validates: Requirements 4.1**
   * 
   * 对于任何表格，多次调用 detectFramework 应该返回相同结果
   */
  test('对于同一表格，多次识别应该返回相同结果', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const classNames = FRAMEWORK_CLASS_NAMES[framework];
          if (classNames.length === 0) return true;
          
          const { table } = createFrameworkTable(framework, classNames[0]);
          
          // 多次识别
          const result1 = detectFramework(table);
          const result2 = detectFramework(table);
          const result3 = detectFramework(table);
          
          // 验证：结果应该相同
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
          expect(result1).toBe(framework);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.9: 框架规则应用的幂等性
   * 
   * **Validates: Requirements 4.2, 4.3, 4.4**
   * 
   * 对于任何表格和框架类型，
   * 多次调用 applyFrameworkRules 应该返回相同结果
   */
  test('对于同一表格，多次应用框架规则应该返回相同结果', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        (framework) => {
          const classNames = FRAMEWORK_CLASS_NAMES[framework];
          if (classNames.length === 0) return true;
          
          const { table } = createFrameworkTable(framework, classNames[0]);
          
          // 多次应用规则
          const result1 = applyFrameworkRules(table, framework);
          const result2 = applyFrameworkRules(table, framework);
          
          // 验证：结果应该相同
          expect(result1).toEqual(result2);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 8.10: 超过最大遍历深度的框架识别
   * 
   * **Validates: Requirements 4.1**
   * 
   * 对于嵌套超过 10 层的表格，
   * detectFramework 应该返回 'unknown'（因为超过最大遍历深度）
   * 
   * 注意：从表格元素开始向上遍历，如果框架标识在第 11 层或更远，
   * 则无法识别（因为只遍历 10 层）
   */
  test('对于嵌套超过 10 层的表格，应该返回 unknown', () => {
    fc.assert(
      fc.property(
        frameworkGenerator,
        fc.integer({ min: 11, max: 15 }), // 嵌套 11-15 层
        (framework, nestingLevel) => {
          const classNames = FRAMEWORK_CLASS_NAMES[framework];
          if (classNames.length === 0) return true;
          
          // 创建深度嵌套的表格
          // 框架标识在最外层（第 nestingLevel 层）
          const wrapper = document.createElement('div');
          wrapper.className = classNames[0]; // 框架标识在最外层
          document.body.appendChild(wrapper);
          
          let current: HTMLElement = wrapper;
          for (let i = 0; i < nestingLevel; i++) {
            const div = document.createElement('div');
            current.appendChild(div);
            current = div;
          }
          
          const table = document.createElement('table');
          table.innerHTML = `
            <tr><th>Name</th><th>Age</th></tr>
            <tr><td>Alice</td><td>25</td></tr>
          `;
          current.appendChild(table);
          
          const detected = detectFramework(table);
          
          // 验证：应该返回 unknown（因为框架标识超过 10 层）
          expect(detected).toBe('unknown');
          return true;
        }
      ),
      { numRuns: 50 }
    );
  });
});
