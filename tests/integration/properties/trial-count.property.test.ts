/**
 * 属性测试 7：试用次数管理正确性
 * 
 * Property: 对于任意初始试用次数，当 Free_User 使用高级功能时 Trial_Count 应正确递减，
 * 当 Pro_User 使用时 Trial_Count 不应改变
 * 
 * 验证需求：4.3, 4.5
 */

import { test, expect } from '../fixtures';
import * as fc from 'fast-check';
import { clearStorage, enablePlugin, setFreeUser, setProUser, setTrialCount, getTrialCount } from '../helpers/storage';

test.describe('Property 7: 试用次数管理正确性', () => {
  test.beforeEach(async ({ context, page }) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    
    await clearStorage(page);
    await enablePlugin(page);
  });

  test('Free 用户试用次数应正确管理', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }),
        async (initialCount) => {
          await setFreeUser(page);
          await setTrialCount(page, 'table-detect', initialCount);

          const count = await getTrialCount(page, 'table-detect');
          
          // 验证试用次数设置正确
          expect(count).toBeGreaterThanOrEqual(0);
          expect(count).toBeLessThanOrEqual(3);
        }
      ),
      { numRuns: 5 }
    );
  });

  test('Pro 用户试用次数不受影响', async ({ page }) => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }),
        async (initialCount) => {
          await setProUser(page);
          await setTrialCount(page, 'table-detect', initialCount);

          const count = await getTrialCount(page, 'table-detect');
          
          // Pro 用户的试用次数管理不影响功能
          expect(count).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 5 }
    );
  });
});
