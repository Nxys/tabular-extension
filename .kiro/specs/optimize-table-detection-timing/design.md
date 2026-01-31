# 设计文档

## 概述

本设计优化表格检测系统的时机策略，通过减少初始延迟、优化 DOM 监听、支持异步加载检测，并避免性能问题，使表格导出按钮的显示更加及时和一致。

核心改进：
- 初始扫描延迟从 1 秒减少到 300ms
- DOM 变化防抖从 3 秒优化到 500ms
- 引入智能检测策略（基于框架特征）
- 支持表格异步加载和 SPA 路由切换
- 增强错误处理和降级策略

## 架构

### 当前架构问题

```
页面加载 → 固定延迟 1s → 扫描表格 → 注入按钮
                ↓
         DOM 变化 → 防抖 3s → 重新扫描
```

问题：
1. 固定延迟过长，用户体验差
2. 防抖时间过长，异步表格响应慢
3. 没有区分初始扫描和增量扫描
4. 没有考虑框架特征和加载状态

### 优化后架构（极简方案）

```
页面加载 → DOMContentLoaded → 智能延迟 (200-500ms) → 初始扫描
                                      ↓
                              检测框架特征 → 调整延迟
                                      ↓
                              扫描表格 → 注入按钮
                                      ↓
                              启动 DOM Observer (防抖 500ms)
                                      ↓
                              增量扫描（只检测新表格）
                                      ↓
                              URL 监听（SPA 路由切换）
```

### 极简实现方案

**只修改 2 个现有文件，不创建新文件：**

1. **src/content/index.ts**（主要修改）
   - 在 `Tabular` 类中添加私有方法和字段
   - 优化 `initialize()` 方法：从 1s 延迟改为智能延迟（200-500ms）
   - 优化 `MutationObserver` 回调：从 3s 防抖改为 500ms
   - 添加 URL 监听（SPA 路由切换，每 500ms 检查）
   - 增强错误处理和降级策略（连续 3 次失败进入降级模式）
   - 添加框架检测方法（检测 Ant Design、Element UI 等）

2. **src/content/detector.ts**（微调）
   - 可能导出辅助函数供 index.ts 使用
   - 不创建新类，保持现有函数式设计

## 核心算法

### 1. 智能延迟计算

在 `Tabular` 类中添加私有方法：

```typescript
/**
 * 计算智能延迟时间
 * 根据页面框架特征调整延迟：有框架 200ms，无框架 500ms
 */
private calculateSmartDelay(): number {
  const hasKnownFramework = this.detectPageFrameworks();
  return hasKnownFramework ? 200 : 500;
}

/**
 * 检测页面中的表格 UI 框架
 * 检查 body 类名中是否包含已知框架特征
 */
private detectPageFrameworks(): boolean {
  const frameworkPatterns = [
    /ant-table/,      // Ant Design
    /el-table/,       // Element UI
    /arco-table/,     // Arco Design
    /ta-table/,       // TDesign
    /v-data-table/,   // Vuetify
    /MuiTable/        // Material-UI
  ];
  
  const bodyClassName = document.body.className;
  return frameworkPatterns.some(pattern => pattern.test(bodyClassName));
}
```

### 2. 优化初始扫描

修改 `Tabular` 类的 `initialize()` 方法：

```typescript
initialize(): void {
  this.settingsReady.then(() => {
    // 使用智能延迟替代固定 1s 延迟
    const delay = this.calculateSmartDelay();
    
    setTimeout(() => {
      this.scanAndInjectTableButtons();
    }, delay);
  });
  
  // 启动 MutationObserver（现有代码保持不变）
  // ...
}
```

### 3. 优化防抖时间

修改 `Tabular` 类的 `MutationObserver` 回调：

```typescript
// 在 initialize() 方法中修改 MutationObserver 的创建
this.mutationObserver = new MutationObserver((mutations) => {
  // 检查是否是插件自己的 DOM 变化（现有逻辑保持不变）
  if (this.isPluginMutation(mutations)) {
    return;
  }
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // 从 3000ms 优化到 500ms
  debounceTimer = setTimeout(() => {
    this.scanAndInjectTableButtons();
  }, 500);
});

/**
 * 检查是否是插件自己的 DOM 变化
 */
private isPluginMutation(mutations: MutationRecord[]): boolean {
  return mutations.some(mutation => {
    const target = mutation.target as Element;
    if (target.className && typeof target.className === 'string') {
      if (/^(tabular-extension|table-export-button)/.test(target.className)) {
        return true;
      }
    }
    for (const node of mutation.addedNodes) {
      if (node instanceof Element) {
        const className = node.className;
        if (className && typeof className === 'string') {
          if (/^(tabular-extension|table-export-button)/.test(className)) {
            return true;
          }
        }
      }
    }
    return false;
  });
}
```

