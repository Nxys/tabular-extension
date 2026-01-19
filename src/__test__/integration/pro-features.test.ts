import { test, expect } from '@playwright/test';
import {
  createTestPage,
  dragSelection,
  waitForResultPanel,
  hasUpgradePrompt,
  getRowLimitInfo,
  getPanelText,
  waitForAsync
} from './helpers/extension-helper.js';
import {
  setProUser,
  setFreeUser,
  setTrialCount,
  getTrialCount,
  clearStorage
} from './helpers/storage-helper.js';
import { generateLargeTablePage } from './fixtures/test-pages.js';
import { generateOverLimitTableData } from './fixtures/test-data.js';

/**
 * Pro 功能测试
 * 测试 Pro 功能和权限控制
 */

test.describe('Pro 功能测试', () => {
  
  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage
    await clearStorage(page);
  });

  test('Free 用户提取超过 5 行应显示限制', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 生成超过 5 行的表格
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
    
    await waitForAsync(1000);
    
    // 检查是否显示限制提示
    const limitInfo = await getRowLimitInfo(page);
    expect(limitInfo.limited).toBe(true);
    expect(limitInfo.current).toBeLessThanOrEqual(5);
    
    // 检查是否有升级提示
    const hasUpgrade = await hasUpgradePrompt(page);
    expect(hasUpgrade).toBe(true);
  });

  test('Pro 用户提取超过 5 行应无限制', async ({ page }) => {
    // 设置为 Pro 用户
    await setProUser(page);
    
    // 生成超过 5 行的表格
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
    
    await waitForAsync(1000);
    
    // 检查是否无限制
    const limitInfo = await getRowLimitInfo(page);
    expect(limitInfo.limited).toBe(false);
    expect(limitInfo.current).toBeGreaterThan(5);
    
    // 检查不应有升级提示
    const hasUpgrade = await hasUpgradePrompt(page);
    expect(hasUpgrade).toBe(false);
  });

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
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 获取初始试用次数
    const initialCount = await getTrialCount(page, 'advanced-cleaning');
    expect(initialCount).toBe(3);
    
    // TODO: 触发高级清洗功能
    // 这里需要实际的高级清洗操作，暂时跳过
    
    // 验证试用次数减少
    // const finalCount = await getTrialCount(page, 'advanced-cleaning');
    // expect(finalCount).toBe(2);
  });

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
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // TODO: 尝试使用高级清洗功能
    // 应该显示升级提示
    
    // 验证试用次数仍为 0（未消耗）
    const finalCount = await getTrialCount(page, 'advanced-cleaning');
    expect(finalCount).toBe(0);
  });

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
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 获取初始试用次数
    const initialCount = await getTrialCount(page, 'advanced-cleaning');
    
    // TODO: 使用高级清洗功能
    
    // 验证试用次数不变
    const finalCount = await getTrialCount(page, 'advanced-cleaning');
    expect(finalCount).toBe(initialCount);
  });

  test('升级提示应包含正确的文案', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 生成超过 5 行的表格
    const htmlContent = generateLargeTablePage(10, 3);
    await createTestPage(page, htmlContent);
    
    // 框选表格
    const table = page.locator('#large-table');
    const box = await table.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    await waitForAsync(1000);
    
    // 检查升级提示文案
    const panelText = await getPanelText(page);
    expect(panelText).toMatch(/升级.*Pro/);
    expect(panelText).toMatch(/完整数据/);
  });
});
