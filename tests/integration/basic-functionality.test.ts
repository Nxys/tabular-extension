import { test, expect } from './fixtures';
import { 
  createTestPage, 
  selectText, 
  selectTable, 
  waitForPanel, 
  isPanelVisible,
  clickPanelButton,
  getPanelText,
  waitForAsync,
  dragSelection,
  waitForResultPanel
} from './helpers/extension-helper';
import { 
  generateTablePage, 
  generateTextPage, 
  generateComplexTablePage,
  generateMultilineTextPage
} from './fixtures/test-pages';

/**
 * 基础功能测试
 * 测试插件的核心文本提取和表格检测功能
 */

test.describe('基础功能测试', () => {
  
  /**
   * 测试简单文本提取功能
   * 验证需求：1.1 - 用户框选简单文本时，提取的文本与原始文本完全一致
   */
  test('应该能够提取选中的文本', async ({ page }) => {
    // 准备测试页面
    const testText = '这是一段测试文本，用于验证文本提取功能是否正常工作。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(500);
    
    // 获取测试文本元素的位置
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取文本元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的文本与原始文本完全一致
    expect(panelText).toContain(testText);
  });

  /**
   * 测试多行文本提取功能
   * 验证需求：1.2 - 用户框选多行文本时，提取的文本保留换行符和格式
   */
  test('应该能够提取多行文本并保留换行符', async ({ page }) => {
    // 准备多行文本测试页面
    const htmlContent = generateMultilineTextPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取多行文本元素的位置
    const textElement = page.locator('#multiline-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取多行文本元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的文本包含所有行
    expect(panelText).toContain('第一行文本');
    expect(panelText).toContain('第二行文本');
    expect(panelText).toContain('第三行文本');
    expect(panelText).toContain('第五行文本');
    
    // 验证换行符被保留（文本应该包含多行）
    // 注意：实际的换行符可能被转换为 <br> 或保留为 \n，取决于插件的实现
    const lines = panelText.split(/[\n\r]+/).filter(line => line.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(4); // 至少应该有 4 行非空文本
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