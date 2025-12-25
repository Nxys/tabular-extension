import { CSS_CLASS_PREFIX } from '../shared/constants';

/**
 * 面板调度（创建 / 销毁 - 合并版）
 * 
 * 职责：
 * - 成功结果 UI（showResult）
 * - 免费用尽 UI（showLimit）
 * - 升级 Pro UI（showPro）
 * - 面板拖动、定位等交互
 * 
 * 禁止：
 * - 不得包含业务逻辑判断
 * - 不得拼装业务文案
 * - 不得读取 usage、pro 状态
 */

export class Panel {
  private element: HTMLDivElement | null = null;
  private currentText = '';
  private dragState:
    | { startX: number; startY: number; originLeft: number; originTop: number }
    | null = null;

  /**
   * 显示结果面板
   * 
   * 接收 background 生成的数据，纯渲染
   */
  showResult(uiData?: { text?: string; table?: string[][]; csv?: string }): void {
    this.hide();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = `${CSS_CLASS_PREFIX}-panel`;
    
    // 标题栏
    const header = this.createHeader('📋', '文本预览');
    
    // 内容区域
    const previewWrapper = document.createElement('div');
    previewWrapper.className = `${CSS_CLASS_PREFIX}-panel-preview-wrapper`;

    const preview = document.createElement('textarea');
    preview.className = `${CSS_CLASS_PREFIX}-panel-textarea`;
    preview.readOnly = false;
    
    // 渲染内容
    if (uiData?.text) {
      this.currentText = uiData.text;
      preview.value = uiData.text;
    } else if (uiData?.table) {
      this.currentText = uiData.table.map(row => row.join('')).join('\n');
      preview.value = this.currentText;
      this.element.classList.add(`${CSS_CLASS_PREFIX}-table-mode`);
    }
    
    preview.oninput = (e) => {
      const target = e.target as HTMLTextAreaElement;
      this.currentText = target.value;
    };

    previewWrapper.appendChild(preview);

    // 复制按钮容器
    const copyBtnWrapper = document.createElement('div');
    copyBtnWrapper.className = `${CSS_CLASS_PREFIX}-panel-copy-wrapper`;

    // 复制按钮
    const copyBtn = this.createCopyButton();
    copyBtnWrapper.appendChild(copyBtn);

    // 如果有 CSV，添加导出按钮
    if (uiData?.csv) {
      const csvBtn = this.createCSVButton(uiData.csv);
      copyBtnWrapper.insertBefore(csvBtn, copyBtn);
    }

    // 组装面板
    this.element.appendChild(header);
    this.element.appendChild(previewWrapper);
    this.element.appendChild(copyBtnWrapper);

    document.body.appendChild(this.element);
    this.adjustPositionForViewport();
    this.bindDragEvents(header);
  }

  /**
   * 显示限制提示
   * 
   * 接收 background 生成的完整文案
   */
  showLimit(uiData?: { message?: string }): void {
    this.hide();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = `${CSS_CLASS_PREFIX}-panel ${CSS_CLASS_PREFIX}-panel-force-center`;
    
    // 标题栏
    const header = this.createHeader('🚫', '使用限制');
    
    // 消息内容
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `${CSS_CLASS_PREFIX}-panel-message-wrapper`;

    const message = document.createElement('div');
    message.className = `${CSS_CLASS_PREFIX}-panel-message`;
    message.textContent = uiData?.message || '今日免费次数已用完';

    messageWrapper.appendChild(message);

    // 组装面板
    this.element.appendChild(header);
    this.element.appendChild(messageWrapper);

    document.body.appendChild(this.element);
    this.bindDragEvents(header);
  }

