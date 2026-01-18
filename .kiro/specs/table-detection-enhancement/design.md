# 设计文档：表格检测增强

## 概述

本设计旨在增强 Chrome 浏览器扩展的表格检测能力，重点解决 Ant Design 等现代 UI 框架的复杂表格结构检测问题。

### 核心问题分析

**当前问题：**
1. 空表格检测失败：要求至少 2 行数据，导致只有表头的表格被过滤
2. 占位行干扰：Ant Design 的占位行被计入行数但不包含有效数据
3. 辅助行未过滤：测量行和隐藏行未被过滤
4. 固定列未识别：没有特殊处理固定列
5. 嵌套结构穿透不足：未穿透容器嵌套

### 设计目标

1. 支持空表格检测（只有表头的表格）
2. 正确识别和过滤 Ant Design 的辅助行
3. 支持固定列表格的完整数据提取
4. 穿透嵌套容器找到实际表格元素
5. 保持向后兼容，不影响现有功能
6. 遵循三层架构，所有逻辑在 Content 层

## 架构

### 模块职责

本设计只涉及 Content 层的 `detector.ts` 模块。

**detector.ts 职责：**
- 扫描页面识别表格结构
- 提取表格数据（表头和数据行）
- 注入导出按钮到表格容器
- 处理各种表格变体

**不涉及的职责：**
- 业务逻辑判断
- 状态管理
- 消息通信

### 数据流

```
页面 DOM → scanTables() → detectHTMLTable() → TableInfo[] → injectExportButton()
```

## 组件和接口

### 1. 增强的表格信息接口

```typescript
export interface TableInfo {
  element: HTMLElement;
  type: 'html-table' | 'div-table';
  rows: number;
  cols: number;
  data: string[][];
  boundingRect: DOMRect;
  isEmpty: boolean;
  hasFixedColumns: boolean;
  framework?: UIFramework;  // 支持多种 UI 框架
}

type UIFramework = 
  | 'ant-design' | 'element-ui' | 'element-plus' 
  | 'arco-design' | 'naive-ui' | 'vuetify'
  | 'material-ui' | 'bootstrap' | 'semantic-ui'
  | 'unknown';
```

### 2. 辅助行检测接口

```typescript
type AuxiliaryRowType = 'placeholder' | 'measure' | 'hidden' | 'zero-height';

function isAuxiliaryRow(row: HTMLTableRowElement): AuxiliaryRowType | null;
```

### 3. 固定列检测接口

```typescript
interface FixedColumnInfo {
  index: number;
  position: 'left' | 'right';
  element: HTMLElement;
}

function detectFixedColumns(table: HTMLTableElement): FixedColumnInfo[];
```

### 4. 框架识别接口

```typescript
/**
 * 支持的 UI 框架类型
 */
type UIFramework = 
  | 'ant-design'      // Ant Design (React)
  | 'element-ui'      // Element UI (Vue 2)
  | 'element-plus'    // Element Plus (Vue 3)
  | 'arco-design'     // Arco Design (字节跳动)
  | 'naive-ui'        // Naive UI (Vue 3)
  | 'vuetify'         // Vuetify (Vue)
  | 'material-ui'     // Material-UI (React)
  | 'bootstrap'       // Bootstrap
  | 'semantic-ui'     // Semantic UI
  | 'unknown';        // 未知框架

/**
 * 框架特征配置
 */
interface FrameworkSignature {
  classPatterns: RegExp[];           // 类名特征模式
  containerSelectors: string[];      // 容器选择器
  auxiliaryRowPatterns: RegExp[];    // 辅助行特征
  fixedColumnPatterns: RegExp[];     // 固定列特征
}

/**
 * 识别 UI 框架类型
 */
function detectFramework(element: HTMLElement): UIFramework;

/**
 * 应用框架特定的检测规则
 */
function applyFrameworkRules(
  table: HTMLTableElement, 
  framework: UIFramework
): Partial<TableInfo>;

/**
 * 获取框架特征配置
 */
function getFrameworkSignature(framework: UIFramework): FrameworkSignature;
```

## 数据模型

### 框架特征库

为了支持多种前端框架的表格检测，系统维护一个框架特征库：

