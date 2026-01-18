 # 实现计划：UI/UX改进

## 概述

本实现计划将6个UI/UX改进需求转换为可执行的编码任务。任务按照依赖关系和优先级组织，确保每个步骤都可以独立验证。

## 任务

- [x] 1. 修复自定义分隔符功能
  - [x] 1.1 修改cleaner.ts中的advancedClean函数
    - 修复mergeMultipleLines逻辑，支持空分隔符时使用默认换行符
    - 确保customSeparator为空字符串时使用默认值
    - _需求：1.1, 1.2, 1.4_
  
  - [x] 1.2 为自定义分隔符编写属性测试
    - **属性 1：自定义分隔符应用**
    - **验证需求：1.1, 1.4**
    - 使用fast-check生成随机文本数组和分隔符
    - 验证结果使用指定分隔符连接
    - _需求：1.1, 1.4_
  
  - [ ]* 1.3 为默认分隔符编写属性测试
    - **属性 2：默认分隔符行为**
    - **验证需求：1.2**
    - 测试未提供分隔符时使用换行符
    - _需求：1.2_

- [x] 2. 深色主题文字适配
  - [x] 2.1 修改content.css中的深色主题样式
    - 确保.tabular-extension-dialog-rule-item使用var(--bsc-text)
    - 确保.tabular-extension-dialog-separator-item label使用var(--bsc-text)
    - 验证深色主题下文字颜色变量正确应用
    - _需求：2.1, 2.2, 2.3_

- [x] 3. 优化功能重复性
  - [x] 3.1 更新cleaner.ts中的清洗逻辑
    - 明确"合并多行"和"合并为一行"的互斥关系
    - 当mergeToSingleLine启用时，忽略mergeMultipleLines
    - 添加注释说明两个选项的语义差异
    - _需求：3.1, 3.2, 3.3_

- [x] 4. 面板交互改进
  - [x] 4.1 实现文本选择禁用/恢复功能
    - 在Panel类中添加disableTextSelection()方法
    - 在Panel类中添加enableTextSelection()方法
    - 在showResult、showLimit、showPro、showTrialExhausted中调用禁用方法
    - 在hide()中调用恢复方法
    - _需求：4.1, 4.3_
  
  - [x] 4.2 实现ESC键逐层关闭功能
    - 在content/index.ts中创建全局dialogStack数组
    - 修改showCleaningDialog，将overlay推入栈并绑定ESC监听
    - 修改showExportDialog，将overlay推入栈并绑定ESC监听
    - 修改Panel的handleKeyDown，仅在栈为空时关闭主面板
    - 确保ESC键只关闭栈顶弹窗
    - _需求：4.2_
  
  - [ ]* 4.3 为面板交互编写单元测试
    - 测试文本选择禁用：验证样式标签被添加
    - 测试文本选择恢复：验证样式标签被移除
    - 测试ESC键逐层关闭：模拟多层弹窗场景
    - _需求：4.1, 4.2, 4.3_

- [x] 5. 导出面板UI优化
  - [x] 5.1 修改showExportDialog方法
    - 保留"取消"按钮
    - 创建新的按钮容器类tabular-extension-dialog-export-buttons
    - 将取消按钮放入容器，实现居右布局
    - 移除关闭×按钮相关代码
    - _需求：5.1, 5.2, 5.3_
  
  - [x] 5.2 添加导出面板CSS样式
    - 添加.tabular-extension-dialog-export-buttons样式（flex布局，justify-content: flex-end）
    - 调整取消按钮样式（padding: 10px 24px, min-width: 80px）
    - _需求：5.1, 5.2_
  
  - [ ]* 5.3 为导出面板UI编写单元测试
    - 验证导出弹窗包含取消按钮
    - 验证取消按钮在容器右侧
    - 验证不包含关闭×按钮
    - 验证点击取消按钮关闭弹窗且不触发导出
    - _需求：5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. 修复导出功能并实现文件下载
  - [x] 6.1 修复exporter.ts中的数据验证
    - 在toCSV函数开头添加数据验证（检查null、undefined、非数组）
    - 在toCSV中验证每行也是数组
    - 在exportData函数中添加数据验证
    - 修改错误处理：抛出错误而不是返回错误Blob
    - _需求：6.3, 6.4_
  
  - [x] 6.2 在background/index.ts中实现文件下载
    - 添加handleTableExport函数处理table-export请求
    - 实现parseTextToTable辅助函数
    - 调用exportData生成Blob
    - 使用URL.createObjectURL创建下载链接
    - 使用chrome.downloads.download触发下载
    - 生成带时间戳的文件名
    - 处理下载成功/失败，返回相应的ACTION_RESULT
    - _需求：6.1, 6.2, 6.5_
  
  - [x] 6.3 添加manifest.json权限
    - 在permissions数组中添加"downloads"权限
    - _需求：6.1, 6.2_
  
  - [ ]* 6.4 为导出功能编写属性测试
    - **属性 3：CSV格式生成**
    - **验证需求：6.1**
    - 测试CSV符合RFC 4180标准
    - _需求：6.1_
  
  - [ ]* 6.5 为导出功能编写属性测试
    - **属性 4：Excel格式生成**
    - **验证需求：6.2**
    - 测试Excel生成有效Blob
    - _需求：6.2_
  
  - [ ]* 6.6 为导出错误处理编写属性测试
    - **属性 5：导出错误处理**
    - **验证需求：6.3, 6.4**
    - 测试空数组、undefined、null输入抛出错误
    - _需求：6.3, 6.4_

- [x] 7. 检查点 - 验证所有改进
  - 手动测试深色主题下高级清洗选项文字可读性
  - 手动测试自定义分隔符功能
  - 手动测试ESC键逐层关闭多个弹窗
  - 手动测试导出CSV和Excel文件到本地
  - 手动测试导出面板取消按钮布局
  - 确保所有测试通过，询问用户是否有问题

## 注意事项

- 标记为`*`的任务为可选测试任务，可以跳过以加快MVP开发
- 每个任务都引用了具体的需求编号，便于追溯
- 任务按照依赖关系组织，可以按顺序执行
- 所有代码修改遵循三层架构规范
- 样式修改集中在content.css
- 业务逻辑修改在background层
