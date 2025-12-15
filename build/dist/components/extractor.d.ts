import { SelectionRect } from '../types.js';
/**
 * 文本提取器
 * 从选择区域提取文本并按视觉顺序排列
 */
export declare class Extractor {
    private readonly LINE_TOLERANCE;
    /**
     * 提取选择区域内的文本
     */
    extract(rect: SelectionRect): string;
    /**
     * 获取文本元素
     */
    private getTextElements;
    /**
     * 检查元素是否可见
     */
    private isVisible;
    /**
     * 检查矩形是否相交
     */
    private intersects;
    /**
     * 按视觉顺序排序
     */
    private sortByVisualOrder;
    /**
     * 合并文本
     */
    private combineText;
}
//# sourceMappingURL=extractor.d.ts.map