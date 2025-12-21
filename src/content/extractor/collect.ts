/**
 * 文本项：包含文本内容和位置信息
 */
export interface TextItem {
  text: string;      // 文本内容
  rect: DOMRect;     // 位置信息
}

/**
 * 采集选择区域内的文本元素
 * 纯事实采集，不包含任何业务逻辑或视觉判断
 * @param selectionRect 选择区域
 * @returns 文本项数组
 */
export function collect(selectionRect: { left: number; top: number; right: number; bottom: number }): TextItem[] {
  const items: TextItem[] = [];
  
  // 性能优化：缓存已检查过的元素的可见性，避免重复调用 getComputedStyle
  const visibilityCache = new Map<Element, boolean>();
  
  // 使用 TreeWalker 遍历 DOM TextNode
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        // 过滤空文本
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        
        // 过滤不可见元素（使用缓存）
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        // 检查缓存，避免重复调用 getComputedStyle
        let visible = visibilityCache.get(parent);
        if (visible === undefined) {
          visible = isVisible(parent);
          visibilityCache.set(parent, visible);
        }
        
        return visible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );

  let node: Text | null;
  while ((node = walker.nextNode() as Text)) {
    const parent = node.parentElement!;
    const clientRects = parent.getClientRects();
    
    // 遍历所有 rect，检查是否与选择区域相交
    for (let i = 0; i < clientRects.length; i++) {
      const clientRect = clientRects[i];
      
      // 将 clientRect 转换为绝对坐标（加上滚动偏移）
      const elementRect = {
        left: clientRect.left + window.scrollX,
        top: clientRect.top + window.scrollY,
        right: clientRect.right + window.scrollX,
        bottom: clientRect.bottom + window.scrollY
      };

      // 过滤不在选择区域内的 rect
      if (intersects(elementRect, selectionRect)) {
        items.push({
          text: node.textContent || '',
          rect: clientRect
        });
        break; // 找到一个相交的 rect 就跳出循环
      }
    }
  }

  // 返回 TextItem[]，不执行排序或行合并
  return items;
}

/**
 * 检查元素是否可见
 * 过滤 display: none, visibility: hidden, opacity: 0
 */
function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0';
}

/**
 * 检查两个矩形是否相交
 */
function intersects(
  rect1: { left: number; top: number; right: number; bottom: number },
  rect2: { left: number; top: number; right: number; bottom: number }
): boolean {
  return !(rect1.right < rect2.left || 
           rect1.left > rect2.right ||
           rect1.bottom < rect2.top ||
           rect1.top > rect2.bottom);
}
