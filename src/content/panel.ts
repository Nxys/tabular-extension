/**
 * 结果面板
 * 显示提取结果和提供复制功能的浮动面板
 */
export class Panel {
  private element: HTMLDivElement | null = null;
  private currentText = '';
  private readonly CSS_CLASS_PREFIX = 'browser-selection-copy';
  private dragState:
    | { startX: number; startY: number; originLeft: number; originTop: number }
    | null = null;

  /**
   * 显示结果
   */
  show(
    text: string,
    options: { position: { left: number; top: number }; editable?: boolean } = {
      position: { left: 50, top: 50 },
      editable: true
    }
  ): void {
    console.log('面板显示被调用，文本长度:', text.length);
    console.log('文本内容:', text);
    this.currentText = text;
    this.createElement(options.position, options.editable ?? true);
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
    document.removeEventListener('mousemove', this.handleDrag);
    document.removeEventListener('mouseup', this.endDrag);
    this.dragState = null;
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
  private createElement(position: { left: number; top: number }, editable: boolean): void {
    console.log('开始创建面板元素');
    this.hide(); // 确保只有一个面板

    this.element = document.createElement('div');
    this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
    
    Object.assign(this.element.style, {
      position: 'fixed',
      top: `${position.top}px`,
      left: `${position.left}px`,
      width: '320px',
      maxHeight: '440px',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: '2147483647',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      padding: '0',
      display: 'block',
      visibility: 'visible',
      opacity: '1',
      pointerEvents: 'auto',
      overflow: 'hidden'
    });

    console.log('面板样式已设置');

    const header = document.createElement('div');
    header.className = `${this.CSS_CLASS_PREFIX}-panel-header`;
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      cursor: move;
      user-select: none;
      background: #f7f7f7;
      border-bottom: 1px solid #eee;
      font-weight: 600;
    `;
    header.textContent = '文本预览';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = '×';
    closeBtn.dataset.role = 'close';
    closeBtn.style.cssText = `
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 6px;
      background: transparent;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: #666;
      padding: 0;
    `;
    closeBtn.onclick = () => this.hide();
    header.appendChild(closeBtn);

    // 文本预览
    const preview = document.createElement('textarea');
    preview.style.cssText = `
      width: 100%;
      height: 220px;
      resize: none;
      border: none;
      outline: none;
      padding: 12px;
      background: #fdfdfd;
      border-bottom: 1px solid #eee;
      white-space: pre-wrap;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
      color: #222;
    `;
    preview.readOnly = !editable;
    preview.value = this.currentText;
    preview.oninput = (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.currentText = target.value;
    };

    // 复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.textContent = '复制到剪贴板';
    copyBtn.dataset.role = 'copy';
    copyBtn.style.cssText = `
      width: calc(100% - 24px);
      margin: 12px;
      padding: 10px;
      background: #007acc;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    `;
    copyBtn.onclick = () => this.copyToClipboard();

    this.element.appendChild(header);
    this.element.appendChild(preview);
    this.element.appendChild(copyBtn);
    
    console.log('将面板添加到页面');
    document.body.appendChild(this.element);
    
    console.log('面板已添加到DOM，元素:', this.element);
    console.log('面板位置:', this.element.getBoundingClientRect());

    // 绑定拖动
    header.addEventListener('mousedown', (event) => this.startDrag(event));
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.endDrag);
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
    const btn = this.element?.querySelector<HTMLButtonElement>('button[data-role="copy"]');
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
    const btn = this.element?.querySelector<HTMLButtonElement>('button[data-role="copy"]');
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
   * 开始拖动
   */
  private startDrag(event: MouseEvent): void {
    if (!this.element) return;
    const rect = this.element.getBoundingClientRect();
    this.dragState = {
      startX: event.clientX,
      startY: event.clientY,
      originLeft: rect.left,
      originTop: rect.top
    };
    event.preventDefault();
  }

  /**
   * 处理拖动
   */
  private handleDrag = (event: MouseEvent): void => {
    if (!this.dragState || !this.element) return;
    const deltaX = event.clientX - this.dragState.startX;
    const deltaY = event.clientY - this.dragState.startY;

    const nextLeft = this.dragState.originLeft + deltaX;
    const nextTop = this.dragState.originTop + deltaY;

    const maxLeft = window.innerWidth - this.element.offsetWidth;
    const maxTop = window.innerHeight - this.element.offsetHeight;

    this.element.style.left = `${Math.min(Math.max(0, nextLeft), Math.max(0, maxLeft))}px`;
    this.element.style.top = `${Math.min(Math.max(0, nextTop), Math.max(0, maxTop))}px`;
  };

  /**
   * 结束拖动
   */
  private endDrag = (): void => {
    this.dragState = null;
  };
}