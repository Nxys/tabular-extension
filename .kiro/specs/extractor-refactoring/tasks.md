# 实施计划：Extractor 重构

## 概述

本任务列表将 Extractor 重构分解为一系列增量式的编码步骤。每个任务都是独立的、可验证的，并且构建在前一个任务的基础上。重构完成后，所有现有功能和行为将保持完全一致。

## 任务

- [x] 1. 创建 Extractor 模块目录结构
  - 创建 `src/content/extractor/` 目录
  - 创建四个空文件：`collect.ts`、`layout.ts`、`format.ts`、`index.ts`
  - _需求：1.1_

- [x] 2. 实现 Collect 模块
  - [x] 2.1 定义 TextItem 接口和 collect 函数签名
    - 在 `collect.ts` 中定义 `TextItem` 接口（包含 `text: string` 和 `rect: DOMRect`）
    - 定义 `collect` 函数签名：`(selectionRect: DOMRect) => TextItem[]`
    - _需求：2.1, 2.2_

  - [x] 2.2 实现 DOM 遍历和文本采集逻辑
    - 从原 `extractor.ts` 的 `getTextElements` 方法迁移逻辑
    - 使用 `TreeWalker` 遍历 DOM TextNode
    - 过滤不可见元素（`display: none`, `visibility: hidden`, `opacity: 0`）
    - 过滤不在选择区域内的 rect
    - 返回 `TextItem[]`，不执行排序或行合并
    - _需求：2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [x] 3. 实现 Layout 模块
  - [x] 3.1 定义 LayoutOptions 接口和 layout 函数签名
    - 在 `layout.ts` 中定义 `LayoutOptions` 接口（包含 `lineThresholdRatio` 和 `minHorizontalGap`）
    - 定义 `layout` 函数签名：`(items: TextItem[], options: LayoutOptions) => TextItem[][]`
    - _需求：3.1, 3.2_

  - [x] 3.2 实现视觉行分组算法
    - 从原 `extractor.ts` 的 `sortByVisualOrder` 方法迁移逻辑
    - 将 `LINE_TOLERANCE = 5` 替换为 `options.lineThresholdRatio`
    - 按 Y 坐标将 TextItem 分组为视觉行
    - 在每个视觉行内按 X 坐标排序
    - 在行间按 Y 坐标排序
    - 返回 `TextItem[][]`
    - _需求：3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 4. 实现 Format 模块
  - [x] 4.1 定义 format 函数签名
    - 在 `format.ts` 中定义 `format` 函数签名：`(lines: TextItem[][]) => string`
    - _需求：4.1_

  - [x] 4.2 实现文本格式化逻辑
    - 从原 `extractor.ts` 的 `combineText` 方法迁移逻辑
    - 保留所有防护措施（限制行数、元素数、文本长度）
    - 在行内根据水平间距判断是否插入空格
    - 在行间插入换行符
    - 保留所有错误处理逻辑（try-catch）
    - 确保输出与原版本完全一致
    - _需求：4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 5. 实现 Extractor Index 模块
  - [x] 5.1 实现 extractText 函数
    - 在 `index.ts` 中导入 `collect`、`layout`、`format`
    - 实现 `extractText` 函数，严格按照 `collect → layout → format` 顺序执行
    - 定义默认的 `LayoutOptions`（`lineThresholdRatio: 5, minHorizontalGap: 10`）
    - _需求：5.1, 5.2, 5.3_

  - [x] 5.2 导出类型和函数
    - 重新导出 `TextItem` 和 `LayoutOptions` 类型
    - 导出 `extractText` 函数
    - _需求：5.4, 5.5_

- [x] 6. 检查点 - 验证新模块
  - 确保新模块编译通过
  - 确保类型定义正确
  - 询问用户是否有问题

