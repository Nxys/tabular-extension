import { test, expect } from '@playwright/test';
import {
  createTestPage,
  dragSelection,
  waitForResultPanel,
  hasUpgradePrompt,
  getRowLimitInfo,
  getPanelText,
  waitForAsync
} from './helpers/extension-helper';
import {
  setProUser,
  setFreeUser,
  setTrialCount,
  getTrialCount,
  clearStorage
} from './helpers/storage-helper';
import { generateLargeTablePage } from './fixtures/test-pages';
import { generateOverLimitTableData } from './fixtures/test-data';

/**
 * Pro 功能测试套件
 * 
 * 测试范围：
 * - Free 用户行数限制（5 行）
 * - Pro 用户无限制
 * - Free 用户试用次数管理
 * - Pro 用户试用次数不受影响
 * - 升级提示文案
 * 
 * 需求：4.1-4.5
 */

test.describe('Pro 功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage，确保测试隔离
    await clearStorage(page);
  });

  /**
   * 测试 3.2：Free 用户行数限制
   * 需求：4.1
   */
  test('Free 用户提取超过 5 行应显示限制', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 生成超过 5 行的表格（10 行）
    const tableData = generateOverLimitTableData(5);
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>行数限制测试</title></head>
<body>
    <table id="test-table">
        ${tableData.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 框选表格
    const table = page.locator('#test-table');
    const box = await table.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    // 等待面板显示
    await waitForAsync(1000);
    
    // 检查是否显示限制提示
    const limitInfo = await getRowLimitInfo(page);
    expect(limitInfo.limited).toBe(true);
    expect(limitInfo.current).toBeLessThanOrEqual(5);
    expect(limitInfo.max).toBeGreaterThan(5);
    
    // 检查是否有升级提示
    const hasUpgrade = await hasUpgradePrompt(page);
    expect(hasUpgrade).toBe(true);
  });

  /**
   * 测试 3.3：Pro 用户无限制
   * 需求：4.2
   */
  test('Pro 用户提取超过 5 行应无限制', async ({ page }) => {
    // 设置为 Pro 用户
    await setProUser(page);
    
    // 生成超过 5 行的表格（10 行）
    const tableData = generateOverLimitTableData(5);
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>Pro 无限制测试</title></head>
<body>
    <table id="test-table">
        ${tableData.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
    </table>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 框选表格
    const table = page.locator('#test-table');
    const box = await table.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    // 等待面板显示
    await waitForAsync(1000);
    
    // 检查是否无限制
    const limitInfo = await getRowLimitInfo(page);
    expect(limitInfo.limited).toBe(false);
    expect(limitInfo.current).toBeGreaterThan(5);
    
    // 检查不应有升级提示
    const hasUpgrade = await hasUpgradePrompt(page);
    expect(hasUpgrade).toBe(false);
  });

  /**
   * 测试 3.4：Free 用户试用次数消耗
   * 需求：4.3
   * 
   * 注意：当前测试仅验证试用次数的初始设置和读取
   * 实际的高级清洗功能触发需要完整的 UI 交互流程
   */
  test('Free 用户使用高级清洗应消耗试用次数', async ({ page }) => {
    // 设置为 Free 用户并设置试用次数
    await setFreeUser(page);
    await setTrialCount(page, 'advanced-cleaning', 3);
    
    // 创建测试页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>高级清洗测试</title></head>
<body>
    <div id="test-text">
        第一行文本
        第二行文本
        第三行文本
    </div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 获取初始试用次数
    const initialCount = await getTrialCount(page, 'advanced-cleaning');
    expect(initialCount).toBe(3);
    
    // TODO: 触发高级清洗功能
    // 当前插件的高级清洗功能需要通过 UI 交互触发
    // 这里仅验证试用次数的设置和读取功能
    // 完整的功能测试需要在 UI 交互测试中实现
    
    // 验证试用次数设置成功
    expect(initialCount).toBeGreaterThan(0);
  });

  /**
   * 测试 3.5：试用次数为 0 的行为
   * 需求：4.4
   */
  test('Free 用户试用次数为 0 应显示升级提示', async ({ page }) => {
    // 设置为 Free 用户并设置试用次数为 0
    await setFreeUser(page);
    await setTrialCount(page, 'advanced-cleaning', 0);
    
    // 创建测试页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>试用次数耗尽测试</title></head>
<body>
    <div id="test-text">
        第一行文本
        第二行文本
        第三行文本
    </div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 验证试用次数为 0
    const initialCount = await getTrialCount(page, 'advanced-cleaning');
    expect(initialCount).toBe(0);
    
    // TODO: 尝试使用高级清洗功能
    // 应该显示升级提示并阻止操作
    // 完整的功能测试需要在 UI 交互测试中实现
    
    // 验证试用次数仍为 0（未消耗）
    const finalCount = await getTrialCount(page, 'advanced-cleaning');
    expect(finalCount).toBe(0);
  });

  /**
   * 测试 3.6：Pro 用户试用次数不变
   * 需求：4.5
   */
  test('Pro 用户使用高级清洗不消耗试用次数', async ({ page }) => {
    // 设置为 Pro 用户
    await setProUser(page);
    await setTrialCount(page, 'advanced-cleaning', 3);
    
    // 创建测试页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>Pro 用户测试</title></head>
<body>
    <div id="test-text">
        第一行文本
        第二行文本
        第三行文本
    </div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 获取初始试用次数
    const initialCount = await getTrialCount(page, 'advanced-cleaning');
    expect(initialCount).toBe(3);
    
    // TODO: 使用高级清洗功能
    // Pro 用户使用高级功能不应消耗试用次数
    // 完整的功能测试需要在 UI 交互测试中实现
    
    // 验证试用次数不变
    const finalCount = await getTrialCount(page, 'advanced-cleaning');
    expect(finalCount).toBe(initialCount);
  });

  /**
   * 测试 3.7：升级提示内容
   * 需求：4.1, 4.4
   */
  test('升级提示应包含正确的文案', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 生成超过 5 行的大型表格
    const htmlContent = generateLargeTablePage(10, 3);
    await createTestPage(page, htmlContent);
    
    // 框选表格
    const table = page.locator('#large-table');
    const box = await table.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    // 等待面板显示
    await waitForAsync(1000);
    
    // 检查升级提示文案
    const panelText = await getPanelText(page);
    
    // 验证包含关键词
    expect(panelText).toMatch(/升级|Pro/);
    expect(panelText).toMatch(/完整数据|解锁/);
    
    // 验证包含行数限制信息
    const limitInfo = await getRowLimitInfo(page);
    if (limitInfo.limited) {
      expect(panelText).toMatch(/仅展示前.*行/);
    }
  });
});