```typescript
/**
 * 框架特征库
 */
const FRAMEWORK_SIGNATURES: Record<UIFramework, FrameworkSignature> = {
  'ant-design': {
    classPatterns: [/^ant-table/, /^ant-table-wrapper/],
    containerSelectors: ['.ant-table-container', '.ant-table-content'],
    auxiliaryRowPatterns: [/ant-table-placeholder/, /ant-table-measure-row/],
    fixedColumnPatterns: [/ant-table-cell-fix-left/, /ant-table-cell-fix-right/]
  },
  'element-ui': {
    classPatterns: [/^el-table/, /^el-table__/],
    containerSelectors: ['.el-table__body-wrapper', '.el-table__header-wrapper'],
    auxiliaryRowPatterns: [/el-table__empty-block/],
    fixedColumnPatterns: [/el-table-fixed-column/, /is-fixed/]
  },
  'element-plus': {
    classPatterns: [/^el-table/, /^el-table__/],
    containerSelectors: ['.el-table__body-wrapper', '.el-table__inner-wrapper'],
    auxiliaryRowPatterns: [/el-table__empty-text/],
    fixedColumnPatterns: [/el-table__fixed/, /is-fixed/]
  },
  'arco-design': {
    classPatterns: [/^arco-table/, /^arco-table-/],
    containerSelectors: ['.arco-table-container', '.arco-table-content'],
    auxiliaryRowPatterns: [/arco-table-empty/, /arco-table-tr-measure/],
    fixedColumnPatterns: [/arco-table-col-fixed-left/, /arco-table-col-fixed-right/]
  },
  'naive-ui': {
    classPatterns: [/^n-data-table/, /^n-table/],
    containerSelectors: ['.n-data-table-wrapper', '.n-data-table-base-table'],
    auxiliaryRowPatterns: [/n-data-table-empty/],
    fixedColumnPatterns: [/n-data-table-td--fixed-left/, /n-data-table-td--fixed-right/]
  },
  'vuetify': {
    classPatterns: [/^v-data-table/, /^v-table/],
    containerSelectors: ['.v-data-table__wrapper', '.v-table__wrapper'],
    auxiliaryRowPatterns: [/v-data-table__empty-wrapper/],
    fixedColumnPatterns: [/v-data-table__td--fixed/]
  },
  'material-ui': {
    classPatterns: [/^MuiTable/, /^MuiDataGrid/],
    containerSelectors: ['.MuiTable-root', '.MuiDataGrid-root'],
    auxiliaryRowPatterns: [/MuiTableRow-empty/],
    fixedColumnPatterns: [/MuiTableCell--stickyHeader/, /MuiDataGrid-cell--pinnedLeft/]
  },
  'bootstrap': {
    classPatterns: [/^table/, /^table-/],
    containerSelectors: ['.table-responsive'],
    auxiliaryRowPatterns: [],
    fixedColumnPatterns: [/table-fixed/]
  },
  'semantic-ui': {
    classPatterns: [/^ui\.table/],
    containerSelectors: ['.ui.table'],
    auxiliaryRowPatterns: [],
    fixedColumnPatterns: [/fixed/]
  },
  'unknown': {
    classPatterns: [],
    containerSelectors: [],
    auxiliaryRowPatterns: [],
    fixedColumnPatterns: []
  }
};
```

### 框架检测算法

```typescript
/**
 * 检测表格所属的 UI 框架
 * 
 * 算法：
 * 1. 从表格元素向上遍历 DOM 树
 * 2. 检查每个祖先元素的类名
 * 3. 匹配框架特征库中的类名模式
 * 4. 返回第一个匹配的框架类型
 */
function detectFramework(element: HTMLElement): UIFramework {
  let current: HTMLElement | null = element;
  
  // 向上遍历最多 10 层
  for (let depth = 0; depth < 10 && current; depth++) {
    const className = current.className;
    
    // 遍历所有框架特征
    for (const [framework, signature] of Object.entries(FRAMEWORK_SIGNATURES)) {
      for (const pattern of signature.classPatterns) {
        if (pattern.test(className)) {
          return framework as UIFramework;
        }
      }
    }
    
    current = current.parentElement;
  }
  
  return 'unknown';
}
```

### 表格检测配置（增强版）

