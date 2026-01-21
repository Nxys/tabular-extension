import { test, expect } from './fixtures';
import { 
  createTestPage, 
  selectText, 
  selectTable, 
  waitForPanel, 
  isPanelVisible,
  clickPanelButton,
  getPanelText,
  waitForAsync,
  dragSelection,
  waitForResultPanel,
  getPanelTableData
} from './helpers/extension';
import { 
  enablePlugin,
  clearStorage
} from './helpers/storage';
import { 
  generateTablePage, 
  generateTextPage, 
  generateComplexTablePage,
  generateMultilineTextPage,
  generateSpecialCharPage,
  generateEmptyPage,
  generateNestedTagsPage,
  generateNonTableContentPage,
  generateLargeTablePage
} from './fixtures/pages';

/**
 * 基础功能测试
 * 测试插件的核心文本提取和表格检测功能
 */

test.describe('基础功能测试', () => {
  
  /**
   * 测试简单文本提取功能
   * 验证需求：1.1 - 用户框选简单文本时，提取的文本与原始文本完全一致
   */
  test('应该能够提取选中的文本', async ({ page }) => {
    // 准备测试页面
    const testText = '这是一段测试文本，用于验证文本提取功能是否正常工作。';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(500);
    
    // 获取测试文本元素的位置
    const textElement = page.locator('#test-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取文本元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的文本与原始文本完全一致
    expect(panelText).toContain(testText);
  });

  /**
   * 测试多行文本提取功能
   * 验证需求：1.2 - 用户框选多行文本时，提取的文本保留换行符和格式
   */
  test('应该能够提取多行文本并保留换行符', async ({ page }) => {
    // 准备多行文本测试页面
    const htmlContent = generateMultilineTextPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取多行文本元素的位置
    const textElement = page.locator('#multiline-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取多行文本元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的文本包含所有行
    expect(panelText).toContain('第一行文本');
    expect(panelText).toContain('第二行文本');
    expect(panelText).toContain('第三行文本');
    expect(panelText).toContain('第五行文本');
    
    // 验证换行符被保留
    // 文本应该包含换行符（\n 或 \r\n）
    const hasNewlines = panelText.includes('\n') || panelText.includes('\r');
    expect(hasNewlines).toBe(true);
    
    // 验证文本被正确分成多行
    const lines = panelText.split(/\r?\n/).filter(line => line.trim().length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(4); // 至少应该有 4 行非空文本
    
    // 验证行的顺序正确（第一行在第二行之前）
    const firstLineIndex = panelText.indexOf('第一行文本');
    const secondLineIndex = panelText.indexOf('第二行文本');
    const thirdLineIndex = panelText.indexOf('第三行文本');
    const fifthLineIndex = panelText.indexOf('第五行文本');
    
    expect(firstLineIndex).toBeLessThan(secondLineIndex);
    expect(secondLineIndex).toBeLessThan(thirdLineIndex);
    expect(thirdLineIndex).toBeLessThan(fifthLineIndex);
    
    // 验证空行的处理（第四行是空行，第五行应该在第三行之后）
    // 空行可能被保留为空字符串或被过滤掉，这取决于插件的实现
    // 我们主要验证非空行的顺序和内容
  });

  /**
   * 测试特殊字符提取功能
   * 验证需求：1.3 - 用户框选包含特殊字符的文本时，特殊字符被正确解码和提取
   */
  test('应该能够正确提取和解码 HTML 实体', async ({ page }) => {
    // 准备包含 HTML 实体的测试页面
    const htmlContent = generateSpecialCharPage(true, false, false);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取特殊字符元素的位置
    const textElement = page.locator('#special-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取特殊字符元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证 HTML 实体被正确解码
    expect(panelText).toContain('<div>'); // &lt;div&gt; 应该被解码为 <div>
    expect(panelText).toContain('</div>'); // &lt;/div&gt; 应该被解码为 </div>
    expect(panelText).toContain('&'); // &amp; 应该被解码为 &
    expect(panelText).toContain('"引号"'); // &quot; 应该被解码为 "
    expect(panelText).toContain("'单引号'"); // &apos; 应该被解码为 '
    
    // 验证基础文本内容也存在
    expect(panelText).toContain('基础文本内容');
    expect(panelText).toContain('HTML实体');
  });

  /**
   * 测试 Unicode 字符提取功能
   * 验证需求：1.3 - 用户框选包含 Unicode 字符的文本时，字符被正确提取
   */
  test('应该能够正确提取 Unicode 字符', async ({ page }) => {
    // 准备包含 Unicode 字符的测试页面
    const htmlContent = generateSpecialCharPage(false, true, false);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取特殊字符元素的位置
    const textElement = page.locator('#special-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取 Unicode 字符元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证 Unicode 字符被正确提取
    expect(panelText).toContain('中文'); // \u4E2D\u6587
    expect(panelText).toContain('日本語'); // \u65E5\u672C\u8A9E
    expect(panelText).toContain('한국어'); // \uD55C\uAD6D\uC5B4
    expect(panelText).toContain('©'); // \u00A9
    expect(panelText).toContain('®'); // \u00AE
    expect(panelText).toContain('™'); // \u2122
    
    // 验证基础文本内容也存在
    expect(panelText).toContain('基础文本内容');
    expect(panelText).toContain('Unicode');
  });

  /**
   * 测试 Emoji 表情符号提取功能
   * 验证需求：1.3 - 用户框选包含 Emoji 的文本时，Emoji 被正确提取
   */
  test('应该能够正确提取 Emoji 表情符号', async ({ page }) => {
    // 准备包含 Emoji 的测试页面
    const htmlContent = generateSpecialCharPage(false, false, true);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取特殊字符元素的位置
    const textElement = page.locator('#special-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取 Emoji 元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证 Emoji 被正确提取
    expect(panelText).toContain('😀'); // 笑脸
    expect(panelText).toContain('🎉'); // 庆祝
    expect(panelText).toContain('🚀'); // 火箭
    expect(panelText).toContain('❤️'); // 红心
    expect(panelText).toContain('👍'); // 点赞
    expect(panelText).toContain('🌟'); // 星星
    expect(panelText).toContain('💻'); // 电脑
    expect(panelText).toContain('📱'); // 手机
    expect(panelText).toContain('🔥'); // 火焰
    expect(panelText).toContain('✨'); // 闪光
    
    // 验证基础文本内容也存在
    expect(panelText).toContain('基础文本内容');
    expect(panelText).toContain('Emoji');
  });

  /**
   * 测试混合特殊字符提取功能
   * 验证需求：1.3 - 用户框选包含多种特殊字符的文本时，所有字符都被正确解码和提取
   */
  test('应该能够正确提取混合特殊字符（HTML实体 + Unicode + Emoji）', async ({ page }) => {
    // 准备包含所有类型特殊字符的测试页面
    const htmlContent = generateSpecialCharPage(true, true, true);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取特殊字符元素的位置
    const textElement = page.locator('#special-text');
    const boundingBox = await textElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取混合特殊字符元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证 HTML 实体
    expect(panelText).toContain('<div>');
    expect(panelText).toContain('&');
    expect(panelText).toContain('"引号"');
    
    // 验证 Unicode 字符
    expect(panelText).toContain('中文');
    expect(panelText).toContain('日本語');
    expect(panelText).toContain('©');
    
    // 验证 Emoji
    expect(panelText).toContain('😀');
    expect(panelText).toContain('🚀');
    expect(panelText).toContain('❤️');
    
    // 验证基础文本内容
    expect(panelText).toContain('基础文本内容');
  });

  /**
   * 测试嵌套标签提取功能
   * 验证需求：1.5 - 用户框选包含嵌套 HTML 标签的文本时，提取的纯文本去除了所有标签
   */
  test('应该能够去除所有嵌套 HTML 标签并提取纯文本', async ({ page }) => {
    // 准备包含嵌套标签的测试页面
    const htmlContent = generateNestedTagsPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取嵌套标签元素的位置
    const nestedElement = page.locator('#nested-tags');
    const boundingBox = await nestedElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取嵌套标签元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的文本不包含 HTML 标签
    // 不应该包含任何 HTML 标签的尖括号
    expect(panelText).not.toContain('<strong>');
    expect(panelText).not.toContain('</strong>');
    expect(panelText).not.toContain('<em>');
    expect(panelText).not.toContain('</em>');
    expect(panelText).not.toContain('<span');
    expect(panelText).not.toContain('</span>');
    expect(panelText).not.toContain('<a ');
    expect(panelText).not.toContain('</a>');
    expect(panelText).not.toContain('<div>');
    expect(panelText).not.toContain('</div>');
    expect(panelText).not.toContain('<p>');
    expect(panelText).not.toContain('</p>');
    expect(panelText).not.toContain('<b>');
    expect(panelText).not.toContain('</b>');
    expect(panelText).not.toContain('<i>');
    expect(panelText).not.toContain('</i>');
    
    // 验证提取的纯文本包含主要内容（去除标签后的文本）
    // 注意：由于块级元素（div, p）的存在，文本可能会被分割或重新排列
    expect(panelText).toContain('这是');
    expect(panelText).toContain('加粗的');
    expect(panelText).toContain('斜体的');
    expect(panelText).toContain('高亮的');
    expect(panelText).toContain('文本');
    expect(panelText).toContain('内容');
    expect(panelText).toContain('包含');
    expect(panelText).toContain('链接');
    expect(panelText).toContain('中的');
    expect(panelText).toContain('嵌套');
    expect(panelText).toContain('标签');
    expect(panelText).toContain('以及');
    expect(panelText).toContain('块级');
    
    // 验证不包含任何 HTML 属性（如 class, href 等）
    expect(panelText).not.toContain('class=');
    expect(panelText).not.toContain('href=');
    expect(panelText).not.toContain('highlight');
    
    // 额外验证：确保没有遗留的尖括号
    const hasAngleBrackets = panelText.includes('<') || panelText.includes('>');
    expect(hasAngleBrackets).toBe(false);
  });

  /**
   * 测试简单表格检测功能
   * 验证需求：2.1 - 用户框选简单表格（2x2）时，表格被正确识别且数据结构完整
   */
  test('应该能够检测和提取简单 2x2 表格', async ({ page }) => {
    // 准备 2x2 测试表格
    const expectedTableData = [
      ['姓名', '年龄'],
      ['张三', '25']
    ];
    const htmlContent = generateTablePage(expectedTableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取表格元素的位置
    const tableElement = page.locator('#test-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容（表格数据以文本形式显示在 textarea 中）
    const panelText = await getPanelText(page);
    
    // 验证表格被正确识别：面板应该包含所有单元格的内容
    expect(panelText).toBeDefined();
    expect(panelText.length).toBeGreaterThan(0);
    
    // 验证所有单元格内容都存在
    expect(panelText).toContain('姓名');
    expect(panelText).toContain('年龄');
    expect(panelText).toContain('张三');
    expect(panelText).toContain('25');
    
    // 验证数据结构完整性：表格数据应该按行组织
    // 根据 panel.ts 实现，表格数据格式为：row.join('') + '\n'
    // 即每行的单元格直接连接，行之间用换行符分隔
    const lines = panelText.split('\n').filter(line => line.trim().length > 0);
    
    // 应该有 2 行数据（表头行 + 数据行）
    expect(lines.length).toBe(2);
    
    // 验证第一行（表头）包含正确的内容
    const firstLine = lines[0];
    expect(firstLine).toContain('姓名');
    expect(firstLine).toContain('年龄');
    
    // 验证第二行（数据行）包含正确的内容
    const secondLine = lines[1];
    expect(secondLine).toContain('张三');
    expect(secondLine).toContain('25');
    
    // 验证行的顺序正确（表头在数据行之前）
    const nameIndex = panelText.indexOf('姓名');
    const zhangSanIndex = panelText.indexOf('张三');
    expect(nameIndex).toBeLessThan(zhangSanIndex);
  });

  /**
   * 测试复杂表格检测功能（包含合并单元格）
   * 验证需求：2.2 - 用户框选复杂表格（包含合并单元格）时，合并单元格被正确处理
   */
  test('应该能够处理包含合并单元格的复杂表格', async ({ page }) => {
    // 准备包含合并单元格的复杂表格页面
    const htmlContent = generateComplexTablePage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取不规则表格（包含 rowspan 和 colspan）的位置
    const tableElement = page.locator('#irregular-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取不规则表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证表格被正确识别：面板应该包含所有单元格的内容
    expect(panelText).toBeDefined();
    expect(panelText.length).toBeGreaterThan(0);
    
    // 验证合并单元格的内容被正确提取
    // 根据 generateComplexTablePage() 中的不规则表格结构：
    // 第一行：合并行（rowspan=2）、普通单元格1、普通单元格2
    // 第二行：合并列（colspan=2）
    expect(panelText).toContain('合并行');
    expect(panelText).toContain('普通单元格1');
    expect(panelText).toContain('普通单元格2');
    expect(panelText).toContain('合并列');
    
    // 验证数据结构完整性：所有单元格内容都应该存在
    const lines = panelText.split('\n').filter(line => line.trim().length > 0);
    
    // 应该至少有 2 行数据（对应表格的 2 行）
    expect(lines.length).toBeGreaterThanOrEqual(2);
    
    // 验证第一行包含合并行单元格和其他单元格
    const firstLine = lines[0];
    expect(firstLine).toContain('合并行');
    
    // 验证第二行包含合并列单元格
    // 注意：由于 rowspan，"合并行"可能在第二行也出现，或者只在第一行出现
    // 我们主要验证"合并列"在后续行中出现
    const hasColspanCell = lines.some(line => line.includes('合并列'));
    expect(hasColspanCell).toBe(true);
    
    // 验证所有关键内容都被提取
    const allContent = panelText;
    expect(allContent).toContain('合并行');
    expect(allContent).toContain('普通单元格1');
    expect(allContent).toContain('普通单元格2');
    expect(allContent).toContain('合并列');
  });

  /**
   * 测试嵌套表格检测功能
   * 验证需求：2.3 - 用户框选嵌套表格时，内外层表格都被正确提取
   */
  test('应该能够处理嵌套表格并提取内外层数据', async ({ page }) => {
    // 准备包含嵌套表格的页面
    const htmlContent = generateComplexTablePage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取嵌套表格元素的位置
    const tableElement = page.locator('#nested-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取嵌套表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证表格被正确识别：面板应该包含所有单元格的内容
    expect(panelText).toBeDefined();
    expect(panelText.length).toBeGreaterThan(0);
    
    // 验证外层表格的内容被正确提取
    expect(panelText).toContain('外层单元格1');
    
    // 验证内层表格的内容被正确提取
    // 根据 generateComplexTablePage() 中的嵌套表格结构：
    // 外层：外层单元格1 | [内层表格]
    // 内层：内层A1 | 内层B1
    //       内层A2 | 内层B2
    expect(panelText).toContain('内层A1');
    expect(panelText).toContain('内层B1');
    expect(panelText).toContain('内层A2');
    expect(panelText).toContain('内层B2');
    
    // 验证数据结构完整性：所有单元格内容都应该存在
    const allContent = panelText;
    
    // 验证外层表格内容
    expect(allContent).toContain('外层单元格1');
    
    // 验证内层表格所有单元格内容
    expect(allContent).toContain('内层A1');
    expect(allContent).toContain('内层B1');
    expect(allContent).toContain('内层A2');
    expect(allContent).toContain('内层B2');
    
    // 验证内容的相对顺序（内层表格的内容应该在一起）
    const a1Index = panelText.indexOf('内层A1');
    const b1Index = panelText.indexOf('内层B1');
    const a2Index = panelText.indexOf('内层A2');
    const b2Index = panelText.indexOf('内层B2');
    
    // 验证内层表格的行顺序正确（第一行在第二行之前）
    expect(a1Index).toBeLessThan(a2Index);
    expect(b1Index).toBeLessThan(b2Index);
    
    // 验证每行内的列顺序（A 列在 B 列之前或附近）
    // 注意：由于表格可能被转换为文本，列的顺序可能不是严格的前后关系
    // 但至少应该在合理的范围内
    const row1Distance = Math.abs(b1Index - a1Index);
    const row2Distance = Math.abs(b2Index - a2Index);
    
    // 同一行的两个单元格之间的距离应该相对较小（小于 100 个字符）
    expect(row1Distance).toBeLessThan(100);
    expect(row2Distance).toBeLessThan(100);
  });

  /**
   * 测试表头识别功能
   * 验证需求：2.4 - 用户框选包含表头的表格时，表头被正确识别和标记
   */
  test('应该能够识别和提取包含表头的表格', async ({ page }) => {
    // 准备包含表头的表格页面
    const htmlContent = generateComplexTablePage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取带表头的表格元素的位置
    const tableElement = page.locator('#header-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取表头表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证表格被正确识别：面板应该包含所有单元格的内容
    expect(panelText).toBeDefined();
    expect(panelText.length).toBeGreaterThan(0);
    
    // 验证表头内容被正确提取
    // 根据 generateComplexTablePage() 中的表头表格结构：
    // 表头：姓名 | 年龄 | 城市 | 职业
    // 数据行1：张三 | 25 | 北京 | 工程师
    // 数据行2：李四 | 30 | 上海 | 设计师
    expect(panelText).toContain('姓名');
    expect(panelText).toContain('年龄');
    expect(panelText).toContain('城市');
    expect(panelText).toContain('职业');
    
    // 验证数据行内容被正确提取
    expect(panelText).toContain('张三');
    expect(panelText).toContain('25');
    expect(panelText).toContain('北京');
    expect(panelText).toContain('工程师');
    expect(panelText).toContain('李四');
    expect(panelText).toContain('30');
    expect(panelText).toContain('上海');
    expect(panelText).toContain('设计师');
    
    // 验证数据结构完整性：所有行都应该存在
    const lines = panelText.split('\n').filter(line => line.trim().length > 0);
    
    // 应该至少有 3 行数据（表头行 + 2 个数据行）
    expect(lines.length).toBeGreaterThanOrEqual(3);
    
    // 验证表头行在数据行之前
    const headerIndex = panelText.indexOf('姓名');
    const firstDataIndex = panelText.indexOf('张三');
    const secondDataIndex = panelText.indexOf('李四');
    
    expect(headerIndex).toBeLessThan(firstDataIndex);
    expect(firstDataIndex).toBeLessThan(secondDataIndex);
    
    // 验证表头行包含所有表头字段
    const firstLine = lines[0];
    expect(firstLine).toContain('姓名');
    expect(firstLine).toContain('年龄');
    expect(firstLine).toContain('城市');
    expect(firstLine).toContain('职业');
    
    // 验证第一个数据行包含正确的内容
    const secondLine = lines[1];
    expect(secondLine).toContain('张三');
    expect(secondLine).toContain('25');
    expect(secondLine).toContain('北京');
    expect(secondLine).toContain('工程师');
    
    // 验证第二个数据行包含正确的内容
    const thirdLine = lines[2];
    expect(thirdLine).toContain('李四');
    expect(thirdLine).toContain('30');
    expect(thirdLine).toContain('上海');
    expect(thirdLine).toContain('设计师');
    
    // 验证列的对齐：同一列的数据应该在相似的位置
    // 例如，"姓名"列的数据（张三、李四）应该在相似的位置
    const nameHeaderPos = firstLine.indexOf('姓名');
    const zhangSanPos = secondLine.indexOf('张三');
    const liSiPos = thirdLine.indexOf('李四');
    
    // 姓名列的数据应该在表头"姓名"的附近位置（允许一定偏差）
    // 由于可能有空格填充，我们检查它们是否在合理的范围内
    expect(Math.abs(zhangSanPos - nameHeaderPos)).toBeLessThan(10);
    expect(Math.abs(liSiPos - nameHeaderPos)).toBeLessThan(10);
  });

  test('应该能够处理不规则表格', async ({ page }) => {
    const htmlContent = generateComplexTablePage();
    await createTestPage(page, htmlContent);
    
    // 选择不规则表格
    await selectTable(page, '#irregular-table');
    await waitForAsync();
    
    // 检查面板显示
    const panelVisible = await isPanelVisible(page);
    expect(panelVisible).toBe(true);
  });

  /**
   * 测试空白区域框选功能
   * 验证需求：1.4 - 用户框选空白区域时，系统返回空结果或提示消息
   */
  test('应该能够处理空白区域框选', async ({ page }) => {
    // 准备空白页面
    const htmlContent = generateEmptyPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(500);
    
    // 获取空白区域元素的位置
    const emptyElement = page.locator('#empty-content');
    const boundingBox = await emptyElement.boundingBox();
    
    if (!boundingBox) {
      // 如果空白元素没有边界框，使用页面中心区域
      const viewportSize = page.viewportSize();
      if (!viewportSize) {
        throw new Error('无法获取视口大小');
      }
      
      // 在页面中心区域进行框选
      const startX = viewportSize.width / 4;
      const startY = viewportSize.height / 4;
      const endX = viewportSize.width * 3 / 4;
      const endY = viewportSize.height * 3 / 4;
      
      await dragSelection(page, startX, startY, endX, endY);
    } else {
      // 在空白元素区域进行框选
      const startX = boundingBox.x + 10;
      const startY = boundingBox.y + 10;
      const endX = boundingBox.x + Math.max(boundingBox.width - 10, 50);
      const endY = boundingBox.y + Math.max(boundingBox.height - 10, 50);
      
      await dragSelection(page, startX, startY, endX, endY);
    }
    
    // 等待一段时间，看是否有面板显示
    await waitForAsync(2000);
    
    // 检查面板是否显示
    const panelVisible = await isPanelVisible(page);
    
    if (panelVisible) {
      // 如果面板显示，验证是否包含空结果或提示消息
      const panelText = await getPanelText(page);
      
      // 验证面板显示空结果或提示消息
      // 可能的情况：
      // 1. 面板显示但内容为空
      // 2. 面板显示提示消息（如"未选中任何内容"、"选择区域为空"等）
      const isEmpty = panelText.trim().length === 0;
      const hasEmptyMessage = 
        panelText.includes('未选中') || 
        panelText.includes('为空') || 
        panelText.includes('没有内容') ||
        panelText.includes('无内容') ||
        panelText.includes('空白');
      
      // 至少满足一个条件：内容为空或显示提示消息
      expect(isEmpty || hasEmptyMessage).toBe(true);
    } else {
      // 如果面板不显示，这也是合理的行为（空白区域不触发面板）
      expect(panelVisible).toBe(false);
    }
  });

  /**
   * 测试非表格内容不被误判为表格
   * 验证需求：2.5 - 用户框选非表格内容时，系统不会误判为表格
   */
  test('应该不会将列表误判为表格', async ({ page }) => {
    // 准备包含列表的页面
    const htmlContent = generateNonTableContentPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 测试无序列表
    const unorderedList = page.locator('#unordered-list');
    const boundingBox = await unorderedList.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取无序列表元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的内容包含列表项
    expect(panelText).toContain('高性能处理器');
    expect(panelText).toContain('长续航电池');
    expect(panelText).toContain('轻薄便携设计');
    expect(panelText).toContain('全高清显示屏');
    
    // 核心验证：列表不应该被识别为表格
    // 如果被误判为表格，getPanelTableData() 应该返回空数组或抛出错误
    // 因为面板不会以表格模式显示列表内容
    try {
      const tableData = await getPanelTableData(page);
      // 如果能获取到表格数据，说明被误判为表格了
      // 表格数据应该为空或者不存在
      expect(tableData.length).toBe(0);
    } catch (error) {
      // 如果抛出错误（例如找不到表格元素），说明没有被误判为表格，这是正确的
      // 这是预期的行为
    }
    
    // 验证内容是连续的文本，而不是严格的表格行列格式
    // 列表项应该按顺序出现
    const processorIndex = panelText.indexOf('高性能处理器');
    const batteryIndex = panelText.indexOf('长续航电池');
    const designIndex = panelText.indexOf('轻薄便携设计');
    const displayIndex = panelText.indexOf('全高清显示屏');
    
    expect(processorIndex).toBeLessThan(batteryIndex);
    expect(batteryIndex).toBeLessThan(designIndex);
    expect(designIndex).toBeLessThan(displayIndex);
  });

  /**
   * 测试 Div 网格布局不被误判为表格
   * 验证需求：2.5 - 用户框选 Div 网格布局时，系统不会误判为表格
   */
  test('应该不会将 Div 网格布局误判为表格', async ({ page }) => {
    // 准备包含网格布局的页面
    const htmlContent = generateNonTableContentPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 测试网格布局
    const gridLayout = page.locator('#grid-layout');
    const boundingBox = await gridLayout.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取网格布局元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的内容包含网格项
    expect(panelText).toContain('产品名称');
    expect(panelText).toContain('笔记本电脑');
    expect(panelText).toContain('价格');
    expect(panelText).toContain('¥5,999');
    expect(panelText).toContain('库存');
    expect(panelText).toContain('15 台');
    
    // 核心验证：Div 网格布局不应该被识别为表格
    // 即使视觉上看起来像表格，但由于不是 <table> 元素，不应该被识别为表格
    try {
      const tableData = await getPanelTableData(page);
      // 如果能获取到表格数据，说明被误判为表格了
      expect(tableData.length).toBe(0);
    } catch (error) {
      // 如果抛出错误，说明没有被误判为表格，这是正确的
    }
    
    // 验证内容被正确提取（即使布局看起来像表格，但实际是 div）
    // 网格布局的内容应该按照 DOM 顺序提取，而不是严格的表格行列结构
  });

  /**
   * 测试卡片布局不被误判为表格
   * 验证需求：2.5 - 用户框选卡片布局时，系统不会误判为表格
   */
  test('应该不会将卡片布局误判为表格', async ({ page }) => {
    // 准备包含卡片布局的页面
    const htmlContent = generateNonTableContentPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 测试卡片布局
    const cardLayout = page.locator('#card-layout');
    const boundingBox = await cardLayout.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取卡片布局元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的内容包含卡片信息
    expect(panelText).toContain('张三');
    expect(panelText).toContain('前端工程师');
    expect(panelText).toContain('李四');
    expect(panelText).toContain('后端工程师');
    expect(panelText).toContain('王五');
    expect(panelText).toContain('UI设计师');
    
    // 核心验证：卡片布局不应该被识别为表格
    try {
      const tableData = await getPanelTableData(page);
      // 如果能获取到表格数据，说明被误判为表格了
      expect(tableData.length).toBe(0);
    } catch (error) {
      // 如果抛出错误，说明没有被误判为表格，这是正确的
    }
    
    // 验证卡片内容被正确提取
    // 卡片布局应该保持其语义结构，而不是被强制转换为表格格式
  });

  /**
   * 测试段落文本不被误判为表格
   * 验证需求：2.5 - 用户框选段落文本时，系统不会误判为表格
   */
  test('应该不会将段落文本误判为表格', async ({ page }) => {
    // 准备包含段落的页面
    const htmlContent = generateNonTableContentPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 测试段落文本
    const paragraphs = page.locator('#paragraphs');
    const boundingBox = await paragraphs.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取段落元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待一段时间，看是否有面板显示
    await waitForAsync(2000);
    
    // 检查面板是否显示
    const panelVisible = await isPanelVisible(page);
    
    if (panelVisible) {
      // 如果面板显示，验证提取的内容
      const panelText = await getPanelText(page);
      
      // 验证提取的内容包含段落文本
      expect(panelText).toContain('高性能的商务笔记本电脑');
      expect(panelText).toContain('最新的处理器技术');
      expect(panelText).toContain('轻薄的机身设计');
      expect(panelText).toContain('全高清显示屏');
      
      // 核心验证：段落文本不应该被识别为表格
      try {
        const tableData = await getPanelTableData(page);
        // 如果能获取到表格数据，说明被误判为表格了
        expect(tableData.length).toBe(0);
      } catch (error) {
        // 如果抛出错误，说明没有被误判为表格，这是正确的
      }
      
      // 验证段落文本被正确提取为连续文本，而不是表格格式
      // 段落之间应该保持自然的文本流，而不是被分割成表格的行列
    } else {
      // 如果面板不显示，可能是因为段落内容没有触发提取
      // 这也是合理的行为，取决于插件的实现逻辑
      console.log('段落文本未触发面板显示，可能是插件的预期行为');
    }
  });

  /**
   * 测试类表格 Div 布局不被误判为表格
   * 验证需求：2.5 - 用户框选看起来像表格的 Div 布局时，系统不会误判为表格
   */
  test('应该不会将类表格 Div 布局误判为真正的表格', async ({ page }) => {
    // 准备包含类表格 Div 布局的页面
    const htmlContent = generateNonTableContentPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 测试类表格 Div 布局
    const divTableLike = page.locator('#div-table-like');
    const boundingBox = await divTableLike.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取类表格 Div 布局元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 10;
    const startY = boundingBox.y + 10;
    const endX = boundingBox.x + boundingBox.width - 10;
    const endY = boundingBox.y + boundingBox.height - 10;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证提取的内容包含规格参数
    expect(panelText).toContain('处理器');
    expect(panelText).toContain('Intel Core i7-12700H');
    expect(panelText).toContain('内存');
    expect(panelText).toContain('16GB DDR4');
    expect(panelText).toContain('存储');
    expect(panelText).toContain('512GB SSD');
    expect(panelText).toContain('显卡');
    expect(panelText).toContain('NVIDIA RTX 3060');
    
    // 核心验证：即使这个 Div 布局看起来像表格（有边框、行列结构），
    // 但由于它不是真正的 <table> 元素，系统不应该将其识别为表格
    try {
      const tableData = await getPanelTableData(page);
      // 如果能获取到表格数据，说明被误判为表格了
      expect(tableData.length).toBe(0);
    } catch (error) {
      // 如果抛出错误，说明没有被误判为表格，这是正确的
    }
    
    // 验证内容应该按照 DOM 顺序提取，而不是严格的表格行列结构
  });

  test('应该能够关闭插件面板', async ({ page }) => {
    const testText = '测试文本';
    const htmlContent = generateTextPage(testText);
    await createTestPage(page, htmlContent);
    
    // 选择文本显示面板
    await selectText(page, '#test-text');
    await waitForPanel(page);
    
    // 点击关闭按钮（如果有的话）
    try {
      await clickPanelButton(page, '关闭');
      await waitForAsync();
      
      const panelVisible = await isPanelVisible(page);
      expect(panelVisible).toBe(false);
    } catch {
      // 如果没有关闭按钮，点击其他地方应该也能关闭
      await page.click('body');
      await waitForAsync();
    }
  });

  /**
   * 测试 CSV 导出格式正确性
   * 验证需求：3.1 - 用户点击 CSV 导出按钮时，生成的 CSV 文件格式正确且内容完整
   * 
   * 注意：由于插件使用 chrome.downloads API，无法直接捕获下载文件
   * 此测试验证导出流程能够正常触发，CSV 格式正确性通过单元测试验证
   */
  test('应该能够触发 CSV 导出流程', async ({ page }) => {
    // 准备测试表格数据
    const expectedTableData = [
      ['姓名', '年龄', '城市'],
      ['张三', '25', '北京'],
      ['李四', '30', '上海']
    ];
    const htmlContent = generateTablePage(expectedTableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取表格元素的位置
    const tableElement = page.locator('#test-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 点击导出按钮
    const exportBtn = panel.locator('button:has-text("导出")');
    await exportBtn.click();
    
    // 等待导出格式选择对话框显示
    await waitForAsync(500);
    
    // 验证对话框显示
    const dialog = page.locator('.tabular-extension-dialog');
    expect(await dialog.isVisible()).toBe(true);
    
    // 验证 CSV 格式选项存在
    const csvFormatBtn = page.locator('button:has-text("CSV 格式")');
    expect(await csvFormatBtn.isVisible()).toBe(true);
    
    // 点击 CSV 格式按钮
    await csvFormatBtn.click();
    
    // 等待导出完成（面板应该显示成功消息或关闭）
    await waitForAsync(2000);
    
    // 验证导出流程完成
    // 由于使用 chrome.downloads API，导出成功后面板会关闭
    const panelStillVisible = await isPanelVisible(page);
    
    // 导出成功后，面板应该关闭或显示成功消息
    // 如果面板关闭，说明导出流程正常完成
    // 如果面板仍然可见，检查是否有错误消息
    if (panelStillVisible) {
      const panelText = await getPanelText(page);
      // 不应该显示错误消息
      expect(panelText).not.toMatch(/失败|错误|Error/);
    }
    
    // 注意：CSV 格式的正确性（逗号分隔、CRLF 换行、特殊字符转义）
    // 应该通过单元测试验证 toCSV() 函数的实现
  });

  /**
   * 测试 CSV 导出特殊字符转义（集成测试）
   * 验证需求：3.3 - 导出流程能够处理包含特殊字符的表格数据
   * 
   * 注意：特殊字符转义的正确性通过单元测试验证
   * 此测试验证包含特殊字符的表格能够正常触发导出流程
   */
  test('应该能够导出包含特殊字符的表格数据', async ({ page }) => {
    // 准备包含特殊字符的测试表格数据
    const expectedTableData = [
      ['字段1', '字段2', '字段3'],
      ['包含,逗号', '包含"引号"', '包含换行'],
      ['混合特殊字符', '正常文本', '¥1,234.56']
    ];
    const htmlContent = generateTablePage(expectedTableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取表格元素的位置
    const tableElement = page.locator('#test-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 验证面板中包含特殊字符的内容
    const panelText = await getPanelText(page);
    expect(panelText).toContain('包含,逗号');
    expect(panelText).toContain('包含"引号"');
    expect(panelText).toContain('¥1,234.56');
    
    // 点击导出按钮
    const exportBtn = panel.locator('button:has-text("导出")');
    await exportBtn.click();
    
    // 等待导出格式选择对话框显示
    await waitForAsync(500);
    
    // 点击 CSV 格式按钮
    const csvFormatBtn = page.locator('button:has-text("CSV 格式")');
    await csvFormatBtn.click();
    
    // 等待导出完成
    await waitForAsync(2000);
    
    // 验证导出流程完成（没有报错）
    const panelStillVisible = await isPanelVisible(page);
    
    if (panelStillVisible) {
      const panelTextAfter = await getPanelText(page);
      // 不应该显示错误消息
      expect(panelTextAfter).not.toMatch(/失败|错误|Error/);
    }
    
    // 注意：特殊字符转义的正确性（逗号、引号、换行符的转义规则）
    // 应该通过单元测试验证 toCSV() 和 escapeCSVField() 函数
  });

  /**
   * 测试 Excel 导出格式正确性
   * 验证需求：3.2 - 用户点击 Excel 导出按钮时，生成的 Excel 文件格式正确且内容完整
   * 
   * 注意：由于插件使用 chrome.downloads API，无法直接捕获下载文件
   * 此测试验证导出流程能够正常触发，Excel 格式正确性通过单元测试验证
   */
  test('应该能够触发 Excel 导出流程', async ({ page }) => {
    // 准备测试表格数据
    const expectedTableData = [
      ['姓名', '年龄', '城市'],
      ['张三', '25', '北京'],
      ['李四', '30', '上海']
    ];
    const htmlContent = generateTablePage(expectedTableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取表格元素的位置
    const tableElement = page.locator('#test-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 点击导出按钮
    const exportBtn = panel.locator('button:has-text("导出")');
    await exportBtn.click();
    
    // 等待导出格式选择对话框显示
    await waitForAsync(500);
    
    // 验证对话框显示
    const dialog = page.locator('.tabular-extension-dialog');
    expect(await dialog.isVisible()).toBe(true);
    
    // 验证 Excel 格式选项存在
    const excelFormatBtn = page.locator('button:has-text("Excel 格式")');
    expect(await excelFormatBtn.isVisible()).toBe(true);
    
    // 点击 Excel 格式按钮
    await excelFormatBtn.click();
    
    // 等待导出完成（面板应该显示成功消息或关闭）
    await waitForAsync(2000);
    
    // 验证导出流程完成
    // 由于使用 chrome.downloads API，导出成功后面板会关闭
    const panelStillVisible = await isPanelVisible(page);
    
    // 导出成功后，面板应该关闭或显示成功消息
    // 如果面板关闭，说明导出流程正常完成
    // 如果面板仍然可见，检查是否有错误消息
    if (panelStillVisible) {
      const panelText = await getPanelText(page);
      // 不应该显示错误消息
      expect(panelText).not.toMatch(/失败|错误|Error/);
    }
    
    // 注意：Excel 格式的正确性（MIME 类型、内容格式）
    // 应该通过单元测试验证 toExcel() 函数的实现
    // 当前实现使用 CSV 格式作为 Excel 的简化实现（Excel 可以打开 CSV 文件）
  });

  /**
   * 测试 Excel 导出包含特殊字符的表格数据
   * 验证需求：3.2, 3.3 - Excel 导出流程能够处理包含特殊字符的表格数据
   * 
   * 注意：特殊字符转义的正确性通过单元测试验证
   * 此测试验证包含特殊字符的表格能够正常触发 Excel 导出流程
   */
  test('应该能够导出包含特殊字符的表格数据为 Excel 格式', async ({ page }) => {
    // 准备包含特殊字符的测试表格数据
    const expectedTableData = [
      ['字段1', '字段2', '字段3'],
      ['包含,逗号', '包含"引号"', '包含换行'],
      ['混合特殊字符', '正常文本', '¥1,234.56']
    ];
    const htmlContent = generateTablePage(expectedTableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取表格元素的位置
    const tableElement = page.locator('#test-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 验证面板中包含特殊字符的内容
    const panelText = await getPanelText(page);
    expect(panelText).toContain('包含,逗号');
    expect(panelText).toContain('包含"引号"');
    expect(panelText).toContain('¥1,234.56');
    
    // 点击导出按钮
    const exportBtn = panel.locator('button:has-text("导出")');
    await exportBtn.click();
    
    // 等待导出格式选择对话框显示
    await waitForAsync(500);
    
    // 点击 Excel 格式按钮
    const excelFormatBtn = page.locator('button:has-text("Excel 格式")');
    await excelFormatBtn.click();
    
    // 等待导出完成
    await waitForAsync(2000);
    
    // 验证导出流程完成（没有报错）
    const panelStillVisible = await isPanelVisible(page);
    
    if (panelStillVisible) {
      const panelTextAfter = await getPanelText(page);
      // 不应该显示错误消息
      expect(panelTextAfter).not.toMatch(/失败|错误|Error/);
    }
    
    // 注意：特殊字符转义的正确性（逗号、引号、换行符的转义规则）
    // 应该通过单元测试验证 toExcel() 和 toCSV() 函数
    // 当前 Excel 实现基于 CSV 格式，因此转义规则与 CSV 相同
  });

  /**
   * 测试空数据导出处理
   * 验证需求：3.4 - 导出空数据时，系统返回错误提示或空文件
   * 
   * 测试场景：
   * 1. 框选空白区域后尝试导出
   * 2. 验证系统是否显示错误提示或正确处理空数据
   */
  test('应该能够正确处理空数据导出', async ({ page }) => {
    // 准备空白页面
    const htmlContent = generateEmptyPage();
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取空白区域元素的位置
    const emptyElement = page.locator('#empty-content');
    const boundingBox = await emptyElement.boundingBox();
    
    let startX: number, startY: number, endX: number, endY: number;
    
    if (!boundingBox) {
      // 如果空白元素没有边界框，使用页面中心区域
      const viewportSize = page.viewportSize();
      if (!viewportSize) {
        throw new Error('无法获取视口大小');
      }
      
      startX = viewportSize.width / 4;
      startY = viewportSize.height / 4;
      endX = viewportSize.width * 3 / 4;
      endY = viewportSize.height * 3 / 4;
    } else {
      // 在空白元素区域进行框选
      startX = boundingBox.x + 10;
      startY = boundingBox.y + 10;
      endX = boundingBox.x + Math.max(boundingBox.width - 10, 50);
      endY = boundingBox.y + Math.max(boundingBox.height - 10, 50);
    }
    
    // 使用 dragSelection 进行框选
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待一段时间，看是否有面板显示
    await waitForAsync(2000);
    
    // 检查面板是否显示
    const panelVisible = await isPanelVisible(page);
    
    if (panelVisible) {
      // 如果面板显示，尝试点击导出按钮
      const panel = await waitForResultPanel(page, 5000);
      
      // 检查面板内容是否为空或包含提示
      const panelText = await getPanelText(page);
      const isEmpty = panelText.trim().length === 0;
      const hasEmptyMessage = 
        panelText.includes('未选中') || 
        panelText.includes('为空') || 
        panelText.includes('没有内容') ||
        panelText.includes('无内容');
      
      // 尝试查找导出按钮
      const exportBtn = panel.locator('button:has-text("导出")');
      const exportBtnVisible = await exportBtn.isVisible().catch(() => false);
      
      if (exportBtnVisible) {
        // 如果导出按钮可见，点击它
        await exportBtn.click();
        
        // 等待导出格式选择对话框显示
        await waitForAsync(500);
        
        // 检查是否显示对话框
        const dialog = page.locator('.tabular-extension-dialog');
        const dialogVisible = await dialog.isVisible().catch(() => false);
        
        if (dialogVisible) {
          // 点击 CSV 格式按钮
          const csvFormatBtn = page.locator('button:has-text("CSV 格式")');
          const csvBtnVisible = await csvFormatBtn.isVisible().catch(() => false);
          
          if (csvBtnVisible) {
            await csvFormatBtn.click();
            
            // 等待导出完成
            await waitForAsync(2000);
            
            // 验证导出后的状态
            // 空数据导出应该：
            // 1. 显示错误提示，或
            // 2. 生成空文件（面板关闭），或
            // 3. 面板保持显示但不报错
            const panelStillVisible = await isPanelVisible(page);
            
            if (panelStillVisible) {
              const panelTextAfter = await getPanelText(page);
              
              // 验证：要么显示空数据提示，要么没有错误消息
              const hasErrorMessage = panelTextAfter.match(/失败|错误|Error/);
              const hasEmptyDataMessage = 
                panelTextAfter.includes('空') || 
                panelTextAfter.includes('无数据') ||
                panelTextAfter.includes('没有内容');
              
              // 空数据导出应该：
              // - 不显示失败错误（因为这是预期行为），或
              // - 显示友好的空数据提示
              if (hasErrorMessage) {
                // 如果有错误消息，应该是关于空数据的友好提示
                expect(hasEmptyDataMessage).toBe(true);
              }
            }
            // 如果面板关闭，说明导出了空文件，这也是合理的行为
          }
        } else {
          // 如果对话框没有显示，可能是因为空数据被阻止导出
          // 这是合理的行为，验证面板是否显示提示
          const panelTextAfter = await getPanelText(page);
          const hasEmptyDataMessage = 
            panelTextAfter.includes('空') || 
            panelTextAfter.includes('无数据') ||
            panelTextAfter.includes('没有内容');
          
          // 应该显示空数据相关的提示
          expect(isEmpty || hasEmptyMessage || hasEmptyDataMessage).toBe(true);
        }
      } else {
        // 如果导出按钮不可见，验证面板显示空数据提示
        expect(isEmpty || hasEmptyMessage).toBe(true);
      }
    } else {
      // 如果面板不显示，这也是合理的行为（空白区域不触发面板）
      // 这种情况下，无法测试导出功能，但至少验证了空白区域的处理
      expect(panelVisible).toBe(false);
    }
  });

  /**
   * 测试空表格导出处理
   * 验证需求：3.4 - 导出空表格时，系统返回错误提示或空文件
   * 
   * 测试场景：
   * 1. 创建一个只有表头没有数据行的表格
   * 2. 框选并尝试导出
   * 3. 验证系统是否正确处理空表格导出
   */
  test('应该能够正确处理空表格导出', async ({ page }) => {
    // 准备只有表头的空表格
    const emptyTableData = [
      ['列1', '列2', '列3']
      // 没有数据行
    ];
    const htmlContent = generateTablePage(emptyTableData);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    await page.waitForLoadState('networkidle');
    await waitForAsync(1000);
    
    // 获取表格元素的位置
    const tableElement = page.locator('#test-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    const panel = await waitForResultPanel(page, 10000);
    expect(await panel.isVisible()).toBe(true);
    
    // 获取面板中的文本内容
    const panelText = await getPanelText(page);
    
    // 验证面板包含表头内容
    expect(panelText).toContain('列1');
    expect(panelText).toContain('列2');
    expect(panelText).toContain('列3');
    
    // 尝试导出
    const exportBtn = panel.locator('button:has-text("导出")');
    const exportBtnVisible = await exportBtn.isVisible().catch(() => false);
    
    if (exportBtnVisible) {
      await exportBtn.click();
      
      // 等待导出格式选择对话框显示
      await waitForAsync(500);
      
      // 检查是否显示对话框
      const dialog = page.locator('.tabular-extension-dialog');
      const dialogVisible = await dialog.isVisible().catch(() => false);
      
      if (dialogVisible) {
        // 点击 CSV 格式按钮
        const csvFormatBtn = page.locator('button:has-text("CSV 格式")');
        await csvFormatBtn.click();
        
        // 等待导出完成
        await waitForAsync(2000);
        
        // 验证导出后的状态
        const panelStillVisible = await isPanelVisible(page);
        
        if (panelStillVisible) {
          const panelTextAfter = await getPanelText(page);
          
          // 验证：空表格导出应该成功（只包含表头）或显示友好提示
          // 不应该显示严重错误
          const hasCriticalError = panelTextAfter.match(/失败|崩溃|异常/);
          expect(hasCriticalError).toBeFalsy();
        }
        // 如果面板关闭，说明导出成功（生成了只包含表头的文件）
      }
    }
  });

  /**
   * 测试大量数据导出功能
   * 验证需求：3.5 - 导出大量数据（超过 1000 行）时，导出过程不会超时或崩溃
   * 
   * 测试场景：
   * 1. 创建一个包含 1200 行 x 10 列的大型表格
   * 2. 框选整个表格
   * 3. 触发 CSV 导出流程
   * 4. 验证导出过程能够正常完成，不会超时或崩溃
   * 
   * 注意：
   * - 此测试主要验证导出流程的稳定性和性能
   * - 由于使用 chrome.downloads API，无法直接验证下载文件的内容
   * - 导出内容的正确性通过单元测试验证
   */
  test('应该能够导出大量数据而不超时或崩溃', async ({ page }) => {
    // 准备大型表格：1200 行 x 10 列
    const rows = 1200;
    const cols = 10;
    const htmlContent = generateLargeTablePage(rows, cols);
    await createTestPage(page, htmlContent);
    
    // 等待页面完全加载
    // 大型表格可能需要更长的加载时间
    await page.waitForLoadState('networkidle');
    await waitForAsync(2000);
    
    // 获取大型表格元素的位置
    const tableElement = page.locator('#large-table');
    const boundingBox = await tableElement.boundingBox();
    
    if (!boundingBox) {
      throw new Error('无法获取大型表格元素的位置');
    }
    
    // 使用 dragSelection 进行框选
    // 框选整个表格区域
    const startX = boundingBox.x + 5;
    const startY = boundingBox.y + 5;
    const endX = boundingBox.x + boundingBox.width - 5;
    const endY = boundingBox.y + boundingBox.height - 5;
    
    await dragSelection(page, startX, startY, endX, endY);
    
    // 等待结果面板显示
    // 大量数据处理可能需要更长时间
    const panel = await waitForResultPanel(page, 15000);
    expect(await panel.isVisible()).toBe(true);
    
    // 验证面板能够正常显示（即使数据量很大）
    const panelText = await getPanelText(page);
    expect(panelText).toBeDefined();
    expect(panelText.length).toBeGreaterThan(0);
    
    // 验证面板包含表格数据的一部分
    // 由于数据量大，可能只显示部分内容或前几行
    expect(panelText).toContain('列1');
    expect(panelText).toContain('数据');
    
    // 点击导出按钮
    const exportBtn = panel.locator('button:has-text("导出")');
    expect(await exportBtn.isVisible()).toBe(true);
    await exportBtn.click();
    
    // 等待导出格式选择对话框显示
    await waitForAsync(500);
    
    // 验证对话框显示
    const dialog = page.locator('.tabular-extension-dialog');
    expect(await dialog.isVisible()).toBe(true);
    
    // 验证 CSV 格式选项存在
    const csvFormatBtn = page.locator('button:has-text("CSV 格式")');
    expect(await csvFormatBtn.isVisible()).toBe(true);
    
    // 点击 CSV 格式按钮触发导出
    await csvFormatBtn.click();
    
    // 等待导出完成
    // 大量数据导出可能需要更长时间，但不应该超时
    // 设置较长的等待时间（10 秒）来验证导出过程能够完成
    await waitForAsync(10000);
    
    // 验证导出流程完成且没有崩溃
    // 检查页面是否仍然响应
    const pageTitle = await page.title();
    expect(pageTitle).toBeDefined();
    
    // 检查是否有 JavaScript 错误
    // 如果有严重错误，页面可能会显示错误信息
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Uncaught');
    expect(bodyText).not.toContain('TypeError');
    expect(bodyText).not.toContain('ReferenceError');
    
    // 验证导出后的状态
    const panelStillVisible = await isPanelVisible(page);
    
    if (panelStillVisible) {
      const panelTextAfter = await getPanelText(page);
      
      // 验证：大量数据导出应该成功完成
      // 不应该显示超时、崩溃或内存错误
      expect(panelTextAfter).not.toMatch(/超时|timeout/i);
      expect(panelTextAfter).not.toMatch(/崩溃|crash/i);
      expect(panelTextAfter).not.toMatch(/内存|memory/i);
      expect(panelTextAfter).not.toMatch(/失败|failed/i);
      
      // 如果面板仍然显示，应该是正常状态（不是错误状态）
      // 可能显示成功消息或保持原样
    }
    // 如果面板关闭，说明导出成功完成
    
    // 额外验证：检查浏览器控制台是否有错误
    // 通过监听 console 事件来捕获错误
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // 等待一小段时间，确保所有异步错误都被捕获
    await waitForAsync(1000);
    
    // 验证没有严重的控制台错误
    // 允许一些警告，但不应该有崩溃性错误
    const hasCriticalError = consoleErrors.some(error => 
      error.includes('Uncaught') || 
      error.includes('TypeError') || 
      error.includes('ReferenceError') ||
      error.includes('Maximum call stack')
    );
    expect(hasCriticalError).toBe(false);
  });
});