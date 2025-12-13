import { SelectionBox } from './components/SelectionBox.js';
import { VisualTextExtractor } from './components/VisualTextExtractor.js';
import { ResultPanel } from './components/ResultPanel.js';
/**
 * 主控制器 - 协调各组件交互，管理完整的用户操作流程
 */
export class MainController {
    selectionBox;
    textExtractor;
    resultPanel;
    isActive = false;
    constructor() {
        this.selectionBox = new SelectionBox();
        this.textExtractor = new VisualTextExtractor();
        this.resultPanel = new ResultPanel();
    }
    /**
     * 初始化控制器，绑定事件监听器
     */
    initialize() {
        if (this.isActive)
            return;
        this.isActive = true;
        this.bindEvents();
    }
    /**
     * 销毁控制器，清理资源
     */
    destroy() {
        if (!this.isActive)
            return;
        this.isActive = false;
        this.unbindEvents();
        this.selectionBox.clearSelection();
        this.resultPanel.hide();
    }
    /**
     * 绑定鼠标事件监听器
     */
    bindEvents() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    /**
     * 解绑事件监听器
     */
    unbindEvents() {
        document.removeEventListener('mousedown', this.handleMouseDown.bind(this));
        document.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    /**
     * 处理鼠标按下事件
     */
    handleMouseDown(event) {
        // 忽略右键和中键
        if (event.button !== 0)
            return;
        // 忽略在结果面板上的点击
        const target = event.target;
        if (target.closest('.browser-selection-copy-panel'))
            return;
        // 清除之前的结果面板
        this.resultPanel.hide();
        // 开始新的选择
        this.selectionBox.startSelection(event.pageX, event.pageY);
        event.preventDefault();
    }
    /**
     * 处理鼠标移动事件
     */
    handleMouseMove(event) {
        this.selectionBox.updateSelection(event.pageX, event.pageY);
    }
    /**
     * 处理鼠标释放事件
     */
    handleMouseUp(event) {
        try {
            const selectionRect = this.selectionBox.finishSelection();
            // 检查选择区域是否足够大
            const minSize = 10; // 最小选择区域像素
            const width = selectionRect.right - selectionRect.left;
            const height = selectionRect.bottom - selectionRect.top;
            if (width < minSize || height < minSize) {
                this.selectionBox.clearSelection();
                return;
            }
            // 提取文本
            const extractedText = this.textExtractor.extractText(selectionRect);
            // 清除选择框
            this.selectionBox.clearSelection();
            // 显示结果
            if (extractedText.trim()) {
                this.resultPanel.showResult(extractedText);
            }
            else {
                // 显示无文本提示
                this.showNoTextFeedback(event.pageX, event.pageY);
            }
        }
        catch (error) {
            console.error('文本提取过程中发生错误:', error);
            this.selectionBox.clearSelection();
            this.showErrorFeedback();
        }
    }
    /**
     * 显示无文本反馈
     */
    showNoTextFeedback(x, y) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000000;
      pointer-events: none;
    `;
        feedback.textContent = '未检测到文本';
        document.body.appendChild(feedback);
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }
    /**
     * 显示错误反馈
     */
    showErrorFeedback() {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 12px 24px;
      background: #f44336;
      color: white;
      border-radius: 4px;
      z-index: 1000001;
      font-size: 14px;
    `;
        feedback.textContent = '文本提取失败，请重新尝试';
        document.body.appendChild(feedback);
        setTimeout(() => {
            feedback.remove();
        }, 3000);
    }
}
//# sourceMappingURL=MainController.js.map