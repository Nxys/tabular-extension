/**
 * 属性测试 2：特殊字符处理正确性
 * 
 * Property: 对于任意包含特殊字符（HTML 实体、Unicode、emoji）的文本，
 * 当用户框选该内容时，提取的文本应正确解码所有特殊字符
 * 
 * 验证需求：1.3, 3.3
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel, getPanelText } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 2: 特殊字符处理正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('HTML 实体应正确解码', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (text) => {
          // 将文本转换为 HTML 实体
          const htmlEntities = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <div id="test-text" style="margin: 50px; padding: 20px;">
    ${htmlEntities}
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
          const extractedText = await getPanelText(page);

          // 验证 HTML 实体被正确解码
          expect(extractedText.trim()).toBe(text.trim());
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Unicode 字符应正确处理', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.unicodeString({ minLength: 1, maxLength: 50 }),
        async (text) => {
          const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

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
          const extractedText = await getPanelText(page);

          // 验证 Unicode 字符被正确处理
          expect(extractedText.trim()).toBe(text.trim());
        }
      ),
      { numRuns: 5 }
    );
  });

  test('混合特殊字符应正确处理', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.unicodeString({ minLength: 1, maxLength: 20 }),
          fc.constantFrom('😀', '🎉', '🚀', '❤️', '👍')
        ),
        async ([text1, text2, emoji]) => {
          const mixedText = `${text1} ${emoji} ${text2}`;
          const escapedText = mixedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

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
          const extractedText = await getPanelText(page);

          // 验证混合特殊字符被正确处理
          expect(extractedText.trim()).toBe(mixedText.trim());
        }
      ),
      { numRuns: 5 }
    );
  });
});
