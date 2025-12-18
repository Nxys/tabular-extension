import type { SelectionRect, TextElement } from '../types.js';

/**
 * 文本提取器
 * 从选择区域提取文本并按视觉顺序排列
 */
export class Extractor {
  private readonly LINE_TOLERANCE = 5;

  /**
   * 提取选择区域内的文本
   */
  extract(rect: SelectionRect): string {
    console.log('开始提取文本，选择区域:', rect);
    
    // 方法1：使用TreeWalker
    const elements = this.getTextElements(rect);
    console.log('TreeWalker找到文本元素数量:', elements.length);
    
    if (elements.length > 0) {
      const sorted = this.sortByVisualOrder(elements);
      console.log('排序后元素数量:', sorted.length);
      const result = this.combineText(sorted);
      console.log('TreeWalker提取结果:', result);
      if (result.trim()) {
        return result;
      }
    }
    
    // 方法2：备用方法 - 使用elementsFromPoint
    console.log('使用备用提取方法');
    const centerX = rect.left + (rect.right - rect.left) / 2;
    const centerY = rect.top + (rect.bottom - rect.top) / 2;
    
    // jsdom 环境可能不存在 elementsFromPoint，这里做兼容处理
    const elementsFromPoint = typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint.bind(document)
      : null;

    if (!elementsFromPoint) {
      console.warn('elementsFromPoint 不可用，返回空结果');
      return '';
    }

    const elementsAtPoint = elementsFromPoint(centerX, centerY);
    console.log('中心点元素:', elementsAtPoint);
    
    let fallbackText = '';
    for (const element of elementsAtPoint) {
      const text = element.textContent || (element as HTMLElement).innerText || '';
      if (text.trim()) {
        fallbackText += text.trim() + '\n';
        break; // 只取第一个有文本的元素
      }
    }
    
    console.log('备用方法提取结果:', fallbackText);
    return fallbackText.trim();
  }

  /**
   * 获取文本元素
   */
  private getTextElements(rect: SelectionRect): TextElement[] {
    const elements: TextElement[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          return parent && this.isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const parent = node.parentElement!;
      const clientRects = parent.getClientRects();
      
      for (let i = 0; i < clientRects.length; i++) {
        const clientRect = clientRects[i];
        const elementRect = {
          left: clientRect.left + window.scrollX,
          top: clientRect.top + window.scrollY,
          right: clientRect.right + window.scrollX,
          bottom: clientRect.bottom + window.scrollY
        };

        if (this.intersects(elementRect, rect)) {
          elements.push({
            text: node.textContent || '',
            rect: clientRect,
            element: parent,
            lineIndex: -1,
            columnIndex: -1
          });
          break;
        }
      }
    }

    return elements;
  }

  /**
   * 检查元素是否可见
   */
  private isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * 检查矩形是否相交
   */
  private intersects(rect1: SelectionRect, rect2: SelectionRect): boolean {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right ||
             rect1.bottom < rect2.top ||
             rect1.top > rect2.bottom);
  }

  /**
   * 按视觉顺序排序
   */
  private sortByVisualOrder(elements: TextElement[]): TextElement[] {
    // 按行分组
    const lines: TextElement[][] = [];
    
    elements.forEach(element => {
      const elementTop = element.rect.top;
      let foundLine = false;
      
      for (const line of lines) {
        const lineTop = line[0].rect.top;
        if (Math.abs(elementTop - lineTop) <= this.LINE_TOLERANCE) {
          line.push(element);
          foundLine = true;
          break;
        }
      }
      
      if (!foundLine) {
        lines.push([element]);
      }
    });

    // 行内按X坐标排序，行间按Y坐标排序
    lines.forEach(line => {
      line.sort((a, b) => a.rect.left - b.rect.left);
    });
    
    lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
    
    return lines.flat();
  }

  /**
   * 合并文本
   */
  private combineText(elements: TextElement[]): string {
    if (elements.length === 0) return '';

    try {
      // 防护措施：严格限制元素数量，避免内存溢出
      const maxElements = 50;
      const limitedElements = elements.slice(0, maxElements);

      const lines: string[] = [];
      let currentLine: string[] = [];
      let lastTop = limitedElements[0].rect.top;

      limitedElements.forEach(element => {
        const text = element.text.trim();
        if (!text || text.length > 1000) return; // 跳过空文本和过长文本

        if (Math.abs(element.rect.top - lastTop) > this.LINE_TOLERANCE) {
          // 新行
          if (currentLine.length > 0) {
            // 防护措施：严格限制单行元素数量和文本长度
            const safeCurrentLine = currentLine.slice(0, 10);
            try {
              const lineText = safeCurrentLine.join(' ');
              if (lineText.length < 10000) { // 限制行长度
                lines.push(lineText);
              }
            } catch (e) {
              // 如果join失败，使用第一个元素
              if (safeCurrentLine.length > 0) {
                lines.push(safeCurrentLine[0]);
              }
            }
            currentLine = [];
          }
          lastTop = element.rect.top;
        }
        
        // 防护措施：严格限制单行元素数量
        if (currentLine.length < 10 && text.length < 1000) {
          currentLine.push(text);
        }
      });

      if (currentLine.length > 0) {
        const safeCurrentLine = currentLine.slice(0, 10);
        try {
          const lineText = safeCurrentLine.join(' ');
          if (lineText.length < 10000) {
            lines.push(lineText);
          }
        } catch (e) {
          if (safeCurrentLine.length > 0) {
            lines.push(safeCurrentLine[0]);
          }
        }
      }

      // 防护措施：严格限制总行数
      const limitedLines = lines.slice(0, 10);
      try {
        return limitedLines.join('\n');
      } catch (e) {
        // 如果最终join失败，返回第一行
        return limitedLines.length > 0 ? limitedLines[0] : '';
      }
    } catch (error) {
      console.warn('文本合并出错:', error);
      return '文本提取出错';
    }
  }
}

