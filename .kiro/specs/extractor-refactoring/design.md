# 设计文档：Extractor 重构

## 概述

本设计文档描述了浏览器框选复制插件（Browser Selection Copy）的代码重构方案。这是一个**零功能变更**的纯重构项目，目标是将现有的单体 `Extractor` 类拆分为清晰的三段式 pipeline，并收敛各组件的职责边界。

### 重构目标

1. **职责分离**：将文本提取流程拆分为 collect（采集）→ layout（布局）→ format（格式化）三个独立阶段
2. **算法隔离**：将视觉行分组算法（核心护城河）独立为 layout 模块
3. **接口清晰**：通过 index.ts 提供统一的对外接口，隐藏内部实现
4. **组件纯化**：让 BrowserSelectionCopy、Panel、Selection 各司其职，不越界

### 重构原则

- **零功能变更**：所有现有功能和行为保持完全一致
- **零测试新增**：不新增测试，只调整 import 路径
- **零依赖引入**：不引入任何第三方依赖
- **零构建变更**：构建产物结构保持不变

## 架构

### 当前架构问题

```
content/
├── content.ts          # 主控制器（包含部分算法逻辑）
├── extractor.ts        # 单体提取器（职责过重）
├── panel.ts            # 结果面板
└── selection.ts        # 选择框
```

**问题**：
- `extractor.ts` 混合了数据采集、视觉算法、文本格式化三种职责
- 魔法数字（LINE_TOLERANCE = 5）硬编码在类中
- 算法难以独立测试和演进
- `content.ts` 包含部分算法细节

### 目标架构

```
content/
├── content.ts          # 主控制器（纯流程编排）
├── extractor/          # 提取器模块
│   ├── index.ts       # 统一对外接口
│   ├── collect.ts     # 数据采集
│   ├── layout.ts      # 视觉行分组（核心算法）
│   └── format.ts      # 文本格式化
├── panel.ts            # 结果面板（纯展示）
└── selection.ts        # 选择框（纯 UI）
```

**改进**：
- 三段式 pipeline，职责单一
- 算法参数化，便于调优
- 模块独立，易于测试
- 组件纯化，边界清晰

## 组件与接口

### 1. Collect 模块（collect.ts）

**职责**：纯事实采集，不包含任何业务逻辑或视觉判断。

**接口定义**：

```typescript
/**
 * 文本项：包含文本内容和位置信息
 */
export interface TextItem {
  text: string;      // 文本内容
  rect: DOMRect;     // 位置信息
}

/**
 * 采集选择区域内的文本元素
 * @param selectionRect 选择区域
 * @returns 文本项数组
 */
export function collect(selectionRect: DOMRect): TextItem[];
```

**实现逻辑**：

1. 使用 `TreeWalker` 遍历 DOM 中的所有 TextNode
2. 过滤条件：
   - 文本内容非空（`textContent?.trim()`）
   - 父元素可见（`display !== 'none'`, `visibility !== 'hidden'`, `opacity !== '0'`）
3. 对每个文本节点：
   - 获取父元素的 `getClientRects()`
   - 检查每个 rect 是否与 selectionRect 相交
   - 如果相交，创建 `TextItem` 并添加到结果数组
4. 返回 `TextItem[]`

**禁止事项**：
- 不执行排序
- 不执行行合并
- 不执行文本拼接
- 不包含任何视觉判断逻辑（如行判断、间距判断）

### 2. Layout 模块（layout.ts）

**职责**：将文本项按视觉位置组织成二维结构（行 × 列）。这是插件的核心技术护城河。

**接口定义**：

```typescript
/**
 * 布局选项
 */
export interface LayoutOptions {
  lineThresholdRatio: number;  // 行阈值比例（原 LINE_TOLERANCE）
  minHorizontalGap: number;    // 最小水平间距（用于判断是否插入空格）
}

/**
 * 将文本项按视觉行分组
 * @param items 文本项数组
 * @param options 布局选项
 * @returns 二维数组，外层为行，内层为该行的文本项
 */
export function layout(items: TextItem[], options: LayoutOptions): TextItem[][];
```

**实现逻辑**：

1. **行分组**（使用现有算法）：
   - 遍历所有 TextItem
   - 对每个 item，检查其 `rect.top` 与已有行的 `top` 差值
   - 如果差值 ≤ `lineThresholdRatio`，归入该行
   - 否则创建新行
   
