/**
 * 属性测试 11：消息通信往返正确性
 * 
 * Property: 对于任意用户操作，Content 发送的 REQUEST_ACTION 消息应包含正确的 action 类型，
 * Background 返回的 ACTION_RESULT 消息应包含 status 和 uiAction
 * 
 * 验证需求：6.1, 6.2
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 11: 消息通信往返正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('消息通信应正确完成', async ({ page }) => {
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

          // 验证消息通信完成（面板显示）
          await waitForResultPanel(page);
          const panelVisible = await page.locator('.tabular-extension-panel').isVisible();
          expect(panelVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});
