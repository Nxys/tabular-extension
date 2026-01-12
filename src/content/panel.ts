import { CSS_CLASS_PREFIX } from '../shared/constants';
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

  /**
   * 更新鼠标位置（用于跟随鼠标定位）
   */
  updateMousePosition(x: number, y: number): void {
    this.mousePosition = { x, y };
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
    trialRemaining?: number;
  }, panelPosition: PanelPosition = 'center'): void {
    // 直接复制模式：不显示面板，直接复制到剪贴板
    if (panelPosition === 'none') {
      this.copyDirectly(uiData);
      return;
    }

    this.hide();
    
    // 创建面板
    this.element = document.createElement('div');
    this.element.className = `${CSS_CLASS_PREFIX}-panel`;
    
    // 标题栏
    const header = this.createHeader('📋', '文本预览');
    
    // 内容区域
    const previewWrapper = document.createElement('div');
    previewWrapper.className = `${CSS_CLASS_PREFIX}-panel-preview-wrapper`;

    // 行数限制提示（如果被限制）
    if (uiData?.isLimited && uiData?.rowLimit && uiData?.totalRows) {
      const limitHint = this.createLimitHint(uiData.rowLimit, uiData.totalRows);
      previewWrapper.appendChild(limitHint);
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

    // 按钮容器
    const btnWrapper = document.createElement('div');
    btnWrapper.className = `${CSS_CLASS_PREFIX}-panel-copy-wrapper`;

    // 高级清洗按钮
    const advancedCleanBtn = this.createAdvancedCleanButton();
    btnWrapper.appendChild(advancedCleanBtn);

    // 导出按钮
    const exportBtn = this.createExportButton();
    btnWrapper.appendChild(exportBtn);

    // 复制按钮
    const copyBtn = this.createCopyButton();
    btnWrapper.appendChild(copyBtn);

    // 组装面板
    this.element.appendChild(header);
    this.element.appendChild(previewWrapper);
    this.element.appendChild(btnWrapper);

    document.body.appendChild(this.element);
    this.positionPanel(panelPosition);
    this.bindDragEvents(header);
  }

  /**
   * 显示限制提示
   * 
   * 接收 background 生成的完整文案
   * 注意：限制提示始终页面居中显示
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
   * 注意：Pro 提示始终页面居中显示
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
   * 显示试用次数用尽提示
   * 
   * 接收 background 生成的完整文案（包含权益说明）
   * 注意：试用次数用尽提示始终页面居中显示
   */
  showTrialExhausted(uiData?: { message?: string; trialRemaining?: number }): void {
    this.hide();
    
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
    message.textContent = uiData?.message || '试用次数已用完，升级 Pro 解锁无限使用';

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
    };

    return copyBtn;
  }

  /**
   * 创建行数限制提示
   */
  private createLimitHint(rowLimit: number, totalRows: number): HTMLDivElement {
    const hint = document.createElement('div');
    hint.className = `${CSS_CLASS_PREFIX}-panel-limit-hint`;
    hint.textContent = `仅展示前 ${rowLimit} 行（共 ${totalRows} 行），升级 Pro 解锁完整数据`;
    return hint;
  }

  /**
   * 创建高级清洗按钮
   */
  private createAdvancedCleanButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `${CSS_CLASS_PREFIX}-panel-advanced-clean-btn`;
    btn.textContent = '🧹 高级清洗（Pro）';
    btn.onclick = () => {
      this.showCleaningDialog();
    };
    return btn;
  }

  /**
   * 创建导出按钮
   */
  private createExportButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `${CSS_CLASS_PREFIX}-panel-export-btn`;
    btn.textContent = '📤 导出';
    btn.onclick = () => {
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
  private showCleaningDialog(): void {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
    
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
    
    // 标题
    const title = document.createElement('div');
    title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
    title.textContent = '高级清洗规则';
    
    // 规则选项容器
    const rulesContainer = document.createElement('div');
    rulesContainer.className = `${CSS_CLASS_PREFIX}-dialog-rules`;
    
    // 规则选项
    const rules = [
      { id: 'removeEmptyLines', label: '去除空行' },
      { id: 'mergeMultipleLines', label: '合并多行' },
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
    
    // 自定义分隔符选项
    const separatorItem = document.createElement('div');
    separatorItem.className = `${CSS_CLASS_PREFIX}-dialog-separator-item`;
    
    const separatorLabel = document.createElement('label');
    separatorLabel.textContent = '自定义分隔符：';
    
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
    };
    
    // 确认按钮
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-confirm`;
    confirmBtn.textContent = '应用清洗';
    confirmBtn.onclick = () => {
      // 收集选中的规则
      const selectedRules = {
        removeEmptyLines: checkboxes.removeEmptyLines.checked,
        mergeMultipleLines: checkboxes.mergeMultipleLines.checked,
        mergeToSingleLine: checkboxes.mergeToSingleLine.checked,
        removeDuplicates: checkboxes.removeDuplicates.checked,
        customSeparator: separatorInput.value || undefined
      };
      
      // 发送消息到 background
      chrome.runtime.sendMessage({
        type: 'REQUEST_ACTION',
        payload: {
          action: 'advanced-clean',
          data: {
            text: this.currentText,
            rules: selectedRules
          }
        }
      });
      
      overlay.remove();
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
      }
    };
    
    document.body.appendChild(overlay);
  }

  /**
   * 显示导出格式选择弹窗
   */
  private showExportDialog(): void {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
    
    // 创建弹窗
    const dialog = document.createElement('div');
    dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
    
    // 标题
    const title = document.createElement('div');
    title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
    title.textContent = '选择导出格式';
    
    // 格式选项容器
    const formatsContainer = document.createElement('div');
    formatsContainer.className = `${CSS_CLASS_PREFIX}-dialog-formats`;
    
    // 格式选项
    const formats = [
      { id: 'csv', label: 'CSV 格式', icon: '📊' },
      { id: 'excel', label: 'Excel 格式', icon: '📈' }
    ];
    
    formats.forEach(format => {
      const formatBtn = document.createElement('button');
      formatBtn.className = `${CSS_CLASS_PREFIX}-dialog-format-btn`;
      formatBtn.innerHTML = `<span class="${CSS_CLASS_PREFIX}-dialog-format-icon">${format.icon}</span><span>${format.label}</span>`;
      formatBtn.onclick = () => {
        // 发送消息到 background
        chrome.runtime.sendMessage({
          type: 'REQUEST_ACTION',
          payload: {
            action: 'table-export',
            data: {
              text: this.currentText,
              format: format.id
            }
          }
        });
        
        overlay.remove();
        this.hide();
      };
      
      formatsContainer.appendChild(formatBtn);
    });
    
    // 取消按钮
    const cancelBtn = document.createElement('button');
    cancelBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-cancel`;
    cancelBtn.textContent = '取消';
    cancelBtn.onclick = () => {
      overlay.remove();
    };
    
    // 组装弹窗
    dialog.appendChild(title);
    dialog.appendChild(formatsContainer);
    dialog.appendChild(cancelBtn);
    overlay.appendChild(dialog);
    
    // 点击遮罩层关闭
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    };
    
    document.body.appendChild(overlay);
  }
}
