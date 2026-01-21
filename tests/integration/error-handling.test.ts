import { test, expect } from './fixtures';
import { 
  createTestPage, 
  selectTable, 
  isPanelVisible,
  getPanelText,
  waitForAsync,
  dragSelection
} from './helpers/extension';
import {
  clearStorage
} from './helpers/storage';
import {
  generateMalformedHTMLPage
} from './fixtures/pages';

/**
 * 错误处理测试
 * 测试插件在各种异常情况下的表现
 * 
 * 需求覆盖：
 * - 7.1: 格式错误的 HTML 不会导致插件崩溃，返回合理结果
 */

test.describe('错误处理测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage，确保测试隔离
    // 注意：enablePlugin 已在 createTestPage 中自动调用
    await clearStorage(page);
  });
  
  /**
   * 需求 7.1: 测试格式错误的 HTML
   * 验证插件不会崩溃且返回合理结果
   */
  test('格式错误的 HTML 不应导致插件崩溃', async ({ page }) => {
    // 使用专门的格式错误 HTML 页面生成器
    const htmlContent = generateMalformedHTMLPage();
    await createTestPage(page, htmlContent);
    
    // 收集控制台错误
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 测试未闭合标签区域
    const uncloseBox = await page.locator('#unclosed-tags').boundingBox();
    if (uncloseBox) {
      await dragSelection(
        page,
        uncloseBox.x + 10,
        uncloseBox.y + 10,
        uncloseBox.x + uncloseBox.width - 10,
        uncloseBox.y + uncloseBox.height - 10
      );
      await waitForAsync(500);
      
      // 验证插件没有崩溃（面板应该显示或至少不抛出致命错误）
      const panelVisible = await isPanelVisible(page);
      
      // 如果面板显示，应该有内容（即使是错误提示）
      if (panelVisible) {
        const panelText = await getPanelText(page);
        expect(panelText.length).toBeGreaterThan(0);
      }
      
      // 不应该有大量控制台错误（允许少量警告）
      expect(consoleErrors.length).toBeLessThan(5);
    }
  });

  test('格式错误的表格应返回合理结果', async ({ page }) => {
    const htmlContent = generateMalformedHTMLPage();
    await createTestPage(page, htmlContent);
    
    // 选择格式错误的表格
    const tableBox = await page.locator('#malformed-table').boundingBox();
    if (tableBox) {
      await dragSelection(
        page,
        tableBox.x + 10,
        tableBox.y + 10,
        tableBox.x + tableBox.width - 10,
        tableBox.y + tableBox.height - 10
      );
      await waitForAsync(500);
      
      // 验证返回合理结果
      const panelVisible = await isPanelVisible(page);
      
      if (panelVisible) {
        const panelText = await getPanelText(page);
        
        // 应该包含一些提取的内容或错误提示
        expect(panelText.length).toBeGreaterThan(0);
        
        // 应该包含表格中的某些文本（浏览器会自动修复部分错误）
        const hasContent = 
          panelText.includes('正常单元格') || 
          panelText.includes('第二行') ||
          panelText.includes('错误') ||
          panelText.includes('无法');
        
        expect(hasContent).toBe(true);
      }
    }
  });

  test('错误嵌套的标签应能提取文本', async ({ page }) => {
    const htmlContent = generateMalformedHTMLPage();
    await createTestPage(page, htmlContent);
    
    // 选择错误嵌套的区域
    const nestingBox = await page.locator('#wrong-nesting').boundingBox();
    if (nestingBox) {
      await dragSelection(
        page,
        nestingBox.x + 10,
        nestingBox.y + 10,
        nestingBox.x + nestingBox.width - 10,
        nestingBox.y + nestingBox.height - 10
      );
      await waitForAsync(500);
      
      const panelVisible = await isPanelVisible(page);
      
      if (panelVisible) {
        const panelText = await getPanelText(page);
        
        // 应该能提取到文本内容（即使标签嵌套错误）
        expect(panelText.length).toBeGreaterThan(0);
        
        // 应该包含实际的文本内容
        const hasText = 
          panelText.includes('段落') || 
          panelText.includes('粗体') ||
          panelText.includes('斜体');
        
        expect(hasText).toBe(true);
      }
    }
  });

  test('空表格应优雅处理', async ({ page }) => {
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

  test('超大表格应能处理', async ({ page }) => {
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

  test('特殊字符应正确处理', async ({ page }) => {
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
});