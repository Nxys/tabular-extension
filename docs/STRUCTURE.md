# 项目结构

## 🏗️ 整体架构（极简分类）

```
./
├─ src/                   # 📝 源码（开发，包含图标资源）
├─ test/                  # 🧪 测试（单元测试）
├─ build/                 # 🔧 构建（编译打包）
└─ docs/                  # 📚 文档（说明指南）
```

## 📝 源码目录（src/）

```
src/
├─ background.ts        # 后台脚本（处理快捷键、消息通信）
├─ types.ts             # 类型定义（SelectionRect、PluginSettings 等）
├─ manifest.json        # 扩展配置（Manifest v3）
├─ content/             # 内容脚本模块
│  ├─ content.ts       # 内容脚本入口（组合所有组件，管理完整流程）
│  ├─ content.css      # 样式文件（CSS 变量 + 媒体查询）
│  ├─ selection.ts     # 选择框组件（鼠标交互、UI 管理）
│  ├─ panel.ts         # 结果面板（文本预览、表格显示、CSV 导出）
│  ├─ extractor/       # 文本提取器模块（三段式 pipeline）
│  │  ├─ index.ts     # 统一对外接口（extractText 函数）
│  │  ├─ collect.ts   # 数据采集（TreeWalker + 可见性缓存）
│  │  ├─ layout.ts    # 视觉行分组（核心算法，技术护城河）
│  │  └─ format.ts    # 文本格式化（防护措施）
│  ├─ table/           # 表格处理模块（Pro 功能）
│  │  ├─ detect.ts    # 表格检测（X 轴位置聚类）
│  │  ├─ align.ts     # 列对齐（中英文混合宽度计算）
│  │  └─ csv.ts       # CSV 导出（RFC 4180 标准）
│  ├─ usage/           # 使用统计模块
│  │  ├─ usage.ts     # 行为信号记录器（record、checkUsage）
│  │  ├─ storage.ts   # 状态持久化（自动跨天重置、内存降级）
│  │  └─ policy.ts    # 策略定义（免费版每日 20 次）
│  └─ pro/             # Pro 功能门控
│     ├─ gate.ts      # 多点防护（签名、调用路径、异常检测）
│     └─ strategy.ts  # 策略映射（text → free, table → pro）
├─ popup/               # 弹出窗口模块
│  ├─ popup.ts         # 弹出窗口脚本（设置管理）
│  └─ popup.html       # 弹出窗口 HTML（紫色主题）
└─ images/              # 图标资源
   └─ icon.html        # 图标生成工具（SVG 模板）
```

## 🧪 测试目录（test/）

```
test/
├─ setup.ts                      # 测试配置（Jest + jsdom）
├─ structure.test.ts             # 结构测试（文件组织验证）
├─ manifest.test.ts              # 清单测试（Manifest v3 验证）
├─ dependency.test.ts            # 依赖测试（无外部依赖验证）
├─ extension.test.ts             # 扩展功能测试（完整流程）
├─ content-integration.test.ts   # 内容脚本集成测试
├─ table-detect.test.ts          # 表格检测单元测试
├─ table-detect.property.test.ts # 表格检测属性测试（fast-check）
├─ table-align.test.ts           # 列对齐单元测试
├─ table-align.property.test.ts  # 列对齐属性测试
├─ table-csv.test.ts             # CSV 导出单元测试
├─ table-csv.property.test.ts    # CSV 导出属性测试
├─ table-integration.test.ts     # 表格模块集成测试
├─ usage.test.ts                 # 使用统计单元测试
├─ storage.test.ts               # 存储模块单元测试
├─ policy.test.ts                # 策略模块单元测试
├─ usage-upgrade.test.ts         # 使用升级测试
├─ pro-gate.test.ts              # Pro 门控单元测试
├─ pro-gate-usage.test.ts        # Pro 门控使用测试
├─ pro-strategy.test.ts          # Pro 策略单元测试
├─ panel.test.ts                 # 面板单元测试
├─ panel-pro.test.ts             # 面板 Pro 功能测试
├─ panel-usage-info.test.ts      # 面板使用信息测试
├─ e2e-property.test.ts          # 端到端属性测试
└─ coverage/                     # 测试覆盖率报告
```

**测试统计**：39 个测试用例，覆盖单元测试、属性测试、集成测试和端到端测试。

## 🔧 构建目录（build/）

```
build/
├─ extension.cjs       # 扩展构建脚本
├─ merge.cjs           # 合并脚本（将组件合并为单个content.js）
├─ icon.cjs            # 图标生成脚本
├─ zip.cjs             # 打包脚本
├─ dist/               # 编译输出（TypeScript编译后的模块）
│  ├─ types.js/.d.ts
│  ├─ background.js/.d.ts
│  ├─ content/
│  │  ├─ content.js/.d.ts
│  │  ├─ selection.js/.d.ts
│  │  ├─ extractor.js/.d.ts
│  │  └─ panel.js/.d.ts
│  └─ popup/
│     └─ popup.js/.d.ts
└─ extension/          # 打包输出（最终发布包）
   ├─ manifest.json
   ├─ background.js
   ├─ content/
   │  ├─ content.js    # 合并后的单个文件（MVP设计）
   │  └─ content.css
   ├─ popup/
   │  ├─ popup.js
   │  └─ popup.html
   └─ images/
      ├─ icon16.png
      ├─ icon32.png
      ├─ icon48.png
      └─ icon128.png
```

## 🎨 图标资源（src/images/）

