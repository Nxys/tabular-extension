/**
 * 结果面板
 * 显示提取结果和提供复制功能的浮动面板
 */
export declare class Panel {
    private element;
    private currentText;
    private readonly CSS_CLASS_PREFIX;
    /**
     * 显示结果
     */
    show(text: string): void;
    /**
     * 隐藏面板
     */
    hide(): void;
    /**
     * 检查点击是否在面板内
     */
    contains(target: Node | null): boolean;
    /**
     * 创建面板
     */
    private createElement;
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
}
//# sourceMappingURL=panel.d.ts.map