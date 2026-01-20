import { Page, BrowserContext, Locator } from '@playwright/test';

/**
 * Chrome 插件测试辅助工具
 * 提供插件加载、页面操作等功能
 */

/**
 * 等待插件加载完成
 */
export async function waitForExtensionLoad(context: BrowserContext): Promise<void> {
  // 等待 background script 加载
  await context.waitForEvent('page', { 
    predicate: page => page.url().includes('chrome-extension://') 
  });
  
  // 额外等待确保插件完全初始化
  await new Promise(resolve => setTimeout(resolve, 1000));
}

/**
 * 创建测试页面并写入内容
 * 注意：使用 HTTP 服务器而不是 setContent，以确保 content script 正确注入
 */
export async function createTestPage(page: Page, htmlContent: string): Promise<void> {
  // 生成唯一的测试页面文件名
  const timestamp = Date.now();
  const filename = `test-page-${timestamp}.html`;
  const filepath = `test/integration/fixtures/test-server/${filename}`;
  
  // 写入 HTML 文件
  const fs = await import('fs/promises');
  await fs.writeFile(filepath, htmlContent, 'utf-8');
  
  // 导航到测试页面
  await page.goto(`http://localhost:3000/${filename}`);
  await page.waitForLoadState('domcontentloaded');
  
  // 等待 content script 加载（检查全局变量）
  await page.waitForFunction(() => {
    return typeof (window as any).tabular !== 'undefined';
  }, { timeout: 10000 });
  
  // 清理：测试完成后删除文件（使用 page.context().on('close') 或在测试结束时手动清理）
}

/**
 * 模拟文本选择
 */
export async function selectText(page: Page, selector: string): Promise<void> {
  await page.locator(selector).click();
  
  // 使用 JavaScript 选择文本
  await page.evaluate((sel) => {
    const element = document.querySelector(sel);
    if (element) {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, selector);
}

/**
 * 模拟表格选择
 */
export async function selectTable(page: Page, tableSelector: string): Promise<void> {
  // 点击表格开始选择
  const table = page.locator(tableSelector);
  const firstCell = table.locator('td, th').first();
  const lastCell = table.locator('td, th').last();
  
  // 获取第一个和最后一个单元格的位置
  const firstBox = await firstCell.boundingBox();
  const lastBox = await lastCell.boundingBox();
  
  if (firstBox && lastBox) {
    // 从第一个单元格拖拽到最后一个单元格
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height / 2);
    await page.mouse.up();
  }
}

/**
 * 等待插件面板出现
 */
export async function waitForPanel(page: Page, panelSelector: string = '.tabular-extension-panel'): Promise<void> {
  await page.waitForSelector(panelSelector, { timeout: 5000 });
}

/**
 * 检查插件面板是否显示
 */
export async function isPanelVisible(page: Page, panelSelector: string = '.tabular-extension-panel'): Promise<boolean> {
  try {
    const panel = page.locator(panelSelector);
    return await panel.isVisible();
  } catch {
    return false;
  }
}

/**
 * 点击插件面板按钮
 */
export async function clickPanelButton(page: Page, buttonText: string): Promise<void> {
  const button = page.locator('.tabular-extension-panel').getByText(buttonText);
  await button.click();
}

/**
 * 获取插件面板文本内容
 */
export async function getPanelText(page: Page): Promise<string> {
  const panel = page.locator('.tabular-extension-panel');
  return await panel.textContent() || '';
}

/**
 * 模拟键盘快捷键
 */
export async function pressShortcut(page: Page, shortcut: string): Promise<void> {
  await page.keyboard.press(shortcut);
}

/**
 * 检查剪贴板内容（需要权限）
 */
export async function getClipboardContent(page: Page): Promise<string> {
  return await page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText();
    } catch {
      return '';
    }
  });
}

/**
 * 设置剪贴板内容
 */
export async function setClipboardContent(page: Page, content: string): Promise<void> {
  await page.evaluate(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 忽略权限错误
    }
  }, content);
}

/**
 * 等待异步操作完成
 */
export async function waitForAsync(ms: number = 500): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 检查控制台错误
 */
export async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  return errors;
}

/**
 * 模拟右键菜单操作
 */
export async function rightClickAndSelectMenu(page: Page, selector: string, menuText: string): Promise<void> {
  await page.locator(selector).click({ button: 'right' });
  await page.getByText(menuText).click();
}

/**
 * 模拟鼠标框选操作
 */
export async function dragSelection(
  page: Page,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): Promise<void> {
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY);
  await page.mouse.up();
}

/**
 * 等待 Result_Panel 显示并返回面板元素
 */
export async function waitForResultPanel(
  page: Page,
  timeout: number = 5000
): Promise<Locator> {
  await page.waitForSelector('.tabular-extension-panel', { timeout });
  return page.locator('.tabular-extension-panel');
}

/**
 * 获取面板中的表格数据
 */
export async function getPanelTableData(page: Page): Promise<string[][]> {
  return await page.evaluate(() => {
    const panel = document.querySelector('.tabular-extension-panel');
    if (!panel) return [];

    const table = panel.querySelector('table');
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll('tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td, th'));
      return cells.map(cell => cell.textContent?.trim() || '');
    });
  });
}

/**
 * 检查面板是否显示升级提示
 */
export async function hasUpgradePrompt(page: Page): Promise<boolean> {
  const panelText = await getPanelText(page);
  return panelText.includes('升级') || panelText.includes('Pro');
}

/**
 * 获取面板中显示的行数限制信息
 */
export async function getRowLimitInfo(
  page: Page
): Promise<{ limited: boolean; current: number; max: number }> {
  const panelText = await getPanelText(page);
  
  // 检查是否有限制提示
  const limitMatch = panelText.match(/仅展示前\s*(\d+)\s*行.*共\s*(\d+)\s*行/);
  
  if (limitMatch) {
    return {
      limited: true,
      current: parseInt(limitMatch[1], 10),
      max: parseInt(limitMatch[2], 10)
    };
  }

  // 如果没有限制提示，尝试获取实际行数
  const tableData = await getPanelTableData(page);
  return {
    limited: false,
    current: tableData.length,
    max: tableData.length
  };
}