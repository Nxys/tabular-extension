import { SelectionRect, TextElement } from './types.js';

/**
 * 浏览器框选复制插件 - 内容脚本
 * 合并了选择框、文本提取器和结果面板的核心功能
 */
class BrowserSelectionCopy {
  // 选择框相关
  private selectionElement: HTMLDivElement | null = null;
  private startX = 0;
  private startY = 0;
  private isSelecting = false;
  
  // 结果面板相关
  private panelElement: HTMLDivElement | null = null;
  private currentText = '';
  
  // 常量
  private readonly LINE_TOLERANCE = 5;
  private readonly CSS_CLASS_PREFIX = 'browser-selection-copy';

  constructor() {
    this.bindEvents();
  }

  /**
   * 绑定鼠标事件
   */
  private bindEvents(): void {
    document.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  /**
   * 鼠标按下事件
   */
  private handleMouseDown(event: MouseEvent): void {
    // 忽略右键和中键
    if (event.button !== 0) return;
    
    // 忽略在面板上的点击
    if (this.panelElement?.contains(event.target as Node)) return;
    
    this.startSelection(event.clientX, event.clientY);
    event.preventDefault();
  }

  /**
   * 鼠标移动事件
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isSelecting) return;
    this.updateSelection(event.clientX, event.clientY);
  }

  /**
   * 鼠标释放事件
   */
  private handleMouseUp(_event: MouseEvent): void {
    if (!this.isSelecting) return;
    
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
  private handleOutsideClick(event: Event): void {
    if (this.panelElement && !this.panelElement.contains(event.target as Node)) {
      this.hidePanel();
    }
  }

  // === 选择框功能 ===

  /**
   * 开始选择
   */
  private startSelection(x: number, y: number): void {
    this.startX = x;
    this.startY = y;
    this.isSelecting = true;
    this.hidePanel(); // 隐藏之前的面板
    this.createSelectionElement();
  }

  /**
   * 更新选择框
   */
  private updateSelection(x: number, y: number): void {
    if (!this.selectionElement) return;

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
  private finishSelection(): SelectionRect | null {
    if (!this.selectionElement) return null;

    const rect = this.selectionElement.getBoundingClientRect();
    const selectionRect: SelectionRect = {
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
  private createSelectionElement(): void {
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
  private clearSelection(): void {
    if (this.selectionElement) {
      this.selectionElement.remove();
      this.selectionElement = null;
    }
    this.isSelecting = false;
  }

  /**
   * 验证选择是否有效
   */
  private isValidSelection(rect: SelectionRect): boolean {
    const width = rect.right - rect.left;
    const height = rect.bottom - rect.top;
    return width > 10 && height > 10; // 最小选择区域
  }

  // === 文本提取功能 ===

  /**
   * 提取选择区域内的文本
   */
  private extractText(rect: SelectionRect): string {
    const elements = this.getTextElements(rect);
    const sorted = this.sortByVisualOrder(elements);
    return this.combineText(sorted);
  }

  /**
   * 获取文本元素
   */
  private getTextElements(rect: SelectionRect): TextElement[] {
    const elements: TextElement[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          return parent && this.isVisible(parent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node: Text | null;
    while (node = walker.nextNode() as Text) {
      const parent = node.parentElement!;
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
  private isVisible(element: Element): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  /**
   * 检查矩形是否相交
   */
  private intersects(rect1: SelectionRect, rect2: SelectionRect): boolean {
    return !(rect1.right < rect2.left || 
             rect1.left > rect2.right ||
             rect1.bottom < rect2.top ||
             rect1.top > rect2.bottom);
  }

  /**
   * 按视觉顺序排序
   */
  private sortByVisualOrder(elements: TextElement[]): TextElement[] {
    // 按行分组
    const lines: TextElement[][] = [];
    
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
  private combineText(elements: TextElement[]): string {
    if (elements.length === 0) return '';

    const lines: string[] = [];
    let currentLine: string[] = [];
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
  private showResult(text: string): void {
    this.currentText = text;
    this.createPanel();
  }

  /**
   * 创建面板
   */
  private createPanel(): void {
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
  private async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.currentText);
      this.showCopySuccess();
    } catch (error) {
      console.error('复制失败:', error);
      this.showCopyError();
    }
  }

  /**
   * 显示复制成功
   */
  private showCopySuccess(): void {
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
  private showCopyError(): void {
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
  private hidePanel(): void {
    if (this.panelElement) {
      this.panelElement.remove();
      this.panelElement = null;
    }
  }

  /**
   * 初始化插件
   */
  initialize(): void {
    console.log('浏览器框选复制插件已初始化');
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.clearSelection();
    this.hidePanel();
  }
}

// 全局初始化
declare global {
  interface Window {
    browserSelectionCopy?: BrowserSelectionCopy;
  }
}

// 防止重复初始化
if (!window.browserSelectionCopy) {
  window.browserSelectionCopy = new BrowserSelectionCopy();
  window.browserSelectionCopy.initialize();
}

export { BrowserSelectionCopy };