2. **行内排序**：
   - 每行内的 TextItem 按 `rect.left` 升序排序

3. **行间排序**：
   - 所有行按第一个元素的 `rect.top` 升序排序

4. 返回 `TextItem[][]`

**参数说明**：
- `lineThresholdRatio`：原代码中的 `LINE_TOLERANCE = 5`，现在作为参数传入
- `minHorizontalGap`：用于 format 阶段判断是否插入空格，这里不使用但需要传递给 format

**禁止事项**：
- 不改变现有算法行为
- 不执行文本拼接

### 3. Format 模块（format.ts）

**职责**：将视觉行结构转换为最终可复制的文本字符串。

**接口定义**：

```typescript
/**
 * 将视觉行结构格式化为文本
 * @param lines 二维文本项数组
 * @returns 格式化后的文本字符串
 */
export function format(lines: TextItem[][]): string;
```

**实现逻辑**：

1. **防护措施**（保留现有逻辑）：
   - 限制最大行数（10 行）
   - 限制每行最大元素数（10 个）
   - 限制单个文本最大长度（1000 字符）
   - 限制单行最大长度（10000 字符）

2. **行内处理**：
   - 遍历每行的 TextItem
   - 提取 `text` 并 trim
   - 根据相邻元素的水平间距判断是否插入空格
   - 使用 `join(' ')` 拼接行内文本

3. **行间处理**：
   - 使用 `join('\n')` 拼接所有行

4. **错误处理**：
   - 捕获所有异常，返回 '文本提取出错' 或部分结果

**输出保证**：
- 与当前版本完全一致的文本格式
- 相同的防护措施和错误处理

### 4. Extractor Index 模块（index.ts）

**职责**：提供统一的对外接口，隐藏内部实现细节。

**接口定义**：

```typescript
/**
 * 提取选择区域内的文本
 * @param selectionRect 选择区域
 * @param options 布局选项
 * @returns 格式化后的文本字符串
 */
export function extractText(
  selectionRect: DOMRect,
  options: LayoutOptions
): string;

// 重新导出类型供外部使用
export type { TextItem, LayoutOptions };
```

**实现逻辑**：

```typescript
export function extractText(
  selectionRect: DOMRect,
  options: LayoutOptions
): string {
  // 严格按照 pipeline 顺序执行
  const items = collect(selectionRect);
  const lines = layout(items, options);
  const text = format(lines);
  return text;
}
```

**设计要点**：
- 唯一对外接口，外部不应直接导入 collect/layout/format
- 严格的 pipeline 顺序：collect → layout → format
- 重新导出必要的类型定义

### 5. BrowserSelectionCopy 重构（content.ts）

**职责**：纯流程编排，不包含算法细节。

**修改点**：

1. **移除**：
   - 移除对 `Extractor` 类的依赖
   - 移除所有 DOM 遍历、rect 处理、排序、拼接相关代码

2. **新增**：
   - 导入 `extractText` 和 `LayoutOptions`
   - 定义默认的 `LayoutOptions`

3. **调用方式**：

```typescript
// 原代码
const text = this.extractor.extract(rect);

// 新代码
const options: LayoutOptions = {
  lineThresholdRatio: 5,
  minHorizontalGap: 10
};
const text = extractText(rect, options);
```

**保留职责**：
- 插件启停状态管理
- 快捷键处理（Ctrl + Shift + Y）
- storage 读写
- Selection 生命周期管理
- Panel 生命周期管理
- 鼠标事件处理（mousedown/mousemove/mouseup）
- 面板位置计算

### 6. Panel 组件纯化（panel.ts）

**当前状态**：Panel 组件已经相对纯粹，主要负责展示。

**确认点**：
- 对外接口：`show(text: string, options)`
- 不判断业务状态
- 不访问 storage
- 不引用其他业务组件

**无需修改**：Panel 组件已符合要求，保持不变。

### 7. Selection 组件纯化（selection.ts）

**当前状态**：Selection 组件已经完全纯粹，只负责选择框 UI。

**确认点**：
- 不访问 storage
- 不引用 panel
- 不引用 extractor
- 不判断插件状态

**无需修改**：Selection 组件已符合要求，保持不变。

## 数据模型

### TextItem

```typescript
interface TextItem {
  text: string;      // 文本内容
  rect: DOMRect;     // 位置信息（包含 left, top, right, bottom, width, height）
}
```

