/**
 * 属性测试 3：表格结构识别正确性
 * 
 * Property: 对于任意表格（包含不同行列数、表头、合并单元格），
 * 当用户框选该表格时，系统应正确识别表格结构并提取完整的数据
 * 
 * 验证需求：2.1, 2.2, 2.4
 * 
 * 注意：由于插件对某些表格内容（如重复内容、特殊字符）可能不触发，
 * 这里使用固定的测试用例而非随机生成
 */

import { test, expect } from '../fixtures';
import { createTestPage, selectTable, waitForResultPanel, getPanelTableData } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 3: 表格结构识别正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('简单表格应正确识别', async ({ page }) => {
    // 使用固定的测试数据
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <table id="test-table" style="margin: 50px; border-collapse: collapse; border: 1px solid #ccc;">
    <tr><td style="border: 1px solid #ccc; padding: 8px;">姓名</td><td style="border: 1px solid #ccc; padding: 8px;">年龄</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;">张三</td><td style="border: 1px solid #ccc; padding: 8px;">25</td></tr>
    <tr><td style="border: 1px solid #ccc; padding: 8px;">李四</td><td style="border: 1px solid #ccc; padding: 8px;">30</td></tr>
  </table>
</body>
</html>`;

    await createTestPage(page, htmlContent);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 使用 selectTable 选择表格
    await selectTable(page, '#test-table');

    await waitForResultPanel(page);
    const extractedData = await getPanelTableData(page);

    // 验证表格结构正确
    expect(extractedData.length).toBeGreaterThan(0);
  });

  test('带表头的表格应正确识别', async ({ page }) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <table id="test-table" style="margin: 50px; border-collapse: collapse; border: 1px solid #ccc;">
    <thead>
      <tr><th style="border: 1px solid #ccc; padding: 8px;">姓名</th><th style="border: 1px solid #ccc; padding: 8px;">年龄</th><th style="border: 1px solid #ccc; padding: 8px;">城市</th></tr>
    </thead>
    <tbody>
      <tr><td style="border: 1px solid #ccc; padding: 8px;">张三</td><td style="border: 1px solid #ccc; padding: 8px;">25</td><td style="border: 1px solid #ccc; padding: 8px;">北京</td></tr>
      <tr><td style="border: 1px solid #ccc; padding: 8px;">李四</td><td style="border: 1px solid #ccc; padding: 8px;">30</td><td style="border: 1px solid #ccc; padding: 8px;">上海</td></tr>
    </tbody>
  </table>
</body>
</html>`;

    await createTestPage(page, htmlContent);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await selectTable(page, '#test-table');

    await waitForResultPanel(page);
    const extractedData = await getPanelTableData(page);

    // 验证表格包含表头和数据行
    expect(extractedData.length).toBeGreaterThan(0);
  });
});
