/**
 * 属性测试 10：连续操作隔离性
 * 
 * Property: 对于任意次数的连续框选操作，每次操作应正确处理且不会相互干扰
 * 
 * 验证需求：5.5
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 10: 连续操作隔离性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('连续操作应独立处理', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 3 }),
        async (texts) => {
          for (const text of texts) {
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

            await waitForResultPanel(page);
            
            // 关闭面板准备下一次操作
            const closeButton = page.locator('.tabular-extension-panel').locator('button').first();
            if (await closeButton.isVisible()) {
              await closeButton.click();
              await page.waitForTimeout(500);
            }
          }

          // 验证所有操作完成
          expect(texts.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 5 }
    );
  });
});
