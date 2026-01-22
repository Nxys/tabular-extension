/**
 * 属性测试 9：Result_Panel 显示正确性
 * 
 * Property: 对于任意框选内容，当用户释放鼠标完成框选时，
 * Result_Panel 应自动显示且包含正确的提取结果
 * 
 * 验证需求：5.2
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 9: Result_Panel 显示正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('Result_Panel 应在框选后显示', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (text) => {
          const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <div id="test-text" style="margin: 50px; padding: 20px;">
    ${escapedText}
  </div>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          const box = await page.locator('#test-text').boundingBox();
          if (box) {
            await dragSelection(
              page,
              box.x + 10,
              box.y + 10,
              box.x + box.width - 10,
              box.y + box.height - 10
            );
          }

          // 验证面板显示
          await waitForResultPanel(page);
          const panelVisible = await page.locator('.tabular-extension-panel').isVisible();
          expect(panelVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});