- [x] 7. 重构 BrowserSelectionCopy
  - [x] 7.1 更新 content.ts 的导入
    - 移除 `import { Extractor } from './extractor'`
    - 添加 `import { extractText, LayoutOptions } from './extractor'`
    - 移除 `private extractor: Extractor` 字段
    - 移除 `this.extractor = new Extractor()` 初始化
    - _需求：6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 更新文本提取调用
    - 定义 `LayoutOptions` 常量
    - 将 `this.extractor.extract(rect)` 替换为 `extractText(rect, options)`
    - 确保所有其他功能保持不变（启停状态、快捷键、storage、Selection、Panel）
    - _需求：6.5, 6.6, 6.7, 6.8, 6.9_

- [x] 8. 删除旧的 Extractor 文件
  - 删除 `src/content/extractor.ts`
  - _需求：1.2_

- [x] 9. 更新测试文件
  - [x] 9.1 更新 structure.test.ts
    - 调整 Extractor 的导入路径
    - 从 `import { Extractor } from '../src/content/extractor'` 改为 `import { extractText } from '../src/content/extractor'`
    - 更新相关测试用例
    - _需求：9.3_

  - [x] 9.2 更新 extension.test.ts
    - 调整 Extractor 的 mock
    - 从 `jest.spyOn(Extractor.prototype, 'extract')` 改为 mock `extractText` 函数
    - 更新相关测试用例
    - _需求：9.3_

- [x] 10. 检查点 - 运行所有测试
  - 运行 `npm test` 确保所有测试通过
  - 如果有测试失败，修复问题
  - 询问用户是否有问题
  - _需求：9.4_

- [x] 11. 验证和调整构建脚本
  - [x] 11.1 验证 esbuild 配置
    - 检查 `package.json` 中的 `build:content` 脚本
    - 确认入口文件仍然是 `src/content/content.ts`
    - 确认 esbuild 会自动打包 `extractor/` 目录下的所有模块
    - _需求：1.5, 9.5_

  - [x] 11.2 测试构建
    - 运行 `npm run build` 构建项目
    - 检查 `build/dist/content/content.js` 是否成功生成
    - 检查文件大小是否合理（与重构前相近）
    - _需求：1.5, 9.5_

  - [x] 11.3 验证构建产物
    - 运行 `npm run extension` 生成最终扩展包
    - 检查 `build/extension/content/content.js` 是否存在
    - 确认构建产物结构与重构前一致
    - 如果构建失败或产物异常，调整构建脚本
    - _需求：1.5, 9.5_

- [x] 12. 手动功能测试
  - 在浏览器中加载扩展
  - 测试基本功能：启用插件、拖拽选择、提取文本、复制
  - 测试配置选项：面板位置（居中、跟随鼠标、不弹出）
  - 测试边界情况：空选择、超大选择、不可见元素
  - 确认所有功能与重构前完全一致
  - _需求：10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 13. 更新项目文档
  - [x] 13.1 更新 docs/README.md
    - 更新"核心组件"部分的 Extractor 描述
    - 说明 Extractor 现在是一个模块，包含 collect、layout、format 三个子模块
    - 更新项目结构图，反映新的目录结构
    - _需求：1.1_

  - [x] 13.2 更新 docs/STRUCTURE.md（如果存在）
    - 更新代码结构说明
    - 描述三段式 pipeline 的设计
    - _需求：1.1_

- [x] 14. 最终验收
  - 确认所有需求的验收标准已满足
  - 确认代码质量和可维护性提升
  - 确认没有引入第三方依赖
  - 确认 manifest.json 保持不变
  - 确认文档已更新，准确反映新的代码结构
  - _需求：9.6, 9.7, 10.8, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

## 注意事项

1. **增量式重构**：每个任务都是独立的，完成一个任务后再进行下一个
2. **频繁测试**：每完成一个模块，运行测试确保没有破坏现有功能
3. **保持一致**：所有代码逻辑、错误处理、防护措施都要与原版本保持一致
4. **不要优化**：不要"顺手优化"算法或改变任何行为
5. **类型安全**：利用 TypeScript 的类型检查确保接口正确

## 成功标准

- [x] 所有现有测试通过
- [x] 构建产物结构不变
- [x] 手动测试功能完全一致
- [x] 代码结构清晰，职责单一
- [x] 没有引入新的依赖
- [x] manifest.json 保持不变
- [x] 文档已更新，准确反映新的代码结构