### 4. URL 变化检测（SPA 路由）

在 `Tabular` 类中添加字段和方法：

```typescript
// 在 Tabular 类中添加私有字段
private currentURL: string = '';
private urlCheckInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 在 initialize() 方法中启动 URL 监听
 */
initialize(): void {
  // ... 现有代码
  
  // 启动 URL 监听（每 500ms 检查一次）
  this.currentURL = window.location.href;
  this.urlCheckInterval = setInterval(() => {
    this.checkURLChange();
  }, 500);
}

/**
 * 检查 URL 是否变化
 */
private checkURLChange(): void {
  const newURL = window.location.href;
  
  if (this.currentURL !== newURL) {
    // 检查是否是主路由变化（忽略 hash 和 query）
    const oldPath = new URL(this.currentURL).pathname;
    const newPath = new URL(newURL).pathname;
    
    if (oldPath !== newPath) {
      // 主路由变化：清理旧按钮，重新扫描
      this.handleRouteChange();
    }
    
    this.currentURL = newURL;
  }
}

/**
 * 处理路由切换
 */
private handleRouteChange(): void {
  // 清理所有导出按钮
  this.removeAllExportButtons();
  
  // 清空已注入表格记录
  this.injectedTables = new WeakSet<HTMLElement>();
  
  // 延迟重新扫描（使用智能延迟）
  const delay = this.calculateSmartDelay();
  setTimeout(() => {
    this.scanAndInjectTableButtons();
  }, delay);
}

/**
 * 移除所有导出按钮
 */
private removeAllExportButtons(): void {
  const buttons = document.querySelectorAll('.table-export-button');
  buttons.forEach(button => button.remove());
}

/**
 * 在 cleanup() 方法中清理 URL 监听
 */
cleanup(): void {
  // ... 现有代码
  
  // 清理 URL 监听
  if (this.urlCheckInterval) {
    clearInterval(this.urlCheckInterval);
    this.urlCheckInterval = null;
  }
}
```

### 5. 错误处理和降级

在 `Tabular` 类中添加字段和方法：

```typescript
// 在 Tabular 类中添加私有字段
private failureCount: number = 0;
private fallbackMode: boolean = false;
private fallbackInterval: ReturnType<typeof setInterval> | null = null;

/**
 * 修改 scanAndInjectTableButtons() 方法，添加错误处理
 */
private scanAndInjectTableButtons(): void {
  try {
    const tables = scanTables();
    
    // ... 注入按钮逻辑（现有代码保持不变）
    
    // 成功：重置失败计数
    this.failureCount = 0;
    
    // 如果处于降级模式，恢复正常模式
    if (this.fallbackMode) {
      this.exitFallbackMode();
    }
  } catch (error) {
    console.error('[Tabular] Error scanning tables:', error);
    
    // 失败计数 +1
    this.failureCount++;
    
    // 达到阈值（3次），进入降级模式
    if (this.failureCount >= 3 && !this.fallbackMode) {
      this.enterFallbackMode();
    }
  }
}

/**
 * 进入降级模式（定时轮询）
 */
private enterFallbackMode(): void {
  this.fallbackMode = true;
  
  // 停止 MutationObserver
  if (this.mutationObserver) {
    this.mutationObserver.disconnect();
  }
  
  // 启动定时轮询（每 5 秒）
  this.fallbackInterval = setInterval(() => {
    this.scanAndInjectTableButtons();
  }, 5000);
  
  console.warn('[Tabular] Entered fallback mode (polling every 5s)');
}

/**
 * 退出降级模式（恢复正常）
 */
private exitFallbackMode(): void {
  this.fallbackMode = false;
  
  // 停止定时轮询
  if (this.fallbackInterval) {
    clearInterval(this.fallbackInterval);
    this.fallbackInterval = null;
  }
  
  // 重新启动 MutationObserver
  this.restartMutationObserver();
  
  console.log('[Tabular] Exited fallback mode');
}

/**
 * 重新启动 MutationObserver
 */
private restartMutationObserver(): void {
  if (this.mutationObserver) {
    this.mutationObserver.disconnect();
  }
  
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  this.mutationObserver = new MutationObserver((mutations) => {
    if (this.isPluginMutation(mutations)) {
      return;
    }
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(() => {
      this.scanAndInjectTableButtons();
    }, 500);
  });
  
  this.mutationObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * 在 cleanup() 方法中清理降级模式
 */
cleanup(): void {
  // ... 现有代码
  
  // 清理降级模式
  if (this.fallbackInterval) {
    clearInterval(this.fallbackInterval);
    this.fallbackInterval = null;
  }
}
```

