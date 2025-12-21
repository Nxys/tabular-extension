import type { TextItem } from './collect';

/**
 * 将视觉行结构格式化为文本
 * 职责：将视觉行结构转换为最终可复制的文本字符串
 * @param lines 二维文本项数组
 * @returns 格式化后的文本字符串
 */
export function format(lines: TextItem[][]): string {
  // 空输入处理
  if (lines.length === 0) return '';

  try {
    // 防护措施：严格限制总行数，避免内存溢出
    const maxLines = 10;
    const limitedLines = lines.slice(0, maxLines);

    const resultLines: string[] = [];

    // 遍历每一行
    for (const line of limitedLines) {
      if (line.length === 0) continue;

      // 防护措施：严格限制单行元素数量
      const maxElementsPerLine = 10;
      const limitedLine = line.slice(0, maxElementsPerLine);

      const lineTexts: string[] = [];

      // 遍历行内的每个文本项
      for (const item of limitedLine) {
        const text = item.text.trim();
        
        // 跳过空文本和过长文本
        if (!text || text.length > 1000) continue;

        lineTexts.push(text);
      }

      // 行内文本拼接
      if (lineTexts.length > 0) {
        try {
          // 使用空格连接行内文本
          const lineText = lineTexts.join(' ');
          
          // 防护措施：限制单行最大长度
          if (lineText.length < 10000) {
            resultLines.push(lineText);
          }
        } catch (e) {
          // 如果 join 失败，使用第一个元素
          if (lineTexts.length > 0) {
            resultLines.push(lineTexts[0]);
          }
        }
      }
    }

    // 行间拼接：使用换行符连接所有行
    try {
      return resultLines.join('\n');
    } catch (e) {
      // 如果最终 join 失败，返回第一行
      return resultLines.length > 0 ? resultLines[0] : '';
    }
  } catch (error) {
    console.warn('文本合并出错:', error);
    return '文本提取出错';
  }
}
