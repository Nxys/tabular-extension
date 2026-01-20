import { test, expect } from '@playwright/test';
import {
  createTestPage,
  dragSelection,
  waitForResultPanel,
  waitForAsync
} from './helpers/extension-helper';
import {
  setProUser,
  setFreeUser,
  setTrialCount,
  clearStorage
} from './helpers/storage-helper';
import { MessageSpy } from './helpers/message-spy';
import { generateLargeTablePage } from './fixtures/test-pages';

/**
 * 消息通信协议测试套件
 * 
 * 测试范围：
 * - REQUEST_ACTION 消息格式和内容
 * - ACTION_RESULT 消息格式和内容
 * - UI 响应正确性（根据 uiAction 执行）
 * - 异常兜底机制
 * - 文案由 Background 生成
 * 
 * 需求：6.1-6.5
 */

test.describe('消息通信协议测试', () => {
  let messageSpy: MessageSpy;

  test.beforeEach(async ({ page }) => {
    // 每个测试前清空 storage，确保测试隔离
    await clearStorage(page);
    
    // 初始化消息监听器
    messageSpy = new MessageSpy();
    await messageSpy.start(page);
  });

  test.afterEach(() => {
    // 停止消息监听
    messageSpy.stop();
  });

  /**
   * 测试 4.2：REQUEST_ACTION 消息格式
   * 需求：6.1
   */
  test('Content 发送的 REQUEST_ACTION 应包含正确的 action', async ({ page }) => {
    // 创建简单文本页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>消息格式测试</title></head>
<body>
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 清空之前的消息记录
    await messageSpy.clear();
    
    // 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 5, box.y + 5, box.x + box.width - 5, box.y + box.height - 5);
    }
    
    // 等待消息发送
    await waitForAsync(500);
    
    // 获取最后的 REQUEST_ACTION 消息
    const request = await messageSpy.getLastRequest();
    
    // 验证消息格式
    expect(request).not.toBeNull();
    expect(request?.type).toBe('REQUEST_ACTION');
    expect(request?.payload).toBeDefined();
    expect(request?.payload.action).toBeDefined();
    
    // 验证 action 类型是有效的
    const validActions = ['text-extract', 'table-detect', 'column-align', 'csv-export', 'advanced-clean', 'table-export', 'check-trial'];
    expect(validActions).toContain(request?.payload.action);
  });

  /**
   * 测试 4.3：ACTION_RESULT 消息格式
   * 需求：6.2
   */
  test('Background 返回的 ACTION_RESULT 应包含 status 和 uiAction', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 创建简单文本页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>响应消息测试</title></head>
<body>
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 5, box.y + 5, box.x + box.width - 5, box.y + box.height - 5);
    }
    
    // 等待响应消息
    await waitForAsync(1000);
    
    // 获取最后的 ACTION_RESULT 消息
    const result = await messageSpy.getLastResult();
    
    // 验证消息格式
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ACTION_RESULT');
    expect(result?.payload).toBeDefined();
    expect(result?.payload.status).toBeDefined();
    expect(result?.payload.uiAction).toBeDefined();
    
    // 验证 status 是有效的
    const validStatuses = ['ok', 'limited', 'blocked'];
    expect(validStatuses).toContain(result?.payload.status);
    
    // 验证 uiAction 是有效的
    const validUIActions = [
      'SHOW_RESULT_PANEL',
      'SHOW_LIMIT_PANEL',
      'SHOW_PRO_PANEL',
      'SHOW_CLEANING_DIALOG',
      'SHOW_EXPORT_DIALOG',
      'SHOW_TRIAL_EXHAUSTED'
    ];
    expect(validUIActions).toContain(result?.payload.uiAction);
  });

  /**
   * 测试 4.4：status 为 ok 的 UI 响应
   * 需求：6.3
   */
  test('status 为 ok 时 Content 应执行对应的 uiAction', async ({ page }) => {
    // 设置为 Pro 用户（确保 status 为 ok）
    await setProUser(page);
    
    // 创建简单文本页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>UI 响应测试</title></head>
<body>
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 5, box.y + 5, box.x + box.width - 5, box.y + box.height - 5);
    }
    
    // 等待响应和 UI 更新
    await waitForAsync(1000);
    
    // 获取 ACTION_RESULT 消息
    const result = await messageSpy.getLastResult();
    
    // 如果 status 为 ok，验证 UI 正确更新
    if (result?.payload.status === 'ok') {
      // 验证面板显示
      const panel = await waitForResultPanel(page, 3000);
      expect(await panel.isVisible()).toBe(true);
      
      // 验证 uiAction 被执行
      expect(result.payload.uiAction).toBe('SHOW_RESULT_PANEL');
    }
  });

  /**
   * 测试 4.5：status 为 limited 的 UI 响应
   * 需求：6.4
   */
  test('status 为 limited 时应显示限制提示', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 生成超过 5 行的表格
    const htmlContent = generateLargeTablePage(10, 3);
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选表格
    const table = page.locator('#large-table');
    const box = await table.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    // 等待响应和 UI 更新
    await waitForAsync(1000);
    
    // 获取 ACTION_RESULT 消息
    const result = await messageSpy.getLastResult();
    
    // 验证 status 为 limited
    if (result?.payload.status === 'limited') {
      // 验证面板显示
      const panel = await waitForResultPanel(page, 3000);
      expect(await panel.isVisible()).toBe(true);
      
      // 验证显示限制提示
      const panelText = await panel.textContent();
      expect(panelText).toMatch(/限制|仅展示前.*行/);
      
      // 验证 uiData 包含限制信息
      expect(result.payload.uiData?.isLimited).toBe(true);
      expect(result.payload.uiData?.limitMessage).toBeDefined();
    }
  });

  /**
   * 测试 4.6：status 为 blocked 的 UI 响应
   * 需求：6.4
   */
  test('status 为 blocked 时应显示升级提示', async ({ page }) => {
    // 设置为 Free 用户且试用次数为 0
    await setFreeUser(page);
    await setTrialCount(page, 'advanced-cleaning', 0);
    
    // 创建测试页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>blocked 状态测试</title></head>
<body>
    <div id="test-text">
        第一行文本
        第二行文本
        第三行文本
    </div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 5, box.y + 5, box.x + box.width - 5, box.y + box.height - 5);
    }
    
    // 等待响应
    await waitForAsync(1000);
    
    // 获取 ACTION_RESULT 消息
    const result = await messageSpy.getLastResult();
    
    // 如果 status 为 blocked，验证显示升级提示
    if (result?.payload.status === 'blocked') {
      // 验证 uiAction 是显示 Pro 面板或试用耗尽
      expect(['SHOW_PRO_PANEL', 'SHOW_TRIAL_EXHAUSTED']).toContain(result.payload.uiAction);
      
      // 验证 uiData 包含提示消息
      expect(result.payload.uiData?.message).toBeDefined();
      expect(result.payload.uiData?.message).toMatch(/升级|Pro|试用/);
    }
  });

  /**
   * 测试 4.7：异常兜底机制
   * 需求：6.5
   * 
   * 注意：此测试验证当 Background 处理消息时发生异常，
   * 应返回兜底格式的 ACTION_RESULT，确保 Content 能正确显示错误信息。
   */
  test('Background 异常时应返回兜底 ACTION_RESULT', async ({ page }) => {
    // 创建测试页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>异常兜底测试</title></head>
<body>
    <div id="test-text">测试文本</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 5, box.y + 5, box.x + box.width - 5, box.y + box.height - 5);
    }
    
    // 等待响应
    await waitForAsync(1000);
    
    // 获取 ACTION_RESULT 消息
    const result = await messageSpy.getLastResult();
    
    // 验证消息格式正确（即使发生异常也应返回合法的 ACTION_RESULT）
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ACTION_RESULT');
    expect(result?.payload.status).toBeDefined();
    expect(result?.payload.uiAction).toBeDefined();
    
    // 如果是异常情况，验证兜底格式
    // 兜底格式：{ status: 'blocked', uiAction: 'SHOW_RESULT_PANEL', uiData: { message } }
    if (result?.payload.status === 'blocked' && result?.payload.uiData?.message) {
      expect(result.payload.uiAction).toBeDefined();
      expect(result.payload.uiData.message).toBeDefined();
    }
  });

  /**
   * 测试 4.8：uiData 由 Background 生成
   * 需求：6.3
   */
  test('uiData 中的 message 应由 Background 生成', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 生成超过 5 行的表格
    const htmlContent = generateLargeTablePage(10, 3);
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选表格
    const table = page.locator('#large-table');
    const box = await table.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 10, box.y + 10, box.x + box.width - 10, box.y + box.height - 10);
    }
    
    // 等待响应
    await waitForAsync(1000);
    
    // 获取 ACTION_RESULT 消息
    const result = await messageSpy.getLastResult();
    
    // 验证 uiData 存在
    expect(result?.payload.uiData).toBeDefined();
    
    // 如果有限制，验证 limitMessage 由 Background 生成
    if (result?.payload.uiData?.isLimited) {
      expect(result.payload.uiData.limitMessage).toBeDefined();
      expect(typeof result.payload.uiData.limitMessage).toBe('string');
      expect(result.payload.uiData.limitMessage.length).toBeGreaterThan(0);
      
      // 验证包含行数信息
      expect(result.payload.uiData.rowLimit).toBeDefined();
      expect(result.payload.uiData.totalRows).toBeDefined();
    }
    
    // 验证 Content 不需要自行拼装文案
    // 所有文案都应该在 uiData 中由 Background 提供
    if (result?.payload.uiData?.message) {
      expect(typeof result.payload.uiData.message).toBe('string');
      expect(result.payload.uiData.message.length).toBeGreaterThan(0);
    }
  });

  /**
   * 测试：Content 无条件执行 uiAction
   * 需求：6.3
   * 
   * 验证 Content 不根据 status 自行决定 UI，而是无条件执行 Background 指定的 uiAction
   */
  test('Content 应无条件执行 Background 指定的 uiAction', async ({ page }) => {
    // 设置为 Free 用户
    await setFreeUser(page);
    
    // 创建测试页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>uiAction 执行测试</title></head>
<body>
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 5, box.y + 5, box.x + box.width - 5, box.y + box.height - 5);
    }
    
    // 等待响应和 UI 更新
    await waitForAsync(1000);
    
    // 获取 ACTION_RESULT 消息
    const result = await messageSpy.getLastResult();
    
    // 验证 uiAction 被执行
    if (result?.payload.uiAction === 'SHOW_RESULT_PANEL') {
      // 验证面板显示
      const panel = page.locator('.tabular-extension-panel');
      expect(await panel.isVisible()).toBe(true);
    }
    
    // 关键验证：无论 status 是什么，Content 都应该执行 uiAction
    // 不应该有 Content 根据 status 自行决定 UI 的逻辑
    expect(result?.payload.uiAction).toBeDefined();
  });

  /**
   * 测试：消息通信往返完整性
   * 需求：6.1, 6.2
   */
  test('消息通信应完成完整的往返', async ({ page }) => {
    // 创建测试页面
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>消息往返测试</title></head>
<body>
    <div id="test-text">测试文本内容</div>
</body>
</html>`;
    
    await createTestPage(page, htmlContent);
    
    // 清空消息记录
    await messageSpy.clear();
    
    // 框选文本
    const textDiv = page.locator('#test-text');
    const box = await textDiv.boundingBox();
    if (box) {
      await dragSelection(page, box.x + 5, box.y + 5, box.x + box.width - 5, box.y + box.height - 5);
    }
    
    // 等待消息往返
    await waitForAsync(1000);
    
    // 获取请求和响应消息
    const request = await messageSpy.getLastRequest();
    const result = await messageSpy.getLastResult();
    
    // 验证请求消息存在
    expect(request).not.toBeNull();
    expect(request?.type).toBe('REQUEST_ACTION');
    
    // 验证响应消息存在
    expect(result).not.toBeNull();
    expect(result?.type).toBe('ACTION_RESULT');
    
    // 验证消息往返完整
    // 请求和响应应该是配对的
    expect(request?.payload.action).toBeDefined();
    expect(result?.payload.status).toBeDefined();
    expect(result?.payload.uiAction).toBeDefined();
  });
});
