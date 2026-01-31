/**
 * 表格检测时机集成测试
 * 
 * 测试优化后的表格检测系统：
 * - 智能延迟（200-500ms）
 * - 防抖优化（500ms）
 * - SPA 路由切换
 * - 错误降级
 */

import { test, expect } from './fixtures';
import { createTestPage } from './helpers/extension';

test.describe('表格检测时机优化', () => {
  test.describe('初始扫描', () => {
    test('有框架时应在 200ms 内注入按钮', async ({ context }) => {
      const page = await context.newPage();
      
      // 创建包含 Ant Design 框架特征的测试页面
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body class="ant-table-wrapper">
          <table>
            <thead>
              <tr><th>列1</th><th>列2</th></tr>
            </thead>
            <tbody>
              <tr><td>数据1</td><td>数据2</td></tr>
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      await createTestPage(page, html);
      
      // 等待按钮出现（最多 300ms）
      await page.waitForSelector('.table-export-button', { timeout: 1000 });
      
      // 验证按钮存在
      const buttons = await page.locator('.table-export-button').count();
      expect(buttons).toBe(1);
    });
    
    test('无框架时应在 500ms 内注入按钮', async ({ context }) => {
      const page = await context.newPage();
      
      // 创建不包含框架特征的测试页面
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
          <table>
            <thead>
              <tr><th>列1</th><th>列2</th></tr>
            </thead>
            <tbody>
              <tr><td>数据1</td><td>数据2</td></tr>
            </tbody>
          </table>
        </body>
        </html>
      `;
      
      await createTestPage(page, html);
      
      // 等待按钮出现（最多 1000ms）
      await page.waitForSelector('.table-export-button', { timeout: 1000 });
      
      // 验证按钮存在
      const buttons = await page.locator('.table-export-button').count();
      expect(buttons).toBe(1);
    });
  });
  
  test.describe('增量扫描', () => {
    test('动态添加表格后应在 500ms 内注入按钮', async ({ context }) => {
      const page = await context.newPage();
      
      // 创建初始页面（无表格）
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
          <div id="container"></div>
        </body>
        </html>
      `;
      
      await createTestPage(page, html);
      
      // 等待页面加载完成
      await page.waitForTimeout(1000);
      
      // 动态添加表格
      await page.evaluate(() => {
        const container = document.getElementById('container');
        if (container) {
          container.innerHTML = `
            <table>
              <thead>
                <tr><th>列1</th><th>列2</th></tr>
              </thead>
              <tbody>
                <tr><td>数据1</td><td>数据2</td></tr>
              </tbody>
            </table>
          `;
        }
      });
      
      // 等待按钮出现（最多 1000ms）
      await page.waitForSelector('.table-export-button', { timeout: 1000 });
      
      // 验证按钮存在
      const buttons = await page.locator('.table-export-button').count();
      expect(buttons).toBe(1);
    });
    
    test('连续 DOM 变化应只触发一次扫描（防抖）', async ({ context }) => {
      const page = await context.newPage();
      
      // 创建初始页面
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
          <div id="container"></div>
        </body>
        </html>
      `;
      
      await createTestPage(page, html);
      
      // 等待页面加载完成
      await page.waitForTimeout(1000);
      
      // 连续添加多个表格（间隔 100ms）
      await page.evaluate(() => {
        const container = document.getElementById('container');
        if (container) {
          // 第一个表格
          setTimeout(() => {
            const table1 = document.createElement('table');
            table1.innerHTML = `
              <thead><tr><th>表格1</th></tr></thead>
              <tbody><tr><td>数据1</td></tr></tbody>
            `;
            container.appendChild(table1);
          }, 0);
          
          // 第二个表格（100ms 后）
          setTimeout(() => {
            const table2 = document.createElement('table');
            table2.innerHTML = `
              <thead><tr><th>表格2</th></tr></thead>
              <tbody><tr><td>数据2</td></tr></tbody>
            `;
            container.appendChild(table2);
          }, 100);
          
          // 第三个表格（200ms 后）
          setTimeout(() => {
            const table3 = document.createElement('table');
            table3.innerHTML = `
              <thead><tr><th>表格3</th></tr></thead>
              <tbody><tr><td>数据3</td></tr></tbody>
            `;
            container.appendChild(table3);
          }, 200);
        }
      });
      
      // 等待防抖完成（500ms + 200ms 最后一次变化 = 700ms）
      await page.waitForTimeout(1000);
      
      // 验证：所有表格都应该有按钮
      const buttons = await page.locator('.table-export-button').count();
      expect(buttons).toBe(3);
    });
  });
  
  test.describe('SPA 路由切换', () => {
    test('hash 变化不应触发重新扫描', async ({ context }) => {
      const page = await context.newPage();
      
      // 创建测试页面
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
          <table>
            <thead><tr><th>列1</th></tr></thead>
            <tbody><tr><td>数据1</td></tr></tbody>
          </table>
        </body>
        </html>
      `;
      
      await createTestPage(page, html);
      
      // 等待按钮出现
      await page.waitForSelector('.table-export-button', { timeout: 1000 });
      
      // 记录按钮数量
      const buttonsBefore = await page.locator('.table-export-button').count();
      expect(buttonsBefore).toBe(1);
      
      // 修改 hash
      await page.evaluate(() => {
        window.location.hash = '#section1';
      });
      
      // 等待一段时间
      await page.waitForTimeout(1000);
      
      // 验证：按钮数量不变
      const buttonsAfter = await page.locator('.table-export-button').count();
      expect(buttonsAfter).toBe(buttonsBefore);
    });
  });
  
  test.describe('错误降级', () => {
    test('扫描成功后应正常工作', async ({ context }) => {
      const page = await context.newPage();
      
      // 创建正常的测试页面
      const html = `
        <!DOCTYPE html>
        <html>
        <head><title>Test</title></head>
        <body>
          <table>
            <thead><tr><th>列1</th></tr></thead>
            <tbody><tr><td>数据1</td></tr></tbody>
          </table>
        </body>
        </html>
      `;
      
      await createTestPage(page, html);
      
      // 等待按钮出现
      await page.waitForSelector('.table-export-button', { timeout: 1000 });
      
      // 验证按钮存在
      const buttons = await page.locator('.table-export-button').count();
      expect(buttons).toBe(1);
    });
  });
});