```typescript
export interface TableDetectionConfig {
  minRows: number;
  minCols: number;
  alignmentThreshold: number;
  gridGapTolerance: number;
  detectEmptyTables: boolean;
  filterAuxiliaryRows: boolean;
  detectFixedColumns: boolean;
  penetrateNesting: boolean;
}

const DEFAULT_CONFIG: TableDetectionConfig = {
  minRows: 1,
  minCols: 2,
  alignmentThreshold: 5,
  gridGapTolerance: 10,
  detectEmptyTables: true,
  filterAuxiliaryRows: true,
  detectFixedColumns: true,
  penetrateNesting: true
};
```


## 正确性属性

*属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1：空表格检测完整性

*对于任何*只包含表头的 HTML 表格，检测器应该识别该表格并返回至少包含表头行的表格数据。

**验证：需求 1.1, 1.4**

### 属性 2：占位行过滤正确性

*对于任何*包含占位行（class="ant-table-placeholder"）的表格，检测器应该过滤掉占位行并正确提取表头结构。

**验证：需求 1.2, 1.3**

### 属性 3：辅助行过滤完整性

*对于任何*包含辅助行（测量行、隐藏行、零高度行）的表格，检测器应该过滤掉所有辅助行，只保留有效数据行。

**验证：需求 3.4, 3.5**

### 属性 4：固定列识别完整性

*对于任何*包含固定列（position: sticky 或固定列类名）的表格，检测器应该识别所有列包括固定列，并按视觉顺序排列。

**验证：需求 2.1, 2.2, 2.3**

### 属性 5：固定列去重正确性

*对于任何*包含重叠固定列的表格，检测器应该去重并保留唯一的列数据，总列数计算正确。

**验证：需求 2.4, 2.5**

### 属性 6：嵌套穿透完整性

*对于任何*包含多层容器嵌套的表格，检测器应该穿透嵌套层级找到实际的 `<table>` 元素并正确提取数据。

**验证：需求 3.1, 3.3**

### 属性 7：文本提取完整性

*对于任何*表格单元格，无论其内部 DOM 结构多复杂，检测器应该提取所有可见文本内容并合并。

**验证：需求 3.2, 7.4**

### 属性 8：UI 框架识别通用性

*对于任何*包含已知 UI 框架特征类名的表格容器（Ant Design、Element UI、Arco Design、Naive UI、Vuetify、Material-UI、Bootstrap、Semantic UI 等），检测器应该正确识别框架类型并应用对应的检测规则。

**验证：需求 4.1, 4.2, 4.3, 4.4, 4.5**

### 属性 9：导出按钮注入幂等性

*对于任何*被检测到的表格，多次调用注入函数应该只产生一个导出按钮，且按钮位置正确。

**验证：需求 5.1, 5.3, 5.4**

### 属性 10：样式自动调整正确性

*对于任何*使用 `position: static` 的表格容器，注入导出按钮时应该自动设置为 `position: relative`。

**验证：需求 5.2**

### 属性 11：可见性过滤完整性

*对于任何*不可见的表格（display:none, visibility:hidden, opacity:0, 零尺寸），检测器应该跳过该表格。

**验证：需求 6.1, 6.2, 6.3, 6.4**

### 属性 12：父元素可见性递归检查

*对于任何*嵌套在隐藏父元素中的表格，检测器应该递归检查父元素可见性并跳过该表格。

**验证：需求 6.5**

### 属性 13：空单元格占位保留

*对于任何*包含空单元格的表格，检测器应该在数据数组中保留空字符串占位，保持列对齐。

**验证：需求 7.1**

### 属性 14：合并单元格处理正确性

*对于任何*包含 colspan 或 rowspan 的表格，检测器应该正确处理合并单元格的数据提取。

**验证：需求 7.2**

### 属性 15：特殊字符处理正确性

*对于任何*包含特殊字符（换行符、制表符）的单元格，检测器应该保留或规范化这些字符。

**验证：需求 7.3**

### 属性 16：文本清理一致性

*对于任何*单元格文本，检测器应该去除首尾空白字符，保持数据整洁。

**验证：需求 7.5**

### 属性 17：错误隔离性

*对于任何*检测过程中的单个表格错误，检测器应该记录错误并继续检测其他表格，不影响整体扫描。

**验证：需求 8.1**

### 属性 18：错误降级策略

*对于任何*提取或注入过程中的错误，检测器应该返回 null 或静默失败，不抛出异常影响页面功能。

