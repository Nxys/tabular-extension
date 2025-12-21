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
├─ background.ts        # 后台脚本
├─ types.ts             # 类型定义
├─ manifest.json        # 扩展配置
├─ content/             # 内容脚本模块
│  ├─ content.ts       # 内容脚本入口（组合组件）
│  ├─ content.css      # 样式文件
│  ├─ selection.ts     # 选择框组件
│  ├─ extractor/       # 文本提取器模块
│  │  ├─ index.ts     # 统一对外接口
│  │  ├─ collect.ts   # 数据采集（DOM遍历）
│  │  ├─ layout.ts    # 视觉行分组（核心算法）
│  │  └─ format.ts    # 文本格式化
│  └─ panel.ts         # 结果面板
├─ popup/               # 弹出窗口模块
│  ├─ popup.ts         # 弹出窗口脚本
│  └─ popup.html       # 弹出窗口HTML
└─ images/              # 图标资源
   ├─ icon.html        # 图标生成工具（SVG模板）
   ├─ icon16.png       # 16x16 图标
   ├─ icon32.png       # 32x32 图标
   ├─ icon48.png       # 48x48 图标
   └─ icon128.png      # 128x128 图标
```

## 🧪 测试目录（test/）

```
test/
├─ setup.ts             # 测试配置
├─ structure.test.ts    # 结构测试
├─ manifest.test.ts     # 清单测试
├─ dependency.test.ts   # 依赖测试
└─ extension.test.ts    # 功能测试
```

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

## 🎯 极简命名原则

### 源码文件命名（极简原则）
- `content/content.ts` - 内容脚本入口（组合组件）
- `types.ts` - 类型定义
- `content/selection.ts` - 选择框组件
- `content/extractor/` - 文本提取器模块（三段式 pipeline）
  - `index.ts` - 统一对外接口
  - `collect.ts` - 数据采集（DOM遍历）
  - `layout.ts` - 视觉行分组（核心算法）
  - `format.ts` - 文本格式化
- `content/panel.ts` - 结果面板
- `popup/popup.ts` - 弹出窗口脚本

**命名原则**：模块化组织，通过目录结构清晰分类。Extractor 采用三段式 pipeline 设计（collect → layout → format），职责单一，易于维护和演进。

### 目录分类原则
- **src/** - 所有开发源码（按功能模块组织，包含图标资源）
- **test/** - 所有测试文件（独立于源码）
- **build/** - 所有构建相关（脚本和输出）
- **docs/** - 所有文档说明

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
| 源码 | 11个 | TypeScript 开发文件（按模块组织） |
| 图标 | 5个 | 图标资源（模板+PNG） |
| 测试 | 5个 | 核心功能测试（独立目录） |
| 构建 | 4个 | 自动化构建脚本 |
| 文档 | 3个 | 完整项目文档 |

**设计理念**：
- 源码模块化组织（提升可维护性）
- Extractor 三段式 pipeline（collect → layout → format）
  - **collect**：纯事实采集，遍历 DOM 收集文本和位置
  - **layout**：视觉行分组，将文本按视觉位置组织成二维结构（核心算法）
  - **format**：文本格式化，将视觉行转换为可复制的文本字符串
  - 职责单一，易于测试和演进
- 样式提取到 CSS（使用 CSS 变量和媒体查询）
- 图标资源集中管理（src/images，紫色渐变风格）
- 测试独立管理（清晰分离）
- 最终产物按目录结构打包（清晰的扩展结构）

**总计**: 清晰分类，各司其职，极简高效！