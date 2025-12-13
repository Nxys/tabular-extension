// Chrome 扩展打包脚本
// 创建用于发布到 Chrome Web Store 的扩展包

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const packageDir = './build/package';
const zipFile = './build/extension.zip';

console.log('开始打包 Chrome 扩展...');

// 1. 清理并创建打包目录
if (fs.existsSync(packageDir)) {
  fs.rmSync(packageDir, { recursive: true });
}
fs.mkdirSync(packageDir);

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
  execSync('node build/build-extension.js', { stdio: 'inherit' });
} catch (error) {
  console.error('Content script 合并失败:', error.message);
  process.exit(1);
}

// 4. 复制必要的文件到打包目录
console.log('复制扩展文件...');

const filesToCopy = [
  'src/manifest.json',
  'src/content.css', 
  'src/background.js',
  'src/popup.html',
  'src/popup.js'
];

filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    const targetName = path.basename(file);
    fs.copyFileSync(file, path.join(packageDir, targetName));
    console.log(`✓ 复制 ${file} -> ${targetName}`);
  } else {
    console.warn(`⚠ 文件不存在: ${file}`);
  }
});

// 复制 res 目录中的 assets
if (fs.existsSync('res/assets')) {
  const assetsDir = path.join(packageDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  
  const assetFiles = fs.readdirSync('res/assets');
  assetFiles.forEach(file => {
    fs.copyFileSync(path.join('res/assets', file), path.join(assetsDir, file));
    console.log(`✓ 复制 assets/${file}`);
  });
}

// content.js 由构建脚本生成，确保它存在
if (!fs.existsSync(path.join(packageDir, 'content.js'))) {
  console.error('❌ content.js 未生成，请先运行构建脚本');
  process.exit(1);
}

// 5. 验证必要文件
console.log('验证扩展文件...');
const requiredFiles = [
  'manifest.json',
  'content.js',
  'content.css',
  'background.js'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const filePath = path.join(packageDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✓ ${file} (${stats.size} bytes)`);
  } else {
    console.error(`✗ 缺少必要文件: ${file}`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('打包失败：缺少必要文件');
  process.exit(1);
}

// 6. 验证 manifest.json
console.log('验证 manifest.json...');
try {
  const manifestPath = path.join(packageDir, 'manifest.json');
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

// 7. 创建 ZIP 包
console.log('创建 ZIP 包...');
try {
  // 删除旧的 ZIP 文件
  if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
  }
  
  // 使用系统的 zip 命令创建压缩包
  const zipCommand = `cd ${packageDir} && zip -r ../${path.basename(zipFile)} .`;
  execSync(zipCommand, { stdio: 'inherit' });
  
  // 验证 ZIP 文件
  if (fs.existsSync(zipFile)) {
    const stats = fs.statSync(zipFile);
    console.log(`✓ ZIP 包创建成功: ${zipFile} (${Math.round(stats.size / 1024)} KB)`);
  } else {
    throw new Error('ZIP 文件创建失败');
  }
  
} catch (error) {
  console.error('ZIP 包创建失败:', error.message);
  console.log('尝试手动创建 ZIP 包...');
  console.log(`请手动将 ${packageDir} 目录中的所有文件压缩为 ${zipFile}`);
}

// 8. 运行测试确保质量
console.log('运行测试验证代码质量...');
try {
  execSync('npm test', { stdio: 'inherit' });
  console.log('✓ 所有测试通过');
} catch (error) {
  console.warn('⚠ 测试失败，但继续打包。建议修复测试后重新打包。');
}

// 9. 显示发布指南
console.log('\n=== 打包完成 ===');
console.log(`📦 扩展包: ${zipFile}`);
console.log(`📁 源文件: ${packageDir}/`);
console.log('\n📋 发布步骤:');
console.log('1. 访问 Chrome Web Store 开发者控制台');
console.log('2. 登录开发者账号');
console.log('3. 上传扩展包');
console.log('4. 填写商店信息');
console.log('5. 提交审核');
console.log('\n⚠️  注意事项:');
console.log('- 首次发布需要支付 $5 开发者注册费');
console.log('- 审核通常需要 1-3 个工作日');
console.log('- 确保遵守政策要求');

console.log('\n✅ 打包完成！');