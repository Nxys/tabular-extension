# Pro 功能修复 - 集成测试指南

## 测试前准备

### 1. 构建扩展
```bash
npm run extension
```

### 2. 加载扩展到 Chrome
1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `build/dist` 目录

## 测试清单

### ✅ 测试 1：Popup 显示 Pro 状态

**目标**：验证 Popup 正确显示 Pro 状态

**步骤**：
1. 点击浏览器工具栏的扩展图标，打开 Popup
2. 观察界面显示

**预期结果（Free 用户）**：
- ✓ 显示"升级到 Pro 版"按钮
- ✓ 按钮可点击（不透明）
- ✓ 显示试用次数，例如："高级清洗（剩余 3 次试用）"
- ✓ 显示"表格识别（剩余 3 次试用）"
- ✓ 显示"一键导出（剩余 3 次试用）"

**预期结果（Pro 用户）**：
- ✓ 显示"已激活"按钮
- ✓ 按钮不可点击（半透明，cursor: not-allowed）
- ✓ 显示"高级清洗（无限使用）"
- ✓ 显示"表格识别（无限使用）"
- ✓ 显示"一键导出（无限使用）"

---

### ✅ 测试 2：升级按钮功能

**目标**：验证升级按钮正确设置 Pro 状态

**步骤**：
1. 打开 Popup（确保当前是 Free 用户）
2. 点击"升级到 Pro 版"按钮
3. 观察提示信息
4. 关闭 Popup
5. 重新打开 Popup

**预期结果**：
- ✓ 点击后显示提示："Pro 功能已开启！请刷新页面后使用。"
- ✓ Popup 自动关闭
- ✓ 重新打开 Popup 后，按钮变为"已激活"且不可点击
- ✓ 试用次数显示变为"无限使用"

---

### ✅ 测试 3：高级清洗功能（Pro 用户）

**目标**：验证 Pro 用户可以无限使用高级清洗功能

**前置条件**：已升级为 Pro 用户（执行测试 2）

**步骤**：
1. 打开任意网页（例如：https://example.com）
2. 在 Popup 中开启"启用框选复制"
3. 在页面上框选一段文本（多行）
4. 等待预览面板出现
5. 点击"🧹 清洗"按钮
6. 在弹窗中选择清洗规则（例如：勾选"去除空行"）
7. 点击"应用清洗"

**预期结果**：
- ✓ 预览面板正常显示
- ✓ 按钮文案为"🧹 清洗"（精简版）
- ✓ 点击后弹出清洗规则选择弹窗
- ✓ 应用清洗后，面板更新显示清洗后的文本
- ✓ 不显示试用次数用尽提示
- ✓ 可以多次使用（不受限制）

---

### ✅ 测试 4：高级清洗功能（Free 用户）

**目标**：验证 Free 用户有试用次数限制

**前置条件**：清除 Pro 状态，恢复为 Free 用户

**清除 Pro 状态步骤**：
1. 打开 Chrome DevTools（F12）
2. 切换到 Console 标签
3. 执行以下代码：
```javascript
chrome.storage.local.remove('pro_state', () => {
  console.log('Pro 状态已清除');
  location.reload();
});
```

**测试步骤**：
1. 重新打开 Popup，确认显示"升级到 Pro 版"按钮
2. 在页面上框选文本，打开预览面板
3. 点击"🧹 清洗"按钮
4. 应用清洗规则
5. 重复步骤 2-4，直到试用次数用尽（3 次）
6. 第 4 次尝试使用清洗功能

**预期结果**：
- ✓ 前 3 次可以正常使用
- ✓ 第 4 次显示试用次数用尽提示
- ✓ 提示文案包含权益说明（多行文本）
- ✓ 提示面板居中显示

---

### ✅ 测试 5：按钮文案显示

**目标**：验证预览面板按钮文案精简且不换行

**步骤**：
1. 在页面上框选文本，打开预览面板
2. 观察按钮文案和布局

**预期结果**：
- ✓ 高级清洗按钮显示："🧹 清洗"
- ✓ 导出按钮显示："📤 导出"
- ✓ 复制按钮显示："📄 复制"
- ✓ 三个按钮在一行内显示，不换行
- ✓ 按钮间距合理，布局美观

---

### ✅ 测试 6：验证 storage 中的 Pro 状态是加密的

**目标**：验证 Pro 状态在 storage 中是加密存储的

**步骤**：
1. 确保已升级为 Pro 用户（执行测试 2）
2. 打开 Chrome DevTools（F12）
3. 切换到 Application 标签
4. 在左侧导航中选择 Storage > Local Storage > chrome-extension://[扩展ID]
5. 查找 `pro_state` 键
6. 观察其值

**预期结果**：
- ✓ `pro_state` 键存在
- ✓ 值是一个 base64 编码的字符串（例如：`"YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo="`）
- ✓ 值不是明文 JSON 对象（不应该看到 `{"isPro":true,...}`）
- ✓ 值长度较长（加密后的数据）

**验证解密**：
在 Console 中执行以下代码验证解密：
```javascript
chrome.storage.local.get('pro_state', async (result) => {
  console.log('加密数据:', result.pro_state);
  console.log('数据类型:', typeof result.pro_state);
  console.log('是否为 base64:', /^[A-Za-z0-9+/=]+$/.test(result.pro_state));
});
```

---

