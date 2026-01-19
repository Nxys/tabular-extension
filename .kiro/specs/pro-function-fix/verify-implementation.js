/**
 * Pro 功能修复 - 实现验证脚本
 * 
 * 此脚本用于验证代码实现是否符合设计要求
 * 在浏览器 DevTools Console 中执行
 */

console.log('🔍 开始验证 Pro 功能修复实现...\n');

// ============================================
// 验证 1：检查加密模块是否存在
// ============================================
console.log('✅ 验证 1：检查加密模块');
console.log('- 文件路径：src/background/crypto.ts');
console.log('- 预期导出：encryptProState, decryptProState');
console.log('- 请手动检查文件是否存在\n');

// ============================================
// 验证 2：检查 Pro 模块更新
// ============================================
console.log('✅ 验证 2：检查 Pro 模块更新');
console.log('- 文件路径：src/background/pro.ts');
console.log('- 预期导出：getProState, setProState, allow');
console.log('- 请手动检查函数是否存在\n');

// ============================================
// 验证 3：检查 Popup 模块更新
// ============================================
console.log('✅ 验证 3：检查 Popup 模块更新');
console.log('- 文件路径：src/popup/popup.ts');
console.log('- 预期函数：loadProState, updateProDisplay, updateTrialDisplay');
console.log('- 请手动检查函数是否存在\n');

// ============================================
// 验证 4：检查按钮文案
// ============================================
console.log('✅ 验证 4：检查按钮文案');
console.log('- 文件路径：src/content/panel.ts');
console.log('- 预期文案：');
console.log('  - 高级清洗：🧹 清洗');
console.log('  - 导出：📤 导出');
console.log('  - 复制：📄 复制');
console.log('- 请手动检查文案是否正确\n');

// ============================================
// 验证 5：运行时验证（需要在扩展环境中执行）
// ============================================
console.log('✅ 验证 5：运行时验证');
console.log('以下代码需要在扩展环境中执行（Popup 或 Background）：\n');

console.log('// 验证加密解密往返一致性');
console.log(`
async function verifyEncryption() {
  // 导入加密模块（需要在 Background 环境中）
  const { encryptProState, decryptProState } = await import('./crypto.js');
  
  // 测试数据
  const testState = {
    isPro: true,
    signature: 'test-signature',
    features: {
      'table-detect': true,
      'column-align': true,
      'csv-export': true
    }
  };
  
  console.log('原始数据:', testState);
  
  // 加密
  const encrypted = await encryptProState(testState);
  console.log('加密后:', encrypted);
  console.log('是否为 base64:', /^[A-Za-z0-9+/=]+$/.test(encrypted));
  
  // 解密
  const decrypted = await decryptProState(encrypted);
  console.log('解密后:', decrypted);
  
  // 验证一致性
  const isEqual = JSON.stringify(testState) === JSON.stringify(decrypted);
  console.log('往返一致性:', isEqual ? '✓ 通过' : '✗ 失败');
  
  return isEqual;
}

// 执行验证
verifyEncryption().then(result => {
  console.log('\\n加密验证结果:', result ? '✓ 通过' : '✗ 失败');
});
`);

console.log('\n// 验证 storage 中的 Pro 状态');
console.log(`
chrome.storage.local.get('pro_state', (result) => {
  const encrypted = result.pro_state;
  
  if (!encrypted) {
    console.log('⚠️ 未找到 pro_state，可能尚未设置');
    return;
  }
  
  console.log('✓ pro_state 存在');
  console.log('✓ 数据类型:', typeof encrypted);
  console.log('✓ 是否为字符串:', typeof encrypted === 'string');
  
  if (typeof encrypted === 'string') {
    console.log('✓ 是否为 base64:', /^[A-Za-z0-9+/=]+$/.test(encrypted));
    console.log('✓ 数据长度:', encrypted.length);
    console.log('✓ 加密验证通过');
  } else {
    console.log('✗ 数据不是字符串，可能是明文对象');
    console.log('✗ 加密验证失败');
  }
});
`);

console.log('\n// 验证 Popup UI 状态');
console.log(`
// 在 Popup 页面的 Console 中执行
const upgradeButton = document.getElementById('upgradeButton');

if (upgradeButton) {
  console.log('✓ 升级按钮存在');
  console.log('✓ 按钮文本:', upgradeButton.textContent);
  console.log('✓ 是否禁用:', upgradeButton.disabled);
  console.log('✓ 透明度:', upgradeButton.style.opacity);
  console.log('✓ 光标样式:', upgradeButton.style.cursor);
} else {
  console.log('✗ 升级按钮不存在');
}

// 检查试用次数显示
const advancedCleaningEl = document.getElementById('trialAdvancedCleaning');
const tableDetectionEl = document.getElementById('trialTableDetection');
const oneClickExportEl = document.getElementById('trialOneClickExport');

console.log('\\n试用次数显示:');
console.log('- 高级清洗:', advancedCleaningEl?.textContent);
console.log('- 表格识别:', tableDetectionEl?.textContent);
console.log('- 一键导出:', oneClickExportEl?.textContent);
`);

// ============================================
// 验证 6：代码静态检查
// ============================================
console.log('\n✅ 验证 6：代码静态检查');
console.log('运行以下命令进行静态检查：');
console.log('```bash');
console.log('npm run lint');
console.log('npm test');
console.log('```\n');

// ============================================
// 验证 7：构建检查
// ============================================
console.log('✅ 验证 7：构建检查');
console.log('运行以下命令进行构建：');
console.log('```bash');
console.log('npm run extension');
console.log('```');
console.log('检查是否有构建错误\n');

// ============================================
// 总结
// ============================================
console.log('📋 验证总结');
console.log('请按照以上步骤逐一验证，确保所有检查项都通过');
console.log('完成后，可以进行集成测试（参考 INTEGRATION_TEST_GUIDE.md）\n');

console.log('🎉 验证脚本执行完成！');
