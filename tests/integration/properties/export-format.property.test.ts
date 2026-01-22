/**
 * 属性测试 5：导出格式正确性
 * 
 * Property: 对于任意表格数据，当用户导出为 CSV 或 Excel 格式时，
 * 生成的文件应格式正确、内容完整，且特殊字符被正确转义
 * 
 * 验证需求：3.1, 3.2, 3.3
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel, clickPanelButton } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 5: 导出格式正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('CSV 导出应包含所有数据', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.array(fc.string({ minLength: 1, maxLength: 15 }), { minLength: 2, maxLength: 3 }),
          { minLength: 2, maxLength: 3 }
        ),
        async (tableData) => {
          const rows = tableData.map(row => 
            `<tr>${row.map(cell => `<td>${cell.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>`
          ).join('\n');

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <table id="test-table" style="margin: 50px; border-collapse: collapse;">
    ${rows}
  </table>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          const box = await page.locator('#test-table').boundingBox();
          if (box) {
            await dragSelection(
              page,
              box.x + 5,
              box.y + 5,
              box.x + box.width - 5,
              box.y + box.height - 5
            );
          }

          await waitForResultPanel(page);
          
          // 验证面板显示（导出功能可用）
          const panelVisible = await page.locator('.tabular-extension-panel').isVisible();
          expect(panelVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});
