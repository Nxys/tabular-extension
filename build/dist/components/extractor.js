/**
 * 视觉文本提取器 - 负责从选择区域提取和排序文本
 */
export class VisualTextExtractor {
    LINE_TOLERANCE = 5; // 行分组的像素容差
    /**
     * 提取选择区域内的文本并按视觉顺序排列
     */
    extractText(selectionRect) {
        const textElements = this.getTextElements(selectionRect);
        const sortedElements = this.sortByVisualOrder(textElements);
        return this.combineTextElements(sortedElements);
    }
    /**
     * 获取选择区域内的所有文本元素
     */
    getTextElements(rect) {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                // 过滤空白和隐藏文本
                if (!node.textContent?.trim())
                    return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                if (!parent || !this.isVisible(parent))
                    return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        const elements = [];
        let node;
        while (node = walker.nextNode()) {
            const parent = node.parentElement;
            const rects = parent.getClientRects();
            // 检查每个rect是否与选择区域相交
            for (let i = 0; i < rects.length; i++) {
                const domRect = rects[i];
                if (this.intersects(domRect, rect)) {
                    elements.push({
                        text: node.textContent || '',
                        rect: domRect,
                        element: parent,
                        lineIndex: -1, // 稍后分配
                        columnIndex: -1 // 稍后分配
                    });
                    break; // 每个文本节点只添加一次
                }
            }
        }
        return elements;
    }
    /**
     * 按视觉顺序排序文本元素
     */
    sortByVisualOrder(elements) {
        // 1. 按Y坐标分组为视觉行
        const lines = this.groupIntoVisualLines(elements);
        // 2. 行内按X坐标排序
        lines.forEach(line => {
            line.elements.sort((a, b) => a.rect.left - b.rect.left);
            // 分配列索引
            line.elements.forEach((element, index) => {
                element.columnIndex = index;
            });
        });
        // 3. 按行顺序合并结果并分配行索引
        return lines
            .sort((a, b) => a.topY - b.topY)
            .flatMap((line, lineIndex) => {
            line.elements.forEach(element => {
                element.lineIndex = lineIndex;
            });
            return line.elements;
        });
    }
    /**
     * 检查元素是否可见
     */
    isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
    }
    /**
     * 检查矩形是否与选择区域相交
     */
    intersects(rect, selection) {
        return !(rect.right < selection.left ||
            rect.left > selection.right ||
            rect.bottom < selection.top ||
            rect.top > selection.bottom);
    }
    /**
     * 将文本元素分组为视觉行
     */
    groupIntoVisualLines(elements) {
        const lines = [];
        elements.forEach(element => {
            const existingLine = lines.find(line => Math.abs(line.topY - element.rect.top) <= this.LINE_TOLERANCE);
            if (existingLine) {
                existingLine.elements.push(element);
                // 更新行边界
                existingLine.topY = Math.min(existingLine.topY, element.rect.top);
                existingLine.bottomY = Math.max(existingLine.bottomY, element.rect.bottom);
            }
            else {
                lines.push({
                    lineIndex: lines.length,
                    topY: element.rect.top,
                    bottomY: element.rect.bottom,
                    elements: [element]
                });
            }
        });
        return lines;
    }
    /**
     * 合并文本元素为最终字符串
     */
    combineTextElements(elements) {
        if (elements.length === 0)
            return '';
        let result = '';
        let currentLineIndex = -1;
        elements.forEach((element, index) => {
            // 如果是新行，添加换行符（除了第一行）
            if (element.lineIndex !== currentLineIndex) {
                if (currentLineIndex !== -1) {
                    result += '\n';
                }
                currentLineIndex = element.lineIndex;
            }
            else if (index > 0) {
                // 同行内添加空格分隔
                result += ' ';
            }
            result += element.text.trim();
        });
        return result;
    }
}
//# sourceMappingURL=extractor.js.map