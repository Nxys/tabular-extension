// 生成插件文件夹脚本
// 创建用于加载到 Chrome 扩展调试的扩展文件夹

const fs = require('fs');
const path = require('path');

const extensionDir = './build/extension';

console.log('开始生成插件文件夹...');


// 1. 清理并创建扩展目录
if (fs.existsSync(extensionDir)) {
  fs.rmSync(extensionDir, { recursive: true });
}
fs.mkdirSync(extensionDir);

// 确保子目录存在
const contentDir = path.join(extensionDir, 'content');
const popupDir = path.join(extensionDir, 'popup');
const imagesDir = path.join(extensionDir, 'images');
fs.mkdirSync(contentDir, { recursive: true });
fs.mkdirSync(popupDir, { recursive: true });
fs.mkdirSync(imagesDir, { recursive: true });


// 2. 复制必要的文件到扩展目录
console.log('复制扩展文件...');

const filesToCopy = [
  { src: 'src/manifest.json', dest: 'manifest.json' },
  { src: 'build/dist/background.js', dest: 'background.js' },
  { src: 'build/dist/popup/popup.js', dest: 'popup/popup.js' },
  { src: 'src/popup/popup.html', dest: 'popup/popup.html' },
  { src: 'build/dist/content/content.js', dest: 'content/content.js' },
  { src: 'src/content/content.css', dest: 'content/content.css' },
];

filesToCopy.forEach(fileConfig => {
  const { src, dest } = fileConfig;
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(extensionDir, dest));
    console.log(`✓ 复制 ${src} -> ${dest}`);
  } else {
    console.error(`❌ 文件不存在: ${src}`);
    process.exit(1);
  }
});


// 3. 复制图标文件
console.log('复制图标文件...');
const iconSizes = [16, 32, 48, 128];
iconSizes.forEach(size => {
  const iconFile = `icon${size}.png`;
  const srcPath = path.join('src/images', iconFile);
  const destPath = path.join(imagesDir, iconFile);

  if (fs.existsSync(srcPath)) {
    fs.renameSync(srcPath, destPath);
    console.log(`✓ 复制 ${iconFile}`);
  } else {
    console.error(`❌ 图标文件不存在: ${srcPath}`);
    process.exit(1);
  }
});


// 4. 验证必要文件
console.log('验证扩展文件...');
const requiredFiles = [
  'manifest.json',
  'background.js',
  'content/content.js',
  'content/content.css',
  'popup/popup.html',
  'popup/popup.js'
];
requiredFiles.forEach(file => {
  const filePath = path.join(extensionDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${file} (${stats.size} bytes)`);
  } else {
    console.error(`❌ 缺少必要文件: ${file}`);
    process.exit(1);
  }
});

// 5. 显示完成信息
console.log('\n=== 插件文件夹生成完成 ===');
console.log(`📁 扩展文件夹: ${extensionDir}/`);
console.log('\n💡 提示: 运行 npm run zip 将插件打包为 ZIP 文件');
