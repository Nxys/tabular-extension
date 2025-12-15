// 生成插件文件夹脚本
// 创建用于发布到 Chrome Web Store 的扩展文件夹

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extensionDir = './build/extension';

console.log('开始生成插件文件夹...');

// 1. 清理并创建扩展目录
if (fs.existsSync(extensionDir)) {
  fs.rmSync(extensionDir, { recursive: true });
}
fs.mkdirSync(extensionDir);

// 确保 assets 目录存在
const assetsDir = path.join(extensionDir, 'assets');
fs.mkdirSync(assetsDir, { recursive: true });

// 2. 编译 TypeScript
console.log('编译 TypeScript...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (error) {
  console.error('TypeScript 编译失败:', error.message);
  process.exit(1);
}

// 3. 生成合并的 content script
console.log('生成合并的 content script...');
try {
  execSync('node build/merge.cjs', { stdio: 'inherit' });
} catch (error) {
  console.error('Content script 合并失败:', error.message);
  process.exit(1);
}

// 4. 复制必要的文件到扩展目录
console.log('复制扩展文件...');

const filesToCopy = [
  { src: 'src/manifest.json', dest: 'manifest.json' },
  { src: 'src/content.css', dest: 'content.css' },
  { src: 'build/dist/background.js', dest: 'background.js' },
  { src: 'src/popup.html', dest: 'popup.html' },
  { src: 'build/dist/popup.js', dest: 'popup.js' }
];

filesToCopy.forEach(fileConfig => {
  const { src, dest } = fileConfig;
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(extensionDir, dest));
    console.log(`✓ 复制 ${src} -> ${dest}`);
  } else {
    console.warn(`⚠ 文件不存在: ${src}`);
  }
});

// 5. 生成图标文件
console.log('生成图标文件...');
try {
  execSync('node build/icon.cjs', { stdio: 'inherit' });
  console.log('✓ 图标生成完成');
} catch (error) {
  console.error('❌ 图标生成失败:', error.message);
  process.exit(1);
}

// content.js 由构建脚本生成，确保它存在
if (!fs.existsSync(path.join(extensionDir, 'content.js'))) {
  console.error('❌ content.js 未生成，请先运行构建脚本');
  process.exit(1);
}

// 6. 验证必要文件
console.log('验证扩展文件...');
const requiredFiles = [
  'manifest.json',
  'content.js',
  'content.css',
  'background.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(extensionDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${file} (${stats.size} bytes)`);
  } else {
    console.error(`✗ 缺少必要文件: ${file}`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('生成失败：缺少必要文件');
  process.exit(1);
}

// 7. 验证 manifest.json
console.log('验证 manifest.json...');
try {
  const manifestPath = path.join(extensionDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  
  // 检查必要字段
  const requiredFields = ['manifest_version', 'name', 'version', 'description'];
  requiredFields.forEach(field => {
    if (!manifest[field]) {
      throw new Error(`manifest.json 缺少必要字段: ${field}`);
    }
  });
  
  // 检查 manifest v3 规范
  if (manifest.manifest_version !== 3) {
    throw new Error('必须使用 Manifest v3');
  }
  
  console.log(`✓ Manifest v${manifest.manifest_version} 验证通过`);
  console.log(`✓ 扩展名称: ${manifest.name}`);
  console.log(`✓ 版本: ${manifest.version}`);
  
} catch (error) {
  console.error('Manifest 验证失败:', error.message);
  process.exit(1);
}

// 8. 显示完成信息
console.log('\n=== 插件文件夹生成完成 ===');
console.log(`📁 扩展文件夹: ${extensionDir}/`);
console.log('\n💡 提示: 运行 npm run zip 将插件打包为 ZIP 文件');

console.log('\n✅ 生成完成！');