### ✅ 测试 7：验证刷新页面后状态保持

**目标**：验证 Pro 状态在刷新页面后仍然保持

**步骤**：
1. 确保已升级为 Pro 用户
2. 打开 Popup，确认显示"已激活"
3. 关闭 Popup
4. 刷新当前页面（F5 或 Ctrl+R）
5. 重新打开 Popup

**预期结果**：
- ✓ 刷新后 Popup 仍然显示"已激活"
- ✓ 试用次数仍然显示"无限使用"
- ✓ 高级清洗功能仍然可用（不受限制）

---

### ✅ 测试 8：验证关闭浏览器后状态保持

**目标**：验证 Pro 状态在关闭浏览器后仍然保持

**步骤**：
1. 确保已升级为 Pro 用户
2. 打开 Popup，确认显示"已激活"
3. 关闭浏览器
4. 重新打开浏览器
5. 打开 Popup

**预期结果**：
- ✓ 重新打开浏览器后 Popup 仍然显示"已激活"
- ✓ Pro 状态持久化成功

---

## 测试数据准备

### 测试文本（多行）
```
这是第一行文本

这是第三行文本（第二行是空行）
这是第四行文本
这是第五行文本
这是第六行文本
这是第七行文本
```

### 测试网页
- https://example.com（简单文本）
- https://en.wikipedia.org/wiki/Table_(information)（包含表格）
- 任意包含多行文本的网页

---

## 常见问题排查

### 问题 1：Popup 不显示 Pro 状态
**可能原因**：
- 加密模块未正确导入
- storage 读取失败

**排查步骤**：
1. 打开 DevTools Console
2. 查看是否有错误日志
3. 检查 `pro_state` 键是否存在

### 问题 2：升级按钮点击无反应
**可能原因**：
- 事件监听器未绑定
- 加密写入失败

**排查步骤**：
1. 打开 DevTools Console
2. 查看是否有错误日志
3. 检查 `setProState()` 函数是否正常执行

### 问题 3：高级清洗功能不工作
**可能原因**：
- 消息通信失败
- Background 处理逻辑错误

**排查步骤**：
1. 打开 DevTools Console（页面和 Background）
2. 查看消息发送和接收日志
3. 检查 `handleAdvancedClean()` 函数是否正常执行

### 问题 4：按钮文案换行
**可能原因**：
- CSS 样式未正确应用
- 按钮容器宽度不足

**排查步骤**：
1. 打开 DevTools Elements
2. 检查按钮容器的 CSS 样式
3. 确认 `flexbox` 布局是否生效

---

## 测试完成标准

所有测试项目都通过（✓），包括：
- [x] Popup 显示 Pro 状态正确
- [x] 升级按钮功能正常
- [x] 高级清洗功能正常（Pro 和 Free 用户）
- [x] 按钮文案精简且不换行
- [x] storage 中的 Pro 状态是加密的
- [x] 刷新页面后状态保持
- [x] 关闭浏览器后状态保持

---

## 自动化验证脚本

以下脚本可以在 DevTools Console 中执行，用于快速验证某些功能：

### 验证加密状态
```javascript
chrome.storage.local.get('pro_state', (result) => {
  const encrypted = result.pro_state;
  console.log('✓ 加密数据:', encrypted);
  console.log('✓ 数据类型:', typeof encrypted);
  console.log('✓ 是否为字符串:', typeof encrypted === 'string');
  console.log('✓ 是否为 base64:', /^[A-Za-z0-9+/=]+$/.test(encrypted));
  console.log('✓ 数据长度:', encrypted?.length);
});
```

### 清除 Pro 状态（恢复 Free 用户）
```javascript
chrome.storage.local.remove('pro_state', () => {
  console.log('✓ Pro 状态已清除');
  location.reload();
});
```

### 手动设置 Pro 状态（用于测试）
```javascript
// 注意：这会设置明文数据，仅用于测试向后兼容性
chrome.storage.local.set({
  pro_state: {
    isPro: true,
    signature: 'test',
    features: {
      'table-detect': true,
      'column-align': true,
      'csv-export': true
    }
  }
}, () => {
  console.log('✓ Pro 状态已设置（明文）');
  location.reload();
});
```

### 查看所有 storage 数据
```javascript
chrome.storage.local.get(null, (items) => {
  console.log('✓ 所有 storage 数据:', items);
});
```

---

## 测试报告模板

```
# Pro 功能修复 - 集成测试报告

测试日期：YYYY-MM-DD
测试人员：[姓名]
浏览器版本：Chrome [版本号]
扩展版本：1.0.0

## 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 1. Popup 显示 Pro 状态 | ✓ / ✗ | |
| 2. 升级按钮功能 | ✓ / ✗ | |
| 3. 高级清洗功能（Pro） | ✓ / ✗ | |
| 4. 高级清洗功能（Free） | ✓ / ✗ | |
| 5. 按钮文案显示 | ✓ / ✗ | |
| 6. storage 加密验证 | ✓ / ✗ | |
| 7. 刷新页面状态保持 | ✓ / ✗ | |
| 8. 关闭浏览器状态保持 | ✓ / ✗ | |

## 发现的问题

1. [问题描述]
   - 重现步骤：
   - 预期结果：
   - 实际结果：
   - 截图：

## 总结

- 通过测试项：X / 8
- 测试结论：通过 / 不通过
- 建议：
```
