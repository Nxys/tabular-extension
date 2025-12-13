// 生成简单的 PNG 图标文件
// 使用 Canvas API 创建图标并保存为 PNG

const fs = require('fs');
const path = require('path');

// 创建 Canvas（需要 node-canvas 或在浏览器中运行）
function createIcon(size) {
  // 创建一个简单的 SVG 字符串
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- 背景 -->
      <rect width="${size}" height="${size}" rx="${size/8}" fill="url(#bg)"/>
      
      <!-- 选择框 -->
      <rect x="${size*0.2}" y="${size*0.25}" width="${size*0.6}" height="${size*0.5}" 
            fill="none" 
            stroke="rgba(255,255,255,0.8)" 
            stroke-width="${Math.max(1, size/32)}" 
            stroke-dasharray="${size/16},${size/32}" 
            rx="${size/32}"/>
      
      <!-- 文本线条 -->
      <rect x="${size*0.3}" y="${size*0.35}" width="${size*0.4}" height="${size/16}" fill="rgba(255,255,255,0.9)" rx="${size/64}"/>
      <rect x="${size*0.3}" y="${size*0.45}" width="${size*0.3}" height="${size/16}" fill="rgba(255,255,255,0.9)" rx="${size/64}"/>
      <rect x="${size*0.3}" y="${size*0.55}" width="${size*0.35}" height="${size/16}" fill="rgba(255,255,255,0.9)" rx="${size/64}"/>
      
      <!-- 复制图标 -->
      <g transform="translate(${size*0.7}, ${size*0.15})">
        <rect x="0" y="0" width="${size*0.15}" height="${size*0.15}" fill="rgba(255,255,255,0.9)" rx="${size/64}"/>
        <rect x="${size*0.03}" y="${size*0.03}" width="${size*0.09}" height="${size*0.09}" fill="rgba(102,126,234,0.8)" rx="${size/128}"/>
      </g>
    </svg>
  `;
  
  return svg;
}

// 生成所有尺寸的图标
const sizes = [16, 32, 48, 128];
const outputDir = './res/assets';

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('生成 SVG 图标文件...');

sizes.forEach(size => {
  const svg = createIcon(size);
  const filename = `icon${size}.svg`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, svg);
  console.log(`✓ 生成 ${filename}`);
});

console.log('\n📝 说明:');
console.log('1. SVG 图标已生成，Chrome 扩展支持 SVG 格式');
console.log('2. 如需 PNG 格式，请使用在线转换工具或图像编辑软件');
console.log('3. 推荐工具: https://convertio.co/svg-png/');
console.log('\n✅ 图标生成完成！');