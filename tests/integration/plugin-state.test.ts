import { test, expect } from './fixtures';
import { 
  createTestPage, 
  dragSelection, 
  waitForResultPanel,
  isPanelVisible,
  waitForAsync
} from './helpers/extension';
import { 
  enablePlugin,
  disablePlugin,
  clearStorage
} from './helpers/storage';
import { generateTextPage, generateTablePage } from './fixtures/pages';

/**
 * 插件状态测试
 * 测试插件启用/禁用状态下的行为
 * 
 * 验证需求1：插件关闭状态下禁用表格检测
 */

test.describe('插件状态测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage，确保测试隔离
    await clearStorage(page);
  });

  /**
   * 测试插件禁用时表格检测不可用
   * 验证需求：1.1 - 插件禁用时不执行表格检测逻辑
   */
  test('插件禁用时表格检测不可用', async ({ page }) => {
    // 1. 准备包含表格的测试页面
    const tableData = [
      ['姓名', '年龄'],
      ['张三', '25'],
      ['李四', '30']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 2. 禁用插件（在页面加载后）
    await disablePlugin(page);
    
    // 等待设置生效
    await waitForAsync(1000);
    
    // 3. 验证没有表格导出按钮（或按钮被移除）
    const exportButtons = await page.$$('.table-export-button');
    expect(exportButtons.length).toBe(0);
    
    // 4. 尝试框选表格
    const tableElement = page.locator('#test-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 5;
      const startY = boundingBox.y + 5;
      const endX = boundingBox.x + boundingBox.width - 5;
      const endY = boundingBox.y + boundingBox.height - 5;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 等待一段时间，看是否有面板显示
      await waitForAsync(2000);
      
      // 5. 验证没有面板显示（插件禁用时不应该有任何响应）
      const panelVisible = await isPanelVisible(page);
      expect(panelVisible).toBe(false);
    }
  });

  /**
   * 测试插件禁用时文本框选不可用
   * 验证需求：1.1 - 插件禁用时不执行文本提取逻辑
   */
  test('插件禁用时文本框选不可用', async ({ page }) => {
    // 1. 准备包含文本的测试页面
    const testText = '这是一段测试文本，用于验证插件禁用状态。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 禁用插件（在页面加载后）
    await disablePlugin(page);
    
    // 等待设置生效
    await waitForAsync(1000);
    
    // 3. 尝试框选文本
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 5;
      const startY = boundingBox.y + 5;
      const endX = boundingBox.x + boundingBox.width - 5;
      const endY = boundingBox.y + boundingBox.height - 5;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 等待一段时间，看是否有面板显示
      await waitForAsync(2000);
      
      // 4. 验证没有面板显示
      const panelVisible = await isPanelVisible(page);
      expect(panelVisible).toBe(false);
    }
  });

  /**
   * 测试插件启用后表格检测恢复正常
   * 验证需求：1.4 - 插件从禁用变为启用时，表格检测恢复工作
   */
  test('插件启用后表格检测恢复正常', async ({ page }) => {
    // 1. 准备包含表格的测试页面（插件默认启用）
    const tableData = [
      ['姓名', '年龄'],
      ['张三', '25']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 2. 禁用插件
    await disablePlugin(page);
    
    // 等待设置生效
    await waitForAsync(1000);
    
    // 3. 验证没有表格导出按钮（插件禁用状态）
    let exportButtons = await page.$$('.table-export-button');
    expect(exportButtons.length).toBe(0);
    
    // 4. 重新启用插件
    await enablePlugin(page);
    
    // 5. 重新加载页面以触发表格检测
    await page.reload();
    await page.waitForLoadState('networkidle');
    await waitForAsync(1500);
    
    // 6. 验证表格导出按钮出现
    exportButtons = await page.$$('.table-export-button');
    expect(exportButtons.length).toBeGreaterThan(0);
  });

  /**
   * 测试插件启用后文本框选恢复正常
   * 验证需求：1.4 - 插件从禁用变为启用时，文本框选恢复工作
   */
  test('插件启用后文本框选恢复正常', async ({ page }) => {
    // 1. 先禁用插件
    await disablePlugin(page);
    
    // 2. 准备包含文本的测试页面
    const testText = '这是一段测试文本，用于验证插件启用状态。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 3. 启用插件
    await enablePlugin(page);
    
    // 等待设置生效
    await waitForAsync(1000);
    
    // 4. 框选文本
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 5;
      const startY = boundingBox.y + 5;
      const endX = boundingBox.x + boundingBox.width - 5;
      const endY = boundingBox.y + boundingBox.height - 5;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 5. 等待结果面板显示
      const panel = await waitForResultPanel(page, 10000);
      expect(await panel.isVisible()).toBe(true);
    }
  });

  /**
   * 测试插件状态切换不影响已有页面的DOM
   * 验证需求：1.2 - 插件禁用时不在页面上显示任何UI元素
   */
  test('插件禁用时移除所有UI元素', async ({ page }) => {
    // 1. 启用插件并加载页面
    await enablePlugin(page);
    
    const tableData = [
      ['姓名', '年龄'],
      ['张三', '25']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1500);
    
    // 2. 验证表格导出按钮存在
    let exportButtons = await page.$$('.table-export-button');
    expect(exportButtons.length).toBeGreaterThan(0);
    
    // 3. 禁用插件
    await disablePlugin(page);
    
    // 等待设置生效
    await waitForAsync(1000);
    
    // 4. 验证表格导出按钮被移除
    exportButtons = await page.$$('.table-export-button');
    expect(exportButtons.length).toBe(0);
    
    // 5. 验证没有其他插件UI元素
    const panels = await page.$$('.tabular-extension-panel');
    expect(panels.length).toBe(0);
    
    const selectionBoxes = await page.$$('.tabular-extension-selection-box');
    expect(selectionBoxes.length).toBe(0);
  });

  /**
   * 测试插件禁用时不响应用户操作
   * 验证需求：1.3 - 插件禁用时不响应用户的表格检测相关操作
   */
  test('插件禁用时不响应任何用户操作', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '测试文本内容';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 禁用插件（在页面加载后）
    await disablePlugin(page);
    
    // 等待设置生效
    await waitForAsync(1000);
    
    // 3. 尝试多次框选操作
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      for (let i = 0; i < 3; i++) {
        const startX = boundingBox.x + 5;
        const startY = boundingBox.y + 5;
        const endX = boundingBox.x + boundingBox.width - 5;
        const endY = boundingBox.y + boundingBox.height - 5;
        
        await dragSelection(page, startX, startY, endX, endY);
        await waitForAsync(500);
      }
      
      // 4. 验证没有任何面板显示
      const panelVisible = await isPanelVisible(page);
      expect(panelVisible).toBe(false);
      
      // 5. 验证没有框选框残留
      const selectionBoxes = await page.$$('.tabular-extension-selection-box');
      expect(selectionBoxes.length).toBe(0);
    }
  });
});
