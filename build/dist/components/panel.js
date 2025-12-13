/**
 * 结果面板组件 - 显示提取结果和提供复制功能
 */
export class ResultPanel {
    panelElement = null;
    currentText = '';
    outsideClickHandler = null;
    keydownHandler = null;
    /**
     * 显示提取结果
     */
    showResult(text) {
        this.currentText = text;
        this.createPanel();
        this.updateContent();
    }
    /**
     * 隐藏面板
     */
    hide() {
        if (this.panelElement) {
            this.panelElement.remove();
            this.panelElement = null;
        }
        // 清理事件监听器
        this.removeOutsideClickListener();
        this.removeKeydownListener();
    }
    /**
     * 复制文本到剪贴板
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopyFeedback(true);
            return true;
        }
        catch (error) {
            console.warn('剪贴板写入失败，尝试降级方案:', error);
            this.fallbackCopy(text);
            return false;
        }
    }
    /**
     * 创建结果面板DOM元素
     */
    createPanel() {
        this.hide(); // 清除之前的面板
        this.panelElement = document.createElement('div');
        this.panelElement.className = 'browser-selection-copy-panel';
        this.panelElement.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: 400px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 1000000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    `;
        document.body.appendChild(this.panelElement);
        // 添加交互事件监听（延迟添加，避免立即触发）
        setTimeout(() => {
            this.addOutsideClickListener();
            this.addKeydownListener();
        }, 0);
    }
    /**
     * 更新面板内容
     */
    updateContent() {
        if (!this.panelElement)
            return;
        const header = document.createElement('div');
        header.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      font-weight: 600;
      color: #333;
    `;
        header.textContent = '提取的文本';
        const content = document.createElement('div');
        content.style.cssText = `
      padding: 12px 16px;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      color: #666;
      line-height: 1.4;
    `;
        content.textContent = this.currentText || '未检测到文本';
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
      padding: 12px 16px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;
        const copyButton = document.createElement('button');
        copyButton.style.cssText = `
      padding: 6px 12px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
        copyButton.textContent = '复制';
        copyButton.onclick = () => this.copyToClipboard(this.currentText);
        const closeButton = document.createElement('button');
        closeButton.style.cssText = `
      padding: 6px 12px;
      background: #f5f5f5;
      color: #666;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `;
        closeButton.textContent = '关闭';
        closeButton.onclick = () => this.hide();
        buttonContainer.appendChild(copyButton);
        buttonContainer.appendChild(closeButton);
        this.panelElement.appendChild(header);
        this.panelElement.appendChild(content);
        this.panelElement.appendChild(buttonContainer);
    }
    /**
     * 显示复制反馈
     */
    showCopyFeedback(success) {
        const feedback = document.createElement('div');
        feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 12px 24px;
      background: ${success ? '#4caf50' : '#f44336'};
      color: white;
      border-radius: 4px;
      z-index: 1000001;
      font-size: 14px;
    `;
        feedback.textContent = success ? '复制成功！' : '复制失败，请手动复制';
        document.body.appendChild(feedback);
        setTimeout(() => {
            feedback.remove();
        }, 2000);
    }
    /**
     * 降级复制方案 - 选择文本让用户手动复制
     */
    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 2em;
      height: 2em;
      padding: 0;
      border: none;
      outline: none;
      box-shadow: none;
      background: transparent;
    `;
        document.body.appendChild(textArea);
        textArea.select();
        textArea.setSelectionRange(0, 99999);
        try {
            document.execCommand('copy');
            this.showCopyFeedback(true);
        }
        catch (err) {
            this.showCopyFeedback(false);
        }
        document.body.removeChild(textArea);
    }
    /**
     * 添加外部点击事件监听器
     */
    addOutsideClickListener() {
        if (!this.outsideClickHandler) {
            this.outsideClickHandler = this.handleOutsideClick.bind(this);
            document.addEventListener('click', this.outsideClickHandler, true);
        }
    }
    /**
     * 移除外部点击事件监听器
     */
    removeOutsideClickListener() {
        if (this.outsideClickHandler) {
            document.removeEventListener('click', this.outsideClickHandler, true);
            this.outsideClickHandler = null;
        }
    }
    /**
     * 添加键盘事件监听器
     */
    addKeydownListener() {
        if (!this.keydownHandler) {
            this.keydownHandler = this.handleKeydown.bind(this);
            document.addEventListener('keydown', this.keydownHandler, true);
        }
    }
    /**
     * 移除键盘事件监听器
     */
    removeKeydownListener() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, true);
            this.keydownHandler = null;
        }
    }
    /**
     * 处理点击外部区域隐藏面板
     */
    handleOutsideClick(event) {
        const target = event.target;
        // 检查点击是否在面板外部
        if (this.panelElement && !this.panelElement.contains(target)) {
            this.hide();
        }
    }
    /**
     * 处理键盘事件（ESC 键隐藏面板）
     */
    handleKeydown(event) {
        if (event.key === 'Escape' && this.panelElement) {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
        }
    }
}
//# sourceMappingURL=panel.js.map