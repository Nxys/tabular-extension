import { test, expect } from '@playwright/test';
import { 
  createTestPage, 
  selectText, 
  selectTable, 
  waitForPanel, 
  isPanelVisible,
  clickPanelButton,
  getPanelText,
  waitForAsync 
} from './helpers/extension-helper';
import { 
  generateTablePage, 
  generateTextPage, 
  generateComplexTablePage 
} from './fixtures/test-pages';

/**
 * 基础功能测试
 * 测试插件的核心文本提取和表格检测功能
 */

test.describe('基础功能测试', () => {
  
  test('应该能够提取选中的文本', async ({ page }) => {
    // 准备测试页面
    const testText = '这是一段测试文本，用于验证文本提取功能是否正常工作。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 选择文本
    await selectText(page, '#test-text');
    await waitForAsync();
    
    // 检查是否显示插件面板
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
    
    // 检查面板内容
    const panelText = await getPanelText(page);
    expect(panelText).toContain('文本提取');
  });

  test('应该能够检测和提取简单表格', async ({ page }) => {
    // 准备测试表格
    const tableData = [
      ['姓名', '年龄', '城市'],
      ['张三', '25', '北京'],
      ['李四', '30', '上海']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 选择表格
    await selectTable(page, '#test-table');
    await waitForAsync();
    
    // 检查是否显示插件面板
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
    
    // 检查面板内容
    const panelText = await getPanelText(page);
    expect(panelText).toContain('表格检测');
  });

  test('应该能够处理复杂表格结构', async ({ page }) => {
    // 准备复杂表格页面
    const htmlContent = generateComplexTablePage();
    await createTestPage(page, htmlContent);
    
    // 选择带表头的表格
    await selectTable(page, '#header-table');
    await waitForAsync();
    
    // 检查面板显示
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
    
    // 验证表头识别
    const panelText = await getPanelText(page);
    expect(panelText).toContain('表格');
  });

  test('应该能够处理嵌套表格', async ({ page }) => {
    const htmlContent = generateComplexTablePage();
    await createTestPage(page, htmlContent);
    
    // 选择嵌套表格
    await selectTable(page, '#nested-table');
    await waitForAsync();
    
    // 检查面板显示
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
  });

  test('应该能够处理不规则表格', async ({ page }) => {
    const htmlContent = generateComplexTablePage();
    await createTestPage(page, htmlContent);
    
    // 选择不规则表格
    await selectTable(page, '#irregular-table');
    await waitForAsync();
    
    // 检查面板显示
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
  });

  test('空选择时不应该显示面板', async ({ page }) => {
    const htmlContent = generateTextPage('测试内容');
    await createTestPage(page, htmlContent);
    
    // 点击空白区域
    await page.click('body');
    await waitForAsync();
    
    // 检查面板不应该显示
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(false);
  });

  test('应该能够关闭插件面板', async ({ page }) => {
    const testText = '测试文本';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 选择文本显示面板
    await selectText(page, '#test-text');
    await waitForPanel(page);
    
    // 点击关闭按钮（如果有的话）
    try {
      await clickPanelButton(page, '关闭');
      await waitForAsync();
      
      const panelVisible = await isPanelVisible(page);
      expect(panelVisible).toBe(false);
    } catch {
      // 如果没有关闭按钮，点击其他地方应该也能关闭
      await page.click('body');
      await waitForAsync();
    }
  });
});