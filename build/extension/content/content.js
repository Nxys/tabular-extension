"use strict";
(() => {
  // src/shared/constants.ts
  var CSS_CLASS_PREFIX = "tabular-extension";
  var IGNORED_TAGS = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"];
  var DEFAULT_LAYOUT_OPTIONS = {
    lineThresholdRatio: 5,
    minHorizontalGap: 10
  };
  var MIN_SELECTION_SIZE = 5;
  var Z_INDEX = {
    /** 框选框层级 */
    SELECTION_BOX: 9998,
    /** 主面板层级 */
    PANEL: 9999,
    /** 弹窗遮罩层层级 */
    DIALOG_OVERLAY: 1e4,
    /** 弹窗层级 */
    DIALOG: 10001
  };

  // src/content/selection.ts
  var Selection = class {
    element = null;
    startX = 0;
    startY = 0;
    isSelecting = false;
    /**
     * 开始选择
     */
    start(x, y) {
      this.startX = x;
      this.startY = y;
      this.isSelecting = true;
      this.createElement();
    }
    /**
     * 更新选择框
     */
    update(x, y) {
      if (!this.element) return;
      const left = Math.min(this.startX, x);
      const top = Math.min(this.startY, y);
      const width = Math.abs(x - this.startX);
      const height = Math.abs(y - this.startY);
      Object.assign(this.element.style, {
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`
      });
    }
    /**
     * 完成选择，返回选择区域
     */
    finish() {
      if (!this.element) {
        return null;
      }
      const rect = this.element.getBoundingClientRect();
      const selectionRect = {
        left: rect.left + window.scrollX,
        top: rect.top + window.scrollY,
        right: rect.right + window.scrollX,
        bottom: rect.bottom + window.scrollY
      };
      this.clear();
      return selectionRect;
    }
    /**
     * 验证选择是否有效
     */
    isValid(rect) {
      const width = rect.right - rect.left;
      const height = rect.bottom - rect.top;
      return width > MIN_SELECTION_SIZE && height > MIN_SELECTION_SIZE;
    }
    /**
     * 获取选择状态
     */
    getIsSelecting() {
      return this.isSelecting;
    }
    /**
     * 清除选择框
     */
    clear() {
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
      this.isSelecting = false;
    }
    /**
     * 创建选择框元素
     */
    createElement() {
      this.element = document.createElement("div");
      this.element.className = `${CSS_CLASS_PREFIX}-box`;
      Object.assign(this.element.style, {
        left: `${this.startX}px`,
        top: `${this.startY}px`,
        width: "0px",
        height: "0px",
        zIndex: String(Z_INDEX.SELECTION_BOX)
      });
      document.body.appendChild(this.element);
    }
  };

  // src/content/panel.ts
  var Panel = class _Panel {
    element = null;
    currentText = "";
    dragState = null;
    mousePosition = { x: 0, y: 0 };
    onActionRequest;
    /**
     * 全局弹窗栈，用于管理多层弹窗的ESC键关闭顺序
     */
    static dialogStack = [];
    /**
     * 主面板ESC键监听器
     */
    handleKeyDown = (event) => {
      if (event.key === "Escape" && _Panel.dialogStack.length === 0) {
        this.hide();
      }
    };
    /**
     * 更新鼠标位置（用于跟随鼠标定位）
     */
    updateMousePosition(x, y) {
      this.mousePosition = { x, y };
    }
    /**
     * 设置操作请求回调
     */
    setActionRequestCallback(callback) {
      this.onActionRequest = callback;
    }
    /**
     * 显示结果面板
     * 
     * 接收 background 生成的数据，纯渲染
     */
    showResult(uiData, panelPosition = "center") {
      if (panelPosition === "none") {
        this.copyDirectly(uiData);
        return;
      }
      this.hide();
      this.disableTextSelection();
      this.element = document.createElement("div");
      this.element.className = `${CSS_CLASS_PREFIX}-panel`;
      this.element.style.zIndex = String(Z_INDEX.PANEL);
      const header = this.createHeader("\u{1F4CB}", "\u6587\u672C\u9884\u89C8");
      const previewWrapper = document.createElement("div");
      previewWrapper.className = `${CSS_CLASS_PREFIX}-panel-preview-wrapper`;
      if (uiData?.isLimited && uiData?.limitMessage) {
        const limitHint = this.createLimitHint(uiData.limitMessage);
        previewWrapper.appendChild(limitHint);
      }
      const preview = document.createElement("textarea");
      preview.className = `${CSS_CLASS_PREFIX}-panel-textarea`;
      preview.readOnly = false;
      if (uiData?.text) {
        this.currentText = uiData.text;
        preview.value = uiData.text;
      } else if (uiData?.table) {
        this.currentText = uiData.table.map((row) => row.join("")).join("\n");
        preview.value = this.currentText;
        this.element.classList.add(`${CSS_CLASS_PREFIX}-table-mode`);
      }
      preview.oninput = (e) => {
        const target = e.target;
        this.currentText = target.value;
      };
      previewWrapper.appendChild(preview);
      const hasContent = !!(uiData?.text && uiData.text.trim().length > 0);
      const btnWrapper = document.createElement("div");
      btnWrapper.className = `${CSS_CLASS_PREFIX}-panel-copy-wrapper`;
      const advancedCleanBtn = this.createAdvancedCleanButton(uiData?.trialRemaining, hasContent);
      btnWrapper.appendChild(advancedCleanBtn);
      const exportBtn = this.createExportButton(uiData?.trialRemaining, hasContent);
      btnWrapper.appendChild(exportBtn);
      const copyBtn = this.createCopyButton(hasContent);
      btnWrapper.appendChild(copyBtn);
      this.element.appendChild(header);
      this.element.appendChild(previewWrapper);
      this.element.appendChild(btnWrapper);
      document.body.appendChild(this.element);
      this.positionPanel(panelPosition);
      this.bindDragEvents(header);
      document.addEventListener("keydown", this.handleKeyDown);
    }
    /**
     * 显示限制提示
     * 
     * 接收 background 生成的完整文案
     * 注意：限制提示始终页面居中显示
     */
    showLimit(uiData) {
      this.hide();
      this.disableTextSelection();
      this.element = document.createElement("div");
      this.element.className = `${CSS_CLASS_PREFIX}-panel ${CSS_CLASS_PREFIX}-panel-force-center`;
      const header = this.createHeader("\u{1F6AB}", "\u4F7F\u7528\u9650\u5236");
      const messageWrapper = document.createElement("div");
      messageWrapper.className = `${CSS_CLASS_PREFIX}-panel-message-wrapper`;
      const message = document.createElement("div");
      message.className = `${CSS_CLASS_PREFIX}-panel-message`;
      message.textContent = uiData?.message || "\u4ECA\u65E5\u514D\u8D39\u6B21\u6570\u5DF2\u7528\u5B8C";
      messageWrapper.appendChild(message);
      this.element.appendChild(header);
      this.element.appendChild(messageWrapper);
      document.body.appendChild(this.element);
      this.bindDragEvents(header);
      document.addEventListener("keydown", this.handleKeyDown);
    }
    /**
     * 显示 Pro 升级提示
     * 
     * 接收 background 生成的完整文案
     * 注意：Pro 提示始终页面居中显示
     */
    showPro(uiData) {
      this.hide();
      this.disableTextSelection();
      this.element = document.createElement("div");
      this.element.className = `${CSS_CLASS_PREFIX}-panel ${CSS_CLASS_PREFIX}-panel-force-center`;
      const header = this.createHeader("\u2B50", "Pro \u529F\u80FD");
      const messageWrapper = document.createElement("div");
      messageWrapper.className = `${CSS_CLASS_PREFIX}-panel-message-wrapper`;
      const message = document.createElement("div");
      message.className = `${CSS_CLASS_PREFIX}-panel-message`;
      message.textContent = uiData?.message || "\u8FD9\u662F Pro \u529F\u80FD";
      messageWrapper.appendChild(message);
      this.element.appendChild(header);
      this.element.appendChild(messageWrapper);
      document.body.appendChild(this.element);
      this.bindDragEvents(header);
      document.addEventListener("keydown", this.handleKeyDown);
    }
    /**
     * 显示试用次数用尽提示
     * 
     * 接收 background 生成的完整文案（包含权益说明）
     * 注意：试用次数用尽提示始终页面居中显示
     */
    showTrialExhausted(uiData) {
      this.hide();
      this.disableTextSelection();
      this.element = document.createElement("div");
      this.element.className = `${CSS_CLASS_PREFIX}-panel ${CSS_CLASS_PREFIX}-panel-force-center`;
      const header = this.createHeader("\u{1F512}", "\u8BD5\u7528\u6B21\u6570\u5DF2\u7528\u5B8C");
      const messageWrapper = document.createElement("div");
      messageWrapper.className = `${CSS_CLASS_PREFIX}-panel-message-wrapper`;
      const message = document.createElement("div");
      message.className = `${CSS_CLASS_PREFIX}-panel-message`;
      message.style.whiteSpace = "pre-line";
      let messageText = uiData?.message || "\u8BD5\u7528\u6B21\u6570\u5DF2\u7528\u5B8C\uFF0C\u5347\u7EA7 Pro \u89E3\u9501\u65E0\u9650\u4F7F\u7528";
      if (uiData?.trialRemaining !== void 0) {
        messageText = `\u5269\u4F59\u8BD5\u7528\u6B21\u6570\uFF1A${uiData.trialRemaining}

${messageText}`;
      }
      message.textContent = messageText;
      messageWrapper.appendChild(message);
      this.element.appendChild(header);
      this.element.appendChild(messageWrapper);
      document.body.appendChild(this.element);
      this.bindDragEvents(header);
      document.addEventListener("keydown", this.handleKeyDown);
    }
    /**
     * 隐藏面板
     */
    hide() {
      if (this.element) {
        this.element.remove();
        this.element = null;
      }
      document.removeEventListener("mousemove", this.handleDrag);
      document.removeEventListener("mouseup", this.endDrag);
      document.removeEventListener("keydown", this.handleKeyDown);
      this.dragState = null;
      this.enableTextSelection();
    }
    /**
     * 检查点击是否在面板内
     */
    contains(target) {
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
    disableTextSelection() {
      const style = document.createElement("style");
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
    enableTextSelection() {
      const style = document.getElementById(`${CSS_CLASS_PREFIX}-disable-selection`);
      if (style) {
        style.remove();
      }
    }
    /**
     * 创建标题栏
     */
    createHeader(icon, title) {
      const header = document.createElement("div");
      header.className = `${CSS_CLASS_PREFIX}-panel-header`;
      const titleSpan = document.createElement("span");
      titleSpan.className = `${CSS_CLASS_PREFIX}-panel-title`;
      const iconSpan = document.createElement("span");
      iconSpan.className = `${CSS_CLASS_PREFIX}-panel-icon`;
      iconSpan.textContent = icon;
      const titleText = document.createElement("span");
      titleText.textContent = title;
      titleSpan.appendChild(iconSpan);
      titleSpan.appendChild(titleText);
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = `${CSS_CLASS_PREFIX}-panel-close`;
      closeBtn.textContent = "\xD7";
      closeBtn.onclick = () => this.hide();
      header.appendChild(titleSpan);
      header.appendChild(closeBtn);
      return header;
    }
    /**
     * 创建复制按钮
     */
    createCopyButton(hasContent = true) {
      const copyBtn = document.createElement("button");
      copyBtn.className = `${CSS_CLASS_PREFIX}-panel-copy-btn`;
      const copyBtnContent = document.createElement("span");
      copyBtnContent.className = `${CSS_CLASS_PREFIX}-panel-copy-btn-content`;
      const copyBtnIcon = document.createElement("span");
      copyBtnIcon.className = `${CSS_CLASS_PREFIX}-panel-copy-btn-icon`;
      copyBtnIcon.textContent = "\u{1F4C4}";
      const copyBtnText = document.createElement("span");
      copyBtnText.textContent = "\u590D\u5236";
      copyBtnContent.appendChild(copyBtnIcon);
      copyBtnContent.appendChild(copyBtnText);
      copyBtn.appendChild(copyBtnContent);
      copyBtn.disabled = !hasContent;
      if (!hasContent) {
        copyBtn.style.opacity = "0.5";
        copyBtn.style.cursor = "not-allowed";
      }
      copyBtn.onclick = () => {
        if (!hasContent) return;
        this.copyToClipboard();
      };
      return copyBtn;
    }
    /**
     * 创建行数限制提示
     * 接收 Background 生成的完整文案
     */
    createLimitHint(message) {
      const hint = document.createElement("div");
      hint.className = `${CSS_CLASS_PREFIX}-panel-limit-hint`;
      hint.textContent = message;
      return hint;
    }
    /**
     * 创建高级清洗按钮
     */
    createAdvancedCleanButton(trialRemaining, hasContent = true) {
      const btn = document.createElement("button");
      btn.className = `${CSS_CLASS_PREFIX}-panel-advanced-clean-btn`;
      let buttonText = "\u{1F9F9} \u6E05\u6D17";
      if (trialRemaining !== void 0) {
        buttonText += ` (\u5269\u4F59 ${trialRemaining} \u6B21)`;
      }
      btn.textContent = buttonText;
      const shouldDisable = !hasContent || trialRemaining !== void 0 && trialRemaining === 0;
      btn.disabled = shouldDisable;
      if (shouldDisable) {
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      }
      btn.onclick = () => {
        if (shouldDisable) return;
        this.showCleaningDialog();
      };
      return btn;
    }
    /**
     * 创建导出按钮
     */
    createExportButton(trialRemaining, hasContent = true) {
      const btn = document.createElement("button");
      btn.className = `${CSS_CLASS_PREFIX}-panel-export-btn`;
      let buttonText = "\u{1F4E4} \u5BFC\u51FA";
      if (trialRemaining !== void 0) {
        buttonText += ` (\u5269\u4F59 ${trialRemaining} \u6B21)`;
      }
      btn.textContent = buttonText;
      const shouldDisable = !hasContent || trialRemaining !== void 0 && trialRemaining === 0;
      btn.disabled = shouldDisable;
      if (shouldDisable) {
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
      }
      btn.onclick = () => {
        if (shouldDisable) return;
        this.showExportDialog();
      };
      return btn;
    }
    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.currentText);
        this.showToast("\u2713 \u5DF2\u590D\u5236");
        this.hide();
      } catch (error) {
        console.error("\u590D\u5236\u5931\u8D25:", error);
        this.showToast("\u2717 \u590D\u5236\u5931\u8D25");
      }
    }
    /**
     * 绑定拖动事件
     */
    bindDragEvents(header) {
      header.addEventListener("mousedown", (event) => this.startDrag(event));
      document.addEventListener("mousemove", this.handleDrag);
      document.addEventListener("mouseup", this.endDrag);
    }
    /**
     * 开始拖动
     */
    startDrag(event) {
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
    handleDrag = (event) => {
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
    endDrag = () => {
      this.dragState = null;
    };
    /**
     * 根据设置定位面板
     */
    positionPanel(panelPosition) {
      if (!this.element) return;
      const rect = this.element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left;
      let top;
      switch (panelPosition) {
        case "center":
          left = (viewportWidth - rect.width) / 2;
          top = (viewportHeight - rect.height) / 2;
          break;
        case "mouse":
          left = this.mousePosition.x + 10;
          top = this.mousePosition.y + 10;
          break;
        case "none":
          left = 20;
          top = 20;
          break;
        default:
          left = (viewportWidth - rect.width) / 2;
          top = (viewportHeight - rect.height) / 2;
      }
      left = Math.max(0, Math.min(left, viewportWidth - rect.width));
      top = Math.max(0, Math.min(top, viewportHeight - rect.height));
      this.element.style.left = `${left}px`;
      this.element.style.top = `${top}px`;
    }
    /**
     * 直接复制到剪贴板（不显示面板）
     */
    async copyDirectly(uiData) {
      let textToCopy = "";
      if (uiData?.text) {
        textToCopy = uiData.text;
      } else if (uiData?.table) {
        textToCopy = uiData.table.map((row) => row.join("")).join("\n");
      }
      if (textToCopy) {
        try {
          await navigator.clipboard.writeText(textToCopy);
          this.showToast("\u2713 \u5DF2\u590D\u5236");
        } catch (error) {
          console.error("\u590D\u5236\u5931\u8D25:", error);
          this.showToast("\u2717 \u590D\u5236\u5931\u8D25");
        }
      }
    }
    /**
     * 显示 Toast 提示（统一风格，跟随浏览器主题）
     */
    showToast(message) {
      const toast = document.createElement("div");
      toast.className = `${CSS_CLASS_PREFIX}-toast`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.remove();
      }, 1500);
    }
    /**
     * 显示清洗规则选择弹窗
     */
    showCleaningDialog(uiData) {
      const textToClean = uiData?.text || this.currentText;
      const overlay = document.createElement("div");
      overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
      overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);
      overlay.style.pointerEvents = "auto";
      overlay.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      const dialog = document.createElement("div");
      dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
      dialog.style.zIndex = String(Z_INDEX.DIALOG);
      const title = document.createElement("div");
      title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
      title.textContent = "\u9AD8\u7EA7\u6E05\u6D17\u89C4\u5219";
      const rulesContainer = document.createElement("div");
      rulesContainer.className = `${CSS_CLASS_PREFIX}-dialog-rules`;
      const rules = [
        { id: "mergeToSingleLine", label: "\u5408\u5E76\u4E3A\u4E00\u884C" },
        { id: "removeDuplicates", label: "\u53BB\u9664\u91CD\u590D\u884C" }
      ];
      const checkboxes = {};
      rules.forEach((rule) => {
        const ruleItem = document.createElement("label");
        ruleItem.className = `${CSS_CLASS_PREFIX}-dialog-rule-item`;
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = rule.id;
        checkbox.className = `${CSS_CLASS_PREFIX}-dialog-checkbox`;
        checkboxes[rule.id] = checkbox;
        const labelText = document.createElement("span");
        labelText.textContent = rule.label;
        ruleItem.appendChild(checkbox);
        ruleItem.appendChild(labelText);
        rulesContainer.appendChild(ruleItem);
      });
      const separatorItem = document.createElement("div");
      separatorItem.className = `${CSS_CLASS_PREFIX}-dialog-separator-item`;
      const separatorLabel = document.createElement("label");
      separatorLabel.textContent = "\u81EA\u5B9A\u4E49\u5206\u9694\u7B26\uFF08\u53EF\u9009\uFF09\uFF1A";
      const separatorInput = document.createElement("input");
      separatorInput.type = "text";
      separatorInput.className = `${CSS_CLASS_PREFIX}-dialog-separator-input`;
      separatorInput.placeholder = "\u4F8B\u5982\uFF1A, \u6216 | \u6216 \u7A7A\u683C";
      separatorItem.appendChild(separatorLabel);
      separatorItem.appendChild(separatorInput);
      rulesContainer.appendChild(separatorItem);
      const btnContainer = document.createElement("div");
      btnContainer.className = `${CSS_CLASS_PREFIX}-dialog-buttons`;
      const cancelBtn = document.createElement("button");
      cancelBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-cancel`;
      cancelBtn.textContent = "\u53D6\u6D88";
      cancelBtn.onclick = () => {
        overlay.remove();
        _Panel.dialogStack.pop();
        document.removeEventListener("keydown", handleEsc);
        if (_Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
      };
      const confirmBtn = document.createElement("button");
      confirmBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-confirm`;
      confirmBtn.textContent = "\u5E94\u7528\u6E05\u6D17";
      confirmBtn.onclick = () => {
        const selectedRules = {
          mergeToSingleLine: checkboxes.mergeToSingleLine.checked,
          customSeparator: separatorInput.value || void 0,
          removeDuplicates: checkboxes.removeDuplicates.checked
        };
        if (this.onActionRequest) {
          this.onActionRequest("advanced-clean", {
            text: textToClean,
            cleaningRules: selectedRules,
            operation: "copy"
          });
        }
        overlay.remove();
        _Panel.dialogStack.pop();
        document.removeEventListener("keydown", handleEsc);
        if (_Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
        this.hide();
      };
      btnContainer.appendChild(cancelBtn);
      btnContainer.appendChild(confirmBtn);
      dialog.appendChild(title);
      dialog.appendChild(rulesContainer);
      dialog.appendChild(btnContainer);
      overlay.appendChild(dialog);
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
          _Panel.dialogStack.pop();
          document.removeEventListener("keydown", handleEsc);
          if (_Panel.dialogStack.length === 0) {
            this.enableTextSelection();
          }
        }
      };
      const handleEsc = (e) => {
        if (e.key === "Escape" && _Panel.dialogStack[_Panel.dialogStack.length - 1] === overlay) {
          overlay.remove();
          _Panel.dialogStack.pop();
          document.removeEventListener("keydown", handleEsc);
          if (_Panel.dialogStack.length === 0) {
            this.enableTextSelection();
          }
        }
      };
      _Panel.dialogStack.push(overlay);
      document.addEventListener("keydown", handleEsc);
      if (_Panel.dialogStack.length === 1) {
        this.disableTextSelection();
      }
      document.body.appendChild(overlay);
    }
    /**
     * 显示导出格式选择弹窗
     */
    showExportDialog(uiData) {
      const textToExport = uiData?.text || this.currentText;
      const overlay = document.createElement("div");
      overlay.className = `${CSS_CLASS_PREFIX}-dialog-overlay`;
      overlay.style.zIndex = String(Z_INDEX.DIALOG_OVERLAY);
      overlay.style.pointerEvents = "auto";
      overlay.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      const dialog = document.createElement("div");
      dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
      dialog.style.zIndex = String(Z_INDEX.DIALOG);
      const title = document.createElement("div");
      title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
      title.textContent = "\u9009\u62E9\u5BFC\u51FA\u683C\u5F0F";
      const formatsContainer = document.createElement("div");
      formatsContainer.className = `${CSS_CLASS_PREFIX}-dialog-formats`;
      const availableFormats = uiData?.exportFormats || ["csv", "excel"];
      const formats = [
        { id: "csv", label: "CSV \u683C\u5F0F", icon: "\u{1F4CA}" },
        { id: "excel", label: "Excel \u683C\u5F0F", icon: "\u{1F4C8}" }
      ].filter((f) => availableFormats.includes(f.id));
      formats.forEach((format2) => {
        const formatBtn = document.createElement("button");
        formatBtn.className = `${CSS_CLASS_PREFIX}-dialog-format-btn`;
        formatBtn.innerHTML = `<span class="${CSS_CLASS_PREFIX}-dialog-format-icon">${format2.icon}</span><span>${format2.label}</span>`;
        formatBtn.onclick = () => {
          if (this.onActionRequest) {
            this.onActionRequest("table-export", {
              text: textToExport,
              format: format2.id
            });
          }
          overlay.remove();
          _Panel.dialogStack.pop();
          document.removeEventListener("keydown", handleEsc);
          if (_Panel.dialogStack.length === 0) {
            this.enableTextSelection();
          }
          this.hide();
        };
        formatsContainer.appendChild(formatBtn);
      });
      const btnContainer = document.createElement("div");
      btnContainer.className = `${CSS_CLASS_PREFIX}-dialog-export-buttons`;
      const cancelBtn = document.createElement("button");
      cancelBtn.className = `${CSS_CLASS_PREFIX}-dialog-btn-cancel`;
      cancelBtn.textContent = "\u53D6\u6D88";
      cancelBtn.onclick = () => {
        overlay.remove();
        _Panel.dialogStack.pop();
        document.removeEventListener("keydown", handleEsc);
        if (_Panel.dialogStack.length === 0) {
          this.enableTextSelection();
        }
      };
      btnContainer.appendChild(cancelBtn);
      dialog.appendChild(title);
      dialog.appendChild(formatsContainer);
      dialog.appendChild(btnContainer);
      overlay.appendChild(dialog);
      overlay.onclick = (e) => {
        if (e.target === overlay) {
          overlay.remove();
          _Panel.dialogStack.pop();
          document.removeEventListener("keydown", handleEsc);
          if (_Panel.dialogStack.length === 0) {
            this.enableTextSelection();
          }
        }
      };
      const handleEsc = (e) => {
        if (e.key === "Escape" && _Panel.dialogStack[_Panel.dialogStack.length - 1] === overlay) {
          overlay.remove();
          _Panel.dialogStack.pop();
          document.removeEventListener("keydown", handleEsc);
          if (_Panel.dialogStack.length === 0) {
            this.enableTextSelection();
          }
        }
      };
      _Panel.dialogStack.push(overlay);
      document.addEventListener("keydown", handleEsc);
      if (_Panel.dialogStack.length === 1) {
        this.disableTextSelection();
      }
      document.body.appendChild(overlay);
    }
  };

  // src/content/extractor.ts
  function collect(selectionRect) {
    const items = [];
    const visibilityCache2 = /* @__PURE__ */ new Map();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node2) => {
          if (!node2.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node2.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          let visible = visibilityCache2.get(parent);
          if (visible === void 0) {
            visible = isVisible(parent);
            visibilityCache2.set(parent, visible);
          }
          return visible ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );
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
        if (intersects(elementRect, selectionRect)) {
          items.push({
            text: node.textContent || "",
            x: clientRect.left,
            y: clientRect.top,
            width: clientRect.width,
            height: clientRect.height
          });
          break;
        }
      }
    }
    return items;
  }
  function isVisible(element) {
    const style = window.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }
  function intersects(rect1, rect2) {
    return !(rect1.right < rect2.left || rect1.left > rect2.right || rect1.bottom < rect2.top || rect1.top > rect2.bottom);
  }
  function layout(items, options) {
    if (items.length === 0) return [];
    const lines = [];
    for (const item of items) {
      const itemTop = item.y;
      let foundLine = false;
      for (const line of lines) {
        const lineTop = line[0].y;
        if (Math.abs(itemTop - lineTop) <= options.lineThresholdRatio) {
          line.push(item);
          foundLine = true;
          break;
        }
      }
      if (!foundLine) {
        lines.push([item]);
      }
    }
    for (const line of lines) {
      line.sort((a, b) => a.x - b.x);
    }
    lines.sort((a, b) => a[0].y - b[0].y);
    return lines;
  }
  function format(lines) {
    if (lines.length === 0) return "";
    try {
      const maxLines = 1e4;
      const limitedLines = lines.slice(0, maxLines);
      const resultLines = [];
      for (const line of limitedLines) {
        if (line.length === 0) continue;
        const maxElementsPerLine = 1e3;
        const limitedLine = line.slice(0, maxElementsPerLine);
        const lineTexts = [];
        for (const item of limitedLine) {
          const text = item.text.trim();
          if (!text || text.length > 1e4) continue;
          lineTexts.push(text);
        }
        if (lineTexts.length > 0) {
          try {
            const lineText = lineTexts.join(" ");
            if (lineText.length < 1e5) {
              resultLines.push(lineText);
            }
          } catch (e) {
            if (lineTexts.length > 0) {
              resultLines.push(lineTexts[0]);
            }
          }
        }
      }
      try {
        return resultLines.join("\n");
      } catch (e) {
        return resultLines.length > 0 ? resultLines[0] : "";
      }
    } catch (error) {
      console.warn("\u6587\u672C\u5408\u5E76\u51FA\u9519:", error);
      return "\u6587\u672C\u63D0\u53D6\u51FA\u9519";
    }
  }

  // src/content/detector.ts
  var DEFAULT_CONFIG = {
    minRows: 1,
    minCols: 2,
    alignmentThreshold: 5,
    gridGapTolerance: 10,
    detectEmptyTables: true,
    filterAuxiliaryRows: true,
    detectFixedColumns: true,
    penetrateNesting: true
  };
  var FRAMEWORK_SIGNATURES = {
    "ant-design": {
      classPatterns: [/^ant-table/, /^ant-table-wrapper/, /^ant-spin-nested-loading/],
      containerSelectors: [
        ".ant-spin-nested-loading",
        ".ant-spin-container",
        ".ant-table-wrapper",
        ".ant-table-container",
        ".ant-table-content",
        ".ant-table"
      ],
      auxiliaryRowPatterns: [/ant-table-placeholder/, /ant-table-measure-row/],
      fixedColumnPatterns: [/ant-table-cell-fix-left/, /ant-table-cell-fix-right/]
    },
    "element-plus": {
      classPatterns: [/^el-table__inner-wrapper/, /^el-table__body-wrapper/],
      containerSelectors: [".el-table__body-wrapper", ".el-table__inner-wrapper"],
      auxiliaryRowPatterns: [/el-table__empty-text/],
      fixedColumnPatterns: [/el-table__fixed/, /is-fixed/]
    },
    "element-ui": {
      classPatterns: [/^el-table(?!__)/, /^el-table__(?!inner-wrapper|body-wrapper)/],
      containerSelectors: [".el-table__body-wrapper", ".el-table__header-wrapper"],
      auxiliaryRowPatterns: [/el-table__empty-block/],
      fixedColumnPatterns: [/el-table-fixed-column/, /is-fixed/]
    },
    "arco-design": {
      classPatterns: [/^arco-table/, /^arco-table-/],
      containerSelectors: [".arco-table-container", ".arco-table-content"],
      auxiliaryRowPatterns: [/arco-table-empty/, /arco-table-tr-measure/],
      fixedColumnPatterns: [/arco-table-col-fixed-left/, /arco-table-col-fixed-right/]
    },
    "naive-ui": {
      classPatterns: [/^n-data-table/, /^n-table/],
      containerSelectors: [".n-data-table-wrapper", ".n-data-table-base-table"],
      auxiliaryRowPatterns: [/n-data-table-empty/],
      fixedColumnPatterns: [/n-data-table-td--fixed-left/, /n-data-table-td--fixed-right/]
    },
    "vuetify": {
      classPatterns: [/^v-data-table/, /^v-table/],
      containerSelectors: [".v-data-table__wrapper", ".v-table__wrapper"],
      auxiliaryRowPatterns: [/v-data-table__empty-wrapper/],
      fixedColumnPatterns: [/v-data-table__td--fixed/]
    },
    "material-ui": {
      classPatterns: [/^MuiTable/, /^MuiDataGrid/],
      containerSelectors: [".MuiTable-root", ".MuiDataGrid-root"],
      auxiliaryRowPatterns: [/MuiTableRow-empty/],
      fixedColumnPatterns: [/MuiTableCell--stickyHeader/, /MuiDataGrid-cell--pinnedLeft/]
    },
    "bootstrap": {
      classPatterns: [/^table/, /^table-/],
      containerSelectors: [".table-responsive"],
      auxiliaryRowPatterns: [],
      fixedColumnPatterns: [/table-fixed/]
    },
    "semantic-ui": {
      classPatterns: [/^ui\.table/],
      containerSelectors: [".ui.table"],
      auxiliaryRowPatterns: [],
      fixedColumnPatterns: [/fixed/]
    },
    "unknown": {
      classPatterns: [],
      containerSelectors: [],
      auxiliaryRowPatterns: [],
      fixedColumnPatterns: []
    }
  };
  function scanTables(config = DEFAULT_CONFIG) {
    const tables = [];
    try {
      const processedTables = /* @__PURE__ */ new WeakSet();
      const htmlTables = document.querySelectorAll("table");
      for (const table of htmlTables) {
        try {
          if (processedTables.has(table)) {
            continue;
          }
          if (isPluginElement(table)) {
            continue;
          }
          const tableInfo = detectHTMLTable(table, config);
          if (tableInfo) {
            tables.push(tableInfo);
            processedTables.add(table);
          }
        } catch (error) {
        }
      }
      if (config.penetrateNesting) {
        const potentialContainers = findPotentialTableContainers();
        for (const container of potentialContainers) {
          try {
            if (isPluginElement(container)) {
              continue;
            }
            const nestedTables = container.querySelectorAll("table");
            for (const table of nestedTables) {
              try {
                if (processedTables.has(table)) {
                  continue;
                }
                if (isPluginElement(table)) {
                  continue;
                }
                const tableInfo = detectHTMLTable(table, config);
                if (tableInfo) {
                  tables.push(tableInfo);
                  processedTables.add(table);
                }
              } catch (error) {
              }
            }
          } catch (error) {
          }
        }
      }
      return tables;
    } catch (error) {
      console.error("[TableDetector] Fatal error scanning tables:", error);
      return [];
    }
  }
  function findPotentialTableContainers() {
    const containers = [];
    const processedElements = /* @__PURE__ */ new WeakSet();
    const allTables = document.querySelectorAll("table");
    for (const table of allTables) {
      try {
        let current = table.parentElement;
        let depth = 0;
        while (current && depth < 10) {
          if (processedElements.has(current)) {
            break;
          }
          processedElements.add(current);
          if (current === document.body || current === document.documentElement) {
            break;
          }
          if (!isVisible2(current)) {
            current = current.parentElement;
            depth++;
            continue;
          }
          const style = window.getComputedStyle(current);
          const display = style.display;
          const isBlockLevel = /^(block|flex|grid|table|inline-block)$/.test(display);
          if (!isBlockLevel) {
            current = current.parentElement;
            depth++;
            continue;
          }
          const rect = current.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            current = current.parentElement;
            depth++;
            continue;
          }
          const overflow = style.overflow;
          const overflowX = style.overflowX;
          const overflowY = style.overflowY;
          const hasOverflow = /auto|scroll|hidden/.test(overflow) || /auto|scroll|hidden/.test(overflowX) || /auto|scroll|hidden/.test(overflowY);
          if (hasOverflow) {
            containers.push(current);
          }
          current = current.parentElement;
          depth++;
        }
      } catch (error) {
        continue;
      }
    }
    return containers;
  }
  function detectHTMLTable(element, config = DEFAULT_CONFIG) {
    try {
      if (!isVisible2(element)) {
        return null;
      }
      const framework = detectFramework(element);
      let fixedColumns = [];
      let hasFixedColumns = false;
      if (config.detectFixedColumns) {
        fixedColumns = detectFixedColumns(element, framework);
        hasFixedColumns = fixedColumns.length > 0;
      }
      const data = [];
      const rows = element.querySelectorAll("tr");
      if (rows.length === 0) {
        return null;
      }
      let hasValidCells = false;
      for (const row of rows) {
        const cells = row.querySelectorAll("td, th");
        if (cells.length > 0) {
          hasValidCells = true;
          break;
        }
      }
      if (!hasValidCells) {
        return null;
      }
      let maxCols = 0;
      let validRowCount = 0;
      let hasDataRows = false;
      const mergedCells = /* @__PURE__ */ new Map();
      let currentRowIndex = 0;
      for (const row of rows) {
        if (config.filterAuxiliaryRows) {
          const auxiliaryType = isAuxiliaryRow(row, framework);
          if (auxiliaryType !== null) {
            continue;
          }
        }
        const cells = row.querySelectorAll("td, th");
        let rowData = [];
        if (hasFixedColumns) {
          rowData = extractRowDataWithFixedColumns(cells, fixedColumns);
        } else {
          let colIndex = 0;
          for (const cell of cells) {
            const htmlCell = cell;
            while (mergedCells.get(currentRowIndex)?.has(colIndex)) {
              const mergedText = mergedCells.get(currentRowIndex)?.get(colIndex) || "";
              rowData.push(mergedText);
              colIndex++;
            }
            const text = extractCellText(cell);
            const colspan = parseInt(htmlCell.getAttribute("colspan") || "1", 10);
            const rowspan = parseInt(htmlCell.getAttribute("rowspan") || "1", 10);
            rowData.push(text);
            for (let i = 1; i < colspan; i++) {
              rowData.push("");
            }
            if (rowspan > 1) {
              for (let r = 1; r < rowspan; r++) {
                const targetRowIndex = currentRowIndex + r;
                if (!mergedCells.has(targetRowIndex)) {
                  mergedCells.set(targetRowIndex, /* @__PURE__ */ new Map());
                }
                for (let c = 0; c < colspan; c++) {
                  mergedCells.get(targetRowIndex)?.set(colIndex + c, text);
                }
              }
            }
            colIndex += colspan;
          }
          while (mergedCells.get(currentRowIndex)?.has(colIndex)) {
            const mergedText = mergedCells.get(currentRowIndex)?.get(colIndex) || "";
            rowData.push(mergedText);
            colIndex++;
          }
        }
        data.push(rowData);
        maxCols = Math.max(maxCols, rowData.length);
        validRowCount++;
        currentRowIndex++;
        const dataCells = row.querySelectorAll("td");
        if (dataCells.length > 0) {
          hasDataRows = true;
        }
      }
      if (validRowCount < config.minRows) {
        return null;
      }
      if (maxCols < config.minCols) {
        return null;
      }
      if (validRowCount < 2 || maxCols < 2) {
        return null;
      }
      const hasNonEmptyData = data.some(
        (row) => row.some((cell) => cell.trim().length > 0)
      );
      if (!hasNonEmptyData) {
        return null;
      }
      const frameworkRules = applyFrameworkRules(element, framework);
      let isEmpty = false;
      if (config.detectEmptyTables) {
        isEmpty = !hasDataRows || (frameworkRules.isEmpty ?? false);
      }
      const finalHasFixedColumns = hasFixedColumns || (frameworkRules.hasFixedColumns ?? false);
      return {
        element,
        type: "html-table",
        rows: validRowCount,
        // 使用有效行数（排除辅助行）
        cols: maxCols,
        data,
        boundingRect: element.getBoundingClientRect(),
        isEmpty,
        hasFixedColumns: finalHasFixedColumns,
        framework: frameworkRules.framework ?? framework
      };
    } catch (error) {
      console.error("[TableDetector] Error detecting HTML table:", {
        element: element?.tagName || "unknown",
        className: element?.className || "unknown",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0
      });
      return null;
    }
  }
  function injectExportButton(table, onClick) {
    try {
      const existingButton = table.element.querySelector(".table-export-button");
      if (existingButton) {
        return;
      }
      const targetContainer = findOutermostTableContainer(table.element);
      const computedStyle = window.getComputedStyle(targetContainer);
      if (computedStyle.position === "static") {
        targetContainer.style.position = "relative";
      }
      const button = document.createElement("button");
      button.className = "table-export-button";
      button.innerHTML = "\u{1F4CA}";
      button.title = "\u5BFC\u51FA\u8868\u683C";
      button.onclick = (e) => {
        e.stopPropagation();
        onClick();
      };
      targetContainer.appendChild(button);
    } catch (error) {
      console.error("[TableDetector] Error injecting export button:", {
        element: table?.element?.tagName || "unknown",
        className: table?.element?.className || "unknown",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  function findOutermostTableContainer(tableElement) {
    const tableRect = tableElement.getBoundingClientRect();
    const tableArea = tableRect.width * tableRect.height;
    let bestContainer = tableElement;
    let current = tableElement.parentElement;
    for (let depth = 0; depth < 15 && current; depth++) {
      if (current === document.body || current === document.documentElement) {
        break;
      }
      if (isTableContainer(current, tableElement, tableArea)) {
        bestContainer = current;
      } else {
        break;
      }
      current = current.parentElement;
    }
    return bestContainer;
  }
  function isTableContainer(element, tableElement, tableArea) {
    try {
      if (!isVisible2(element)) {
        return false;
      }
      const style = window.getComputedStyle(element);
      const display = style.display;
      const isBlockLevel = /^(block|flex|grid|table|inline-block)$/.test(display);
      if (!isBlockLevel) {
        return false;
      }
      const containerRect = element.getBoundingClientRect();
      const containerArea = containerRect.width * containerRect.height;
      if (containerArea < tableArea * 0.95) {
        return false;
      }
      if (containerArea > tableArea * 3) {
        return false;
      }
      const directChildren = Array.from(element.children);
      if (directChildren.length > 10) {
        const tableIsMainContent = directChildren.some(
          (child) => child === tableElement || child.contains(tableElement)
        );
        if (!tableIsMainContent) {
          return false;
        }
      }
      const tablesInContainer = element.querySelectorAll("table");
      if (tablesInContainer.length > 1) {
        const directTables = Array.from(directChildren).filter(
          (child) => child.tagName === "TABLE" || child.querySelector("table")
        );
        if (directTables.length > 1) {
          return false;
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }
  function extractRowDataWithFixedColumns(cells, fixedColumns) {
    if (fixedColumns.length === 0) {
      const rowData = [];
      for (const cell of cells) {
        const text = extractCellText(cell);
        rowData.push(text);
      }
      return rowData;
    }
    const cellInfos = [];
    const fixedColumnIndices = new Set(fixedColumns.map((fc) => fc.index));
    cells.forEach((cell, index) => {
      const htmlCell = cell;
      const text = extractCellText(cell);
      const rect = htmlCell.getBoundingClientRect();
      const isFixed = fixedColumnIndices.has(index);
      cellInfos.push({
        index,
        text,
        x: rect.left,
        isFixed,
        position: isFixed ? fixedColumns.find((fc) => fc.index === index)?.position : void 0
      });
    });
    const deduplicatedCells = [];
    const processedIndices = /* @__PURE__ */ new Set();
    for (let i = 0; i < cellInfos.length; i++) {
      if (processedIndices.has(i)) {
        continue;
      }
      const cell = cellInfos[i];
      const duplicates = [];
      for (let j = i + 1; j < cellInfos.length; j++) {
        if (processedIndices.has(j)) {
          continue;
        }
        const otherCell = cellInfos[j];
        if (cell.text === otherCell.text && Math.abs(cell.x - otherCell.x) < 10) {
          duplicates.push(j);
        }
      }
      if (duplicates.length > 0) {
        const allDuplicates = [i, ...duplicates];
        const fixedIndex = allDuplicates.find((idx) => cellInfos[idx].isFixed);
        const keepIndex = fixedIndex !== void 0 ? fixedIndex : i;
        allDuplicates.forEach((idx) => {
          if (idx !== keepIndex) {
            processedIndices.add(idx);
          }
        });
        deduplicatedCells.push(cellInfos[keepIndex]);
        processedIndices.add(keepIndex);
      } else {
        deduplicatedCells.push(cell);
        processedIndices.add(i);
      }
    }
    deduplicatedCells.sort((a, b) => a.x - b.x);
    return deduplicatedCells.map((cell) => cell.text);
  }
  function detectFixedColumns(table, framework) {
    const fixedColumns = [];
    try {
      const firstRow = table.querySelector("tr");
      if (!firstRow) {
        return fixedColumns;
      }
      const cells = firstRow.querySelectorAll("th, td");
      let fixedColumnPatterns = [];
      if (framework && framework !== "unknown") {
        const signature = getFrameworkSignature(framework);
        fixedColumnPatterns = signature.fixedColumnPatterns;
      } else {
        const allPatterns = [];
        const knownFrameworks = [
          "ant-design",
          "element-ui",
          "element-plus",
          "arco-design",
          "naive-ui",
          "vuetify",
          "material-ui",
          "bootstrap",
          "semantic-ui"
        ];
        for (const fw of knownFrameworks) {
          const sig = getFrameworkSignature(fw);
          allPatterns.push(...sig.fixedColumnPatterns);
        }
        fixedColumnPatterns = allPatterns;
      }
      cells.forEach((cell, index) => {
        const htmlCell = cell;
        const className = htmlCell.className;
        const computedStyle = window.getComputedStyle(htmlCell);
        let isFixed = false;
        let position = "left";
        if (computedStyle.position === "sticky" || computedStyle.position === "fixed") {
          isFixed = true;
          const left = computedStyle.left;
          const right = computedStyle.right;
          if (right && right !== "auto" && (!left || left === "auto")) {
            position = "right";
          } else {
            position = "left";
          }
        }
        if (!isFixed && fixedColumnPatterns.length > 0) {
          for (const pattern of fixedColumnPatterns) {
            if (pattern.test(className)) {
              isFixed = true;
              if (className.includes("right") || className.includes("Right")) {
                position = "right";
              } else {
                position = "left";
              }
              break;
            }
          }
        }
        if (isFixed) {
          fixedColumns.push({
            index,
            position,
            element: htmlCell
          });
        }
      });
      fixedColumns.sort((a, b) => a.index - b.index);
    } catch (error) {
      console.error("[TableDetector] Error detecting fixed columns:", error);
    }
    return fixedColumns;
  }
  function isAuxiliaryRow(row, framework) {
    if (row.getAttribute("aria-hidden") === "true") {
      return "hidden";
    }
    const className = row.className;
    if (framework && framework !== "unknown") {
      const signature = getFrameworkSignature(framework);
      for (const pattern of signature.auxiliaryRowPatterns) {
        if (pattern.test(className)) {
          if (className.includes("placeholder") || className.includes("empty")) {
            return "placeholder";
          }
          if (className.includes("measure")) {
            return "measure";
          }
          return "placeholder";
        }
      }
    }
    if (/placeholder|empty-row|no-data/i.test(className)) {
      return "placeholder";
    }
    if (/measure|sizing|layout-row/i.test(className)) {
      return "measure";
    }
    const cells = row.querySelectorAll("td");
    if (cells.length > 0) {
      if (cells.length === 1) {
        const text = cells[0].textContent?.trim() || "";
        if (/^(暂无数据|无数据|没有数据|no data|empty|no records|no results)$/i.test(text)) {
          return "placeholder";
        }
      }
    }
    if (typeof process !== "undefined" && false) {
      return null;
    }
    const rect = row.getBoundingClientRect();
    if (rect.height === 0 && rect.width > 0) {
      return "zero-height";
    }
    return null;
  }
  function detectFramework(element) {
    let current = element;
    for (let depth = 0; depth < 10 && current; depth++) {
      const className = current.className;
      if (!className || typeof className !== "string") {
        current = current.parentElement;
        continue;
      }
      const frameworkOrder = [
        "ant-design",
        "element-plus",
        // 更具体，优先检查
        "element-ui",
        "arco-design",
        "naive-ui",
        "vuetify",
        "material-ui",
        "bootstrap",
        "semantic-ui"
      ];
      for (const framework of frameworkOrder) {
        const signature = FRAMEWORK_SIGNATURES[framework];
        for (const pattern of signature.classPatterns) {
          if (pattern.test(className)) {
            return framework;
          }
        }
      }
      current = current.parentElement;
    }
    return "unknown";
  }
  function getFrameworkSignature(framework) {
    return FRAMEWORK_SIGNATURES[framework];
  }
  function applyFrameworkRules(table, framework) {
    const result = {
      framework
    };
    if (framework === "unknown") {
      return result;
    }
    const signature = getFrameworkSignature(framework);
    if (signature.auxiliaryRowPatterns.length > 0) {
      const rows = table.querySelectorAll("tr");
      let hasDataRows = false;
      let hasAuxiliaryRows = false;
      for (const row of rows) {
        const rowClassName = row.className;
        const isAuxiliary = signature.auxiliaryRowPatterns.some(
          (pattern) => pattern.test(rowClassName)
        );
        if (isAuxiliary) {
          hasAuxiliaryRows = true;
          continue;
        }
        const cells = row.querySelectorAll("td");
        if (cells.length > 0) {
          for (const cell of cells) {
            const text = cell.textContent?.trim() || "";
            if (text && !text.match(/暂无数据|无数据|no data|empty/i)) {
              hasDataRows = true;
              break;
            }
          }
        }
        if (hasDataRows) break;
      }
      result.isEmpty = hasAuxiliaryRows && !hasDataRows;
    }
    if (signature.fixedColumnPatterns.length > 0) {
      const cells = table.querySelectorAll("td, th");
      for (const cell of cells) {
        const cellClassName = cell.className;
        const hasFixedColumn = signature.fixedColumnPatterns.some(
          (pattern) => pattern.test(cellClassName)
        );
        if (hasFixedColumn) {
          result.hasFixedColumns = true;
          break;
        }
      }
    }
    return result;
  }
  function extractCellText(cell) {
    let text = cell.textContent || "";
    text = text.replace(/\s+/g, " ");
    text = text.trim();
    return text;
  }
  var visibilityCache = /* @__PURE__ */ new WeakMap();
  function isVisible2(element) {
    const cached = visibilityCache.get(element);
    if (cached !== void 0) {
      return cached;
    }
    const style = window.getComputedStyle(element);
    if (style.display === "none") {
      visibilityCache.set(element, false);
      return false;
    }
    if (style.visibility === "hidden") {
      visibilityCache.set(element, false);
      return false;
    }
    if (style.opacity === "0") {
      visibilityCache.set(element, false);
      return false;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      if (typeof process !== "undefined" && false) {
      } else {
        visibilityCache.set(element, false);
        return false;
      }
    }
    const parent = element.parentElement;
    if (parent && parent !== document.body) {
      const parentVisible = isVisible2(parent);
      if (!parentVisible) {
        visibilityCache.set(element, false);
        return false;
      }
    }
    visibilityCache.set(element, true);
    return true;
  }
  function isPluginElement(element) {
    const className = element.className;
    if (typeof className === "string") {
      if (/^(tabular-extension|table-export-button)/.test(className)) {
        return true;
      }
    }
    let current = element;
    while (current) {
      const currentClassName = current.className;
      if (typeof currentClassName === "string") {
        if (/^(tabular-extension|selection-box)/.test(currentClassName)) {
          return true;
        }
      }
      if (current === document.body) {
        break;
      }
      current = current.parentElement;
    }
    return false;
  }

  // src/content/index.ts
  var Tabular = class {
    selection;
    panel;
    ignoreNextOutsideClick = false;
    lastSelectionRect = null;
    settings = {
      enabled: false,
      panelPosition: "center"
    };
    handleMouseDownBound = this.handleMouseDown.bind(this);
    handleMouseMoveBound = this.handleMouseMove.bind(this);
    handleMouseUpBound = this.handleMouseUp.bind(this);
    handleOutsideClickBound = this.handleOutsideClick.bind(this);
    handleKeydownBound = this.handleKeydown.bind(this);
    messageListener = null;
    settingsReady;
    injectedTables = /* @__PURE__ */ new WeakSet();
    // 记录已注入按钮的表格
    mutationObserver = null;
    // 智能延迟和错误处理
    failureCount = 0;
    fallbackMode = false;
    fallbackInterval = null;
    // URL 监听（SPA 路由）
    currentURL = "";
    urlCheckInterval = null;
    constructor() {
      this.selection = new Selection();
      this.panel = new Panel();
      this.panel.setActionRequestCallback(async (action, data) => {
        try {
          const result = await this.requestAction(action, data);
          this.executeUIAction(result);
        } catch (error) {
          console.error("Action request failed:", error);
        }
      });
      this.settingsReady = this.initializeSettings();
      this.bindEvents();
    }
    /**
     * 绑定事件
     */
    bindEvents() {
      document.addEventListener("mousedown", this.handleMouseDownBound);
      document.addEventListener("mousemove", this.handleMouseMoveBound);
      document.addEventListener("mouseup", this.handleMouseUpBound);
      document.addEventListener("click", this.handleOutsideClickBound);
      document.addEventListener("keydown", this.handleKeydownBound);
      if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
        this.messageListener = (message, _sender, sendResponse) => {
          const payload = message;
          if (payload?.type === "updateSettings" && payload.payload) {
            this.applySettings(payload.payload).then(() => {
              sendResponse?.({ ok: true });
            });
            return true;
          }
          return false;
        };
        chrome.runtime.onMessage.addListener(this.messageListener);
      }
      if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === "local") {
            const updates = {};
            if (changes.enabled) {
              updates.enabled = changes.enabled.newValue;
            }
            if (changes.panelPosition) {
              updates.panelPosition = changes.panelPosition.newValue;
            }
            if (Object.keys(updates).length > 0) {
              this.applySettings(updates);
            }
          }
        });
      }
    }
    /**
     * 鼠标按下事件
     */
    handleMouseDown(event) {
      if (!this.settings.enabled) return;
      if (event.button !== 0) return;
      if (this.panel.contains(event.target)) return;
      const target = event.target;
      if (IGNORED_TAGS.includes(target.tagName)) return;
      this.selection.start(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
    }
    /**
     * 鼠标移动事件
     */
    handleMouseMove(event) {
      this.panel.updateMousePosition(event.clientX, event.clientY);
      if (!this.settings.enabled) return;
      if (!this.selection.getIsSelecting()) return;
      this.selection.update(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
    }
    /**
     * 鼠标释放事件
     */
    async handleMouseUp(event) {
      if (!this.settings.enabled) return;
      if (!this.selection.getIsSelecting()) return;
      const rect = this.selection.finish();
      if (rect && this.selection.isValid(rect)) {
        const items = collect(rect);
        const lines = layout(items, DEFAULT_LAYOUT_OPTIONS);
        const text = format(lines);
        try {
          const result = await this.requestAction("text-extract", text);
          this.selection.clear();
          this.executeUIAction(result);
        } catch (error) {
          console.error("Communication with background failed:", error);
        }
      }
      event.preventDefault();
      event.stopPropagation();
    }
    /**
     * 外部点击事件
     */
    handleOutsideClick(event) {
      if (this.ignoreNextOutsideClick && this.lastSelectionRect) {
        const docX = event.clientX + window.scrollX;
        const docY = event.clientY + window.scrollY;
        const { left, right, top, bottom } = this.lastSelectionRect;
        const insideSelection = docX >= left && docX <= right && docY >= top && docY <= bottom;
        if (insideSelection) {
          this.ignoreNextOutsideClick = false;
          return;
        }
      }
      this.ignoreNextOutsideClick = false;
    }
    /**
     * 快捷键切换启用状态
     */
    handleKeydown(event) {
      if (event.ctrlKey && event.shiftKey && event.code === "KeyY") {
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLButtonElement || event.target && event.target.isContentEditable) {
          return;
        }
        event.preventDefault();
        this.toggleEnabled();
      }
    }
    /**
     * 切换启用状态
     */
    async toggleEnabled() {
      const next = !this.settings.enabled;
      await this.applySettings({ enabled: next }, true);
      if (!next) {
        this.selection.clear();
        this.panel.hide();
      }
    }
    /**
     * 初始化设置
     */
    async initializeSettings() {
      const defaults = { enabled: false, panelPosition: "center" };
      if (typeof chrome === "undefined" || !chrome.storage?.local) {
        this.settings = defaults;
        return;
      }
      try {
        const result = await chrome.storage.local.get(["enabled", "panelPosition"]);
        this.settings = {
          enabled: typeof result.enabled === "boolean" ? result.enabled : defaults.enabled,
          panelPosition: ["center", "mouse", "none"].includes(result.panelPosition) ? result.panelPosition : defaults.panelPosition
        };
      } catch (error) {
        console.warn("\u8BFB\u53D6\u5B58\u50A8\u5931\u8D25\uFF0C\u4F7F\u7528\u9ED8\u8BA4\u8BBE\u7F6E", error);
        this.settings = defaults;
      }
    }
    /**
     * 应用并可选持久化设置
     */
    async applySettings(partial, persist = false) {
      await this.settingsReady;
      const prevEnabled = this.settings.enabled;
      this.settings = { ...this.settings, ...partial };
      if (prevEnabled && !this.settings.enabled) {
        this.selection.clear();
        this.panel.hide();
        this.removeAllExportButtons();
      }
      if (!prevEnabled && this.settings.enabled) {
        const delay = this.calculateSmartDelay();
        setTimeout(() => {
          this.scanAndInjectTableButtons();
        }, delay);
      }
      if (persist && typeof chrome !== "undefined" && chrome.storage?.local) {
        try {
          await chrome.storage.local.set({
            enabled: this.settings.enabled,
            panelPosition: this.settings.panelPosition
          });
        } catch (error) {
          console.warn("\u4FDD\u5B58\u8BBE\u7F6E\u5931\u8D25", error);
        }
      }
    }
    /**
     * 向 background 请求执行操作
     */
    async requestAction(action, data) {
      if (!chrome.runtime?.id) {
        console.warn("Extension context invalidated, page needs refresh");
        throw new Error("Extension context invalidated");
      }
      const message = {
        type: "REQUEST_ACTION",
        payload: { action, data }
      };
      try {
        const response = await chrome.runtime.sendMessage(message);
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Extension context invalidated")) {
          console.warn("Extension context invalidated, page needs refresh");
        } else {
          console.error("Failed to request action:", error);
        }
        throw error;
      }
    }
    /**
     * 执行 UI 动作
     * 
     * 关键：content 不判断 status，只执行 uiAction
     */
    executeUIAction(result) {
      const { uiAction, uiData } = result;
      switch (uiAction) {
        case "SHOW_RESULT_PANEL":
          this.panel.showResult(uiData, this.settings.panelPosition);
          this.ignoreNextOutsideClick = true;
          break;
        case "SHOW_LIMIT_PANEL":
          this.panel.showLimit(uiData);
          break;
        case "SHOW_PRO_PANEL":
          this.panel.showPro(uiData);
          break;
        case "SHOW_TRIAL_EXHAUSTED":
          this.panel.showTrialExhausted(uiData);
          break;
        case "SHOW_CLEANING_DIALOG":
          this.panel.showCleaningDialog(uiData);
          break;
        case "SHOW_EXPORT_DIALOG":
          this.panel.showExportDialog(uiData);
          break;
        default:
          console.warn("Unknown UI action:", uiAction);
      }
    }
    /**
     * 初始化插件
     */
    initialize() {
      this.settingsReady.then(() => {
        if (this.settings.enabled) {
          const delay = this.calculateSmartDelay();
          setTimeout(() => {
            this.scanAndInjectTableButtons();
          }, delay);
        }
      });
      this.currentURL = window.location.href;
      this.urlCheckInterval = setInterval(() => {
        this.checkURLChange();
      }, 500);
      let debounceTimer = null;
      this.mutationObserver = new MutationObserver((mutations) => {
        if (this.isPluginMutation(mutations)) {
          return;
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          this.scanAndInjectTableButtons();
        }, 500);
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    /**
     * 检查是否是插件自己的 DOM 变化
     */
    isPluginMutation(mutations) {
      return mutations.some((mutation) => {
        const target = mutation.target;
        if (target.className && typeof target.className === "string") {
          if (/^(tabular-extension|table-export-button)/.test(target.className)) {
            return true;
          }
        }
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) {
            const className = node.className;
            if (className && typeof className === "string") {
              if (/^(tabular-extension|table-export-button)/.test(className)) {
                return true;
              }
            }
          }
        }
        return false;
      });
    }
    /**
     * 检查 URL 是否变化
     */
    checkURLChange() {
      const newURL = window.location.href;
      if (this.currentURL !== newURL) {
        const oldPath = new URL(this.currentURL).pathname;
        const newPath = new URL(newURL).pathname;
        if (oldPath !== newPath) {
          this.handleRouteChange();
        }
        this.currentURL = newURL;
      }
    }
    /**
     * 处理路由切换
     */
    handleRouteChange() {
      this.removeAllExportButtons();
      this.injectedTables = /* @__PURE__ */ new WeakSet();
      const delay = this.calculateSmartDelay();
      setTimeout(() => {
        this.scanAndInjectTableButtons();
      }, delay);
    }
    /**
     * 移除所有导出按钮
     */
    removeAllExportButtons() {
      const buttons = document.querySelectorAll(".table-export-button");
      buttons.forEach((button) => button.remove());
    }
    /**
     * 重新启动 MutationObserver
     */
    restartMutationObserver() {
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      let debounceTimer = null;
      this.mutationObserver = new MutationObserver((mutations) => {
        if (this.isPluginMutation(mutations)) {
          return;
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
          this.scanAndInjectTableButtons();
        }, 500);
      });
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    /**
     * 进入降级模式（定时轮询）
     */
    enterFallbackMode() {
      this.fallbackMode = true;
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
      }
      this.fallbackInterval = setInterval(() => {
        this.scanAndInjectTableButtons();
      }, 5e3);
      console.warn("[Tabular] Entered fallback mode (polling every 5s)");
    }
    /**
     * 退出降级模式（恢复正常）
     */
    exitFallbackMode() {
      this.fallbackMode = false;
      if (this.fallbackInterval) {
        clearInterval(this.fallbackInterval);
        this.fallbackInterval = null;
      }
      this.restartMutationObserver();
      console.log("[Tabular] Exited fallback mode");
    }
    /**
     * 检测页面中的表格 UI 框架
     * 检查 body 类名中是否包含已知框架特征
     */
    detectPageFrameworks() {
      const frameworkPatterns = [
        /ant-table/,
        // Ant Design
        /el-table/,
        // Element UI
        /arco-table/,
        // Arco Design
        /n-data-table/,
        // Naive UI
        /v-data-table/,
        // Vuetify
        /MuiTable/
        // Material-UI
      ];
      const bodyClassName = document.body.className;
      return frameworkPatterns.some((pattern) => pattern.test(bodyClassName));
    }
    /**
     * 计算智能延迟时间
     * 根据页面框架特征调整延迟：有框架 200ms，无框架 500ms
     */
    calculateSmartDelay() {
      const hasKnownFramework = this.detectPageFrameworks();
      return hasKnownFramework ? 200 : 500;
    }
    /**
     * 扫描页面表格并注入导出按钮
     */
    scanAndInjectTableButtons() {
      if (!this.settings.enabled) {
        return;
      }
      try {
        const tables = scanTables();
        let injectedCount = 0;
        for (const table of tables) {
          if (this.injectedTables.has(table.element)) {
            continue;
          }
          const existingButton = table.element.querySelector(".table-export-button");
          if (existingButton) {
            this.injectedTables.add(table.element);
            continue;
          }
          if (this.panel.contains(table.element)) {
            this.injectedTables.add(table.element);
            continue;
          }
          injectExportButton(table, async () => {
            try {
              const tableData = table.data;
              const result = await this.requestAction("table-export", {
                table: tableData
              });
              this.executeUIAction(result);
            } catch (error) {
              console.error("[Tabular] Table export failed:", error);
            }
          });
          this.injectedTables.add(table.element);
          injectedCount++;
        }
        if (injectedCount > 0) {
          console.log("[Tabular] Injected", injectedCount, "export buttons");
        }
        this.failureCount = 0;
        if (this.fallbackMode) {
          this.exitFallbackMode();
        }
      } catch (error) {
        console.error("[Tabular] Error scanning tables:", error);
        this.failureCount++;
        if (this.failureCount >= 3 && !this.fallbackMode) {
          this.enterFallbackMode();
        }
      }
    }
    /**
     * 清理资源
     */
    cleanup() {
      this.selection.clear();
      this.panel.hide();
      document.removeEventListener("mousedown", this.handleMouseDownBound);
      document.removeEventListener("mousemove", this.handleMouseMoveBound);
      document.removeEventListener("mouseup", this.handleMouseUpBound);
      document.removeEventListener("click", this.handleOutsideClickBound);
      document.removeEventListener("keydown", this.handleKeydownBound);
      if (this.messageListener && typeof chrome !== "undefined" && chrome.runtime?.onMessage?.removeListener) {
        chrome.runtime.onMessage.removeListener(this.messageListener);
      }
      this.messageListener = null;
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      if (this.urlCheckInterval) {
        clearInterval(this.urlCheckInterval);
        this.urlCheckInterval = null;
      }
      if (this.fallbackInterval) {
        clearInterval(this.fallbackInterval);
        this.fallbackInterval = null;
      }
    }
  };
  if (!window.tabular) {
    window.tabular = new Tabular();
    window.tabular.initialize();
  }
})();
