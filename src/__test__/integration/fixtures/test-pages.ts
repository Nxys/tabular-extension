/**
 * 测试页面生成器
 * 为 E2E 测试提供各种测试场景的 HTML 页面
 */

/**
 * 生成包含简单表格的测试页面
 */
export function generateTablePage(tableData: string[][]): string {
  const rows = tableData.map(row => 
    `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
  ).join('\n');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>表格测试页面</title>
    <style>
        table { border-collapse: collapse; margin: 20px; }
        td, th { border: 1px solid #ccc; padding: 8px; }
        .test-content { margin: 20px; }
    </style>
</head>
<body>
    <div class="test-content">
        <h1>测试表格</h1>
        <table id="test-table">
            ${rows}
        </table>
        <p>这是一些额外的文本内容，用于测试文本提取功能。</p>
    </div>
</body>
</html>`;
}

/**
 * 生成包含复杂表格的测试页面
 */
export function generateComplexTablePage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>复杂表格测试页面</title>
    <style>
        table { border-collapse: collapse; margin: 20px; width: 80%; }
        td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; font-weight: bold; }
        .nested-table { margin: 0; width: 100%; }
        .nested-table td { border: 1px solid #999; }
    </style>
</head>
<body>
    <div class="test-content">
        <h1>复杂表格测试</h1>
        
        <!-- 带表头的表格 -->
        <table id="header-table">
            <thead>
                <tr>
                    <th>姓名</th>
                    <th>年龄</th>
                    <th>城市</th>
                    <th>职业</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>张三</td>
                    <td>25</td>
                    <td>北京</td>
                    <td>工程师</td>
                </tr>
                <tr>
                    <td>李四</td>
                    <td>30</td>
                    <td>上海</td>
                    <td>设计师</td>
                </tr>
            </tbody>
        </table>

        <!-- 嵌套表格 -->
        <table id="nested-table">
            <tr>
                <td>外层单元格1</td>
                <td>
                    <table class="nested-table">
                        <tr><td>内层A1</td><td>内层B1</td></tr>
                        <tr><td>内层A2</td><td>内层B2</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <!-- 不规则表格 -->
        <table id="irregular-table">
            <tr>
                <td rowspan="2">合并行</td>
                <td>普通单元格1</td>
                <td>普通单元格2</td>
            </tr>
            <tr>
                <td colspan="2">合并列</td>
            </tr>
        </table>
    </div>
</body>
</html>`;
}

/**
 * 生成纯文本测试页面
 */
export function generateTextPage(content: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>文本测试页面</title>
    <style>
        .test-content { margin: 20px; line-height: 1.6; }
        .selectable { background-color: #f0f8ff; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="test-content">
        <h1>文本提取测试</h1>
        <div class="selectable" id="test-text">
            ${content}
        </div>
        <p>这是页面上的其他内容，不应该被选中。</p>
    </div>
</body>
</html>`;
}

/**
 * 生成混合内容测试页面
 */
export function generateMixedContentPage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>混合内容测试页面</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; margin: 20px 0; }
        td, th { border: 1px solid #ccc; padding: 8px; }
        .text-block { background: #f9f9f9; padding: 15px; margin: 10px 0; }
        .data-list { list-style-type: none; padding: 0; }
        .data-list li { background: #e8f4f8; margin: 5px 0; padding: 8px; }
    </style>
</head>
<body>
    <h1>混合内容测试页面</h1>
    
    <div class="text-block">
        <h2>产品信息</h2>
        <p>这是一个包含多种数据格式的测试页面，用于验证插件在复杂场景下的表现。</p>
    </div>

    <table id="product-table">
        <tr>
            <th>产品名称</th>
            <th>价格</th>
            <th>库存</th>
        </tr>
        <tr>
            <td>笔记本电脑</td>
            <td>¥5,999</td>
            <td>15</td>
        </tr>
        <tr>
            <td>无线鼠标</td>
            <td>¥199</td>
            <td>50</td>
        </tr>
    </table>

    <ul class="data-list">
        <li>特性1: 高性能处理器</li>
        <li>特性2: 长续航电池</li>
        <li>特性3: 轻薄便携设计</li>
    </ul>

    <div class="text-block">
        <h3>技术规格</h3>
        <p>处理器: Intel Core i7-12700H<br>
        内存: 16GB DDR4<br>
        存储: 512GB SSD<br>
        显卡: NVIDIA RTX 3060</p>
    </div>
</body>
</html>`;
}