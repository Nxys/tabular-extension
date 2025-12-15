// 合并脚本
// 将 TypeScript 编译后的模块合并为单个 content.js 文件

const fs = require('fs');

// 输出文件路径
const outputFile = './build/extension/content.js';

// 读取所有需要的文件（按依赖顺序）
const files = [
  'build/dist/types.js',
  'build/dist/components/selection.js',
  'build/dist/components/extractor.js',
  'build/dist/components/panel.js',
  'build/dist/content.js'
];

let bundleContent = `// 浏览器框选复制插件 - 合并后的 Content Script
// 自动生成，请勿手动编辑

`;

// 处理每个文件
files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // 移除 import/export 语句
    content = content.replace(/^import.*?;$/gm, '');
    content = content.replace(/^export\s+/gm, '');
    content = content.replace(/\/\/# sourceMappingURL=.*$/gm, '');
    
    bundleContent += `// === ${filePath} ===\n`;
    bundleContent += content + '\n\n';
  }
});

// 初始化代码已在 content.js 中，无需额外添加

// 写入输出文件
fs.writeFileSync(outputFile, bundleContent);
console.log(`内容脚本已生成: ${outputFile}`);

