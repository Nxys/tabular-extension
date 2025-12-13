/**
 * 浏览器框选复制插件 - 内容脚本
 * 合并了选择框、文本提取器和结果面板的核心功能
 */
declare class BrowserSelectionCopy {
    private selectionElement;
    private startX;
    private startY;
    private isSelecting;
    private panelElement;
    private currentText;
    private readonly LINE_TOLERANCE;
    private readonly CSS_CLASS_PREFIX;
    constructor();
    /**
     * 绑定鼠标事件
     */
    private bindEvents;
    /**
     * 鼠标按下事件
     */
    private handleMouseDown;
    /**
     * 鼠标移动事件
     */
    private handleMouseMove;
    /**
     * 鼠标释放事件
     */
    private handleMouseUp;
    /**
     * 外部点击事件
     */
    private handleOutsideClick;
    /**
     * 开始选择
     */
    private startSelection;
    /**
     * 更新选择框
     */
    private updateSelection;
    /**
     * 完成选择
     */
    private finishSelection;
    /**
     * 创建选择框元素
     */
    private createSelectionElement;
    /**
     * 清除选择框
     */
    private clearSelection;
    /**
     * 验证选择是否有效
     */
    private isValidSelection;
    /**
     * 提取选择区域内的文本
     */
    private extractText;
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
    /**
     * 显示结果
     */
    private showResult;
    /**
     * 创建面板
     */
    private createPanel;
    /**
     * 复制到剪贴板
     */
    private copyToClipboard;
    /**
     * 显示复制成功
     */
    private showCopySuccess;
    /**
     * 显示复制错误
     */
    private showCopyError;
    /**
     * 隐藏面板
     */
    private hidePanel;
    /**
     * 初始化插件
     */
    initialize(): void;
    /**
     * 清理资源
     */
    cleanup(): void;
}
declare global {
    interface Window {
        browserSelectionCopy?: BrowserSelectionCopy;
    }
}
export { BrowserSelectionCopy };
//# sourceMappingURL=content.d.ts.map