**说明**：
- 简化版的 `TextElement`（移除 `element`, `lineIndex`, `columnIndex`）
- 只保留提取和布局所需的最小信息
- `rect` 使用标准的 `DOMRect` 类型

### LayoutOptions

```typescript
interface LayoutOptions {
  lineThresholdRatio: number;  // 行阈值，用于判断两个元素是否在同一行
  minHorizontalGap: number;    // 最小水平间距，用于判断是否插入空格
}
```

**默认值**：
```typescript
const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  lineThresholdRatio: 5,
  minHorizontalGap: 10
};
```

### SelectionRect

```typescript
interface SelectionRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
```

**说明**：
- 现有类型，保持不变
- 用于表示选择区域的边界

## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性是人类可读规范和机器可验证正确性保证之间的桥梁。*


### 核心属性

#### 属性 1：重构后文本提取结果一致性（回归测试）

*对于任意* DOM 结构和选择区域，重构后的 `extractText` 函数应该产生与重构前的 `Extractor.extract` 完全相同的文本输出。

**验证：需求 10.6**

**说明**：这是最重要的属性，验证整个重构不改变任何功能行为。通过生成随机的 DOM 结构和选择区域，对比重构前后的输出，确保完全一致。

### 单元属性

#### 属性 2：Collect 过滤不可见元素

*对于任意* 包含不可见元素（`display: none`, `visibility: hidden`, `opacity: 0`）的 DOM 结构，`collect` 函数返回的 `TextItem` 数组中不应包含这些不可见元素的文本。

**验证：需求 2.5**

**说明**：验证 collect 模块正确过滤不可见元素。生成随机的 DOM 结构，包含各种不可见元素，验证它们不出现在结果中。

#### 属性 3：Collect 过滤选择区域外的元素

*对于任意* DOM 结构和选择区域，`collect` 函数返回的所有 `TextItem` 的 `rect` 都应该与选择区域相交。

**验证：需求 2.6**

**说明**：验证 collect 模块正确过滤选择区域外的元素。生成随机的 DOM 结构和选择区域，验证所有返回的 rect 都与选择区域相交。

#### 属性 4：Layout 按 Y 坐标分组

*对于任意* `TextItem` 数组和 `LayoutOptions`，`layout` 函数返回的每一行内的所有 `TextItem`，其 `rect.top` 的差值应该小于等于 `lineThresholdRatio`。

**验证：需求 3.5**

**说明**：验证 layout 模块正确按 Y 坐标分组。生成随机的 TextItem 数组，验证同一行内的元素 Y 坐标接近。

#### 属性 5：Layout 行内按 X 坐标排序

*对于任意* `TextItem` 数组和 `LayoutOptions`，`layout` 函数返回的每一行内的 `TextItem` 应该按 `rect.left` 升序排列。

**验证：需求 3.6**

**说明**：验证 layout 模块正确在行内排序。生成随机的 TextItem 数组，验证每行内的元素按 X 坐标升序排列。

#### 属性 6：Layout 行间按 Y 坐标排序

*对于任意* `TextItem` 数组和 `LayoutOptions`，`layout` 函数返回的所有行应该按第一个元素的 `rect.top` 升序排列。

**验证：需求 3.7**

**说明**：验证 layout 模块正确在行间排序。生成随机的 TextItem 数组，验证所有行按 Y 坐标升序排列。

#### 属性 7：Format 行间插入换行符

*对于任意* 包含多行的 `TextItem[][]`，`format` 函数返回的字符串应该在行间包含换行符 `\n`。

**验证：需求 4.3**

**说明**：验证 format 模块正确在行间插入换行符。生成随机的多行输入，验证输出包含正确数量的换行符。

### 边界情况属性

#### 属性 8：Format 防护措施

*对于任意* 超大的 `TextItem[][]`（超过 10 行、每行超过 10 个元素、单个文本超过 1000 字符），`format` 函数应该正确限制输出，不抛出异常。

**验证：需求 4.5, 4.6**

**说明**：验证 format 模块的防护措施。生成超大输入，验证函数不崩溃且输出被正确限制。

#### 属性 9：错误处理一致性

*对于任意* 会导致错误的输入（如空 DOM、异常大的选择区域），重构后的错误处理行为应该与重构前一致。

**验证：需求 10.7**

**说明**：验证错误处理不变。生成各种边界和错误输入，验证重构前后的错误处理行为一致。

