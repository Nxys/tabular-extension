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
        <p>这是页面上的其他内容，不应要被选中。</p>
    </div>
</body>
</html>`;
}

/**
 * 生成多行文本测试页面
 * 用于测试换行符和格式保留
 */
export function generateMultilineTextPage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>多行文本测试页面</title>
    <style>
        .test-content { margin: 20px; line-height: 1.6; }
        .multiline-text { 
            background-color: #f0f8ff; 
            padding: 15px; 
            margin: 10px 0;
            white-space: pre-wrap;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="test-content">
        <h1>多行文本提取测试</h1>
        <div class="multiline-text" id="multiline-text">第一行文本
第二行文本
第三行文本

第五行文本（前面有空行）</div>
        <p>这是页面上的其他内容。</p>
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

/**
 * 生成包含嵌套 HTML 标签的文本页面
 * 用于测试提取纯文本时是否正确去除所有 HTML 标签
 */
export function generateNestedTagsPage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>嵌套标签测试页面</title>
    <style>
        .test-content { margin: 20px; line-height: 1.6; }
        .nested-content { 
            background-color: #f0f8ff; 
            padding: 15px; 
            margin: 10px 0;
        }
        strong { font-weight: bold; }
        em { font-style: italic; }
        .highlight { background-color: yellow; }
    </style>
</head>
<body>
    <div class="test-content">
        <h1>嵌套标签提取测试</h1>
        <div class="nested-content" id="nested-tags">
            这是<strong>加粗的<em>斜体的<span class="highlight">高亮的</span>文本</em>内容</strong>，
            包含<a href="#">链接<span>中的<b>嵌套</b>标签</span></a>，
            以及<div>块级<p>元素<span>中的<i>多层</i>嵌套</span>标签</p></div>。
        </div>
        <p>这是页面上的其他内容。</p>
    </div>
</body>
</html>`;
}

/**
 * 生成包含格式错误 HTML 的页面
 * 用于测试插件的容错能力
 * 包括：未闭合标签、错误嵌套、缺少必要属性等
 */
