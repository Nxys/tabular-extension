/**
 * 浏览器框选复制插件 - 内容脚本
 * 组合选择框、文本提取器和结果面板
 */
declare class BrowserSelectionCopy {
    private selection;
    private extractor;
    private panel;
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