import { IVisualTextExtractor, SelectionRect, TextElement } from '../types/index.js';
/**
 * 视觉文本提取器 - 负责从选择区域提取和排序文本
 */
export declare class VisualTextExtractor implements IVisualTextExtractor {
    private readonly LINE_TOLERANCE;
    /**
     * 提取选择区域内的文本并按视觉顺序排列
     */
    extractText(selectionRect: SelectionRect): string;
    /**
     * 获取选择区域内的所有文本元素
     */
    getTextElements(rect: SelectionRect): TextElement[];
    /**
     * 按视觉顺序排序文本元素
     */
    sortByVisualOrder(elements: TextElement[]): TextElement[];
    /**
     * 检查元素是否可见
     */
    private isVisible;
    /**
     * 检查矩形是否与选择区域相交
     */
    private intersects;
    /**
     * 将文本元素分组为视觉行
     */
    private groupIntoVisualLines;
    /**
     * 合并文本元素为最终字符串
     */
    private combineTextElements;
}
//# sourceMappingURL=VisualTextExtractor.d.ts.map