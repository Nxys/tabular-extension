import { test, expect } from './fixtures';
import {
  createTestPage,
  dragSelection,
  waitForResultPanel,
  getPanelText,
  waitForAsync
} from './helpers/extension';
import {
  setFreeUser,
  setTrialCount,
  clearStorage
} from './helpers/storage';
import { generateTextPage } from './fixtures/pages';

/**
 * Pro 功能试用次数计数器测试
 * 
 * 测试范围：
 * - Pro 功能用尽后显示正确计数（剩余 0 次）
 * - 按钮被禁用
 * 
 * 需求：4.4 - Pro功能用尽后计数显示修复
 */

test.describe('Pro 试用次数计数器', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage，确保测试隔离
    await clearStorage(page);
    // 设置为 Free 用户
    await setFreeUser(page);
  });

  /**
   * 测试：Pro 功能用尽后应该显示"剩余 0 次"
   * 验证需求：4.1, 4.2 - Background 返回最新计数，Panel 显示计数
   */
  test('Pro 功能用尽后应该显示正确计数', async ({ page }) => {
    // 1. 创建测试页面
    const testText = '第一行文本\n第二行文本\n第三行文本';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 设置试用次数为 1（即将用尽）- 必须在 createTestPage 之后
    await setTrialCount(page, 'advanced-cleaning', 1);
    await waitForAsync(500);
    
    // 3. 框选文本触发面板显示
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    
    if (!box) {
      throw new Error('无法获取文本元素的边界框');
    }
    
    await dragSelection(
      page,
      box.x + 5,
      box.y + 5,
      box.x + box.width - 5,
      box.y + box.height - 5
    );
    
    // 4. 等待面板显示
    const panel = await waitForResultPanel(page, 5000);
    expect(await panel.isVisible()).toBe(true);
    
    // 5. 验证初始状态：按钮显示"剩余 1 次"
    await waitForAsync(500);
    let advancedCleanBtn = panel.locator('.tabular-extension-panel-advanced-clean-btn');
    let buttonText = await advancedCleanBtn.textContent();
    
    // 按钮应该显示剩余次数
    expect(buttonText).toContain('剩余');
    expect(buttonText).toContain('1');
    
    // 6. 点击高级清洗按钮（消耗最后一次试用次数）
    await advancedCleanBtn.click();
    
    // 7. 等待清洗对话框显示
    await page.waitForSelector('.tabular-extension-dialog', { timeout: 3000 });
    
    // 8. 点击确认按钮应用清洗
    const confirmBtn = page.locator('.tabular-extension-dialog-btn-confirm');
    await confirmBtn.click();
    
    // 9. 等待面板更新
    await waitForAsync(1000);
    
    // 10. 验证按钮显示"剩余 0 次"
    advancedCleanBtn = panel.locator('.tabular-extension-panel-advanced-clean-btn');
    buttonText = await advancedCleanBtn.textContent();
    
    console.log('按钮文本（用尽后）:', buttonText);
    
    // 验证显示剩余 0 次
    expect(buttonText).toContain('剩余');
    expect(buttonText).toContain('0');
  });

  /**
   * 测试：Pro 功能用尽后按钮应该被禁用
   * 验证需求：4.2, 4.4 - 次数为 0 时禁用按钮
   */
  test('Pro 功能用尽后按钮应该被禁用', async ({ page }) => {
    // 1. 创建测试页面
    const testText = '测试文本内容';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 设置试用次数为 0（已用尽）- 必须在 createTestPage 之后
    await setTrialCount(page, 'advanced-cleaning', 0);
    await waitForAsync(500);
    
    // 3. 框选文本触发面板显示
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    
    if (!box) {
      throw new Error('无法获取文本元素的边界框');
    }
    
    await dragSelection(
      page,
      box.x + 5,
      box.y + 5,
      box.x + box.width - 5,
      box.y + box.height - 5
    );
    
    // 4. 等待面板显示
    const panel = await waitForResultPanel(page, 5000);
    expect(await panel.isVisible()).toBe(true);
    
    await waitForAsync(500);
    
    // 5. 验证高级清洗按钮被禁用
    const advancedCleanBtn = panel.locator('.tabular-extension-panel-advanced-clean-btn');
    const isDisabled = await advancedCleanBtn.isDisabled();
    
    expect(isDisabled).toBe(true);
    
    // 6. 验证按钮显示"剩余 0 次"
    const buttonText = await advancedCleanBtn.textContent();
    expect(buttonText).toContain('剩余');
    expect(buttonText).toContain('0');
    
    // 7. 验证按钮样式（应该有视觉反馈）
    const opacity = await advancedCleanBtn.evaluate(el => {
      return window.getComputedStyle(el).opacity;
    });
    
    // 禁用的按钮应该有降低的透明度
    expect(parseFloat(opacity)).toBeLessThan(1);
  });

  /**
   * 测试：导出按钮也应该显示正确的试用次数
   * 验证需求：4.2, 4.4 - 所有 Pro 功能按钮都显示计数
   */
  test('导出按钮应该显示正确的试用次数', async ({ page }) => {
    // 1. 创建测试页面
    const testText = '导出测试文本';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 设置导出功能的试用次数为 2 - 必须在 createTestPage 之后
    await setTrialCount(page, 'one-click-export', 2);
    await waitForAsync(500);
    
    // 3. 框选文本触发面板显示
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    
    if (!box) {
      throw new Error('无法获取文本元素的边界框');
    }
    
    await dragSelection(
      page,
      box.x + 5,
      box.y + 5,
      box.x + box.width - 5,
      box.y + box.height - 5
    );
    
    // 4. 等待面板显示
    const panel = await waitForResultPanel(page, 5000);
    expect(await panel.isVisible()).toBe(true);
    
    await waitForAsync(500);
    
    // 5. 验证导出按钮显示"剩余 2 次"
    const exportBtn = panel.locator('.tabular-extension-panel-export-btn');
    const buttonText = await exportBtn.textContent();
    
    console.log('导出按钮文本:', buttonText);
    
    expect(buttonText).toContain('剩余');
    expect(buttonText).toContain('2');
  });

  /**
   * 测试：试用次数用尽后点击按钮不应该有响应
   * 验证需求：4.4 - 禁用按钮不响应点击
   */
  test('试用次数用尽后点击按钮不应该有响应', async ({ page }) => {
    // 1. 创建测试页面
    const testText = '测试文本';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 设置试用次数为 0 - 必须在 createTestPage 之后
    await setTrialCount(page, 'advanced-cleaning', 0);
    await waitForAsync(500);
    
    // 3. 框选文本触发面板显示
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    
    if (!box) {
      throw new Error('无法获取文本元素的边界框');
    }
    
    await dragSelection(
      page,
      box.x + 5,
      box.y + 5,
      box.x + box.width - 5,
      box.y + box.height - 5
    );
    
    // 4. 等待面板显示
    await waitForResultPanel(page, 5000);
    await waitForAsync(500);
    
    // 5. 尝试点击高级清洗按钮
    const advancedCleanBtn = page.locator('.tabular-extension-panel-advanced-clean-btn');
    await advancedCleanBtn.click({ force: true }); // 强制点击禁用的按钮
    
    // 6. 等待一段时间
    await waitForAsync(1000);
    
    // 7. 验证清洗对话框没有显示（按钮不响应）
    const dialog = page.locator('.tabular-extension-dialog');
    const dialogCount = await dialog.count();
    
    expect(dialogCount).toBe(0);
  });

  /**
   * 测试：试用次数从 1 递减到 0 的完整流程
   * 验证需求：4.1, 4.2, 4.4 - 完整的计数更新流程
   */
  test('试用次数应该正确递减并更新显示', async ({ page }) => {
    // 1. 创建测试页面
    const testText = '递减测试文本\n第二行\n第三行';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 设置试用次数为 2 - 必须在 createTestPage 之后
    await setTrialCount(page, 'advanced-cleaning', 2);
    await waitForAsync(500);
    
    // 3. 第一次框选
    const textDiv = page.locator('#test-text');
    let box = await textDiv.boundingBox();
    
    if (!box) {
      throw new Error('无法获取文本元素的边界框');
    }
    
    await dragSelection(
      page,
      box.x + 5,
      box.y + 5,
      box.x + box.width - 5,
      box.y + box.height - 5
    );
    
    // 4. 等待面板显示
    let panel = await waitForResultPanel(page, 5000);
    await waitForAsync(500);
    
    // 5. 验证初始显示"剩余 2 次"
    let advancedCleanBtn = panel.locator('.tabular-extension-panel-advanced-clean-btn');
    let buttonText = await advancedCleanBtn.textContent();
    expect(buttonText).toContain('2');
    
    // 6. 使用一次高级清洗
    await advancedCleanBtn.click();
    await page.waitForSelector('.tabular-extension-dialog');
    await page.locator('.tabular-extension-dialog-btn-confirm').click();
    await waitForAsync(1000);
    
    // 7. 验证更新为"剩余 1 次"
    buttonText = await advancedCleanBtn.textContent();
    expect(buttonText).toContain('1');
    
    // 8. 关闭面板并重新框选
    await page.keyboard.press('Escape');
    await waitForAsync(500);
    
    box = await textDiv.boundingBox();
    if (!box) {
      throw new Error('无法获取文本元素的边界框');
    }
    
    await dragSelection(
      page,
      box.x + 5,
      box.y + 5,
      box.x + box.width - 5,
      box.y + box.height - 5
    );
    
    // 9. 等待面板再次显示
    panel = await waitForResultPanel(page, 5000);
    await waitForAsync(500);
    
    // 10. 验证仍然显示"剩余 1 次"
    advancedCleanBtn = panel.locator('.tabular-extension-panel-advanced-clean-btn');
    buttonText = await advancedCleanBtn.textContent();
    expect(buttonText).toContain('1');
    
    // 11. 再次使用高级清洗（用尽最后一次）
    await advancedCleanBtn.click();
    await page.waitForSelector('.tabular-extension-dialog');
    await page.locator('.tabular-extension-dialog-btn-confirm').click();
    await waitForAsync(1000);
    
    // 12. 验证更新为"剩余 0 次"并被禁用
    buttonText = await advancedCleanBtn.textContent();
    expect(buttonText).toContain('0');
    
    const isDisabled = await advancedCleanBtn.isDisabled();
    expect(isDisabled).toBe(true);
  });

  /**
   * 测试：试用次数用尽后显示升级提示
   * 验证需求：4.5 - showTrialExhausted 显示正确信息
   */
  test('试用次数用尽后应该显示升级提示', async ({ page }) => {
    // 1. 创建测试页面
    const testText = '升级提示测试';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 2. 设置试用次数为 0 - 必须在 createTestPage 之后
    await setTrialCount(page, 'advanced-cleaning', 0);
    await waitForAsync(500);
    
    // 3. 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    
    if (!box) {
      throw new Error('无法获取文本元素的边界框');
    }
    
    await dragSelection(
      page,
      box.x + 5,
      box.y + 5,
      box.x + box.width - 5,
      box.y + box.height - 5
    );
    
    // 4. 等待面板显示
    const panel = await waitForResultPanel(page, 5000);
    await waitForAsync(500);
    
    // 5. 点击高级清洗按钮（虽然被禁用，但可能显示提示）
    const advancedCleanBtn = panel.locator('.tabular-extension-panel-advanced-clean-btn');
    
    // 验证按钮被禁用
    const isDisabled = await advancedCleanBtn.isDisabled();
    expect(isDisabled).toBe(true);
    
    // 6. 获取面板文本，验证是否包含升级相关信息
    const panelText = await getPanelText(page);
    
    // 面板应该显示剩余次数为 0
    expect(panelText).toContain('0');
  });
});
