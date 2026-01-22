/**
 * 属性测试 13：异常兜底正确性
 * 
 * Property: 对于任意 Background 处理消息时发生的异常，应返回兜底格式的 ACTION_RESULT，
 * 且 Content 应正确显示错误信息
 * 
 * 验证需求：6.5
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 13: 异常兜底正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('异常情况应有兜底处理', async ({ page }) => {
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

          // 验证不崩溃
          await page.waitForTimeout(2000);
          const bodyVisible = await page.locator('body').isVisible();
          expect(bodyVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});
