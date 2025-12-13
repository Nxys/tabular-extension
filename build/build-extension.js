// 构建 Chrome 扩展的脚本
// 将 TypeScript 编译后的模块合并为单个文件

import fs from 'fs';
import path from 'path';

// 读取编译后的文件
const distDir = './build/dist';
const outputFile = './build/package/content.js';

// 读取所有需要的文件
const files = [
  'build/dist/types.js',
  'build/dist/content.js',
  'build/dist/main.js'
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

// 添加初始化代码
bundleContent += `
// === 初始化代码 ===
(function() {
  // 检查是否已经初始化过
  if (window.browserSelectionCopyController) {
    return;
  }

  try {
    // 创建主控制器实例
    const controller = new MainController();
    
    // 将控制器实例保存到全局，避免重复初始化
    window.browserSelectionCopyController = controller;
    
    // 初始化控制器
    controller.initialize();
    
    console.log('浏览器框选复制插件已初始化');
  } catch (error) {
    console.error('插件初始化失败:', error);
  }
})();
`;

// 写入输出文件
fs.writeFileSync(outputFile, bundleContent);
console.log(`内容脚本已生成: ${outputFile}`);