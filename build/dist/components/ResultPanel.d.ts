import { IResultPanel } from '../types/index.js';
/**
 * 结果面板组件 - 显示提取结果和提供复制功能
 */
export declare class ResultPanel implements IResultPanel {
    private panelElement;
    private currentText;
    private outsideClickHandler;
    private keydownHandler;
    /**
     * 显示提取结果
     */
    showResult(text: string): void;
    /**
     * 隐藏面板
     */
    hide(): void;
    /**
     * 复制文本到剪贴板
     */
    copyToClipboard(text: string): Promise<boolean>;
    /**
     * 创建结果面板DOM元素
     */
    private createPanel;
    /**
     * 更新面板内容
     */
    private updateContent;
    /**
     * 显示复制反馈
     */
    private showCopyFeedback;
    /**
     * 降级复制方案 - 选择文本让用户手动复制
     */
    private fallbackCopy;
    /**
     * 添加外部点击事件监听器
     */
    private addOutsideClickListener;
    /**
     * 移除外部点击事件监听器
     */
    private removeOutsideClickListener;
    /**
     * 添加键盘事件监听器
     */
    private addKeydownListener;
    /**
     * 移除键盘事件监听器
     */
    private removeKeydownListener;
    /**
     * 处理点击外部区域隐藏面板
     */
    private handleOutsideClick;
    /**
     * 处理键盘事件（ESC 键隐藏面板）
     */
    private handleKeydown;
}
//# sourceMappingURL=ResultPanel.d.ts.map