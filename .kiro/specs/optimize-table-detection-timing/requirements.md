# 需求文档

## 简介

当前表格导出按钮的显示时机存在不一致性问题：初始扫描固定延迟 1 秒，DOM 变化监听防抖 3 秒，且未考虑表格异步加载的情况。本需求旨在优化表格检测算法，使按钮显示更及时和一致，同时避免性能问题。

## 术语表

- **System**: 表格检测系统（Table Detection System）
- **Initial_Scan**: 页面加载后的首次表格扫描
- **DOM_Observer**: 监听 DOM 变化的 MutationObserver
- **Export_Button**: 表格导出按钮
- **Async_Table**: 异步加载的表格（通过 AJAX/Fetch 动态插入）
- **SPA_Page**: 单页应用页面（Single Page Application）
- **Detection_Delay**: 表格检测的延迟时间
- **Debounce_Timer**: 防抖计时器
- **Plugin_Element**: 插件自身的 UI 元素

## 需求

### 需求 1: 减少初始扫描延迟

**用户故事:** 作为用户，我希望在页面加载后能更快看到表格导出按钮，以便及时导出数据。

#### 验收标准

1. WHEN 页面 DOM 内容加载完成（DOMContentLoaded）THEN THE System SHALL 在 300ms 内执行 Initial_Scan
2. WHEN Initial_Scan 检测到表格 THEN THE System SHALL 立即注入 Export_Button
3. WHEN 页面包含多个表格 THEN THE System SHALL 在单次扫描中处理所有表格
4. WHEN Initial_Scan 执行失败 THEN THE System SHALL 记录错误并继续运行（不影响后续检测）

### 需求 2: 优化 DOM 变化监听策略

**用户故事:** 作为用户，我希望在 SPA 页面切换或动态加载表格时，导出按钮能及时出现，而不需要等待过长时间。

#### 验收标准

1. WHEN DOM 发生变化 THEN THE DOM_Observer SHALL 使用 500ms 的 Debounce_Timer
2. WHEN Debounce_Timer 触发 THEN THE System SHALL 执行增量扫描（只检测新增的表格）
3. WHEN 检测到 Plugin_Element 的变化 THEN THE System SHALL 忽略该变化（避免死循环）
4. WHEN 连续发生多次 DOM 变化 THEN THE System SHALL 重置 Debounce_Timer（防抖机制）
5. WHEN DOM_Observer 检测到表格移除 THEN THE System SHALL 清理对应的 Export_Button

### 需求 3: 支持表格异步加载检测

**用户故事:** 作为用户，我希望在表格通过 AJAX 异步加载后，导出按钮能自动出现，无需手动刷新页面。

#### 验收标准

1. WHEN Async_Table 插入 DOM THEN THE DOM_Observer SHALL 在 500ms 内检测到变化
2. WHEN 检测到新表格元素 THEN THE System SHALL 验证表格是否可见且有效
3. WHEN 表格容器的 overflow 属性变化 THEN THE System SHALL 重新扫描该容器内的表格
4. WHEN 表格从隐藏变为可见 THEN THE System SHALL 注入 Export_Button

### 需求 4: 避免重复扫描和性能问题

**用户故事:** 作为开发者，我希望表格检测不会影响页面性能，避免频繁的 DOM 查询和重复注入按钮。

#### 验收标准

1. WHEN 表格已注入 Export_Button THEN THE System SHALL 跳过该表格（使用 WeakSet 记录）
2. WHEN 执行扫描 THEN THE System SHALL 只查询包含 table 元素的容器（避免全局遍历）
3. WHEN Debounce_Timer 未到期 THEN THE System SHALL 取消之前的扫描任务
4. WHEN 单次扫描处理超过 100 个表格 THEN THE System SHALL 分批处理（每批 50 个）
5. WHEN 检测到相同表格元素 THEN THE System SHALL 使用缓存结果（避免重复计算）

### 需求 5: 处理 SPA 页面的动态表格

**用户故事:** 作为用户，我希望在 SPA 页面路由切换后，新页面的表格能正确显示导出按钮，旧页面的按钮能被清理。

#### 验收标准

1. WHEN SPA_Page 路由变化 THEN THE System SHALL 检测 URL 变化
2. WHEN URL 变化被检测到 THEN THE System SHALL 清理所有现有的 Export_Button
3. WHEN 清理完成后 THEN THE System SHALL 在 300ms 内执行新的 Initial_Scan
4. WHEN 页面包含嵌套路由 THEN THE System SHALL 只响应主路由变化（避免过度触发）

### 需求 6: 智能检测时机调整

**用户故事:** 作为开发者，我希望系统能根据页面特征智能调整检测时机，在快速响应和性能之间取得平衡。

#### 验收标准

1. WHEN 页面包含已知的表格 UI 框架类名 THEN THE System SHALL 使用 200ms 的 Detection_Delay
2. WHEN 页面不包含已知框架类名 THEN THE System SHALL 使用 500ms 的 Detection_Delay
3. WHEN 检测到表格容器的 loading 状态 THEN THE System SHALL 等待 loading 状态结束后再扫描
4. WHEN 表格容器包含 skeleton 占位符 THEN THE System SHALL 监听占位符移除事件

### 需求 7: 错误处理和降级策略

**用户故事:** 作为开发者，我希望在检测过程中出现错误时，系统能优雅降级，不影响用户的正常使用。

#### 验收标准

1. WHEN 扫描过程抛出异常 THEN THE System SHALL 记录错误并继续处理其他表格
2. WHEN DOM_Observer 失败 THEN THE System SHALL 回退到定时轮询模式（每 5 秒扫描一次）
3. WHEN 注入按钮失败 THEN THE System SHALL 静默失败并记录错误（不影响其他表格）
4. WHEN 连续 3 次扫描失败 THEN THE System SHALL 暂停自动扫描（避免资源浪费）
5. WHEN 用户手动触发扫描 THEN THE System SHALL 重置失败计数器并恢复自动扫描

### 需求 8: 可见性检测优化

**用户故事:** 作为用户，我希望只有真正可见的表格才显示导出按钮，避免隐藏表格或折叠面板中的表格显示按钮。

#### 验收标准

1. WHEN 表格的 display 属性为 none THEN THE System SHALL 不注入 Export_Button
2. WHEN 表格的 visibility 属性为 hidden THEN THE System SHALL 不注入 Export_Button
3. WHEN 表格在折叠面板中且面板未展开 THEN THE System SHALL 不注入 Export_Button
4. WHEN 折叠面板展开 THEN THE System SHALL 在 500ms 内检测并注入 Export_Button
5. WHEN 表格从不可见变为可见 THEN THE System SHALL 清除可见性缓存并重新检测
