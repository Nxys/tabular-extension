# 表格检测改进说明

## 问题背景

原有实现依赖写死的 CSS 类名来识别表格容器，存在以下问题：
- ❌ 无法识别自定义类名的表格容器
- ❌ 框架升级后类名变化导致失效
- ❌ 不同项目的自定义封装无法识别
- ❌ 维护成本高，需要不断添加新框架的类名

## 改进方案

### 1. 基于特征的容器识别

**原理**：通过元素的**视觉特征**和**结构特征**识别表格容器，而非依赖类名。

**识别特征**：
- ✅ **尺寸特征**：容器尺寸接近表格尺寸（允许边距/边框）
- ✅ **布局特征**：容器是块级元素（block/flex/grid）
- ✅ **内容特征**：容器主要内容是表格（内容纯度检查）
- ✅ **结构特征**：容器不包含多个无关表格

**核心函数**：
```typescript
function isTableContainer(
  element: HTMLElement,
  tableElement: HTMLElement,
  tableArea: number
): boolean
```

**检查逻辑**：
1. 可见性检查
2. 布局类型检查（必须是块级元素）
3. 尺寸关系检查（容器面积 0.95~3 倍表格面积）
4. 内容纯度检查（避免误判页面主容器）
5. 多表格检查（避免误判表格列表容器）

### 2. 智能容器查找

**原理**：向上遍历 DOM 树，找到最外层符合特征的表格容器。

**核心函数**：
```typescript
function findOutermostTableContainer(tableElement: HTMLElement): HTMLElement
```

**查找策略**：
- 从表格元素开始向上遍历（最多 15 层）
- 每层检查是否符合表格容器特征
- 持续向上直到找不到符合特征的容器
- 返回最外层符合特征的容器

### 3. 嵌套表格穿透

**原理**：查找所有可能包含表格的容器，而非依赖框架特定的选择器。

**核心函数**：
```typescript
function findPotentialTableContainers(): HTMLElement[]
```

**识别特征**：
- ✅ 包含 `<table>` 元素
- ✅ 是块级元素
- ✅ 有合理的尺寸（非 0x0）
- ✅ 有 overflow 属性（表格容器常见特征）
- ✅ 直接子元素中有表格

## 优势对比

### 原有方案（基于类名）
```typescript
// ❌ 写死的类名列表
const isTableContainer = 
  /table-wrapper|table-container|table-content/.test(className) ||
  /ant-table|el-table|arco-table/.test(className);
```

**缺点**：
- 无法识别自定义类名
- 框架升级后失效
- 需要不断维护类名列表

### 新方案（基于特征）
```typescript
// ✅ 基于视觉和结构特征
function isTableContainer(element, table, tableArea) {
  // 检查尺寸、布局、内容纯度等特征
  return 尺寸合适 && 布局正确 && 内容纯净 && 无多表格;
}
```

**优点**：
- ✅ 通用性强，适用于任何框架
- ✅ 不依赖类名，抗变化能力强
- ✅ 自动适应自定义封装
- ✅ 维护成本低

## 测试建议

### 1. 标准框架测试
- Ant Design（各版本）
- Element UI / Element Plus
- Arco Design
- Material-UI
- Bootstrap

### 2. 自定义封装测试
- 自定义类名的表格容器
- 多层嵌套的表格容器
- 带滚动条的表格容器

### 3. 边界情况测试
- 页面包含多个表格
- 表格嵌套在复杂布局中
- 表格容器有动画/过渡效果

## 兼容性说明

- ✅ 完全向后兼容
- ✅ 不影响现有功能
- ✅ 性能影响可忽略（增加少量计算）
- ✅ 降级策略：如果特征识别失败，回退到表格元素本身

## 后续优化方向

1. **性能优化**：缓存容器查找结果
2. **特征权重**：为不同特征设置权重，提高准确率
3. **机器学习**：收集数据训练模型，自动识别表格容器