**验证：需求 8.2, 8.3**

### 属性 19：致命错误降级

*对于任何*扫描页面时的致命错误，检测器应该返回空数组而不是崩溃，并记录错误信息。

**验证：需求 8.4, 8.5**

### 属性 20：可见性缓存有效性

*对于任何*重复检查的元素，检测器应该使用可见性缓存避免重复计算，提升性能。

**验证：需求 9.2**

### 属性 21：配置参数有效性

*对于任何*配置参数（最小行数、最小列数、对齐阈值、间隙容差），检测器应该正确应用配置值，未提供时使用默认值。

**验证：需求 10.1, 10.2, 10.3, 10.4, 10.5**


## 错误处理

### 错误分类

1. **可恢复错误**：单个表格检测失败
   - 策略：记录错误，继续检测其他表格
   - 返回：跳过该表格，不影响其他表格

2. **数据提取错误**：表格数据提取失败
   - 策略：返回 null，不抛出异常
   - 日志：记录表格元素和错误信息

3. **UI 注入错误**：导出按钮注入失败
   - 策略：静默失败，不影响页面功能
   - 日志：记录错误但不阻塞

4. **致命错误**：整个扫描过程崩溃
   - 策略：返回空数组，降级处理
   - 日志：记录完整错误堆栈

### 错误日志格式

```typescript
console.error('[TableDetector]', errorType, {
  element: element.tagName,
  className: element.className,
  error: error.message,
  stack: error.stack
});
```

## 测试策略

### 双重测试方法

本设计采用单元测试和属性测试相结合的方式：

- **单元测试**：验证具体示例、边缘情况和错误条件
- **属性测试**：验证跨所有输入的通用属性
- 两者互补，共同确保全面覆盖

### 单元测试

**测试重点：**
- 空表格检测（只有表头）
- 占位行过滤（ant-table-placeholder）
- 辅助行过滤（measure-row, aria-hidden）
- 固定列识别（sticky, fix-left, fix-right）
- 嵌套容器穿透
- Ant Design 框架识别
- 错误处理和降级

**测试工具：**
- Jest + jsdom（模拟 DOM 环境）
- @testing-library/dom（DOM 查询和断言）

**测试示例：**
```typescript
describe('空表格检测', () => {
  it('应该检测只有表头的表格', () => {
    const table = createTableWithHeaderOnly();
    const result = detectHTMLTable(table);
    expect(result).not.toBeNull();
    expect(result.rows).toBe(1);
    expect(result.isEmpty).toBe(true);
  });
});
```

### 属性测试

**测试库：** fast-check（TypeScript 属性测试库）

**测试配置：**
- 每个属性测试至少 100 次迭代
- 使用随机生成的表格结构
- 标签格式：`Feature: table-detection-enhancement, Property {N}: {property_text}`

**生成器设计：**
```typescript
const arbitraryTable = fc.record({
  rows: fc.integer({ min: 0, max: 20 }),
  cols: fc.integer({ min: 1, max: 10 }),
  isEmpty: fc.boolean(),
  hasPlaceholder: fc.boolean(),
  hasFixedColumns: fc.boolean(),
  framework: fc.constantFrom('ant-design', 'element-ui', 'unknown')
});
```

**属性测试示例：**
```typescript
// Feature: table-detection-enhancement, Property 1: 空表格检测完整性
it('属性 1：空表格检测完整性', () => {
  fc.assert(
    fc.property(arbitraryEmptyTable, (tableSpec) => {
      const table = generateTable(tableSpec);
      const result = detectHTMLTable(table);
      
      if (result !== null) {
        expect(result.data.length).toBeGreaterThanOrEqual(1);
        expect(result.isEmpty).toBe(true);
      }
    }),
    { numRuns: 100 }
  );
});
```

### 集成测试

**测试场景：**
1. 真实 Ant Design 表格 HTML（从用户报告的案例）
2. 空表格 + 固定列组合
3. 深度嵌套 + 占位行组合
4. 大量表格的性能测试（100+ 表格）

**测试数据：**
- 保存用户报告的真实 HTML 片段
- 创建各种组合场景的测试用例
- 使用真实网站的表格结构

### 测试覆盖率目标

- Content 层：≥85%（遵循开发规范）
- 核心检测逻辑：≥95%
- 错误处理分支：100%
