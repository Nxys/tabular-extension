// 浏览器框选复制插件 - 合并后的 Content Script
// 自动生成，请勿手动编辑

// === build/dist/types.js ===
{};


// === build/dist/content.js ===
/**
 * 浏览器框选复制插件 - 内容脚本
 * 合并了选择框、文本提取器和结果面板的核心功能
 */
class BrowserSelectionCopy {
    // 选择框相关
    selectionElement = null;
    startX = 0;
    startY = 0;
    isSelecting = false;
    // 结果面板相关
    panelElement = null;
    currentText = '';
    // 常量
    LINE_TOLERANCE = 5;
    CSS_CLASS_PREFIX = 'browser-selection-copy';
    constructor() {
        this.bindEvents();
    }
    /**
     * 绑定鼠标事件
     */
    bindEvents() {
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        document.addEventListener('click', this.handleOutsideClick.bind(this));
    }
    /**
     * 鼠标按下事件
     */
    handleMouseDown(event) {
        // 忽略右键和中键
        if (event.button !== 0)
            return;
        // 忽略在面板上的点击
        if (this.panelElement?.contains(event.target))
            return;
        this.startSelection(event.clientX, event.clientY);
        event.preventDefault();
    }
    /**
     * 鼠标移动事件
     */
    handleMouseMove(event) {
        if (!this.isSelecting)
            return;
        this.updateSelection(event.clientX, event.clientY);
    }
    /**
     * 鼠标释放事件
     */
    handleMouseUp(_event) {
        if (!this.isSelecting)
            return;
        const rect = this.finishSelection();
        if (rect && this.isValidSelection(rect)) {
            const text = this.extractText(rect);
            if (text.trim()) {
                this.showResult(text);
            }
        }
    }
    /**
     * 外部点击事件
     */
    handleOutsideClick(event) {
        if (this.panelElement && !this.panelElement.contains(event.target)) {
            this.hidePanel();
        }
    }
    // === 选择框功能 ===
    /**
     * 开始选择
     */
    startSelection(x, y) {
        this.startX = x;
        this.startY = y;
        this.isSelecting = true;
        this.hidePanel(); // 隐藏之前的面板
        this.createSelectionElement();
    }
    /**
     * 更新选择框
     */
    updateSelection(x, y) {
        if (!this.selectionElement)
            return;
        const left = Math.min(this.startX, x);
        const top = Math.min(this.startY, y);
        const width = Math.abs(x - this.startX);
        const height = Math.abs(y - this.startY);
        Object.assign(this.selectionElement.style, {
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`
        });
    }
    /**
     * 完成选择
     */
    finishSelection() {
        if (!this.selectionElement)
            return null;
        const rect = this.selectionElement.getBoundingClientRect();
        const selectionRect = {
            left: rect.left + window.scrollX,
            top: rect.top + window.scrollY,
            right: rect.right + window.scrollX,
            bottom: rect.bottom + window.scrollY
        };
        this.clearSelection();
        return selectionRect;
    }
    /**
     * 创建选择框元素
     */
    createSelectionElement() {
        this.selectionElement = document.createElement('div');
        this.selectionElement.className = `${this.CSS_CLASS_PREFIX}-box`;
        Object.assign(this.selectionElement.style, {
            position: 'absolute',
            border: '2px dashed #007acc',
            backgroundColor: 'rgba(0, 122, 204, 0.1)',
            pointerEvents: 'none',
            zIndex: '2147483647',
            left: `${this.startX}px`,
            top: `${this.startY}px`,
            width: '0px',
            height: '0px'
        });
        document.body.appendChild(this.selectionElement);
    }
    /**
     * 清除选择框
     */
    clearSelection() {
        if (this.selectionElement) {
            this.selectionElement.remove();
            this.selectionElement = null;
        }
        this.isSelecting = false;
    }
    /**
     * 验证选择是否有效
     */
    isValidSelection(rect) {
        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        return width > 10 && height > 10; // 最小选择区域
    }
    // === 文本提取功能 ===
    /**
     * 提取选择区域内的文本
     */
    extractText(rect) {
        const elements = this.getTextElements(rect);
        const sorted = this.sortByVisualOrder(elements);
        return this.combineText(sorted);
    }
    /**
     * 获取文本元素
     */
    getTextElements(rect) {
        const elements = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
            acceptNode: (node) => {
                if (!node.textContent?.trim())
                    return NodeFilter.FILTER_REJECT;
                const parent = node.parentElement;
                return parent && this.isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        let node;
        while (node = walker.nextNode()) {
            const parent = node.parentElement;
            const clientRects = parent.getClientRects();
            for (let i = 0; i < clientRects.length; i++) {
                const clientRect = clientRects[i];
                const elementRect = {
                    left: clientRect.left + window.scrollX,
                    top: clientRect.top + window.scrollY,
                    right: clientRect.right + window.scrollX,
                    bottom: clientRect.bottom + window.scrollY
                };
                if (this.intersects(elementRect, rect)) {
                    elements.push({
                        text: node.textContent || '',
                        rect: clientRect,
                        element: parent,
                        lineIndex: -1,
                        columnIndex: -1
                    });
                    break;
                }
            }
        }
        return elements;
    }
    /**
     * 检查元素是否可见
     */
    isVisible(element) {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0';
    }
    /**
     * 检查矩形是否相交
     */
    intersects(rect1, rect2) {
        return !(rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom);
    }
    /**
     * 按视觉顺序排序
     */
    sortByVisualOrder(elements) {
        // 按行分组
        const lines = [];
        elements.forEach(element => {
            const elementTop = element.rect.top;
            let foundLine = false;
            for (const line of lines) {
                const lineTop = line[0].rect.top;
                if (Math.abs(elementTop - lineTop) <= this.LINE_TOLERANCE) {
                    line.push(element);
                    foundLine = true;
                    break;
                }
            }
            if (!foundLine) {
                lines.push([element]);
            }
        });
        // 行内按X坐标排序，行间按Y坐标排序
        lines.forEach(line => {
            line.sort((a, b) => a.rect.left - b.rect.left);
        });
        lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
        return lines.flat();
    }
    /**
     * 合并文本
     */
    combineText(elements) {
        if (elements.length === 0)
            return '';
        const lines = [];
        let currentLine = [];
        let lastTop = elements[0].rect.top;
        elements.forEach(element => {
            if (Math.abs(element.rect.top - lastTop) > this.LINE_TOLERANCE) {
                // 新行
                if (currentLine.length > 0) {
                    lines.push(currentLine.join(' '));
                    currentLine = [];
                }
                lastTop = element.rect.top;
            }
            currentLine.push(element.text.trim());
        });
        if (currentLine.length > 0) {
            lines.push(currentLine.join(' '));
        }
        return lines.join('\n');
    }
    // === 结果面板功能 ===
    /**
     * 显示结果
     */
    showResult(text) {
        this.currentText = text;
        this.createPanel();
    }
    /**
     * 创建面板
     */
    createPanel() {
        this.hidePanel(); // 确保只有一个面板
        this.panelElement = document.createElement('div');
        this.panelElement.className = `${this.CSS_CLASS_PREFIX}-panel`;
        Object.assign(this.panelElement.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            width: '300px',
            maxHeight: '400px',
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000000',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            padding: '16px'
        });
        // 文本预览
        const preview = document.createElement('div');
        preview.style.cssText = `
      max-height: 200px;
      overflow-y: auto;
      margin-bottom: 12px;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
    `;
        preview.textContent = this.currentText;
        // 复制按钮
        const copyBtn = document.createElement('button');
        copyBtn.textContent = '复制到剪贴板';
        copyBtn.style.cssText = `
      width: 100%;
      padding: 8px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
        copyBtn.onclick = () => this.copyToClipboard();
        this.panelElement.appendChild(preview);
        this.panelElement.appendChild(copyBtn);
        document.body.appendChild(this.panelElement);
    }
    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.currentText);
            this.showCopySuccess();
        }
        catch (error) {
            console.error('复制失败:', error);
            this.showCopyError();
        }
    }
    /**
     * 显示复制成功
     */
    showCopySuccess() {
        const btn = this.panelElement?.querySelector('button');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '✓ 已复制';
            btn.style.background = '#28a745';
            setTimeout(() => {
                if (btn) {
                    btn.textContent = originalText;
                    btn.style.background = '#007acc';
                }
            }, 1500);
        }
    }
    /**
     * 显示复制错误
     */
    showCopyError() {
        const btn = this.panelElement?.querySelector('button');
        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = '复制失败';
            btn.style.background = '#dc3545';
            setTimeout(() => {
                if (btn) {
                    btn.textContent = originalText;
                    btn.style.background = '#007acc';
                }
            }, 1500);
        }
    }
    /**
     * 隐藏面板
     */
    hidePanel() {
        if (this.panelElement) {
            this.panelElement.remove();
            this.panelElement = null;
        }
    }
    /**
     * 初始化插件
     */
    initialize() {
        console.log('浏览器框选复制插件已初始化');
    }
    /**
     * 清理资源
     */
    cleanup() {
        this.clearSelection();
        this.hidePanel();
    }
}
// 防止重复初始化
if (!window.browserSelectionCopy) {
    window.browserSelectionCopy = new BrowserSelectionCopy();
    window.browserSelectionCopy.initialize();
}
{ BrowserSelectionCopy };


// === build/dist/main.js ===

/**
 * 主控制器 - 简化版，直接使用合并后的组件
 */
class MainController {
    browserSelectionCopy;
    isActive = false;
    constructor() {
        this.browserSelectionCopy = new BrowserSelectionCopy();
    }
    /**
     * 初始化控制器
     */
    initialize() {
        if (this.isActive)
            return;
        this.isActive = true;
        this.browserSelectionCopy.initialize();
    }
    /**
     * 销毁控制器
     */
    destroy() {
        if (!this.isActive)
            return;
        this.isActive = false;
        this.browserSelectionCopy.cleanup();
    }
}



// === 初始化代码 ===
(function() {
  // 检查是否已经初始化过
  if (window.browserSelectionCopyController) {
    return;
  }

  try {
    // 创建主控制器实例
    const controller = new MainController();
    
    // 将控制器实例保存到全局，避免重复初始化
    window.browserSelectionCopyController = controller;
    
    // 初始化控制器
    controller.initialize();
    
    console.log('浏览器框选复制插件已初始化');
  } catch (error) {
    console.error('插件初始化失败:', error);
  }
})();
