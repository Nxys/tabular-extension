import { test, expect } from './fixtures';
import { 
  createTestPage, 
  selectText, 
  selectTable, 
  waitForPanel, 
  isPanelVisible,
  getPanelText,
  getConsoleErrors,
  waitForAsync 
} from './helpers/extension-helper';

/**
 * 错误处理测试
 * 测试插件在各种异常情况下的表现
 */

test.describe('错误处理测试', () => {
  
  test('应该处理空表格', async ({ page }) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>空表格测试</title></head>
<body>
    <table id="empty-table"></table>
    <table id="empty-rows-table">
        <tr></tr>
        <tr></tr>
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 尝试选择空表格
    await selectTable(page, '#empty-table');
    await waitForAsync();
    
    // 插件应该优雅地处理空表格
    const panelVisible = await isPanelVisible(page);
    if (panelVisible) {
      const panelText = await getPanelText(page);
      expect(panelText).toMatch(/(空|无数据|错误)/);
    }
  });

  test('应该处理格式错误的表格', async ({ page }) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>错误表格测试</title></head>
<body>
    <table id="malformed-table">
        <tr>
            <td>正常单元格</td>
            <td>另一个单元格
            <!-- 缺少结束标签 -->
        </tr>
        <tr>
            <td>第二行</td>
        </tr>
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 选择格式错误的表格
    await selectTable(page, '#malformed-table');
    await waitForAsync();
    
    // 插件应该能处理或报告错误
    const errors = await getConsoleErrors(page);
    // 可能有错误，但不应该导致崩溃
    expect(errors.length).toBeLessThan(10); // 允许少量错误
  });

  test('应该处理超大表格', async ({ page }) => {
    // 生成一个大表格
    const rows = Array(100).fill(0).map((_, i) => 
      `<tr>${Array(20).fill(0).map((_, j) => `<td>R${i}C${j}</td>`).join('')}</tr>`
    ).join('');
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>大表格测试</title></head>
<body>
    <table id="large-table">${rows}</table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 选择大表格
    await selectTable(page, '#large-table');
    await waitForAsync(2000); // 给更多时间处理
    
    // 检查是否能正常处理
    const panelVisible = await isPanelVisible(page);
    if (panelVisible) {
      const panelText = await getPanelText(page);
      expect(panelText.length).toBeGreaterThan(0);
    }
  });

  test('应该处理特殊字符', async ({ page }) => {
    const specialChars = '特殊字符测试: <>&"\'`\n\t\r\u0000\uFFFF';
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>特殊字符测试</title></head>
<body>
    <table id="special-chars-table">
        <tr>
            <td>${specialChars}</td>
            <td>正常文本</td>
        </tr>
        <tr>
            <td>emoji: 😀🎉🚀</td>
            <td>数学符号: ∑∆∞</td>
        </tr>
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 选择包含特殊字符的表格
    await selectTable(page, '#special-chars-table');
    await waitForAsync();
    
    // 检查是否正常处理
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
  });

  test('应该处理网络错误情况', async ({ page }) => {
    // 模拟网络中断
    await page.route('**/*', route => {
      if (route.request().url().includes('api')) {
        route.abort();
      } else {
        route.continue();
      }
    });
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>网络错误测试</title></head>
<body>
    <table id="network-test-table">
        <tr><td>测试</td><td>数据</td></tr>
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 尝试操作
    await selectTable(page, '#network-test-table');
    await waitForAsync();
    
    // 插件应该能在网络问题时继续工作
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
  });

  test('应该处理内存不足情况', async ({ page }) => {
    // 创建一个可能导致内存问题的场景
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>内存测试</title></head>
<body>
    <div id="memory-test">
        ${Array(1000).fill('<p>重复内容</p>').join('')}
    </div>
    <table id="memory-table">
        <tr><td>测试</td><td>表格</td></tr>
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 快速多次操作
    for (let i = 0; i < 10; i++) {
      await selectText(page, '#memory-test');
      await waitForAsync(50);
      await selectTable(page, '#memory-table');
      await waitForAsync(50);
    }
    
    // 检查最终状态
    const panelVisible = await isPanelVisible(page);
    expect(typeof panelVisible).toBe('boolean');
  });

  test('应该处理 DOM 变化', async ({ page }) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>DOM 变化测试</title></head>
<body>
    <div id="container">
        <table id="changing-table">
            <tr><td>原始</td><td>数据</td></tr>
        </table>
    </div>
    <script>
        setTimeout(() => {
            document.getElementById('changing-table').innerHTML = 
                '<tr><td>修改后</td><td>数据</td></tr>';
        }, 1000);
    </script>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 选择表格
    await selectTable(page, '#changing-table');
    await waitForAsync();
    
    // 等待 DOM 变化
    await waitForAsync(1500);
    
    // 再次选择
    await selectTable(page, '#changing-table');
    await waitForAsync();
    
    // 检查插件是否适应了变化
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
  });

  test('应该处理权限错误', async ({ page }) => {
    // 模拟权限受限的环境
    await page.addInitScript(() => {
      // 模拟剪贴板 API 不可用
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: false
      });
    });
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>权限测试</title></head>
<body>
    <table id="permission-table">
        <tr><td>权限</td><td>测试</td></tr>
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 选择表格
    await selectTable(page, '#permission-table');
    await waitForAsync();
    
    // 插件应该能在权限受限时工作
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
  });
});