## 错误处理

### Collect 模块错误处理

1. **空 DOM**：如果 DOM 中没有文本节点，返回空数组 `[]`
2. **无效选择区域**：如果选择区域无效（如 left > right），返回空数组 `[]`
3. **DOM 访问异常**：捕获所有 DOM 访问异常，返回空数组 `[]`

### Layout 模块错误处理

1. **空输入**：如果输入数组为空，返回空数组 `[]`
2. **无效选项**：如果 `lineThresholdRatio` 为负数或 NaN，使用默认值 5
3. **异常输入**：捕获所有异常，返回包含原始输入的单行数组 `[[...items]]`

### Format 模块错误处理

1. **空输入**：如果输入数组为空，返回空字符串 `''`
2. **超大输入**：
   - 限制最大行数为 10
   - 限制每行最大元素数为 10
   - 限制单个文本最大长度为 1000 字符
   - 限制单行最大长度为 10000 字符
3. **文本拼接异常**：如果 `join` 操作失败，返回部分结果或 `'文本提取出错'`
4. **任何其他异常**：捕获所有异常，返回 `'文本提取出错'`

### ExtractText 错误处理

1. **传递错误**：将 collect、layout、format 的错误向上传递
2. **最终兜底**：如果整个 pipeline 失败，返回 `'文本提取出错'`

### 错误处理原则

- **保持一致**：重构后的错误处理行为与重构前完全一致
- **不抛出异常**：所有错误都被捕获并转换为合理的返回值
- **用户友好**：错误信息清晰，不暴露内部实现细节

## 测试策略

### 测试原则

1. **零新增测试**：不新增测试文件，只调整 import 路径
2. **回归测试优先**：确保所有现有测试通过
3. **属性测试为辅**：如果需要验证属性，使用现有的测试框架（Jest）

### 测试类型

#### 1. 回归测试（现有测试）

**目标**：确保重构不改变任何功能行为。

**覆盖范围**：
- `test/structure.test.ts`：项目结构和组件导入
- `test/extension.test.ts`：核心功能和用户交互
- `test/manifest.test.ts`：配置文件验证
- `test/dependency.test.ts`：依赖关系验证

**执行方式**：
```bash
npm test
```

**预期结果**：所有测试通过，无新增失败。

#### 2. 单元测试（可选，如需验证属性）

**目标**：验证各个模块的正确性属性。

**测试框架**：Jest（已安装）

**属性测试库**：fast-check（已安装）

**测试配置**：
- 每个属性测试至少运行 100 次迭代
- 使用随机生成的输入数据
- 标记格式：`Feature: extractor-refactoring, Property {number}: {property_text}`

**示例测试结构**：

