import { SelectionRect } from '../types.js';
/**
 * 选择框组件
 * 处理鼠标交互，创建和管理选择框UI
 */
export declare class Selection {
    private element;
    private startX;
    private startY;
    private isSelecting;
    private readonly CSS_CLASS_PREFIX;
    /**
     * 开始选择
     */
    start(x: number, y: number): void;
    /**
     * 更新选择框
     */
    update(x: number, y: number): void;
    /**
     * 完成选择，返回选择区域
     */
    finish(): SelectionRect | null;
    /**
     * 验证选择是否有效
     */
    isValid(rect: SelectionRect): boolean;
    /**
     * 获取选择状态
     */
    getIsSelecting(): boolean;
    /**
     * 清除选择框
     */
    clear(): void;
    /**
     * 创建选择框元素
     */
    private createElement;
}
//# sourceMappingURL=selection.d.ts.map