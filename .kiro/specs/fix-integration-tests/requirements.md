# 需求文档：修复集成测试

## 简介

本规范针对集成测试失败问题进行系统性修复。当前有39个集成测试失败，主要集中在基础功能测试、Pro功能测试、属性测试和表格检测时机测试。

## 术语表

- **Integration_Test**: 集成测试，测试插件在真实浏览器环境中的完整功能
- **Test_Helper**: 测试辅助函数，用于简化测试代码
- **Plugin_Initialization**: 插件初始化流程，包括设置加载、表格扫描等
- **Storage_Timing**: Storage 变化事件的时序问题
- **Content_Script**: 内容脚本，注入到页面中的插件代码

## 问题分析

### 根本原因

1. **插件初始化时序问题**：
   - 插件默认禁用状态 (`enabled: false`)
   - 测试中启用插件的时机和等待时间不正确
   - Storage 变化事件触发需要时间传播

2. **测试辅助函数问题**：
   - `createTestPage` 函数的启用插件逻辑不完善
   - `setProUser` 和 `setFreeUser` 函数缺少等待时间
   - 页面加载和插件初始化的等待时间不足

3. **表格检测时机问题**：
   - 表格扫描依赖插件启用状态
   - MutationObserver 初始化需要时间
   - 智能延迟计算可能导致扫描延迟

## 需求

### 需求 1：优化测试辅助函数

**用户故事：** 作为测试开发者，我希望测试辅助函数能够可靠地初始化插件状态，以便测试能够稳定运行。

#### 验收标准

1. WHEN 调用 `createTestPage` THEN THE 插件 SHALL 在页面加载前被启用
2. WHEN 页面加载完成 THEN THE Content_Script SHALL 已完成初始化
3. WHEN 表格存在于页面 THEN THE 表格导出按钮 SHALL 已被注入
4. WHEN 调用 `setProUser` 或 `setFreeUser` THEN THE 插件 SHALL 同时被启用
5. WHEN Storage 设置完成 THEN THE System SHALL 等待足够时间让变化事件传播

### 需求 2：修复插件初始化流程

**用户故事：** 作为插件开发者，我希望插件能够在测试环境中正确初始化，以便集成测试能够验证功能。

#### 验收标准

1. WHEN Content_Script 加载 THEN THE System SHALL 立即读取 Storage 设置
2. WHEN Storage 中 `enabled: true` THEN THE System SHALL 执行表格扫描
3. WHEN 表格扫描完成 THEN THE System SHALL 注入导出按钮
4. WHEN Storage 变化事件触发 THEN THE System SHALL 更新插件状态
5. WHEN 插件从禁用变为启用 THEN THE System SHALL 重新扫描表格

### 需求 3：增加测试等待时间

**用户故事：** 作为测试开发者，我希望测试能够等待足够的时间让插件完成初始化，以便避免时序问题导致的测试失败。

#### 验收标准

1. WHEN 启用插件后 THEN THE Test SHALL 等待至少 500ms
2. WHEN 页面加载后 THEN THE Test SHALL 等待至少 1500ms
3. WHEN 设置 Pro 状态后 THEN THE Test SHALL 等待至少 500ms
4. WHEN 框选操作后 THEN THE Test SHALL 等待面板显示（最多 10s）
5. WHEN 表格扫描后 THEN THE Test SHALL 等待按钮注入完成

### 需求 4：添加调试日志

**用户故事：** 作为测试开发者，我希望能够看到详细的调试日志，以便快速定位测试失败的原因。

#### 验收标准

1. WHEN 插件初始化 THEN THE System SHALL 输出初始化状态日志
2. WHEN 表格扫描 THEN THE System SHALL 输出扫描结果日志
3. WHEN 按钮注入 THEN THE System SHALL 输出注入数量日志
4. WHEN Storage 变化 THEN THE System SHALL 输出变化内容日志
5. WHEN 测试失败 THEN THE System SHALL 输出详细的错误信息

### 需求 5：修复特定测试场景

**用户故事：** 作为测试开发者，我希望特定的测试场景能够正确处理，以便覆盖所有功能点。

#### 验收标准

1. WHEN 测试文本提取 THEN THE System SHALL 正确提取多行文本和特殊字符
2. WHEN 测试表格检测 THEN THE System SHALL 正确识别各种表格结构
3. WHEN 测试导出功能 THEN THE System SHALL 正确触发导出流程
4. WHEN 测试 Pro 功能 THEN THE System SHALL 正确处理行数限制和试用次数
5. WHEN 测试表格检测时机 THEN THE System SHALL 在正确的时间点扫描表格

## 优先级

1. **P0 - 关键**: 需求1（优化测试辅助函数）、需求2（修复插件初始化流程）
2. **P1 - 重要**: 需求3（增加测试等待时间）
3. **P2 - 一般**: 需求4（添加调试日志）、需求5（修复特定测试场景）

## 依赖关系

- 需求2 依赖于需求1（测试辅助函数需要先优化）
- 需求3 依赖于需求1和需求2（等待时间需要基于正确的初始化流程）
- 需求4 可以独立实现
- 需求5 依赖于需求1、2、3（特定场景需要基础设施正确）

## 成功标准

- 所有39个失败的集成测试通过
- 测试运行稳定，不出现随机失败
- 测试执行时间合理（不超过当前时间的2倍）
- 测试日志清晰，便于调试
