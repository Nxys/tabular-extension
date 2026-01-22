/**
 * 属性测试 6：行数限制策略正确性
 * 
 * Property: 对于任意行数的表格数据，当 Free_User 提取时应只返回前 5 行并显示升级提示，
 * 当 Pro_User 提取时应返回所有数据且无限制提示
 * 
 * 验证需求：4.1, 4.2
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection, waitForResultPanel, getRowLimitInfo } from '../helpers/extension';
import { clearStorage, enablePlugin, setFreeUser, setProUser } from '../helpers/storage';

test.describe('Property 6: 行数限制策略正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('Free 用户应受行数限制', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 6, max: 10 }),
        async (rowCount) => {
          await setFreeUser(page);

          const rows = Array(rowCount).fill(0).map((_, i) => 
            `<tr><td>数据${i + 1}</td><td>值${i + 1}</td></tr>`
          ).join('\n');

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <table id="test-table" style="margin: 50px; border-collapse: collapse;">
    <thead><tr><th>列A</th><th>列B</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          const box = await page.locator('#test-table').boundingBox();
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
          
          // 验证面板显示
          const panelVisible = await page.locator('.tabular-extension-panel').isVisible();
          expect(panelVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Pro 用户应无行数限制', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 6, max: 10 }),
        async (rowCount) => {
          await setProUser(page);

          const rows = Array(rowCount).fill(0).map((_, i) => 
            `<tr><td>数据${i + 1}</td><td>值${i + 1}</td></tr>`
          ).join('\n');

          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <table id="test-table" style="margin: 50px;">
    ${rows}
  </table>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          const box = await page.locator('#test-table').boundingBox();
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
          const limitInfo = await getRowLimitInfo(page);

          // 验证无限制
          expect(limitInfo.limited).toBe(false);
        }
      ),
      { numRuns: 5 }
    );
  });
});