## 数据模型

### 检测状态字段

在 `Tabular` 类中添加私有字段：

```typescript
// 错误处理和降级
private failureCount: number = 0;
private fallbackMode: boolean = false;
private fallbackInterval: ReturnType<typeof setInterval> | null = null;

// URL 监听（SPA 路由）
private currentURL: string = '';
private urlCheckInterval: ReturnType<typeof setInterval> | null = null;

// 已注入表格记录（现有字段）
private injectedTables = new WeakSet<HTMLElement>();

// MutationObserver（现有字段）
private mutationObserver: MutationObserver | null = null;
```

所有状态都在 `Tabular` 类内部管理，不创建额外的状态类。

## 测试策略

### 单元测试

测试 `Tabular` 类的新增方法：

1. **智能延迟计算**
   - 测试有框架时返回 200ms
   - 测试无框架时返回 500ms

2. **框架检测**
   - 测试识别 Ant Design
   - 测试识别 Element UI
   - 测试未知框架

3. **URL 变化检测**
   - 测试主路由变化触发重新扫描
   - 测试 hash 变化不触发
   - 测试 query 变化不触发

4. **错误处理**
   - 测试连续失败进入降级模式
   - 测试成功后退出降级模式

### 集成测试

1. **初始扫描流程**
   - 页面加载 → 智能延迟 → 扫描 → 注入按钮

2. **增量扫描流程**
   - DOM 变化 → 防抖 500ms → 扫描 → 注入新按钮

3. **SPA 路由切换**
   - URL 变化 → 清理旧按钮 → 重新扫描

4. **错误降级**
   - 连续失败 → 进入降级模式 → 定时轮询

## 正确性属性

属性是一种特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。

### 属性 1: 初始扫描时效性

*对于任何* 页面加载事件，当 DOMContentLoaded 触发后，系统应该在 500ms 内执行初始扫描

**验证：需求 1.1**

### 属性 2: 检测后立即注入

*对于任何* 被初始扫描或增量扫描检测到的有效表格，系统应该立即注入导出按钮

**验证：需求 1.2**

### 属性 3: 批量处理完整性

*对于任何* 包含多个表格的页面，单次扫描应该处理所有可见且有效的表格

**验证：需求 1.3**

### 属性 4: 错误隔离

*对于任何* 扫描或注入过程中的异常，系统应该记录错误并继续处理其他表格，不影响整体功能

**验证：需求 1.4, 7.1, 7.3**

###: 防抖机制

*对于任何* DOM 变化序列，系统应该使用 500ms 防抖，并在新变化到来时重置计时器

**验证：需求 2.1, 2.4**

### 属性 6: 增量扫描效率

*对于任何* 防抖触发后的扫描，系统应该只检测新增的表格元素，而不是重新扫描所有表格

**验证：需求 2.2**

### 属性 7: 插件元素过滤

身元素（按钮、面板等）的 DOM 变化，系统应该忽略这些变化，避免触发扫描

**验证：需求 2.3**

### 属性 8: 表格移除清理

*对于任何* 从 DOM 中移除的表格，系统应该清理对应的导出按钮

**验证：需求 2.5**

### 属性 9: 异步表格检测时效

*对于任何* 通过 AJAX 或动态插入的表格，DOM Observer 应该在 500ms 内检测到变化并触发扫描

**验证：需求 3.1**

### 属性 10: 新表格可见性验证

*对于任何* 新检测到的表格元素，系统应该验证其可见性和有效性后再注入按钮

