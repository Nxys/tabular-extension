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


/**
 * 生成包含特殊字符的文本页面
 * @param includeHtmlEntities 是否包含 HTML 实体（如 &lt;, &gt;, &amp;, &quot;, &apos;）
 * @param includeUnicode 是否包含 Unicode 字符（如中文、日文、韩文、特殊符号）
 * @param includeEmoji 是否包含 Emoji 表情符号
 * @returns HTML 页面字符串
 */
export function generateSpecialCharPage(
  includeHtmlEntities: boolean = true,
  includeUnicode: boolean = true,
  includeEmoji: boolean = true
): string {
  let content = '基础文本内容';
  
  if (includeHtmlEntities) {
    content += '<br>&lt;div&gt;HTML实体&lt;/div&gt; &amp; &quot;引号&quot; &apos;单引号&apos; &nbsp;空格&nbsp;';
  }
  
  if (includeUnicode) {
    content += '<br>Unicode: \u4E2D\u6587 \u65E5\u672C\u8A9E \uD55C\uAD6D\uC5B4 \u00A9 \u00AE \u2122';
  }
  
  if (includeEmoji) {
    content += '<br>Emoji: 😀 🎉 🚀 ❤️ 👍 🌟 💻 📱 🔥 ✨';
  }

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>特殊字符测试页面</title>
    <style>
        .test-content { margin: 20px; line-height: 1.8; }
    </style>
</head>
<body>
    <div class="test-content" id="special-text">
        ${content}
    </div>
</body>
</html>`;
}

/**
 * 生成大型表格页面
 */
export function generateLargeTablePage(rows: number, cols: number): string {
  const headerCells = Array(cols).fill(0).map((_, i) => `<th>列${i + 1}</th>`).join('');
  const dataRows = Array(rows).fill(0).map((_, i) => {
    const cells = Array(cols).fill(0).map((_, j) => `<td>数据${i + 1}-${j + 1}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n');

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>大型表格测试页面</title>
    <style>
        table { border-collapse: collapse; margin: 20px; }
        td, th { border: 1px solid #ccc; padding: 4px; font-size: 12px; }
        th { background-color: #f5f5f5; }
    </style>
</head>
<body>
    <h1>大型表格测试 (${rows} 行 x ${cols} 列)</h1>
    <table id="large-table">
        <thead>
            <tr>${headerCells}</tr>
        </thead>
        <tbody>
            ${dataRows}
        </tbody>
    </table>
</body>
</html>`;
}

/**
 * 生成空白页面
 */
export function generateEmptyPage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>空白测试页面</title>
</head>
<body>
    <div id="empty-content"></div>
</body>
</html>`;
}

/**
 * 生成包含动态内容的页面
 */
export function generateDynamicPage(
  initialContent: string,
  dynamicContent: string
): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>动态内容测试页面</title>
    <style>
        .content { margin: 20px; padding: 15px; border: 1px solid #ddd; }
        button { margin: 10px; padding: 8px 16px; }
    </style>
</head>
<body>
    <div class="content" id="dynamic-content">${initialContent}</div>
    <button id="add-content">添加内容</button>
    <script>
        document.getElementById('add-content').onclick = function() {
            document.getElementById('dynamic-content').innerHTML += '${dynamicContent}';
        };
    </script>
</body>
</html>`;
}

/**
 * 生成包含 iframe 的页面
 */
export function generateIframePage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Iframe 测试页面</title>
    <style>
        .container { margin: 20px; }
        iframe { border: 1px solid #ccc; width: 600px; height: 400px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>主页面内容</h1>
        <p id="main-text">这是主页面的文本内容</p>
        <iframe id="test-iframe" srcdoc="<html><body><p>这是 iframe 中的内容</p></body></html>"></iframe>
    </div>
</body>
</html>`;
}

/**
 * 生成包含 Shadow DOM 的页面
 */
export function generateShadowDOMPage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Shadow DOM 测试页面</title>
    <style>
        .container { margin: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Shadow DOM 测试</h1>
        <div id="shadow-host"></div>
    </div>
    <script>
        const host = document.getElementById('shadow-host');
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<p id="shadow-text">这是 Shadow DOM 中的内容</p>';
    </script>
</body>
</html>`;
}