export function generateMalformedHTMLPage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>格式错误 HTML 测试页面</title>
    <style>
        .test-content { margin: 20px; }
        table { border-collapse: collapse; margin: 10px 0; }
        td, th { border: 1px solid #ccc; padding: 8px; }
    </style>
</head>
<body>
    <div class="test-content">
        <h1>格式错误 HTML 测试</h1>
        
        <!-- 未闭合的标签 -->
        <div id="unclosed-tags">
            <p>这是一个段落
            <span>这是一个未闭合的 span
            <strong>这是未闭合的 strong
        </div>
        
        <!-- 错误嵌套的标签 -->
        <div id="wrong-nesting">
            <p>段落开始<div>块级元素错误嵌套在段落中</p></div>
            <b><i>粗体和斜体</b></i>
        </div>
        
        <!-- 格式错误的表格 -->
        <table id="malformed-table">
            <tr>
                <td>正常单元格</td>
                <td>未闭合单元格
            </tr>
            <tr>
                <td>第二行第一列
                <td>第二行第二列</td>
            <!-- 缺少 </tr> -->
            <tr>
                <th>表头在错误位置
                <td>混合使用 th 和 td</td>
            </tr>
        </table>
        
        <!-- 空标签和自闭合标签 -->
        <div id="empty-tags">
            <p></p>
            <span></span>
            <div><br><hr></div>
        </div>
        
        <!-- 特殊字符未转义 -->
        <div id="unescaped-chars">
            <p>未转义的字符: < > & " '</p>
        </div>
        
        <!-- 错误的属性 -->
        <div id="invalid-attrs">
            <table border="invalid" cellspacing="abc">
                <tr>
                    <td colspan="not-a-number">错误的 colspan</td>
                    <td rowspan="-1">负数 rowspan</td>
                </tr>
            </table>
        </div>
    </div>
</body>
</html>`;
}

/**
 * 生成包含非表格内容的页面
 * 用于测试系统不会将非表格结构误判为表格
 * 包括：列表、div 布局、段落、卡片布局等
 */
export function generateNonTableContentPage(): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>非表格内容测试页面</title>
    <style>
        .test-content { margin: 20px; }
        
        /* 列表样式 */
        .list-container { 
            background-color: #f5f5f5; 
            padding: 15px; 
            margin: 10px 0;
        }
        ul, ol { margin: 10px 0; padding-left: 20px; }
        li { margin: 5px 0; }
        
        /* Div 布局样式 */
        .grid-layout {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin: 10px 0;
        }
        .grid-item {
            background-color: #e8f4f8;
            padding: 15px;
            border: 1px solid #ccc;
        }
        
        /* 卡片布局样式 */
        .card-container {
            display: flex;
            gap: 15px;
            margin: 10px 0;
        }
        .card {
            flex: 1;
            background-color: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .card-title { font-weight: bold; margin-bottom: 8px; }
        .card-content { color: #666; }
        
        /* 段落样式 */
        .paragraph-container {
            background-color: #f9f9f9;
            padding: 15px;
            margin: 10px 0;
        }
        p { margin: 10px 0; line-height: 1.6; }
    </style>
</head>
<body>
    <div class="test-content">
        <h1>非表格内容测试</h1>
        
        <!-- 无序列表 -->
        <div class="list-container" id="unordered-list">
            <h3>产品特性（无序列表）</h3>
            <ul>
                <li>高性能处理器</li>
                <li>长续航电池</li>
                <li>轻薄便携设计</li>
                <li>全高清显示屏</li>
            </ul>
        </div>
        
        <!-- 有序列表 -->
        <div class="list-container" id="ordered-list">
            <h3>安装步骤（有序列表）</h3>
            <ol>
                <li>下载安装包</li>
                <li>运行安装程序</li>
                <li>按照向导完成安装</li>
                <li>重启计算机</li>
            </ol>
        </div>
        
        <!-- Div 网格布局 -->
        <div id="grid-layout">
            <h3>产品信息（网格布局）</h3>
            <div class="grid-layout">
                <div class="grid-item">
                    <strong>产品名称</strong><br>
                    笔记本电脑
                </div>
                <div class="grid-item">
                    <strong>价格</strong><br>
                    ¥5,999
                </div>
                <div class="grid-item">
                    <strong>库存</strong><br>
                    15 台
                </div>
                <div class="grid-item">
                    <strong>品牌</strong><br>
                    ThinkPad
                </div>
                <div class="grid-item">
                    <strong>型号</strong><br>
                    X1 Carbon
                </div>
                <div class="grid-item">
                    <strong>颜色</strong><br>
                    黑色
                </div>
            </div>
        </div>
        
        <!-- 卡片布局 -->
        <div id="card-layout">
            <h3>团队成员（卡片布局）</h3>
            <div class="card-container">
                <div class="card">
                    <div class="card-title">张三</div>
                    <div class="card-content">
                        职位：前端工程师<br>
                        经验：5年<br>
                        技能：React, Vue, TypeScript
                    </div>
                </div>
                <div class="card">
                    <div class="card-title">李四</div>
                    <div class="card-content">
                        职位：后端工程师<br>
                        经验：7年<br>
                        技能：Node.js, Python, Go
                    </div>
                </div>
                <div class="card">
                    <div class="card-title">王五</div>
                    <div class="card-content">
                        职位：UI设计师<br>
                        经验：4年<br>
                        技能：Figma, Sketch, Photoshop
                    </div>
                </div>
            </div>
        </div>
        
        <!-- 段落文本 -->
        <div class="paragraph-container" id="paragraphs">
            <h3>产品描述（段落）</h3>
            <p>这是一款高性能的商务笔记本电脑，专为专业人士设计。</p>
            <p>采用最新的处理器技术，提供卓越的性能和能效比。</p>
            <p>轻薄的机身设计，让您随时随地高效工作。</p>
            <p>配备全高清显示屏，呈现清晰细腻的画面。</p>
        </div>
        
        <!-- Div 布局（类似表格但不是表格） -->
        <div id="div-table-like">
            <h3>规格参数（Div 布局）</h3>
            <div style="display: flex; border: 1px solid #ccc; padding: 8px; background: #f5f5f5;">
                <div style="flex: 1; font-weight: bold;">处理器</div>
                <div style="flex: 2;">Intel Core i7-12700H</div>
            </div>
            <div style="display: flex; border: 1px solid #ccc; border-top: none; padding: 8px;">
                <div style="flex: 1; font-weight: bold;">内存</div>
                <div style="flex: 2;">16GB DDR4</div>
            </div>
            <div style="display: flex; border: 1px solid #ccc; border-top: none; padding: 8px;">
                <div style="flex: 1; font-weight: bold;">存储</div>
                <div style="flex: 2;">512GB SSD</div>
            </div>
            <div style="display: flex; border: 1px solid #ccc; border-top: none; padding: 8px;">
                <div style="flex: 1; font-weight: bold;">显卡</div>
                <div style="flex: 2;">NVIDIA RTX 3060</div>
            </div>
        </div>
    </div>
</body>
</html>`;
}
