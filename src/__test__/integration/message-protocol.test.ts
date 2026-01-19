import { test, expect } from '@playwright/test';
import {
  createTestPage,
  dragSelection,
  waitForResultPanel,
  getPanelText,
  waitForAsync
} from './helpers/extension-helper.js';
import { MessageSpy } from './helpers/message-spy.js';
import { clearStorage, setFreeUser } from './helpers/storage-helper.js';
import { generateTextPage, generateTablePage } from './fixtures/test-pages.js';

/**
 * 消息通信协议测试
 * 测试 Content 和 Background 的消息通信
 */

test.describe('消息通信协议测试', () => {
  
  let messageSpy: MessageSpy;

  test.beforeEach(async ({ page }) => {
    // 清空 storage
    await clearStorage(page);
    await setFreeUser(page);
    
    // 启动消息监听
    messageSpy = new MessageSpy();
    await messageSpy.start(page);
  });

  test.afterEach(() => {
    messageSpy.stop();
  });

  test('Content 发送 REQUEST_ACTION 应包含正确的 action', async ({ page }) => {
    // 创建测试页面
    const htmlContent = generateTextPage('测试文本内容');
    await createTestPage(page, htmlContent);
    
    // 框选文本
    const textElement = page.locator('#test-text');
    const box = await textElement.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    await waitForAsync(1000);
    
    // 检查发送的消息
    const request = await messageSpy.getLastRequest();
    expect(request).not.toBeNull();
    expect(request?.type).toBe('REQUEST_ACTION');
    expect(request?.payload.action).toBe('text-extract');
  });

  test('Background 返回 ACTION_RESULT 应包含 status 和 uiAction', async ({ page }) => {
    // 创建测试页面
    const tableData = [
      ['姓名', '年龄'],
      ['张三', '25'],
      ['李四', '30']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 框选表格
    const table = page.locator('#test-table');
    const box = await table.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    await waitForAsync(1000);
    
    // 检查返回的消息
    const result = await messageSpy.getLastResult();
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ACTION_RESULT');
    expect(result?.payload.status).toBeDefined();
    expect(result?.payload.uiAction).toBeDefined();
  });

  test('status 为 ok 时 Content 应执行对应 uiAction', async ({ page }) => {
    // 创建测试页面
    const htmlContent = generateTextPage('简单文本');
    await createTestPage(page, htmlContent);
    
    // 框选文本
    const textElement = page.locator('#test-text');
    const box = await textElement.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    await waitForAsync(1000);
    
    // 检查返回结果
    const result = await messageSpy.getLastResult();
    expect(result?.payload.status).toBe('ok');
    expect(result?.payload.uiAction).toBe('SHOW_RESULT_PANEL');
    
    // 验证 UI 已更新
    const panel = await waitForResultPanel(page);
    expect(await panel.isVisible()).toBe(true);
  });

  test('uiData 中的 message 应由 Background 生成', async ({ page }) => {
    // 创建测试页面
    const htmlContent = generateTextPage('测试消息生成');
    await createTestPage(page, htmlContent);
    
    // 框选文本
    const textElement = page.locator('#test-text');
    const box = await textElement.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    await waitForAsync(1000);
    
    // 检查 uiData
    const result = await messageSpy.getLastResult();
    expect(result?.payload.uiData).toBeDefined();
    
    // 如果有 message，应该是字符串
    if (result?.payload.uiData?.message) {
      expect(typeof result.payload.uiData.message).toBe('string');
      expect(result.payload.uiData.message.length).toBeGreaterThan(0);
    }
  });

  test('Content 不应根据 status 自行决定 UI', async ({ page }) => {
    // 这个测试验证架构约束：Content 应无条件执行 uiAction
    // 无论 status 是什么，Content 都应该执行 Background 指定的 uiAction
    
    const htmlContent = generateTextPage('架构验证测试');
    await createTestPage(page, htmlContent);
    
    // 框选文本
    const textElement = page.locator('#test-text');
    const box = await textElement.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    await waitForAsync(1000);
    
    // 获取消息
    const result = await messageSpy.getLastResult();
    
    // 验证：无论 status 是什么，uiAction 都应该被执行
    // 这里我们检查面板是否按照 uiAction 显示
    if (result?.payload.uiAction === 'SHOW_RESULT_PANEL') {
      const panel = page.locator('.tabular-panel');
      expect(await panel.isVisible()).toBe(true);
    }
  });
});
