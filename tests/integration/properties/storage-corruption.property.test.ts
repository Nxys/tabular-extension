/**
 * 属性测试 15：Storage 损坏容错性
 * 
 * Property: 对于任意损坏的 storage 数据，插件应使用默认值且核心功能不受影响
 * 
 * 验证需求：7.3
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 15: Storage 损坏容错性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('Storage 损坏不应影响核心功能', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        async (text) => {
          // 写入损坏的 storage 数据
          const context = page.context();
          const [background] = context.serviceWorkers();
          
          if (background) {
            await background.evaluate(() => {
              return chrome.storage.local.set({ 
                'corrupted_key': { invalid: 'data' },
                'pro_state': 'invalid_format'
              });
            });
          }

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

          // 验证核心功能仍可用
          await waitForResultPanel(page);
          const panelVisible = await page.locator('.tabular-extension-panel').isVisible();
          expect(panelVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});