```typescript
import fc from 'fast-check';
import { collect } from '../src/content/extractor/collect';

describe('Collect 模块属性测试', () => {
  test('属性 2：过滤不可见元素', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          text: fc.string(),
          visible: fc.boolean(),
          rect: fc.record({
            left: fc.float(),
            top: fc.float(),
            right: fc.float(),
            bottom: fc.float()
          })
        })),
        (items) => {
          // 创建 DOM 结构
          // 调用 collect
          // 验证不可见元素不在结果中
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

**注意**：由于这是纯重构项目，单元测试是可选的。如果现有测试已经充分覆盖，可以不新增单元测试。

### 测试执行流程

1. **重构前**：
   - 运行所有测试，确保全部通过
   - 记录测试覆盖率

2. **重构中**：
   - 每完成一个模块，运行测试
   - 调整 import 路径
   - 确保测试持续通过

3. **重构后**：
   - 运行所有测试，确保全部通过
   - 验证测试覆盖率不降低
   - 手动测试核心功能

### 测试调整

**需要调整的测试文件**：

1. `test/structure.test.ts`：
   - 调整 `Extractor` 的导入路径
   - 从 `import { Extractor } from '../src/content/extractor'`
   - 改为 `import { extractText } from '../src/content/extractor'`

2. `test/extension.test.ts`：
   - 调整 `Extractor` 的 mock
   - 从 `jest.spyOn(Extractor.prototype, 'extract')`
   - 改为 mock `extractText` 函数

**不需要调整的测试文件**：
- `test/manifest.test.ts`：不涉及代码导入
- `test/dependency.test.ts`：不涉及代码导入

### 手动测试清单

重构完成后，执行以下手动测试：

1. **基本功能**：
   - [ ] 启用插件（快捷键 Ctrl + Shift + Y）
   - [ ] 拖拽创建选择框
   - [ ] 提取文本并显示面板
   - [ ] 复制文本到剪贴板
   - [ ] 关闭面板

2. **配置选项**：
   - [ ] 面板位置：居中
   - [ ] 面板位置：跟随鼠标
   - [ ] 面板位置：不弹出（直接复制）

3. **边界情况**：
   - [ ] 空选择区域
   - [ ] 超大选择区域
   - [ ] 包含不可见元素的区域
   - [ ] 包含特殊字符的文本

4. **错误处理**：
   - [ ] 在空白页面使用
   - [ ] 在复杂页面使用
   - [ ] 快速连续操作

## 实施计划

### 阶段 1：创建新模块结构

1. 创建 `src/content/extractor/` 目录
2. 创建 `collect.ts`、`layout.ts`、`format.ts`、`index.ts` 四个文件
3. 定义接口和类型

### 阶段 2：实现 Collect 模块

1. 将 `getTextElements` 逻辑迁移到 `collect.ts`
2. 简化 `TextElement` 为 `TextItem`
3. 移除排序和行合并逻辑
4. 测试 collect 函数

### 阶段 3：实现 Layout 模块

1. 将 `sortByVisualOrder` 逻辑迁移到 `layout.ts`
2. 参数化魔法数字（LINE_TOLERANCE）
3. 保持算法行为不变
4. 测试 layout 函数

### 阶段 4：实现 Format 模块

1. 将 `combineText` 逻辑迁移到 `format.ts`
2. 保留所有防护措施
3. 保持输出格式不变
4. 测试 format 函数

### 阶段 5：实现 Index 模块

1. 在 `index.ts` 中组合三个模块
2. 实现 `extractText` 函数
3. 重新导出类型
4. 测试整个 pipeline

### 阶段 6：重构 BrowserSelectionCopy

1. 移除对 `Extractor` 类的依赖
2. 导入 `extractText` 和 `LayoutOptions`
3. 定义默认的 `LayoutOptions`
4. 调用 `extractText` 替代 `this.extractor.extract`
5. 测试主控制器

### 阶段 7：清理和测试

1. 删除原有的 `src/content/extractor.ts`
2. 调整测试文件的 import 路径
3. 运行所有测试，确保通过
4. 执行手动测试清单
5. 验证构建产物

### 阶段 8：验收

1. 对比重构前后的功能行为
2. 验证所有需求的验收标准
3. 确认代码质量和可维护性提升
4. 文档更新（如需要）

## 风险与缓解

### 风险 1：算法行为变化

**描述**：重构过程中可能无意中改变视觉行分组算法的行为。

**缓解措施**：
- 使用属性 1（回归测试）验证输出一致性
- 保留原有的所有逻辑和魔法数字
- 逐步迁移，每步都运行测试

### 风险 2：测试调整错误

**描述**：调整测试 import 路径时可能引入错误。

**缓解措施**：
- 仔细检查每个 import 语句
- 运行测试验证调整正确
- 使用 TypeScript 类型检查

### 风险 3：构建产物变化

**描述**：模块拆分可能导致构建产物结构变化。

**缓解措施**：
- 验证 esbuild 配置正确
- 检查构建输出的文件结构
- 确认仍然输出单一 content.js

### 风险 4：性能下降

**描述**：模块拆分可能引入额外的函数调用开销。

**缓解措施**：
- 现代 JavaScript 引擎会内联小函数
- 构建工具会进行优化
- 如有性能问题，可以通过性能测试验证

## 总结

本设计文档描述了一个**零功能变更**的纯重构方案，将单体 `Extractor` 类拆分为清晰的三段式 pipeline（collect → layout → format），并收敛各组件的职责边界。

**核心价值**：
1. **职责单一**：每个模块只做一件事
2. **算法隔离**：视觉行分组算法独立，易于演进
3. **接口清晰**：统一的对外接口，隐藏实现细节
4. **可测试性**：模块独立，易于单元测试
5. **可维护性**：代码结构清晰，易于理解和修改

**重构保证**：
- 所有现有功能和行为保持完全一致
- 所有现有测试持续通过
- 构建产物结构保持不变
- 不引入任何第三方依赖

这次重构为未来的 V2 版本（可变现、可扩展）奠定了坚实的基础。
