import { ISelectionBox, SelectionRect } from '../types.js';
/**
 * 选择框组件 - 处理鼠标交互，创建和管理选择框UI
 */
export declare class SelectionBox implements ISelectionBox {
    private selectionElement;
    private startX;
    private startY;
    private isSelecting;
    private isCompleted;
    private onSelectionComplete?;
    constructor();
    /**
     * 开始选择操作
     */
    startSelection(startX: number, startY: number): void;
    /**
     * 更新选择框位置和大小
     */
    updateSelection(currentX: number, currentY: number): void;
    /**
     * 完成选择操作并返回选择区域
     */
    finishSelection(): SelectionRect;
    /**
     * 清除选择框
     */
    clearSelection(): void;
    /**
     * 设置选择完成回调函数
     */
    setOnSelectionComplete(callback: (rect: SelectionRect) => void): void;
    /**
     * 检查是否正在选择
     */
    isCurrentlySelecting(): boolean;
    /**
     * 检查选择是否已完成
     */
    isSelectionCompleted(): boolean;
    /**
     * 检查是否有活动的选择框
     */
    hasActiveSelection(): boolean;
    /**
     * 绑定鼠标事件处理器
     */
    private bindMouseEvents;
    /**
     * 处理鼠标按下事件
     */
    private handleMouseDown;
    /**
     * 处理鼠标移动事件
     */
    private handleMouseMove;
    /**
     * 处理鼠标释放事件
     */
    private handleMouseUp;
    /**
     * 处理点击事件 - 用于清除选择框
     */
    private handleClick;
    /**
     * 销毁组件，移除事件监听器
     */
    destroy(): void;
    /**
     * 创建选择框DOM元素
     */
    private createSelectionElement;
}
//# sourceMappingURL=selection.d.ts.map