  /**
   * 显示 Pro 升级提示
   * 
   * 接收 background 生成的完整文案
   */
  showPro(uiData?: { message?: string }): void {
    this.hide();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = `${CSS_CLASS_PREFIX}-panel ${CSS_CLASS_PREFIX}-panel-force-center`;
    
    // 标题栏
    const header = this.createHeader('⭐', 'Pro 功能');
    
    // 消息内容
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `${CSS_CLASS_PREFIX}-panel-message-wrapper`;

    const message = document.createElement('div');
    message.className = `${CSS_CLASS_PREFIX}-panel-message`;
    message.textContent = uiData?.message || '这是 Pro 功能';

    messageWrapper.appendChild(message);

    // 组装面板
    this.element.appendChild(header);
    this.element.appendChild(messageWrapper);

    document.body.appendChild(this.element);
    this.bindDragEvents(header);
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
   * ============================================
   * 私有辅助方法
   * ============================================
   */

  /**
   * 创建标题栏
   */
  private createHeader(icon: string, title: string): HTMLDivElement {
    const header = document.createElement('div');
    header.className = `${CSS_CLASS_PREFIX}-panel-header`;

    const titleSpan = document.createElement('span');
    titleSpan.className = `${CSS_CLASS_PREFIX}-panel-title`;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = `${CSS_CLASS_PREFIX}-panel-icon`;
    iconSpan.textContent = icon;
    
    const titleText = document.createElement('span');
    titleText.textContent = title;
    
    titleSpan.appendChild(iconSpan);
    titleSpan.appendChild(titleText);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = `${CSS_CLASS_PREFIX}-panel-close`;
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.hide();

    header.appendChild(titleSpan);
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * 创建复制按钮
   */
  private createCopyButton(): HTMLButtonElement {
    const copyBtn = document.createElement('button');
    copyBtn.className = `${CSS_CLASS_PREFIX}-panel-copy-btn`;
    copyBtn.dataset.role = 'copy';
    
    const copyBtnContent = document.createElement('span');
    copyBtnContent.className = `${CSS_CLASS_PREFIX}-panel-copy-btn-content`;
    
    const copyBtnIcon = document.createElement('span');
    copyBtnIcon.className = `${CSS_CLASS_PREFIX}-panel-copy-btn-icon`;
    copyBtnIcon.textContent = '📄';
    
    const copyBtnText = document.createElement('span');
    copyBtnText.textContent = '复制到剪贴板';
    
    copyBtnContent.appendChild(copyBtnIcon);
    copyBtnContent.appendChild(copyBtnText);
    copyBtn.appendChild(copyBtnContent);
    
    copyBtn.onclick = () => {
      this.copyToClipboard();
      setTimeout(() => this.hide(), 1500);
    };

    return copyBtn;
  }

  /**
   * 创建 CSV 导出按钮
   */
  private createCSVButton(csv: string): HTMLButtonElement {
    const csvBtn = document.createElement('button');
    csvBtn.className = `${CSS_CLASS_PREFIX}-panel-csv-btn`;
    csvBtn.textContent = '📊 导出 CSV';
    csvBtn.onclick = () => {
      this.downloadCSV(csv);
    };
    
    return csvBtn;
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
   * 下载 CSV 文件
   */
  private downloadCSV(csv: string): void {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `table-${Date.now()}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * 显示复制成功
   */
  private showCopySuccess(): void {
    const btn = this.element?.querySelector<HTMLButtonElement>('button[data-role="copy"]');
    if (btn) {
      const originalHTML = btn.innerHTML;
      const iconSpan = btn.querySelector(`.${CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
      const textSpan = btn.querySelector(`.${CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
      
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
      const iconSpan = btn.querySelector(`.${CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
      const textSpan = btn.querySelector(`.${CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
      
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
   * 绑定拖动事件
   */
  private bindDragEvents(header: HTMLDivElement): void {
    header.addEventListener('mousedown', (event) => this.startDrag(event));
    document.addEventListener('mousemove', this.handleDrag);
    document.addEventListener('mouseup', this.endDrag);
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

  /**
   * 调整面板位置以确保完整显示在视口内
   */
  private adjustPositionForViewport(): void {
    if (!this.element) return;

    const rect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.left;
    let top = rect.top;
    let adjusted = false;

    // 检查右侧边界
    if (rect.right > viewportWidth) {
      left = viewportWidth - rect.width;
      adjusted = true;
    }

    // 检查底部边界
    if (rect.bottom > viewportHeight) {
      top = viewportHeight - rect.height;
      adjusted = true;
    }

    // 检查左侧边界
    if (left < 0) {
      left = 0;
      adjusted = true;
    }

    // 检查顶部边界
    if (top < 0) {
      top = 0;
      adjusted = true;
    }

    // 应用新位置
    if (adjusted) {
      this.element.style.left = `${left}px`;
      this.element.style.top = `${top}px`;
    }
  }
}
