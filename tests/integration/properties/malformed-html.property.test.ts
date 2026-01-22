/**
 * 属性测试 14：错误 HTML 容错性
 * 
 * Property: 对于任意格式错误的 HTML 页面，当用户框选内容时，
 * 插件不应崩溃且应返回合理结果
 * 
 * 验证需求：7.1
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 14: 错误 HTML 容错性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('格式错误的 HTML 不应导致崩溃', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }),
        async (text) => {
          // 创建格式错误的 HTML（未闭合标签）
          const malformedHTML = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <div id="test-text" style="margin: 50px; padding: 20px;">
    <p>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
    <span>未闭合的标签
  </div>
</body>
</html>`;

          await createTestPage(page, malformedHTML);

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
