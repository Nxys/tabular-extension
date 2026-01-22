/**
 * 属性测试 4：非表格内容不误判
 * 
 * Property: 对于任意非表格的 HTML 结构（如列表、div 布局、段落），
 * 当用户框选该内容时，系统不应将其误判为表格
 * 
 * 验证需求：2.5
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel, getPanelTableData } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 4: 非表格内容不误判', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('列表结构不应误判为表格', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 5 }),
        async (items) => {
          const listItems = items.map(item => 
            `<li>${item.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`
          ).join('\n');

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <ul id="test-list" style="margin: 50px;">
    ${listItems}
  </ul>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          const box = await page.locator('#test-list').boundingBox();
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
          const extractedData = await getPanelTableData(page);

          // 验证不会被识别为表格（表格数据为空或只有一列）
          if (extractedData.length > 0) {
            expect(extractedData[0].length).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Div 布局不应误判为表格', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(fc.string({ minLength: 1, maxLength: 20 }), fc.string({ minLength: 1, maxLength: 20 })),
          { minLength: 2, maxLength: 4 }
        ),
        async (pairs) => {
          const divs = pairs.map(([label, value]) => `
            <div style="display: flex; margin: 5px;">
              <div style="flex: 1;">${label.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              <div style="flex: 2;">${value.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
            </div>
          `).join('\n');

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <div id="test-div" style="margin: 50px;">
    ${divs}
  </div>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          const box = await page.locator('#test-div').boundingBox();
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
          const extractedData = await getPanelTableData(page);

          // 验证不会被识别为表格
          if (extractedData.length > 0) {
            expect(extractedData[0].length).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 5 }
    );
  });
});
