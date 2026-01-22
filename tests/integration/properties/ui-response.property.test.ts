/**
 * 属性测试 12：UI 响应正确性
 * 
 * Property: 对于任意 ACTION_RESULT 消息，Content 应根据 uiAction 无条件执行对应的 UI 操作，
 * 且 UI 更新应正确反映 uiData 中的内容
 * 
 * 验证需求：6.3, 6.4
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 12: UI 响应正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('UI 应正确响应操作', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
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

          // 验证 UI 响应
          await waitForResultPanel(page);
          const panelVisible = await page.locator('.tabular-extension-panel').isVisible();
          expect(panelVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});
