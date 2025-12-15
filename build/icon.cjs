// 图标生成脚本 - 从 res/icon.html 读取模板并生成 PNG 图标
// 直接生成到 build/extension/assets/ 目录

const fs = require('fs');
const path = require('path');

/**
 * 从 res/icon.html 读取 SVG 模板
 * @returns {string} SVG 模板字符串
 */
function loadIconTemplate() {
  const templatePath = path.join(__dirname, '../res/icon.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`图标模板文件不存在: ${templatePath}`);
  }
  
  const htmlContent = fs.readFileSync(templatePath, 'utf-8');
  
  // 使用正则表达式提取 <script type="text/template"> 中的内容
  const match = htmlContent.match(/<script[^>]*type=["']text\/template["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match || !match[1]) {
    throw new Error('无法从 icon.html 中提取 SVG 模板');
  }
  
  return match[1].trim();
}

/**
 * 从模板创建 SVG 图标内容
 * @param {string} template - SVG 模板字符串
 * @param {number} size - 图标尺寸
 * @returns {string} SVG内容字符串
 */
function createSVGIcon(template, size) {
  // 通用占位符替换：支持任意 {{表达式}}，由 size 和 Math 计算
  const exprPattern = /\{\{([^}]+)\}\}/g;
  const evaluate = (expr) => {
    try {
      // 仅暴露 size 和 Math，减少模板与代码耦合
      // eslint-disable-next-line no-new-func
      const fn = new Function('size', 'Math', `return (${expr});`);
      return fn(size, Math);
    } catch {
      return undefined;
    }
  };

  let svg = template.replace(exprPattern, (match, expr) => {
    const value = evaluate(expr.trim());
    if (typeof value === 'number' && Number.isFinite(value)) {
      // 控制精度，避免长尾小数
      return Number.isInteger(value) ? String(value) : Number(value.toFixed(4)).toString();
    }
    // 未能安全求值则保留原占位符，方便日志检查
    return match;
  });
  
  return svg;
}

/**
 * 使用sharp将SVG转换为PNG
 * @param {string} svgContent - SVG内容
 * @param {number} size - 输出尺寸
 * @returns {Promise<Buffer>} PNG图像Buffer
 */
async function convertSVGToPNG(svgContent, size) {
  try {
    const { default: sharp } = await import('sharp');
    return sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toBuffer();
  } catch (error) {
    throw new Error('sharp包未安装，请运行: npm install --save-dev sharp');
  }
}

/**
 * 生成所有尺寸的图标到指定目录
 * @param {string} outputDir - 输出目录（默认 build/extension/assets）
 * @param {boolean} generatePNG - 是否生成PNG图标
 */
async function generateAllIcons(outputDir = './build/extension/assets', generatePNG = true) {
  const sizes = [16, 32, 48, 128];
  
  // 从 res/icon.html 加载模板
  console.log('📖 读取图标模板...');
  const template = loadIconTemplate();
  console.log('✓ 模板加载成功');
  
  // 确保扩展目录存在
  const extensionDir = path.dirname(outputDir);
  if (!fs.existsSync(extensionDir)) {
    fs.mkdirSync(extensionDir, { recursive: true });
  }
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  console.log('🎨 开始生成图标文件...');
  console.log(`📁 输出目录: ${outputDir}`);
  
  for (const size of sizes) {
    const svg = createSVGIcon(template, size);
    
    if (generatePNG) {
      try {
        // 生成PNG图标
        const pngBuffer = await convertSVGToPNG(svg, size);
        const pngFilename = `icon${size}.png`;
        const pngFilepath = path.join(outputDir, pngFilename);
        
        fs.writeFileSync(pngFilepath, pngBuffer);
        console.log(`✓ 生成 ${pngFilename}`);
      } catch (error) {
        console.error(`❌ PNG图标生成失败 (${size}x${size}):`, error.message);
        throw error; // 打包时图标是必须的，失败则抛出错误
      }
    } else {
      // 仅生成SVG图标
      const svgFilename = `icon${size}.svg`;
      const svgFilepath = path.join(outputDir, svgFilename);
      fs.writeFileSync(svgFilepath, svg);
      console.log(`✓ 生成 ${svgFilename}`);
    }
  }
  
  console.log('\n✅ 图标生成完成！');
}

// 如果直接运行此脚本
if (require.main === module) {
  const args = process.argv.slice(2);
  const outputDir = args[0] || './build/extension/assets';
  const generatePNG = !args.includes('--svg-only');
  
  generateAllIcons(outputDir, generatePNG).catch(error => {
    console.error('图标生成失败:', error.message);
    process.exit(1);
  });
}

// 导出函数供其他模块使用
module.exports = {
  generateAllIcons
};

