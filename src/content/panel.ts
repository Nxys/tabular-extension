import { CSS_CLASS_PREFIX, Z_INDEX } from '../shared/constants';
import type { PanelPosition } from '../shared/types';

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
  private mousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private onActionRequest?: (action: string, data: unknown) => void;
  
  /**
   * 全局弹窗栈，用于管理多层弹窗的ESC键关闭顺序
   */
  private static dialogStack: HTMLElement[] = [];
  
  /**
   * 主面板ESC键监听器
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    // 只有在没有弹窗时才关闭主面板
    if (event.key === 'Escape' && Panel.dialogStack.length === 0) {
      this.hide();
    }
  };

  /**
   * 更新鼠标位置（用于跟随鼠标定位）
   */
  updateMousePosition(x: number, y: number): void {
    this.mousePosition = { x, y };
  }

  /**
   * 设置操作请求回调
   */
  setActionRequestCallback(callback: (action: string, data: unknown) => void): void {
    this.onActionRequest = callback;
  }

  /**
   * 显示结果面板
   * 
   * 接收 background 生成的数据，纯渲染
   */
  showResult(uiData?: { 
    text?: string; 
    table?: string[][]; 
    csv?: string;
    rowLimit?: number;
    totalRows?: number;
    isLimited?: boolean;
    limitMessage?: string;  // 由 Background 生成的限制提示文案
    upgradeUrl?: string;    // 升级页面 URL（由 Background 生成）
    trialRemaining?: number;
  }, panelPosition: PanelPosition = 'center'): void {
    // 直接复制模式：不显示面板，直接复制到剪贴板
    if (panelPosition === 'none') {
      this.copyDirectly(uiData);
      return;
    }

    this.hide();
    
    // 禁用页面文本选择
    this.disableTextSelection();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = `${CSS_CLASS_PREFIX}-panel`;
    this.element.style.zIndex = String(Z_INDEX.PANEL);
    
    // 标题栏
    const header = this.createHeader('📋', '文本预览');
    
    // 内容区域
    const previewWrapper = document.createElement('div');
    previewWrapper.className = `${CSS_CLASS_PREFIX}-panel-preview-wrapper`;

    // 超限提示条（如果被限制且有提示文案）
    if (uiData?.isLimited && uiData?.limitMessage) {
      const banner = this.createLimitBanner(uiData.limitMessage, uiData.upgradeUrl);
      previewWrapper.appendChild(banner);
    }

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

    // 检查是否有有效内容
    const hasContent = !!(uiData?.text && uiData.text.trim().length > 0);

    // 按钮容器
    const btnWrapper = document.createElement('div');
    btnWrapper.className = `${CSS_CLASS_PREFIX}-panel-copy-wrapper`;

    // 高级清洗按钮
    const advancedCleanBtn = this.createAdvancedCleanButton(uiData?.trialRemaining, hasContent);
    btnWrapper.appendChild(advancedCleanBtn);

    // 导出按钮
    const exportBtn = this.createExportButton(uiData?.trialRemaining, hasContent);
    btnWrapper.appendChild(exportBtn);

    // 复制按钮
    const copyBtn = this.createCopyButton(hasContent);
    btnWrapper.appendChild(copyBtn);

    // 组装面板
    this.element.appendChild(header);
    this.element.appendChild(previewWrapper);
    this.element.appendChild(btnWrapper);

    document.body.appendChild(this.element);
    this.positionPanel(panelPosition);
    this.bindDragEvents(header);
    
    // 绑定ESC键监听
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 显示限制提示
   * 
   * 接收 background 生成的完整文案
   * 注意：限制提示始终页面居中显示
   */
  showLimit(uiData?: { message?: string }): void {
    this.hide();
    
    // 禁用页面文本选择
    this.disableTextSelection();
    
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
    
    // 绑定ESC键监听
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 显示 Pro 升级提示
   * 
   * 接收 background 生成的完整文案
   * 注意：Pro 提示始终页面居中显示
   */
  showPro(uiData?: { message?: string }): void {
    this.hide();
    
    // 禁用页面文本选择
    this.disableTextSelection();
    
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
    
    // 绑定ESC键监听
    document.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * 显示试用次数用尽提示
   * 
   * 接收 background 生成的完整文案（包含权益说明）
   * 注意：试用次数用尽提示始终页面居中显示
   */
  showTrialExhausted(uiData?: { message?: string; trialRemaining?: number }): void {
    this.hide();
    
    // 禁用页面文本选择
    this.disableTextSelection();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = `${CSS_CLASS_PREFIX}-panel ${CSS_CLASS_PREFIX}-panel-force-center`;
    
    // 标题栏
    const header = this.createHeader('🔒', '试用次数已用完');
    
    // 消息内容
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `${CSS_CLASS_PREFIX}-panel-message-wrapper`;

    const message = document.createElement('div');
    message.className = `${CSS_CLASS_PREFIX}-panel-message`;
    // 保留换行符格式
    message.style.whiteSpace = 'pre-line';
    
    // 如果提供了剩余次数，在消息前显示
    let messageText = uiData?.message || '试用次数已用完，升级 Pro 解锁无限使用';
    if (uiData?.trialRemaining !== undefined) {
      messageText = `剩余试用次数：${uiData.trialRemaining}\n\n${messageText}`;
    }
    
    message.textContent = messageText;

    messageWrapper.appendChild(message);

    // 组装面板
    this.element.appendChild(header);
    this.element.appendChild(messageWrapper);

    document.body.appendChild(this.element);
    this.bindDragEvents(header);
    
    // 绑定ESC键监听
    document.addEventListener('keydown', this.handleKeyDown);
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
    document.removeEventListener('keydown', this.handleKeyDown);
    this.dragState = null;
    this.enableTextSelection();
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
   * 禁用页面文本选择
   */
  private disableTextSelection(): void {
    const style = document.createElement('style');
    style.id = `${CSS_CLASS_PREFIX}-disable-selection`;
    style.textContent = `
      * {
        user-select: none !important;
        -webkit-user-select: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 恢复页面文本选择
   */
  private enableTextSelection(): void {
    const style = document.getElementById(`${CSS_CLASS_PREFIX}-disable-selection`);
    if (style) {
      style.remove();
    }
  }

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
  private createCopyButton(hasContent: boolean = true): HTMLButtonElement {
    const copyBtn = document.createElement('button');
    copyBtn.className = `${CSS_CLASS_PREFIX}-panel-copy-btn`;
    
    const copyBtnContent = document.createElement('span');
    copyBtnContent.className = `${CSS_CLASS_PREFIX}-panel-copy-btn-content`;
    
    const copyBtnIcon = document.createElement('span');
    copyBtnIcon.className = `${CSS_CLASS_PREFIX}-panel-copy-btn-icon`;
    copyBtnIcon.textContent = '📄';
    
    const copyBtnText = document.createElement('span');
    copyBtnText.textContent = '复制';
    
    copyBtnContent.appendChild(copyBtnIcon);
    copyBtnContent.appendChild(copyBtnText);
    copyBtn.appendChild(copyBtnContent);
    
    // 无内容时禁用按钮
    copyBtn.disabled = !hasContent;
    if (!hasContent) {
      copyBtn.style.opacity = '0.5';
      copyBtn.style.cursor = 'not-allowed';
    }
    
    copyBtn.onclick = () => {
      // 无内容时不响应点击
      if (!hasContent) return;
      this.copyToClipboard();
    };

    return copyBtn;
  }

  /**
   * 创建行数限制提示
   * 接收 Background 生成的完整文案
   */
  private createLimitHint(message: string): HTMLDivElement {
    const hint = document.createElement('div');
    hint.className = `${CSS_CLASS_PREFIX}-panel-limit-hint`;
    hint.textContent = message;
    return hint;
  }

  /**
   * 创建超限提示条
   * 
   * 在结果面板顶部显示超限提示，包含提示文案和升级按钮
   * 
   * @param limitMessage - 由 Background 生成的限制提示文案
   * @param upgradeUrl - 升级页面 URL（可选，缺失时使用默认 URL）
   * @returns 超限提示条 DOM 元素
   */
  private createLimitBanner(limitMessage: string, upgradeUrl?: string): HTMLDivElement {
    const banner = document.createElement('div');
    banner.className = `${CSS_CLASS_PREFIX}-panel-limit-banner`;
    
    // 提示文案
    const message = document.createElement('div');
    message.className = `${CSS_CLASS_PREFIX}-panel-limit-message`;
    message.textContent = limitMessage;
    
    // 升级按钮
    const btn = document.createElement('button');
    btn.className = `${CSS_CLASS_PREFIX}-panel-upgrade-btn`;
    btn.textContent = '🚀 升级Pro';
    btn.onclick = () => {
      // 使用提供的 URL 或默认 URL
      const url = upgradeUrl || 'https://example.com/upgrade';
      
      try {
        // 在当前标签页打开升级页面
        window.location.href = url;
      } catch (error) {
        // 页面跳转失败时的备用方案：复制链接到剪贴板
        console.error('无法跳转到升级页面:', error);
        
        // 尝试复制到剪贴板
        navigator.clipboard.writeText(url)
          .then(() => {
            this.showToast('❌ 无法跳转，升级链接已复制到剪贴板');
          })
          .catch(() => {
            this.showToast('❌ 无法跳转到升级页面');
          });
      }
    };
    
    banner.appendChild(message);
    banner.appendChild(btn);
    
    return banner;
  }

  /**
   * 创建高级清洗按钮
   */
  private createAdvancedCleanButton(trialRemaining?: number, hasContent: boolean = true): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `${CSS_CLASS_PREFIX}-panel-advanced-clean-btn`;
    
    // 基础文本
    let buttonText = '🧹 清洗';
    
    // 如果有试用次数信息，显示在按钮上
    if (trialRemaining !== undefined) {
      buttonText += ` (剩余 ${trialRemaining} 次)`;
    }
    
    btn.textContent = buttonText;
    
    // 检查是否应该禁用按钮
    const shouldDisable = !hasContent || (trialRemaining !== undefined && trialRemaining === 0);
    btn.disabled = shouldDisable;
    
    if (shouldDisable) {
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
    
    btn.onclick = () => {
      // 禁用时不响应点击
      if (shouldDisable) return;
      this.showCleaningDialog();
    };
    return btn;
  }

  /**
   * 创建导出按钮
   */
  private createExportButton(trialRemaining?: number, hasContent: boolean = true): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `${CSS_CLASS_PREFIX}-panel-export-btn`;
    
    // 基础文本
    let buttonText = '📤 导出';
    
    // 如果有试用次数信息，显示在按钮上
    if (trialRemaining !== undefined) {
      buttonText += ` (剩余 ${trialRemaining} 次)`;
    }
    
    btn.textContent = buttonText;
    
    // 检查是否应该禁用按钮
    const shouldDisable = !hasContent || (trialRemaining !== undefined && trialRemaining === 0);
    btn.disabled = shouldDisable;
    
    if (shouldDisable) {
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }
    
    btn.onclick = () => {
      // 禁用时不响应点击
      if (shouldDisable) return;
      this.showExportDialog();
    };
    return btn;
  }

  /**
   * 复制到剪贴板
   */
  private async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.currentText);
      this.showToast('✓ 已复制');
      this.hide();
    } catch (error) {
      console.error('复制失败:', error);
      this.showToast('✗ 复制失败');
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
   * 根据设置定位面板
   */
  private positionPanel(panelPosition: PanelPosition): void {
    if (!this.element) return;

    const rect = this.element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left: number;
    let top: number;

    switch (panelPosition) {
      case 'center':
        // 页面居中
        left = (viewportWidth - rect.width) / 2;
        top = (viewportHeight - rect.height) / 2;
        break;

      case 'mouse':
        // 跟随鼠标，偏移一点避免遮挡
        left = this.mousePosition.x + 10;
        top = this.mousePosition.y + 10;
        break;

      case 'none':
        // 直接复制模式，不显示面板（但这里仍需定位，以防万一）
        left = 20;
        top = 20;
        break;

      default:
        // 默认居中
        left = (viewportWidth - rect.width) / 2;
        top = (viewportHeight - rect.height) / 2;
    }

    // 确保面板完整显示在视口内
    left = Math.max(0, Math.min(left, viewportWidth - rect.width));
    top = Math.max(0, Math.min(top, viewportHeight - rect.height));

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }

  /**
   * 直接复制到剪贴板（不显示面板）
   */
  private async copyDirectly(uiData?: { text?: string; table?: string[][]; csv?: string }): Promise<void> {
    let textToCopy = '';
    
    if (uiData?.text) {
      textToCopy = uiData.text;
    } else if (uiData?.table) {
      textToCopy = uiData.table.map(row => row.join('')).join('\n');
    }
    
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        this.showToast('✓ 已复制');
      } catch (error) {
        console.error('复制失败:', error);
        this.showToast('✗ 复制失败');
      }
    }
  }

  /**
   * 显示 Toast 提示（统一风格，跟随浏览器主题）
   */
  private showToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = `${CSS_CLASS_PREFIX}-toast`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 1.5 秒后自动消失
    setTimeout(() => {
      toast.remove();
    }, 1500);
  }

  /**
   * 显示清洗规则选择弹窗
   */
  showCleaningDialog(uiData?: { text?: string }): void {
    // 如果 uiData 提供了文本，使用它；否则使用当前文本
    const textToClean = uiData?.text || this.currentText;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
    overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);
    overlay.style.pointerEvents = 'auto';
    
    // 阻止遮罩层上的鼠标事件触发框选
    overlay.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
    dialog.style.zIndex = String(Z_INDEX.DIALOG);
    
    // 标题
    const title = document.createElement('div');
    title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
    title.textContent = '高级清洗规则';
    
    // 规则选项容器
    const rulesContainer = document.createElement('div');
    rulesContainer.className = `${CSS_CLASS_PREFIX}-dialog-rules`;
    
    // 规则选项（重构后）
    const rules = [
      { id: 'mergeToSingleLine', label: '合并为一行' },
      { id: 'removeDuplicates', label: '去除重复行' }
    ];
    
    const checkboxes: Record<string, HTMLInputElement> = {};
    
    rules.forEach(rule => {
      const ruleItem = document.createElement('label');
      ruleItem.className = `${CSS_CLASS_PREFIX}-dialog-rule-item`;
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = rule.id;
      checkbox.className = `${CSS_CLASS_PREFIX}-dialog-checkbox`;
      checkboxes[rule.id] = checkbox;
      
      const labelText = document.createElement('span');
      labelText.textContent = rule.label;
      
      ruleItem.appendChild(checkbox);
      ruleItem.appendChild(labelText);
      rulesContainer.appendChild(ruleItem);
    });
    
    // 自定义分隔符选项（始终可用）
    const separatorItem = document.createElement('div');
    separatorItem.className = `${CSS_CLASS_PREFIX}-dialog-separator-item`;
    
    const separatorLabel = document.createElement('label');
    separatorLabel.textContent = '自定义分隔符（可选）：';
    
    const separatorInput = document.createElement('input');
    separatorInput.type = 'text';
    separatorInput.className = `${CSS_CLASS_PREFIX}-dialog-separator-input`;
    separatorInput.placeholder = '例如：, 或 | 或 空格';
    
    separatorItem.appendChild(separatorLabel);
    separatorItem.appendChild(separatorInput);
    rulesContainer.appendChild(separatorItem);
    
    // 按钮容器
    const btnContainer = document.createElement('div');
    btnContainer.className = `${CSS_CLASS_PREFIX}-dialog-buttons`;
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-cancel`;
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => {
      overlay.remove();
      Panel.dialogStack.pop();
      document.removeEventListener('keydown', handleEsc);
      // 如果所有弹窗都关闭了，恢复文本选择
      if (Panel.dialogStack.length === 0) {
        this.enableTextSelection();
      }
    };
    
    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-confirm`;
    confirmBtn.textContent = '应用清洗';
    confirmBtn.onclick = () => {
      // 收集选中的规则
      const selectedRules = {
        mergeToSingleLine: checkboxes.mergeToSingleLine.checked,
        customSeparator: separatorInput.value || undefined,
        removeDuplicates: checkboxes.removeDuplicates.checked
      };
      
      // 通过回调通知 content 发送请求
      if (this.onActionRequest) {
        this.onActionRequest('advanced-clean', {
          text: textToClean,
          cleaningRules: selectedRules,
          operation: 'copy'
        });
      }
      
      overlay.remove();
      Panel.dialogStack.pop();
      document.removeEventListener('keydown', handleEsc);
      // 如果所有弹窗都关闭了，恢复文本选择
      if (Panel.dialogStack.length === 0) {
        this.enableTextSelection();
      }
      this.hide();
    };
    
    btnContainer.appendChild(cancelBtn);
    btnContainer.appendChild(confirmBtn);
    
    // 组装弹窗
    dialog.appendChild(title);
    dialog.appendChild(rulesContainer);
    dialog.appendChild(btnContainer);
    overlay.appendChild(dialog);
    
    // 点击遮罩层关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        Panel.dialogStack.pop();
        document.removeEventListener('keydown', handleEsc);
        // 如果所有弹窗都关闭了，恢复文本选择
        if (Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
      }
    };
    
    // ESC键监听 - 只关闭栈顶弹窗
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && Panel.dialogStack[Panel.dialogStack.length - 1] === overlay) {
        overlay.remove();
        Panel.dialogStack.pop();
        document.removeEventListener('keydown', handleEsc);
        // 如果所有弹窗都关闭了，恢复文本选择
        if (Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
      }
    };
    
    // 推入弹窗栈并绑定ESC监听
    Panel.dialogStack.push(overlay);
    document.addEventListener('keydown', handleEsc);
    
    // 禁用页面文本选择（如果这是第一个弹窗）
    if (Panel.dialogStack.length === 1) {
      this.disableTextSelection();
    }
    
    document.body.appendChild(overlay);
  }

  /**
   * 显示导出格式选择弹窗
   */
  showExportDialog(uiData?: { text?: string; exportFormats?: string[] }): void {
    // 如果 uiData 提供了文本，使用它；否则使用当前文本
    const textToExport = uiData?.text || this.currentText;
    
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
    overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);
    overlay.style.pointerEvents = 'auto';
    
    // 阻止遮罩层上的鼠标事件触发框选
    overlay.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
    dialog.style.zIndex = String(Z_INDEX.DIALOG);
    
    // 标题
    const title = document.createElement('div');
    title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
    title.textContent = '选择导出格式';
    
    // 格式选项容器
    const formatsContainer = document.createElement('div');
    formatsContainer.className = `${CSS_CLASS_PREFIX}-dialog-formats`;
    
    // 格式选项（可以从 uiData 获取，或使用默认）
    const availableFormats = uiData?.exportFormats || ['csv', 'excel'];
    const formats = [
      { id: 'csv', label: 'CSV 格式', icon: '📊' },
      { id: 'excel', label: 'Excel 格式', icon: '📈' }
    ].filter(f => availableFormats.includes(f.id));
    
    formats.forEach(format => {
      const formatBtn = document.createElement('button');
      formatBtn.className = `${CSS_CLASS_PREFIX}-dialog-format-btn`;
      formatBtn.innerHTML = `<span class="${CSS_CLASS_PREFIX}-dialog-format-icon">${format.icon}</span><span>${format.label}</span>`;
      formatBtn.onclick = () => {
        // 通过回调通知 content 发送请求
        if (this.onActionRequest) {
          this.onActionRequest('table-export', {
            text: textToExport,
            format: format.id
          });
        }
        
        overlay.remove();
        Panel.dialogStack.pop();
        document.removeEventListener('keydown', handleEsc);
        // 如果所有弹窗都关闭了，恢复文本选择
        if (Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
        this.hide();
      };
      
      formatsContainer.appendChild(formatBtn);
    });
    
    // 按钮容器（居右布局）
    const btnContainer = document.createElement('div');
    btnContainer.className = `${CSS_CLASS_PREFIX}-dialog-export-buttons`;
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-cancel`;
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => {
      overlay.remove();
      Panel.dialogStack.pop();
      document.removeEventListener('keydown', handleEsc);
      // 如果所有弹窗都关闭了，恢复文本选择
      if (Panel.dialogStack.length === 0) {
        this.enableTextSelection();
      }
    };
    
    btnContainer.appendChild(cancelBtn);
    
    // 组装弹窗
    dialog.appendChild(title);
    dialog.appendChild(formatsContainer);
    dialog.appendChild(btnContainer);
    overlay.appendChild(dialog);
    
    // 点击遮罩层关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        Panel.dialogStack.pop();
        document.removeEventListener('keydown', handleEsc);
        // 如果所有弹窗都关闭了，恢复文本选择
        if (Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
      }
    };
    
    // ESC键监听 - 只关闭栈顶弹窗
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && Panel.dialogStack[Panel.dialogStack.length - 1] === overlay) {
        overlay.remove();
        Panel.dialogStack.pop();
        document.removeEventListener('keydown', handleEsc);
        // 如果所有弹窗都关闭了，恢复文本选择
        if (Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
      }
    };
    
    // 推入弹窗栈并绑定ESC监听
    Panel.dialogStack.push(overlay);
    document.addEventListener('keydown', handleEsc);
    
    // 禁用页面文本选择（如果这是第一个弹窗）
    if (Panel.dialogStack.length === 1) {
      this.disableTextSelection();
    }
    
    document.body.appendChild(overlay);
  }
}
