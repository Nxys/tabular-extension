/**
 * 属性测试 1：文本提取正确性
 * 
 * Property: 对于任意包含文本内容的 HTML 页面（包括简单文本、多行文本、嵌套标签），
 * 当用户框选该内容时，提取的纯文本应与原始文本内容一致（去除 HTML 标签，保留换行符和格式）
 * 
 * 验证需求：1.1, 1.2, 1.5
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel, getPanelText } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 1: 文本提取正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    // 等待 service worker 加载
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('简单文本提取应与原始文本一致', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }),
        async (text) => {
          // 转义 HTML 特殊字符以避免解析问题
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
  <div id="test-text" style="margin: 50px; padding: 20px; background: #f0f0f0;">
    ${escapedText}
  </div>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          // 框选文本区域
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

          // 等待面板显示
          await waitForResultPanel(page);

          // 获取提取的文本
          const extractedText = await getPanelText(page);

          // 验证提取的文本与原始文本一致（去除首尾空白）
          expect(extractedText.trim()).toBe(text.trim());
        }
      ),
      { numRuns: 5 }
    );
  });

  test('多行文本提取应保留换行符', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
        async (lines) => {
          const text = lines.join('\n');
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
  <div id="test-text" style="margin: 50px; padding: 20px; white-space: pre-wrap;">
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

          // 验证换行符被保留
          expect(extractedText.trim()).toBe(text.trim());
        }
      ),
      { numRuns: 5 }
    );
  });

  test('嵌套标签文本提取应去除所有 HTML 标签', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        async (text) => {
          const escapedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

          // 创建嵌套标签结构
          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <div id="test-text" style="margin: 50px; padding: 20px;">
    <strong><em><span>${escapedText}</span></em></strong>
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

          // 验证提取的文本去除了所有标签
          expect(extractedText.trim()).toBe(text.trim());
        }
      ),
      { numRuns: 5 }
    );
  });
});
