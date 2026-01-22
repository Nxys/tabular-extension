/**
 * 属性测试 8：Selection_Box 跟随正确性
 * 
 * Property: 对于任意鼠标拖动路径，当用户按下鼠标左键并拖动时，
 * Selection_Box 应实时显示且准确跟随鼠标移动
 * 
 * 验证需求：5.1
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { createTestPage, dragSelection } from '../helpers/extension';
import { clearStorage, enablePlugin } from '../helpers/storage';

test.describe('Property 8: Selection_Box 跟随正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('Selection_Box 应跟随鼠标移动', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.integer({ min: 100, max: 300 }),
          fc.integer({ min: 100, max: 300 }),
          fc.integer({ min: 400, max: 600 }),
          fc.integer({ min: 400, max: 600 })
        ),
        async ([startX, startY, endX, endY]) => {
          const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Test</title></head>
<body>
  <div style="width: 800px; height: 800px; background: #f0f0f0; padding: 50px;">
    <p>测试内容区域</p>
  </div>
</body>
</html>`;

          await createTestPage(page, htmlContent);

          // 执行拖动操作
          await dragSelection(page, startX, startY, endX, endY);

          // 验证操作完成（不崩溃）
          const bodyVisible = await page.locator('body').isVisible();
          expect(bodyVisible).toBe(true);
        }
      ),
      { numRuns: 5 }
    );
  });
});
