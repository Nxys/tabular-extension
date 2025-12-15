/**
 * 结果面板
 * 显示提取结果和提供复制功能的浮动面板
 */
export class Panel {
  private element: HTMLDivElement | null = null;
  private currentText = '';
  private readonly CSS_CLASS_PREFIX = 'browser-selection-copy';

  /**
   * 显示结果
   */
  show(text: string): void {
    console.log('面板显示被调用，文本长度:', text.length);
    console.log('文本内容:', text);
    this.currentText = text;
    this.createElement();
    console.log('面板元素已创建');
  }

  /**
   * 隐藏面板
   */
  hide(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
  }

  /**
   * 检查点击是否在面板内
   */
  contains(target: Node | null): boolean {
    return this.element?.contains(target) ?? false;
  }

  /**
   * 创建面板
   */
  private createElement(): void {
    console.log('开始创建面板元素');
    this.hide(); // 确保只有一个面板

    this.element = document.createElement('div');
    this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
    
    Object.assign(this.element.style, {
      position: 'fixed',
      top: '50px',
      right: '50px',
      width: '300px',
      maxHeight: '400px',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '2147483647',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      padding: '16px',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto'
    });

    console.log('面板样式已设置');

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

    this.element.appendChild(preview);
    this.element.appendChild(copyBtn);
    
    console.log('将面板添加到页面');
    document.body.appendChild(this.element);
    
    console.log('面板已添加到DOM，元素:', this.element);
    console.log('面板位置:', this.element.getBoundingClientRect());
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
    const btn = this.element?.querySelector('button');
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
    const btn = this.element?.querySelector('button');
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
}

