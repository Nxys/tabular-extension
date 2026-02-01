/**
 * 面板按钮状态管理集成测试
 * 测试文本预览面板中按钮的禁用/启用状态
 */

import { test, expect } from './fixtures';
import { 
  createTestPage, 
  dragSelection, 
  waitForResultPanel,
  getPanelText
} from './helpers/extension';
import {
  setTrialCount,
  clearStorage
} from './helpers/storage';
import { generateTextPage } from './fixtures/pages';

test.describe('面板按钮状态管理', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage
    await clearStorage(page);
  });

  test('空内容时按钮应该被禁用', async ({ page }) => {
    // 创建一个测试页面，模拟返回空内容的场景
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>空内容测试</title>
        </head>
        <body>
          <div id="test-content" style="padding: 20px; min-height: 100px;">
            <!-- 空内容区域 -->
          </div>
        </body>
      </html>
    `;
    
    await createTestPage(page, htmlContent);

    // 尝试框选空区域
    const testDiv = page.locator('#test-content');
    const box = await testDiv.boundingBox();
    
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + 50, box.y + 50);
      await page.waitForTimeout(500);
    }

    // 检查是否显示了面板
    const panel = page.locator('.tabular-extension-panel');
    const panelVisible = await panel.isVisible().catch(() => false);
    
    if (panelVisible) {
      // 如果显示了面板，验证按钮被禁用
      const copyBtn = page.locator('.tabular-extension-panel-copy-btn');
      const cleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
      const exportBtn = page.locator('.tabular-extension-panel-export-btn');

      const copyDisabled = await copyBtn.evaluate(el => (el as HTMLButtonElement).disabled);
      const cleanDisabled = await cleanBtn.evaluate(el => (el as HTMLButtonElement).disabled);
      const exportDisabled = await exportBtn.evaluate(el => (el as HTMLButtonElement).disabled);

      expect(copyDisabled).toBe(true);
      expect(cleanDisabled).toBe(true);
      expect(exportDisabled).toBe(true);
    }
  });

  test('有内容时按钮应该可用', async ({ page }) => {
    // 创建一个包含文本内容的测试页面
    const testText = '这是一些测试文本内容，用于验证按钮状态';
    const htmlContent = generateTextPage(testText);
    
    await createTestPage(page, htmlContent);

    // 框选文本内容
    const testDiv = page.locator('#test-text');
    const box = await testDiv.boundingBox();
    
    expect(box).not.toBeNull();
    
    if (box) {
      await dragSelection(
        page, 
        box.x + 10, 
        box.y + 10, 
        box.x + box.width - 10, 
        box.y + box.height - 10
      );
    }

    // 等待面板显示
    await waitForResultPanel(page);

    // 验证按钮可用
    const copyBtn = page.locator('.tabular-extension-panel-copy-btn');
    const cleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
    const exportBtn = page.locator('.tabular-extension-panel-export-btn');

    const copyDisabled = await copyBtn.evaluate(el => (el as HTMLButtonElement).disabled);
    const cleanDisabled = await cleanBtn.evaluate(el => (el as HTMLButtonElement).disabled);
    const exportDisabled = await exportBtn.evaluate(el => (el as HTMLButtonElement).disabled);

    expect(copyDisabled).toBe(false);
    expect(cleanDisabled).toBe(false);
    expect(exportDisabled).toBe(false);
  });

  test('仅包含空格时按钮应该被禁用', async ({ page }) => {
    // 创建一个只包含空格的测试页面
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>空格测试</title>
        </head>
        <body>
          <div id="test-content" style="padding: 20px; white-space: pre; min-height: 100px;">
            
            
            
          </div>
        </body>
      </html>
    `;
    
    await createTestPage(page, htmlContent);

    // 框选空格区域
    const testDiv = page.locator('#test-content');
    const box = await testDiv.boundingBox();
    
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + 50, box.y + 50);
      await page.waitForTimeout(500);
    }

    // 检查是否显示了面板
    const panel = page.locator('.tabular-extension-panel');
    const panelVisible = await panel.isVisible().catch(() => false);
    
    if (panelVisible) {
      // 如果显示了面板，验证按钮被禁用
      const copyBtn = page.locator('.tabular-extension-panel-copy-btn');
      const cleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
      const exportBtn = page.locator('.tabular-extension-panel-export-btn');

      const copyDisabled = await copyBtn.evaluate(el => (el as HTMLButtonElement).disabled);
      const cleanDisabled = await cleanBtn.evaluate(el => (el as HTMLButtonElement).disabled);
      const exportDisabled = await exportBtn.evaluate(el => (el as HTMLButtonElement).disabled);

      expect(copyDisabled).toBe(true);
      expect(cleanDisabled).toBe(true);
      expect(exportDisabled).toBe(true);
    }
  });

  test('试用次数为0时Pro功能按钮应该被禁用', async ({ page }) => {
    // 设置试用次数为0
    await setTrialCount(page, 'advanced-cleaning', 0);
    await setTrialCount(page, 'one-click-export', 0);

    // 创建测试页面
    const testText = '测试文本内容';
    const htmlContent = generateTextPage(testText);
    
    await createTestPage(page, htmlContent);

    // 框选文本
    const testDiv = page.locator('#test-text');
    const box = await testDiv.boundingBox();
    
    expect(box).not.toBeNull();
    
    if (box) {
      await dragSelection(
        page, 
        box.x + 10, 
        box.y + 10, 
        box.x + box.width - 10, 
        box.y + box.height - 10
      );
    }

    // 等待面板显示
    await waitForResultPanel(page);

    // 验证Pro功能按钮被禁用
    const cleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
    const exportBtn = page.locator('.tabular-extension-panel-export-btn');

    const cleanDisabled = await cleanBtn.evaluate(el => (el as HTMLButtonElement).disabled);
    const cleanText = await cleanBtn.textContent();
    expect(cleanDisabled).toBe(true);
    expect(cleanText).toContain('剩余 0 次');

    const exportDisabled = await exportBtn.evaluate(el => (el as HTMLButtonElement).disabled);
    const exportText = await exportBtn.textContent();
    expect(exportDisabled).toBe(true);
    expect(exportText).toContain('剩余 0 次');

    // 复制按钮应该仍然可用（因为有内容）
    const copyBtn = page.locator('.tabular-extension-panel-copy-btn');
    const copyDisabled = await copyBtn.evaluate(el => (el as HTMLButtonElement).disabled);
    expect(copyDisabled).toBe(false);
  });
});
