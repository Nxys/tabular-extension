// 将插件文件夹打包为 ZIP 文件脚本

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const extensionDir = './build/extension';
const zipFile = './build/extension.zip';

console.log('📦 创建 ZIP 包...');

try {
  // 检查扩展目录是否存在
  if (!fs.existsSync(extensionDir)) {
    throw new Error(`扩展目录不存在: ${extensionDir}，请先运行 npm run extension`);
  }

  // 删除旧的 ZIP 文件
  if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
  }

  // 使用系统的 zip 命令创建压缩包
  const zipCommand = `cd ${extensionDir} && zip -r ../${path.basename(zipFile)} .`;
  execSync(zipCommand, { stdio: 'inherit' });

  // 验证 ZIP 文件
  if (fs.existsSync(zipFile)) {
    const stats = fs.statSync(zipFile);
    console.log(`✓ ZIP 包创建成功: ${zipFile} (${Math.round(stats.size / 1024)} KB)`);
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
  } else {
    throw new Error('ZIP 文件创建失败');
  }

} catch (error) {
  console.error('❌ ZIP 包创建失败:', error.message);
  console.log('\n💡 尝试手动创建 ZIP 包:');
  console.log(`请手动将 ${extensionDir} 目录中的所有文件压缩为 ${zipFile}`);
  process.exit(1);
}
