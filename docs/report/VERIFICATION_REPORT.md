# Extractor 模块验证报告

## 验证目的
验证新创建的 `collect.ts`、`layout.ts`、`format.ts` 三个模块的逻辑是否与原 `extractor.ts` 一致。

## 验证方法
逐行对比新旧代码的核心逻辑。

---

## 1. Collect 模块验证

### 原代码 (extractor.ts - getTextElements)
```typescript
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
```

### 新代码 (collect.ts)
```typescript
export function collect(selectionRect: DOMRect): TextItem[] {
  const items: TextItem[] = [];
  
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        return parent && isVisible(parent) 
          ? NodeFilter.FILTER_ACCEPT 
          : NodeFilter.FILTER_REJECT;
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

      if (intersects(elementRect, selectionRect)) {
        items.push({
          text: node.textContent || '',
          rect: clientRect
        });
        break;
      }
    }
  }

  return items;
}
```

### 对比结果
✅ **逻辑一致**
- TreeWalker 遍历逻辑相同
- 过滤条件相同（空文本、不可见元素）
- rect 相交判断相同
- 唯一区别：返回的数据结构简化（移除了 element, lineIndex, columnIndex 字段）

---

## 2. Layout 模块验证

### 原代码 (extractor.ts - sortByVisualOrder)
```typescript
private sortByVisualOrder(elements: TextElement[]): TextElement[] {
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

  lines.forEach(line => {
    line.sort((a, b) => a.rect.left - b.rect.left);
  });
  
  lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
  
  return lines.flat();
}
```

### 新代码 (layout.ts)
```typescript
export function layout(items: TextItem[], options: LayoutOptions): TextItem[][] {
  if (items.length === 0) return [];

  const lines: TextItem[][] = [];
  
  items.forEach(item => {
    const itemTop = item.rect.top;
    let foundLine = false;
    
    for (const line of lines) {
      const lineTop = line[0].rect.top;
      if (Math.abs(itemTop - lineTop) <= options.lineThresholdRatio) {
        line.push(item);
        foundLine = true;
        break;
      }
    }
    
    if (!foundLine) {
      lines.push([item]);
    }
  });

  lines.forEach(line => {
    line.sort((a, b) => a.rect.left - b.rect.left);
  });
  
  lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
  
  return lines;
}
```

### 对比结果
✅ **逻辑一致**
- 行分组算法完全相同
- 行内排序（按 X 坐标）相同
- 行间排序（按 Y 坐标）相同
- 唯一区别：
  1. `LINE_TOLERANCE` 改为参数 `options.lineThresholdRatio`
  2. 返回二维数组而不是 flat 后的一维数组（这是设计要求）

---

## 3. Format 模块验证

### 原代码 (extractor.ts - combineText)
```typescript
private combineText(elements: TextElement[]): string {
  if (elements.length === 0) return '';

  try {
    const maxElements = 50;
    const limitedElements = elements.slice(0, maxElements);

    const lines: string[] = [];
    let currentLine: string[] = [];
    let lastTop = limitedElements[0].rect.top;

    limitedElements.forEach(element => {
      const text = element.text.trim();
      if (!text || text.length > 1000) return;

      if (Math.abs(element.rect.top - lastTop) > this.LINE_TOLERANCE) {
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
          currentLine = [];
        }
        lastTop = element.rect.top;
      }
      
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

    const limitedLines = lines.slice(0, 10);
    try {
      return limitedLines.join('\n');
    } catch (e) {
      return limitedLines.length > 0 ? limitedLines[0] : '';
    }
  } catch (error) {
    console.warn('文本合并出错:', error);
    return '文本提取出错';
  }
}
```

### 新代码 (format.ts)
```typescript
export function format(lines: TextItem[][]): string {
  if (lines.length === 0) return '';

  try {
    const maxLines = 10;
    const limitedLines = lines.slice(0, maxLines);

    const resultLines: string[] = [];

    for (const line of limitedLines) {
      if (line.length === 0) continue;

      const maxElementsPerLine = 10;
      const limitedLine = line.slice(0, maxElementsPerLine);

      const lineTexts: string[] = [];

      for (const item of limitedLine) {
        const text = item.text.trim();
        
        if (!text || text.length > 1000) continue;

        lineTexts.push(text);
      }

      if (lineTexts.length > 0) {
        try {
          const lineText = lineTexts.join(' ');
          
          if (lineText.length < 10000) {
            resultLines.push(lineText);
          }
        } catch (e) {
          if (lineTexts.length > 0) {
            resultLines.push(lineTexts[0]);
          }
        }
      }
    }

    try {
      return resultLines.join('\n');
    } catch (e) {
      return resultLines.length > 0 ? resultLines[0] : '';
    }
  } catch (error) {
    console.warn('文本合并出错:', error);
    return '文本提取出错';
  }
}
```

### 对比结果
⚠️ **逻辑有差异**

**原代码的逻辑**：
1. 接收一维数组（已经 flat 的元素）
2. 在 format 阶段重新判断行（使用 LINE_TOLERANCE）
3. 限制总元素数为 50

**新代码的逻辑**：
1. 接收二维数组（已经分好行的数据）
2. 不需要重新判断行，直接处理每一行
3. 限制总行数为 10，每行元素数为 10

**分析**：
- 新代码的逻辑更清晰，因为行分组已经在 layout 阶段完成
- 但是限制策略不同：
  - 原代码：最多 50 个元素
  - 新代码：最多 10 行 × 10 个元素 = 100 个元素
- 这可能导致输出结果不同！

---

## 4. 整体 Pipeline 验证

### 原代码流程
```
extract(rect) {
  elements = getTextElements(rect)  // 返回 TextElement[]
  sorted = sortByVisualOrder(elements)  // 返回 TextElement[] (flat)
  text = combineText(sorted)  // 在这里重新判断行
  return text
}
```

### 新代码流程
```
extractText(rect, options) {
  items = collect(rect)  // 返回 TextItem[]
  lines = layout(items, options)  // 返回 TextItem[][] (二维)
  text = format(lines)  // 直接处理二维数组
  return text
}
```

---

## 验证结论

### ✅ 正确的部分
1. **Collect 模块**：逻辑完全一致
2. **Layout 模块**：核心算法一致，参数化做得很好

### ⚠️ 需要修正的部分
3. **Format 模块**：逻辑有差异

**问题**：
- 原代码在 `sortByVisualOrder` 返回 flat 数组后，在 `combineText` 中重新判断行
- 新代码在 `layout` 返回二维数组后，在 `format` 中直接处理，不重新判断行
- 这导致 format 的输入数据结构不同

**影响**：
- 如果 layout 的行分组完全正确，新代码会更高效
- 但原代码有"双重保险"（在 format 阶段重新判断行）

### 建议
1. **保持当前实现**：新代码的设计更清晰，职责分离更好
2. **调整限制策略**：将 format 的限制改为与原代码一致（最多 50 个元素）
3. **或者接受差异**：新代码的限制（10 行 × 10 元素）实际上更宽松

---

## 最终验证状态

| 模块 | 状态 | 说明 |
|------|------|------|
| collect.ts | ✅ 通过 | 逻辑与原代码一致 |
| layout.ts | ✅ 通过 | 核心算法一致，参数化改进 |
| format.ts | ⚠️ 有差异 | 输入结构不同，限制策略不同 |
| index.ts | ✅ 通过 | Pipeline 流程清晰 |

**总体评价**：新模块的设计更好，但 format 模块的行为与原代码有细微差异。
