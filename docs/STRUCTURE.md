# 项目结构

## 🏗️ 整体架构（极简分类）

```
./
├─ src/                   # 📝 源码（开发）
├─ build/                 # 🔧 构建（编译打包）
├─ resources/             # 🎨 资源（图标工具）
├─ docs/                  # 📚 文档（说明指南）
├─ manifest.json          # 扩展清单
├─ content.js            # 内容脚本（最终产物）
├─ content.css           # 样式文件
├─ background.js         # 后台脚本
├─ popup.html           # 弹出窗口
├─ popup.js             # 弹出脚本
└─ extension.zip        # 发布包
```

## 📝 源码目录（src/）

```
src/
├─ content.ts           # 内容脚本入口（组合组件）
├─ types.ts             # 类型定义
├─ components/          # 组件目录
│  ├─ selection.ts      # 选择框组件
│  ├─ extractor.ts      # 文本提取器
│  └─ panel.ts          # 结果面板
├─ background.ts        # 后台脚本
├─ popup.ts             # 弹出窗口脚本
├─ popup.html           # 弹出窗口HTML
├─ content.css          # 样式文件
├─ manifest.json        # 扩展配置
└─ test/               # 测试文件
   ├─ setup.ts
   ├─ project-structure.test.ts
   ├─ manifest-validation.test.ts
   ├─ dependency-validation.test.ts
   └─ browser-selection-copy.test.ts
```

## 🔧 构建目录（build/）

```
build/
├─ build-extension.cjs  # 合并脚本（将组件合并为单个content.js）
├─ package-extension.cjs # 打包脚本
├─ dist/               # 编译输出（TypeScript编译后的模块）
│  ├─ types.js/.d.ts
│  ├─ content.js/.d.ts
│  ├─ background.js/.d.ts
│  ├─ popup.js/.d.ts
│  └─ components/
│     ├─ selection.js/.d.ts
│     ├─ extractor.js/.d.ts
│     └─ panel.js/.d.ts
└─ package/            # 打包输出（最终发布包）
   ├─ manifest.json
   ├─ content.js       # 合并后的单个文件（MVP设计）
   ├─ content.css
   ├─ background.js
   ├─ popup.html
   ├─ popup.js
   └─ assets/
```

## 🎨 资源目录（resources/）

```
resources/
├─ assets/             # 图标资源
│  └─ icon.svg         # SVG 图标源文件
├─ create-icons.html   # 图标生成工具
└─ demo.html          # 功能演示页面
```

## 📚 文档目录（docs/）

```
docs/
├─ README.md           # 项目介绍
├─ RELEASE.md          # 发布指南
├─ PUBLISH_CHECKLIST.md # 发布检查清单
├─ STRUCTURE.md        # 本文件（项目结构说明）
└─ store-assets/       # 商店资源说明
   └─ README.md
```

## 📦 核心文件（最终产物）

```
./
├─ manifest.json      # 扩展清单
├─ content.js         # 内容脚本（合并后的单个文件）
├─ content.css        # 样式文件
├─ background.js      # 后台脚本
├─ popup.html         # 弹出窗口
├─ popup.js           # 弹出脚本
└─ assets/            # 资源文件
   ├─ icon16.png      # 16x16 图标
   ├─ icon32.png      # 32x32 图标
   ├─ icon48.png      # 48x48 图标
   └─ icon128.png     # 128x128 图标
```

## 🎯 极简命名原则

### 源码文件命名（极简原则）
- `content.ts` - 内容脚本入口（组合组件）
- `types.ts` - 类型定义
- `selection.ts` - 选择框组件
- `extractor.ts` - 文本提取器
- `panel.ts` - 结果面板

**命名原则**：单一、简洁，通过注释和文档说明功能

### 目录分类原则
- **src/** - 所有开发源码
- **build/** - 所有构建相关
- **resources/** - 所有资源文件
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
| 源码 | 7个 | TypeScript 开发文件（content.ts + 3个组件 + 其他） |
| 测试 | 5个 | 核心功能测试 |
| 构建 | 2个 | 自动化构建脚本 |
| 文档 | 5个 | 完整项目文档 |
| 资源 | 3个 | 图标和演示工具 |

**设计理念**：源码可拆分（提升可维护性），最终产物合并为单个文件（符合MVP设计，降低审核风险）

**总计**: 清晰分类，各司其职，极简高效！