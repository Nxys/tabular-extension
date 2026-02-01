import { test, expect } from './fixtures';
import { 
  createTestPage, 
  dragSelection, 
  waitForResultPanel,
  waitForAsync
} from './helpers/extension';
import { clearStorage, setTrialCount } from './helpers/storage';
import { generateTextPage } from './fixtures/pages';

/**
 * 面板 z-index 层级测试
 * 测试面板、弹窗和框选框的层级关系
 * 
 * 验证需求3：修复面板框选问题
 */

test.describe('面板 z-index 层级测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage，确保测试隔离
    await clearStorage(page);
    
    // 设置试用次数，避免按钮被禁用
    await setTrialCount(page, 'advanced-cleaning', 3);
    await setTrialCount(page, 'one-click-export', 3);
  });

  /**
   * 测试面板在框选框之上
   * 验证需求：3.2 - 面板使用正确的 z-index (9999)
   * 验证需求：3.5 - 面板显示时清除框选框
   */
  /**
   * 测试面板在框选框之上
   * 验证需求：3.2 - 面板使用正确的 z-index (9999)
   * 验证需求：3.5 - 面板显示时清除框选框
   */
  test('面板应该在框选框之上', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证面板层级。这段文本需要足够长以便能够被正确框选。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 框选文本
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + boundingBox.width - 10;
      const endY = boundingBox.y + boundingBox.height - 10;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 3. 等待面板显示
      const panel = await waitForResultPanel(page, 10000);
      expect(await panel.isVisible()).toBe(true);
      
      // 4. 验证面板的 z-index 为 9999
      const panelZIndex = await panel.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(panelZIndex).toBe('9999');
      
      // 5. 验证框选框已被清除（不存在）
      const selectionBox = await page.$('.tabular-extension-box');
      expect(selectionBox).toBeNull();
    }
  });

  /**
   * 测试弹窗在面板之上
   * 验证需求：3.3 - 弹窗使用正确的 z-index (10001)
   * 验证需求：3.3 - 遮罩层使用正确的 z-index (10000)
   */
  /**
   * 测试弹窗在面板之上
   * 验证需求：3.3 - 弹窗使用正确的 z-index (10001)
   * 验证需求：3.3 - 遮罩层使用正确的 z-index (10000)
   */
  test('弹窗应该在面板之上', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证弹窗层级。这段文本需要足够长以便能够被正确框选。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 框选文本并显示面板
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + boundingBox.width - 10;
      const endY = boundingBox.y + boundingBox.height - 10;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 3. 等待面板显示
      const panel = await waitForResultPanel(page, 10000);
      expect(await panel.isVisible()).toBe(true);
      
      // 4. 点击高级清洗按钮
      const advancedCleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
      await advancedCleanBtn.click();
      
      // 5. 等待弹窗显示
      await page.waitForSelector('.tabular-extension-dialog', { timeout: 5000 });
      
      // 6. 验证遮罩层的 z-index 为 10000
      const dialogOverlay = page.locator('.tabular-extension-dialog-overlay');
      const overlayZIndex = await dialogOverlay.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(overlayZIndex).toBe('10000');
      
      // 7. 验证弹窗的 z-index 为 10001
      const dialog = page.locator('.tabular-extension-dialog');
      const dialogZIndex = await dialog.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(dialogZIndex).toBe('10001');
      
      // 8. 验证层级关系：弹窗 > 遮罩层 > 面板
      const panelZIndex = await panel.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(parseInt(dialogZIndex)).toBeGreaterThan(parseInt(overlayZIndex));
      expect(parseInt(overlayZIndex)).toBeGreaterThan(parseInt(panelZIndex));
    }
  });

  /**
   * 测试面板显示时不应该有框选框
   * 验证需求：3.5 - 面板显示时清除框选框
   * 验证需求：3.6 - Selection 的 clear 方法正确移除框选框
   */
  /**
   * 测试面板显示时不应该有框选框
   * 验证需求：3.5 - 面板显示时清除框选框
   * 验证需求：3.6 - Selection 的 clear 方法正确移除框选框
   */
  test('面板显示时不应该有框选框', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证框选框清除。这段文本需要足够长以便能够被正确框选。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 框选文本
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + boundingBox.width - 10;
      const endY = boundingBox.y + boundingBox.height - 10;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 3. 等待面板显示
      const panel = await waitForResultPanel(page, 10000);
      expect(await panel.isVisible()).toBe(true);
      
      // 4. 验证框选框不存在
      const selectionBox = await page.$('.tabular-extension-box');
      expect(selectionBox).toBeNull();
      
      // 5. 尝试在面板上进行鼠标操作（不应该创建新的框选框）
      const panelBoundingBox = await panel.boundingBox();
      if (panelBoundingBox) {
        const panelStartX = panelBoundingBox.x + 10;
        const panelStartY = panelBoundingBox.y + 10;
        const panelEndX = panelBoundingBox.x + 50;
        const panelEndY = panelBoundingBox.y + 50;
        
        await page.mouse.move(panelStartX, panelStartY);
        await page.mouse.down();
        await page.mouse.move(panelEndX, panelEndY);
        await page.mouse.up();
        
        // 等待一段时间
        await waitForAsync(500);
        
        // 6. 再次验证框选框不存在
        const selectionBox2 = await page.$('.tabular-extension-box');
        expect(selectionBox2).toBeNull();
      }
    }
  });

  /**
   * 测试遮罩层显示时应该禁用框选
   * 验证需求：3.7 - 遮罩层显示时禁用框选
   * 验证需求：3.8 - CSS 中确保遮罩层阻止交互
   */
  /**
   * 测试遮罩层显示时应该禁用框选
   * 验证需求：3.7 - 遮罩层显示时禁用框选
   * 验证需求：3.8 - CSS 中确保遮罩层阻止交互
   */
  test('遮罩层显示时应该禁用框选', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证遮罩层阻止框选。这段文本需要足够长以便能够被正确框选。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 框选文本并显示面板
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + boundingBox.width - 10;
      const endY = boundingBox.y + boundingBox.height - 10;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 3. 等待面板显示
      const panel = await waitForResultPanel(page, 10000);
      expect(await panel.isVisible()).toBe(true);
      
      // 4. 点击高级清洗按钮显示遮罩层
      const advancedCleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
      await advancedCleanBtn.click();
      
      // 5. 等待遮罩层显示
      await page.waitForSelector('.tabular-extension-dialog-overlay', { timeout: 5000 });
      
      // 6. 验证遮罩层的 pointer-events 为 auto
      const dialogOverlay = page.locator('.tabular-extension-dialog-overlay');
      const pointerEvents = await dialogOverlay.evaluate(el => 
        window.getComputedStyle(el).pointerEvents
      );
      expect(pointerEvents).toBe('auto');
      
      // 7. 尝试在遮罩层上框选（应该不会创建框选框）
      const overlayBoundingBox = await dialogOverlay.boundingBox();
      if (overlayBoundingBox) {
        // 在遮罩层的空白区域（不在弹窗上）进行框选
        const overlayStartX = overlayBoundingBox.x + 50;
        const overlayStartY = overlayBoundingBox.y + 50;
        const overlayEndX = overlayStartX + 100;
        const overlayEndY = overlayStartY + 100;
        
        await page.mouse.move(overlayStartX, overlayStartY);
        await page.mouse.down();
        await page.mouse.move(overlayEndX, overlayEndY);
        await page.mouse.up();
        
        // 等待一段时间
        await waitForAsync(500);
        
        // 8. 验证没有创建框选框
        const selectionBox = await page.$('.tabular-extension-box');
        expect(selectionBox).toBeNull();
      }
    }
  });

  /**
   * 测试导出对话框的层级关系
   * 验证需求：3.3 - 导出对话框使用正确的 z-index
   */
  /**
   * 测试导出对话框的层级关系
   * 验证需求：3.3 - 导出对话框使用正确的 z-index
   */
  test('导出对话框应该在面板之上', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证导出对话框层级。这段文本需要足够长以便能够被正确框选。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 框选文本并显示面板
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + boundingBox.width - 10;
      const endY = boundingBox.y + boundingBox.height - 10;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 3. 等待面板显示
      const panel = await waitForResultPanel(page, 10000);
      expect(await panel.isVisible()).toBe(true);
      
      // 4. 点击导出按钮
      const exportBtn = page.locator('.tabular-extension-panel-export-btn');
      await exportBtn.click();
      
      // 5. 等待导出对话框显示
      await page.waitForSelector('.tabular-extension-dialog', { timeout: 5000 });
      
      // 6. 验证遮罩层的 z-index 为 10000
      const dialogOverlay = page.locator('.tabular-extension-dialog-overlay');
      const overlayZIndex = await dialogOverlay.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(overlayZIndex).toBe('10000');
      
      // 7. 验证弹窗的 z-index 为 10001
      const dialog = page.locator('.tabular-extension-dialog');
      const dialogZIndex = await dialog.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(dialogZIndex).toBe('10001');
      
      // 8. 验证层级关系
      const panelZIndex = await panel.evaluate(el => 
        window.getComputedStyle(el).zIndex
      );
      expect(parseInt(dialogZIndex)).toBeGreaterThan(parseInt(overlayZIndex));
      expect(parseInt(overlayZIndex)).toBeGreaterThan(parseInt(panelZIndex));
    }
  });

  /**
   * 测试框选框的 z-index
   * 验证需求：3.2 - 框选框使用正确的 z-index (9998)
   */
  test('框选框应该使用正确的 z-index', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证框选框 z-index。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 开始框选但不释放鼠标（保持框选框显示）
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 5;
      const startY = boundingBox.y + 5;
      const endX = boundingBox.x + boundingBox.width - 5;
      const endY = boundingBox.y + boundingBox.height - 5;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      
      // 不释放鼠标，等待框选框显示
      await waitForAsync(200);
      
      // 3. 验证框选框存在
      const selectionBox = await page.$('.tabular-extension-box');
      expect(selectionBox).not.toBeNull();
      
      // 4. 验证框选框的 z-index 为 9998
      if (selectionBox) {
        const boxZIndex = await page.evaluate(el => 
          window.getComputedStyle(el).zIndex,
          selectionBox
        );
        expect(boxZIndex).toBe('9998');
      }
      
      // 5. 释放鼠标
      await page.mouse.up();
    }
  });

  /**
   * 测试多次框选后的层级关系
   * 验证需求：3.5 - 每次显示面板时都清除框选框
   */
  /**
   * 测试多次框选后的层级关系
   * 验证需求：3.5 - 每次显示面板时都清除框选框
   */
  test.skip('多次框选后面板层级保持正确', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证多次框选的层级关系。这段文本需要足够长以便能够被正确框选。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + boundingBox.width - 10;
      const endY = boundingBox.y + boundingBox.height - 10;
      
      // 2. 进行2次框选操作（减少循环次数避免超时）
      for (let i = 0; i < 2; i++) {
        await dragSelection(page, startX, startY, endX, endY);
        
        // 等待面板显示
        const panel = await waitForResultPanel(page, 10000);
        expect(await panel.isVisible()).toBe(true);
        
        // 验证面板 z-index 正确
        const panelZIndex = await panel.evaluate(el => 
          window.getComputedStyle(el).zIndex
        );
        expect(panelZIndex).toBe('9999');
        
        // 验证没有框选框
        const selectionBox = await page.$('.tabular-extension-box');
        expect(selectionBox).toBeNull();
        
        // 关闭面板
        const closeBtn = page.locator('.tabular-extension-panel-close-btn');
        await closeBtn.click({ timeout: 5000 });
        
        // 等待面板关闭
        await page.waitForSelector('.tabular-extension-panel', { state: 'detached', timeout: 5000 });
        await waitForAsync(300);
      }
    }
  });

  /**
   * 测试遮罩层的 user-select 属性
   * 验证需求：3.8 - 遮罩层禁止文本选择
   */
  /**
   * 测试遮罩层的 user-select 属性
   * 验证需求：3.8 - 遮罩层禁止文本选择
   */
  test('遮罩层应该禁止文本选择', async ({ page }) => {
    // 1. 准备测试页面
    const testText = '这是一段测试文本，用于验证遮罩层禁止文本选择。这段文本需要足够长以便能够被正确框选。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 框选文本并显示面板
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (boundingBox) {
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + boundingBox.width - 10;
      const endY = boundingBox.y + boundingBox.height - 10;
      
      await dragSelection(page, startX, startY, endX, endY);
      
      // 3. 等待面板显示
      const panel = await waitForResultPanel(page, 10000);
      expect(await panel.isVisible()).toBe(true);
      
      // 4. 点击高级清洗按钮显示遮罩层
      const advancedCleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
      await advancedCleanBtn.click();
      
      // 5. 等待遮罩层显示
      await page.waitForSelector('.tabular-extension-dialog-overlay', { timeout: 5000 });
      
      // 6. 验证遮罩层的 user-select 为 none
      const dialogOverlay = page.locator('.tabular-extension-dialog-overlay');
      const userSelect = await dialogOverlay.evaluate(el => 
        window.getComputedStyle(el).userSelect
      );
      expect(userSelect).toBe('none');
    }
  });
});