```
src/images/
├─ icon.html          # 图标生成工具（包含SVG模板）
├─ icon16.png         # 16x16 图标
├─ icon32.png         # 32x32 图标
├─ icon48.png         # 48x48 图标
└─ icon128.png        # 128x128 图标
```

## 📚 文档目录（docs/）

```
docs/
├─ STRUCTURE.md        # 本文件（项目结构说明）
├─ PUBLISHING_GUIDE.md # 发布指南和检查清单
├─ RELEASE.md          # 技术发布文档
└─ report/             # 项目报告
   ├─ FINAL_ACCEPTANCE_REPORT.md
   ├─ PERFORMANCE_OPTIMIZATION_REPORT.md
   └─ VERIFICATION_REPORT.md
```

## 📦 核心文件（最终产物 - build/extension/）

```
build/extension/
├─ manifest.json      # 扩展清单
├─ background.js      # 后台脚本
├─ content/           # 内容脚本目录
│  ├─ content.js     # 合并后的单个文件（MVP设计）
│  └─ content.css    # 样式文件
├─ popup/             # 弹出窗口目录
│  ├─ popup.js       # 弹出脚本
│  └─ popup.html     # 弹出窗口
└─ images/            # 图标资源
   ├─ icon16.png      # 16x16 图标
   ├─ icon32.png      # 32x32 图标
   ├─ icon48.png      # 48x48 图标
   └─ icon128.png     # 128x128 图标
```

## 🎯 模块化设计原则

### 源码文件命名（模块化原则）
- `content/content.ts` - 内容脚本入口（组合所有组件，管理完整流程）
- `types.ts` - 类型定义（全局共享类型）
- `content/selection.ts` - 选择框组件（鼠标交互）
- `content/panel.ts` - 结果面板（UI 展示）
- `content/extractor/` - 文本提取器模块（三段式 pipeline）
  - `index.ts` - 统一对外接口（extractText 函数）
  - `collect.ts` - 数据采集（TreeWalker + 可见性缓存）
  - `layout.ts` - 视觉行分组（核心算法，技术护城河）
  - `format.ts` - 文本格式化（防护措施）
- `content/table/` - 表格处理模块（Pro 功能）
  - `detect.ts` - 表格检测（X 轴位置聚类）
  - `align.ts` - 列对齐（中英文混合宽度计算）
  - `csv.ts` - CSV 导出（RFC 4180 标准）
- `content/usage/` - 使用统计模块
  - `usage.ts` - 行为信号记录器（record、checkUsage）
  - `storage.ts` - 状态持久化（自动跨天重置）
  - `policy.ts` - 策略定义（免费版每日 20 次）
- `content/pro/` - Pro 功能门控
  - `gate.ts` - 多点防护（签名、调用路径、异常检测）
  - `strategy.ts` - 策略映射（text → free, table → pro）
- `popup/popup.ts` - 弹出窗口脚本（设置管理）

**命名原则**：
1. 模块化组织，通过目录结构清晰分类
2. Extractor 采用三段式 pipeline 设计（collect → layout → format），职责单一
3. Table 模块独立封装，支持表格识别、对齐和导出
4. Usage 模块负责行为记录和使用限制
5. Pro 模块负责权限控制和策略映射

### 目录分类原则
- **src/** - 所有开发源码（按功能模块组织，包含图标资源）
- **test/** - 所有测试文件（独立于源码，39 个测试用例）
- **build/** - 所有构建相关（脚本和输出）
- **docs/** - 所有文档说明（排除 report 目录）

## 🔄 开发流程

```bash
# 1. 开发阶段 - 编辑 src/ 目录文件
npm run lint          # 代码检查

# 2. 测试阶段
npm run test          # 运行测试

# 3. 构建阶段
npm run build         # 编译到 build/dist/

# 4. 打包阶段  
npm run pack          # 生成 extension.zip

# 5. 发布阶段
npm run release       # 完整流程
```

## 📊 文件统计

| 分类 | 文件数 | 说明 |
|------|--------|------|
| 源码 | 20+ 个 | TypeScript 开发文件（按模块组织） |
| 图标 | 5 个 | 图标资源（模板 + PNG） |
| 测试 | 27 个 | 完整测试套件（39 个测试用例） |
| 构建 | 4 个 | 自动化构建脚本 |
| 文档 | 3 个 | 完整项目文档（排除 report） |

**设计理念**：
- **源码模块化组织**（提升可维护性）
  - Extractor 三段式 pipeline（collect → layout → format）
    - **collect**：纯事实采集，TreeWalker 遍历 DOM，可见性缓存优化
    - **layout**：视觉行分组，核心算法，技术护城河
    - **format**：文本格式化，防护措施
  - Table 模块独立封装（detect → align → csv）
    - **detect**：X 轴位置聚类，不依赖 DOM 元素类型
    - **align**：中英文混合宽度计算
    - **csv**：RFC 4180 标准
  - Usage 模块行为记录（usage → storage → policy）
  - Pro 模块权限控制（gate → strategy）
- **样式提取到 CSS**（CSS 变量 + 媒体查询，自动主题切换）
- **图标资源集中管理**（src/images，紫色渐变风格）
- **测试独立管理**（单元测试 + 属性测试 + 集成测试）
- **最终产物按目录结构打包**（清晰的扩展结构）

**技术亮点**：
1. 三段式 Pipeline 设计，职责单一，易于维护和演进
2. 视觉行分组算法，核心技术护城河
3. 表格智能识别，基于 X 轴位置聚类
4. 多点防护机制，签名验证 + 调用路径检查 + 异常行为检测
5. 完整测试覆盖，39 个测试用例全部通过

**总计**: 模块化设计，职责清晰，技术扎实！