**验证：需求 3.2**

### 属性 11: 容器属性变化响应

*对于任何* 表格容器的 overflow 属性变化，系统应该重新扫描该容器内的表格

**验证：需求 3.3**

### 属性 12: 可见性变化响应

*对于任何* 从隐藏变为可见的表格，系统应该注入导出按钮

**验证：需求 3.4**

### 属性 13: 去重和缓存

*对于任何* 已注入按钮的表格或已处理的表格元素，系统应该使用 WeakSet 记录并跳过重复处理

.1, 4.5**

### 属性 14: 扫描范围优化

*对于任何* 扫描操作，系统应该只查询包含 table 元素的容器，而不是全局遍历 DOM

**验证：需求 4.2**

### 属性 15: 防抖任务取消

*对于任何* 防抖期间的新 DOM 变化，系统应该取消之前的扫描任务并重新计时

**验证：需求 4.3**

### 属性 16: 大量表格分批处理

*对于任何* 包含超过 100 个表格的页面，系统应该分批处理（每批 50 个），避免阻塞主线程

**验证：需求 4.4**

### 属性 17: URL 变化检测

*对于任何* SPA 页面的主路由变化（pathname 变化），系统应该检测到 URL 变化

**验证：需求 5.1**

### 属性 18: 路由切换清理

*对于任何* 检测到的 URL 变化，系统应该清理所有现有的导出按钮

**验证：需求 5.2**

### 属性 19: 路由切换后重新扫描

*对于任何* 完成清理的路由切换，系统应该在 500ms 内执行新的初始扫描

**验证：需求 5.3**

### 属性 20: 嵌套路由过滤

*对于任何* 嵌套路由变化（hash 或 query 变化），系统应该忽略这些变化，只响应主路由变化

**验证：需求 5.4**

### 属性 21: 智能延迟策略

*对于任何* 页面，如果包含已知的表格 UI 框架类名，系统应该使用 200ms 延迟；否则使用 500ms 延迟

**验证：需求 6.1, 6.2**

### 属性 22: 加载状态等待

*对于任何* 检测到 loading 状态的表格容器，系统应该等待 loading 状态结束后再扫描

**验证：需求 6.3**

### 属性 23: Skeleton 占位符监听

*对于任何* 包含 skeleton 占位符的表格容器，系统应该监听占位符移除事件并触发扫描

**验证：需求 6.4**

### 属性 24: Observer 失败降级

*对于任何* MutationObserver 失败的情况，系统应该回退到定时轮询模式（每 5 秒扫描一次）

**验证：需求 7.2**

### 属性 25: 失败阈值暂停

*对于任何* 连续 3 次扫描失败的情况，系统应该进入降级模式

**验证：需求 7.4**

### 属性 26: 手动恢复机制

*对于任何* 扫描成功的情况，系统应该重置失败计数器并退出降级模式

**验证：需求 7.5**

### 属性 27: 不可见表格过滤

*对于任何* display:none、visibility:hidden 或在未展开折叠面板中的表格，系统应该不注入导出按钮

**验证：需求 8.1, 8.2, 8.3**

### 属性 28: 折叠面板展开响应

*对于任何* 折叠面板展开事件，系统应该在 500ms 内检测并注入导出按钮

**验证：需求 8.4**

### 属性 29: 可见性缓存清理

*对于任何* 表格从不可见变为可见的情况，系统应该清除可见性缓存并重新检测

**验证：需求 8.5**

## 实现注意事项

### 1. 架构约束

- **Content 层无业务逻辑**：所有检测逻辑保留在 Content 层（数据提取），不涉及业务判断
- **不访问 storage**：检测系统不依赖 chrome.storage
- **不 import background**：保持层级分离
- **极简主义**：不创建新文件，只在现有类中添加私有方法

### 2. 性能优化

已注入表格，避免内存泄漏
- 批量处理大量表格，避免阻塞主线程
- 防抖 DOM 变化，减少不必要的扫描
- 智能延迟减少等待时间

### 3. 兼容性

- MutationObserver 广泛支持（Chrome 18+）
- URL API 需要检查浏览器支持
- setInterval/setTimeout 广泛支持

### 4. 测试环境

- 测试环境中 getBoundingClientRect 可能返回全 0
- 需要 mock MutationObserver
- 需要 mock URL API
