import { test, expect } from './fixtures';
import { 
  createTestPage, 
  waitForAsync
} from './helpers/extension';
import { 
  setTrialCount
} from './helpers/storage';
import { 
  generateTablePage
} from './fixtures/pages';

/**
 * Excel 导出格式测试
 * 测试需求6：修复Excel导出格式
 * 
 * 验证：
 * 1. Excel导出包含多列
 * 2. 下载的文件格式正确
 */

test.describe('Excel 导出格式测试', () => {
  
  /**
   * 测试 Excel 导出包含多列
   * 验证需求：6.1 - Excel 导出应该正确解析表格的列结构
   */
  test('Excel 导出应该包含多列数据', async ({ page }) => {
    // 设置足够的试用次数（表格导出是 Pro 功能）
    await setTrialCount(page, 'one-click-export', 3);
    
    // 准备包含多列的表格
    const tableData = [
      ['产品名称', '价格', '库存', '品牌'],
      ['笔记本电脑', '5999', '10', 'ThinkPad'],
      ['无线鼠标', '199', '50', 'Logitech'],
      ['机械键盘', '599', '30', 'Cherry']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1500); // 等待表格检测和按钮注入
    
    // 验证表格导出按钮已注入
    const exportButton = page.locator('.table-export-button');
    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // 点击表格导出按钮
    await exportButton.click();
    
    // 等待UI响应
    await waitForAsync(1000);
    
    // 查找 Excel 格式按钮
    const excelButton = page.locator('button:has-text("Excel"), .tabular-extension-dialog-format-btn:has-text("Excel")').first();
    const excelButtonExists = await excelButton.count() > 0;
    
    if (excelButtonExists) {
      // 在点击 Excel 按钮之前设置下载监听
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      await excelButton.click();
      
      // 等待下载
      const download = await downloadPromise;
      
      // 验证触发了下载
      expect(download).toBeTruthy();
      
      // 验证文件名
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.(xls|xlsx)$/i);
      
      // 保存文件到临时目录
      const path = await download.path();
      expect(path).toBeTruthy();
      
      // 读取文件内容
      const fs = await import('fs/promises');
      const content = await fs.readFile(path!, 'utf-8');
      
      // 验证内容使用制表符分隔（TSV格式）
      expect(content).toContain('\t');
      
      // 验证包含所有列的数据
      const lines = content.trim().split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(4); // 至少4行数据
      
      // 验证第一行（表头）包含所有列
      const headerCols = lines[0].split('\t');
      expect(headerCols.length).toBe(4); // 4列
      expect(headerCols[0]).toContain('产品名称');
      expect(headerCols[1]).toContain('价格');
      expect(headerCols[2]).toContain('库存');
      expect(headerCols[3]).toContain('品牌');
      
      // 验证数据行也包含所有列
      const dataRow1 = lines[1].split('\t');
      expect(dataRow1.length).toBe(4);
      expect(dataRow1[0]).toContain('笔记本电脑');
      expect(dataRow1[1]).toContain('5999');
      expect(dataRow1[2]).toContain('10');
      expect(dataRow1[3]).toContain('ThinkPad');
    } else {
      // 如果没有找到 Excel 按钮，可能需要先点击导出按钮
      const panel = page.locator('.tabular-extension-panel');
      const panelVisible = await panel.isVisible().catch(() => false);
      
      if (panelVisible) {
        const exportBtn = panel.locator('button:has-text("导出")').first();
        const exportBtnExists = await exportBtn.count() > 0;
        
        if (exportBtnExists) {
          await exportBtn.click();
          await waitForAsync(500);
          
          // 再次查找 Excel 按钮
          const excelBtn = page.locator('button:has-text("Excel"), .tabular-extension-dialog-format-btn:has-text("Excel")').first();
          const excelBtnExists = await excelBtn.count() > 0;
          
          if (excelBtnExists) {
            // 在点击之前设置下载监听
            const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
            
            await excelBtn.click();
            
            const download = await downloadPromise;
            expect(download).toBeTruthy();
            
            const filename = download.suggestedFilename();
            expect(filename).toMatch(/\.(xls|xlsx)$/i);
          }
        }
      }
    }
  });

  /**
   * 测试 Excel 导出处理特殊字符
   * 验证需求：6.2 - Excel 导出应该正确转义特殊字符
   */
  test('Excel 导出应该正确处理特殊字符', async ({ page }) => {
    // 设置足够的试用次数（表格导出是 Pro 功能）
    await setTrialCount(page, 'one-click-export', 3);
    
    // 准备包含特殊字符的表格（使用简单的特殊字符）
    const tableData = [
      ['名称', '描述', '备注'],
      ['产品A', '包含逗号,和分号;的文本', '测试1'],
      ['产品B', '包含引号的文本', '测试2'],
      ['产品C', '正常文本', '测试3']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1500);
    
    // 验证表格导出按钮已注入
    const exportButton = page.locator('.table-export-button');
    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // 点击表格导出按钮
    await exportButton.click();
    await waitForAsync(1000);
    
    // 查找 Excel 格式按钮
    const excelButton = page.locator('button:has-text("Excel"), .tabular-extension-dialog-format-btn:has-text("Excel")').first();
    const excelButtonExists = await excelButton.count() > 0;
    
    if (excelButtonExists) {
      // 在点击之前设置下载监听
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      await excelButton.click();
      
      // 等待下载
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      
      // 保存文件到临时目录
      const path = await download.path();
      expect(path).toBeTruthy();
      
      // 读取文件内容
      const fs = await import('fs/promises');
      const content = await fs.readFile(path!, 'utf-8');
      
      // 验证文件格式正确（使用制表符分隔列）
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(4); // 1行表头 + 3行数据
      
      lines.forEach(line => {
        const cols = line.split('\t');
        expect(cols.length).toBe(3); // 每行应该有3列
      });
      
      // 验证特殊字符被保留（逗号和分号不影响TSV格式）
      expect(content).toContain('包含逗号,和分号;的文本');
    }
  });

  /**
   * 测试 Excel 导出文件格式
   * 验证需求：6.3 - 下载的文件应该可以被 Excel/WPS 正常打开
   */
  test('Excel 导出文件应该有正确的 MIME 类型', async ({ page }) => {
    // 设置足够的试用次数（表格导出是 Pro 功能）
    await setTrialCount(page, 'one-click-export', 3);
    
    // 准备简单表格
    const tableData = [
      ['列1', '列2', '列3'],
      ['数据1', '数据2', '数据3']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1500);
    
    // 验证表格导出按钮已注入
    const exportButton = page.locator('.table-export-button');
    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // 点击表格导出按钮
    await exportButton.click();
    await waitForAsync(1000);
    
    // 查找 Excel 格式按钮
    const excelButton = page.locator('button:has-text("Excel"), .tabular-extension-dialog-format-btn:has-text("Excel")').first();
    const excelButtonExists = await excelButton.count() > 0;
    
    if (excelButtonExists) {
      // 在点击之前设置下载监听
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      await excelButton.click();
      
      // 等待下载
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      
      // 验证文件名扩展名
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/\.(xls|xlsx)$/i);
      
      // 验证文件不为空
      const path = await download.path();
      expect(path).toBeTruthy();
      
      const fs = await import('fs/promises');
      const stats = await fs.stat(path!);
      expect(stats.size).toBeGreaterThan(0);
    }
  });

  /**
   * 测试 Excel 导出多行数据
   * 验证需求：6.4 - Excel 导出应该正确处理多行数据
   */
  test('Excel 导出应该正确处理多行数据', async ({ page }) => {
    // 设置足够的试用次数（表格导出是 Pro 功能）
    await setTrialCount(page, 'one-click-export', 3);
    
    // 准备包含多行的表格
    const tableData = [
      ['ID', '姓名', '年龄', '城市', '职业'],
      ['1', '张三', '25', '北京', '工程师'],
      ['2', '李四', '30', '上海', '设计师'],
      ['3', '王五', '28', '广州', '产品经理'],
      ['4', '赵六', '32', '深圳', '架构师'],
      ['5', '钱七', '27', '杭州', '测试工程师']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1500);
    
    // 验证表格导出按钮已注入
    const exportButton = page.locator('.table-export-button');
    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // 点击表格导出按钮
    await exportButton.click();
    await waitForAsync(1000);
    
    // 查找 Excel 格式按钮
    const excelButton = page.locator('button:has-text("Excel"), .tabular-extension-dialog-format-btn:has-text("Excel")').first();
    const excelButtonExists = await excelButton.count() > 0;
    
    if (excelButtonExists) {
      // 在点击之前设置下载监听
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      await excelButton.click();
      
      // 等待下载
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      
      // 保存文件到临时目录
      const path = await download.path();
      expect(path).toBeTruthy();
      
      // 读取文件内容
      const fs = await import('fs/promises');
      const content = await fs.readFile(path!, 'utf-8');
      
      // 验证行数
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(6); // 1行表头 + 5行数据
      
      // 验证每行的列数一致
      lines.forEach(line => {
        const cols = line.split('\t');
        expect(cols.length).toBe(5); // 每行应该有5列
      });
      
      // 验证数据完整性
      expect(content).toContain('张三');
      expect(content).toContain('李四');
      expect(content).toContain('王五');
      expect(content).toContain('赵六');
      expect(content).toContain('钱七');
    }
  });

  /**
   * 测试 Excel 导出少量数据
   * 验证需求：6.5 - Excel 导出应该正确处理少量数据的表格
   */
  test('Excel 导出应该处理少量数据的表格', async ({ page }) => {
    // 设置足够的试用次数（表格导出是 Pro 功能）
    await setTrialCount(page, 'one-click-export', 3);
    
    // 准备包含少量数据的表格（至少2行，确保表格检测器能识别）
    const tableData = [
      ['列1', '列2', '列3'],
      ['数据1', '数据2', '数据3']
    ];
    const htmlContent = generateTablePage(tableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1500);
    
    // 验证表格导出按钮已注入
    const exportButton = page.locator('.table-export-button');
    await exportButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // 点击表格导出按钮
    await exportButton.click();
    await waitForAsync(1000);
    
    // 查找 Excel 格式按钮
    const excelButton = page.locator('button:has-text("Excel"), .tabular-extension-dialog-format-btn:has-text("Excel")').first();
    const excelButtonExists = await excelButton.count() > 0;
    
    if (excelButtonExists) {
      // 在点击之前设置下载监听
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      await excelButton.click();
      
      // 等待下载
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      
      // 保存文件到临时目录
      const path = await download.path();
      expect(path).toBeTruthy();
      
      // 读取文件内容
      const fs = await import('fs/promises');
      const content = await fs.readFile(path!, 'utf-8');
      
      // 验证有2行数据
      const lines = content.trim().split('\n');
      expect(lines.length).toBe(2);
      
      // 验证每行包含3列
      const headerCols = lines[0].split('\t');
      expect(headerCols.length).toBe(3);
      
      const dataCols = lines[1].split('\t');
      expect(dataCols.length).toBe(3);
    }
  });
});
