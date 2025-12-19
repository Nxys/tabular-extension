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
    this.currentText = text;
    this.createElement(options.position, options.editable ?? true);
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
    this.hide(); // 确保只有一个面板

    // 创建面板容器
    this.element = document.createElement('div');
    this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
    this.element.style.top = `${position.top}px`;
    this.element.style.left = `${position.left}px`;

    // 标题栏
    const header = document.createElement('div');
    header.className = `${this.CSS_CLASS_PREFIX}-panel-header`;

    // 标题文字
    const title = document.createElement('span');
    title.className = `${this.CSS_CLASS_PREFIX}-panel-title`;
    
    // 图标
    const icon = document.createElement('span');
    icon.className = `${this.CSS_CLASS_PREFIX}-panel-icon`;
    icon.textContent = '📋';
    
    // 标题文本
    const titleText = document.createElement('span');
    titleText.textContent = '文本预览';
    
    title.appendChild(icon);
    title.appendChild(titleText);

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-close`;
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 文本预览区域
    const previewWrapper = document.createElement('div');
    previewWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-preview-wrapper`;

    const preview = document.createElement('textarea');
    preview.className = `${this.CSS_CLASS_PREFIX}-panel-textarea`;
    preview.readOnly = !editable;
    preview.value = this.currentText;
    preview.oninput = (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.currentText = target.value;
    };

    previewWrapper.appendChild(preview);

    // 复制按钮容器
    const copyBtnWrapper = document.createElement('div');
    copyBtnWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-copy-wrapper`;

    // 复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn`;
    copyBtn.dataset.role = 'copy';
    
    const copyBtnContent = document.createElement('span');
    copyBtnContent.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn-content`;
    
    const copyBtnIcon = document.createElement('span');
    copyBtnIcon.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`;
    copyBtnIcon.textContent = '📄';
    
    const copyBtnText = document.createElement('span');
    copyBtnText.textContent = '复制到剪贴板';
    
    copyBtnContent.appendChild(copyBtnIcon);
    copyBtnContent.appendChild(copyBtnText);
    copyBtn.appendChild(copyBtnContent);
    
    copyBtn.onclick = () => {
      this.copyToClipboard();
      // 复制后关闭面板
      setTimeout(() => this.hide(), 1500);
    };

    copyBtnWrapper.appendChild(copyBtn);

    // 组装面板
    this.element.appendChild(header);
    this.element.appendChild(previewWrapper);
    this.element.appendChild(copyBtnWrapper);

    document.body.appendChild(this.element);

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
      const originalHTML = btn.innerHTML;
      const iconSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
      const textSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
      
      if (iconSpan && textSpan) {
        iconSpan.textContent = '✓';
        textSpan.textContent = '已复制';
      }
      
      btn.classList.add('success');
      
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = originalHTML;
          btn.classList.remove('success');
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
      const originalHTML = btn.innerHTML;
      const iconSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
      const textSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
      
      if (iconSpan && textSpan) {
        iconSpan.textContent = '✗';
        textSpan.textContent = '复制失败';
      }
      
      btn.classList.add('error');
      
      setTimeout(() => {
        if (btn) {
          btn.innerHTML = originalHTML;
          btn.classList.remove('error');
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