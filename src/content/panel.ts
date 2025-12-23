import { FREE_POLICY } from './usage/policy';

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
    options: { 
      position: { left: number; top: number }; 
      editable?: boolean;
      usageInfo?: { remaining: number; max: number }; // 新增：使用信息
    } = {
      position: { left: 50, top: 50 },
      editable: true
    }
  ): void {
    this.currentText = text;
    this.createElement(
      options.position, 
      options.editable ?? true, 
      undefined, // config 参数
      false, // forceCenter 参数
      options.usageInfo // 传递 usageInfo
    );
    
    // 调用边界检测，确保面板完整显示在视口内
    this.adjustPositionForViewport();
  }

  /**
   * 显示使用限制提示
   */
  showLimitReached(usageInfo?: { current: number; max: number }): void {
    // 如果没有传入 usageInfo，从策略模块读取
    const maxPerDay = usageInfo?.max ?? FREE_POLICY.maxPerDay;
    const current = usageInfo?.current ?? maxPerDay;
    
    this.createElement(
      { left: 50, top: 50 },
      false,
      {
        type: 'limit',
        title: '使用限制',
        icon: '🚫',
        message: '今日免费次数已用完',
        showUpgradeButton: true,
        usageInfo: { current, max: maxPerDay }
      },
      true // forceCenter: 强制居中显示
    );
  }

  /**
   * 显示对齐后的表格
   * 
   * @param table 对齐后的二维字符串数组
   */
  showAligned(table: string[][]): void {
    // 将二维数组转换为文本
    const text = table.map(row => row.join('')).join('\n');
    
    // 使用现有的 show 方法，但添加特殊标记
    this.show(text, {
      position: { left: 50, top: 50 },
      editable: true
    });
    
    // 添加表格标识（用于样式）
    if (this.element) {
      this.element.classList.add(`${this.CSS_CLASS_PREFIX}-table-mode`);
    }
  }

  /**
   * 启用 CSV 导出
   * 
   * @param csv CSV 字符串
   * @param onExport 导出时的回调函数（可选）
   */
  enableCSVExport(csv: string, onExport?: () => void | Promise<void>): void {
    if (!this.element) return;
    
    // 查找复制按钮容器
    const copyWrapper = this.element.querySelector(
      `.${this.CSS_CLASS_PREFIX}-panel-copy-wrapper`
    );
    
    if (!copyWrapper) return;
    
    // 创建 CSV 导出按钮
    const csvBtn = document.createElement('button');
    csvBtn.className = `${this.CSS_CLASS_PREFIX}-panel-csv-btn`;
    csvBtn.textContent = '📊 导出 CSV';
    csvBtn.onclick = async () => {
      this.downloadCSV(csv);
      // 调用回调函数（如果提供）
      if (onExport) {
        await onExport();
      }
    };
    
    // 插入到复制按钮之前
    copyWrapper.insertBefore(csvBtn, copyWrapper.firstChild);
  }

  /**
   * 显示 Pro 升级提示
   */
  showProRequired(): void {
    this.createElement(
      { left: 50, top: 50 },
      false,
      {
        type: 'pro-required',
        title: 'Pro 功能',
        icon: '⭐',
        message: '表格识别是 Pro 功能',
        showUpgradeButton: true
      },
      true // forceCenter: 强制居中显示
    );
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
  private createElement(
    position: { left: number; top: number },
    editable: boolean,
    config?: {
      type?: 'limit' | 'pro-required';
      title?: string;
      icon?: string;
      message?: string;
      showUpgradeButton?: boolean;
      usageInfo?: { current: number; max: number }; // 限制面板使用信息
    },
    forceCenter?: boolean, // 是否强制居中
    usageInfo?: { remaining: number; max: number } // 文本预览面板使用信息
  ): void {
    this.hide(); // 确保只有一个面板

    // 创建面板容器
    this.element = document.createElement('div');
    this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
    
    // 根据 forceCenter 参数决定定位方式
    if (forceCenter) {
      // 强制居中：添加特殊 CSS 类
      this.element.classList.add(`${this.CSS_CLASS_PREFIX}-panel-force-center`);
    } else {
      // 普通定位：使用传入的位置
      this.element.style.top = `${position.top}px`;
      this.element.style.left = `${position.left}px`;
    }

    // 标题栏
    const header = document.createElement('div');
    header.className = `${this.CSS_CLASS_PREFIX}-panel-header`;

    // 标题文字
    const title = document.createElement('span');
    title.className = `${this.CSS_CLASS_PREFIX}-panel-title`;
    
    // 图标
    const icon = document.createElement('span');
    icon.className = `${this.CSS_CLASS_PREFIX}-panel-icon`;
    icon.textContent = config?.icon ?? '📋';
    
    // 标题文本
    const titleText = document.createElement('span');
    titleText.textContent = config?.title ?? '文本预览';
    
    title.appendChild(icon);
    title.appendChild(titleText);
    
    // 如果是文本预览面板且有 usageInfo，添加免费额度显示
    if (!config?.type && usageInfo) {
      const usageInfoSpan = document.createElement('span');
      usageInfoSpan.className = `${this.CSS_CLASS_PREFIX}-panel-usage-info`;
      usageInfoSpan.textContent = `剩余 ${usageInfo.remaining} 次`;
      title.appendChild(usageInfoSpan);
    }

    // 关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-close`;
    closeBtn.textContent = '×';
    closeBtn.onclick = () => this.hide();

    header.appendChild(title);
    header.appendChild(closeBtn);

    // 根据类型创建不同的内容
    if (config?.type === 'limit' || config?.type === 'pro-required') {
      // 限制提示内容或 Pro 升级提示
      const messageWrapper = document.createElement('div');
      messageWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-message-wrapper`;

      const message = document.createElement('div');
      message.className = `${this.CSS_CLASS_PREFIX}-panel-message`;
      message.textContent = config.message ?? '';

      messageWrapper.appendChild(message);

      // 如果是限制类型，添加额外信息
      if (config.type === 'limit') {
        // 主提示：次数信息（应用新样式类）
        const countInfo = document.createElement('div');
        countInfo.className = `${this.CSS_CLASS_PREFIX}-panel-limit-count`;
        
        // 使用 usageInfo 动态生成次数显示文本
        if (config.usageInfo) {
          countInfo.textContent = `(${config.usageInfo.current}/${config.usageInfo.max})`;
        } else {
          // 后备方案：从策略模块读取
          countInfo.textContent = `(${FREE_POLICY.maxPerDay}/${FREE_POLICY.maxPerDay})`;
        }

        // 次要说明：重置信息（应用新样式类）
        const resetInfo = document.createElement('div');
        resetInfo.className = `${this.CSS_CLASS_PREFIX}-panel-limit-secondary`;
        resetInfo.textContent = '明天将自动重置';

        messageWrapper.appendChild(countInfo);
        messageWrapper.appendChild(resetInfo);
      }

      this.element.appendChild(header);
      this.element.appendChild(messageWrapper);

      // 升级按钮（占位）
      if (config.showUpgradeButton) {
        const upgradeBtnWrapper = document.createElement('div');
        upgradeBtnWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-upgrade-wrapper`;

        const upgradeBtn = document.createElement('button');
        upgradeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-upgrade-btn`;
        upgradeBtn.textContent = '升级 Pro（占位）';
        upgradeBtn.onclick = () => {
          // 占位按钮，当前无实际功能
          console.log('升级 Pro 功能尚未实现');
        };

        upgradeBtnWrapper.appendChild(upgradeBtn);
        this.element.appendChild(upgradeBtnWrapper);
      }
    } else {
      // 原有的文本预览内容
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
    }

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
   * 下载 CSV 文件
   * 
   * @param csv CSV 字符串
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

  /**
   * 调整面板位置以确保完整显示在视口内
   * 优先保证底部和右侧可见
   */
  private adjustPositionForViewport(): void {
    if (!this.element) return;

    const rect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = rect.left;
    let top = rect.top;
    let adjusted = false;

    // 检查右侧边界（优先保证右侧可见）
    if (rect.right > viewportWidth) {
      left = viewportWidth - rect.width;
      adjusted = true;
    }

    // 检查底部边界（优先保证底部可见）
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

    // 如果需要调整，应用新位置
    if (adjusted) {
      this.element.style.left = `${left}px`;
      this.element.style.top = `${top}px`;
    }
  }
}