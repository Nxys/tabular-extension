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
        height: "0px"
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
      const header = this.createHeader("\u{1F4CB}", "\u6587\u672C\u9884\u89C8");
      const previewWrapper = document.createElement("div");
      previewWrapper.className = `${CSS_CLASS_PREFIX}-panel-preview-wrapper`;
      if (uiData?.isLimited && uiData?.limitMessage) {
        const banner = this.createLimitBanner(uiData.limitMessage, uiData.upgradeUrl);
        previewWrapper.appendChild(banner);
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
      const btnWrapper = document.createElement("div");
      btnWrapper.className = `${CSS_CLASS_PREFIX}-panel-copy-wrapper`;
      const advancedCleanBtn = this.createAdvancedCleanButton();
      btnWrapper.appendChild(advancedCleanBtn);
      const exportBtn = this.createExportButton();
      btnWrapper.appendChild(exportBtn);
      const copyBtn = this.createCopyButton();
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
      message.textContent = uiData?.message || "\u8BD5\u7528\u6B21\u6570\u5DF2\u7528\u5B8C\uFF0C\u5347\u7EA7 Pro \u89E3\u9501\u65E0\u9650\u4F7F\u7528";
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
    createCopyButton() {
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
      copyBtn.onclick = () => {
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
     * 创建超限提示条
     * 
     * 在结果面板顶部显示超限提示，包含提示文案和升级按钮
     * 
     * @param limitMessage - 由 Background 生成的限制提示文案
     * @param upgradeUrl - 升级页面 URL（可选，缺失时使用默认 URL）
     * @returns 超限提示条 DOM 元素
     */
    createLimitBanner(limitMessage, upgradeUrl) {
      const banner = document.createElement("div");
      banner.className = `${CSS_CLASS_PREFIX}-panel-limit-banner`;
      const message = document.createElement("div");
      message.className = `${CSS_CLASS_PREFIX}-panel-limit-message`;
      message.textContent = limitMessage;
      const btn = document.createElement("button");
      btn.className = `${CSS_CLASS_PREFIX}-panel-upgrade-btn`;
      btn.textContent = "\u{1F680} \u5347\u7EA7Pro";
      btn.onclick = () => {
        const url = upgradeUrl || "https://example.com/upgrade";
        try {
          window.location.href = url;
        } catch (error) {
          console.error("\u65E0\u6CD5\u8DF3\u8F6C\u5230\u5347\u7EA7\u9875\u9762:", error);
          navigator.clipboard.writeText(url).then(() => {
            this.showToast("\u274C \u65E0\u6CD5\u8DF3\u8F6C\uFF0C\u5347\u7EA7\u94FE\u63A5\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
          }).catch(() => {
            this.showToast("\u274C \u65E0\u6CD5\u8DF3\u8F6C\u5230\u5347\u7EA7\u9875\u9762");
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
    createAdvancedCleanButton() {
      const btn = document.createElement("button");
      btn.className = `${CSS_CLASS_PREFIX}-panel-advanced-clean-btn`;
      btn.textContent = "\u{1F9F9} \u6E05\u6D17";
      btn.onclick = () => {
        this.showCleaningDialog();
      };
      return btn;
    }
    /**
     * 创建导出按钮
     */
    createExportButton() {
      const btn = document.createElement("button");
      btn.className = `${CSS_CLASS_PREFIX}-panel-export-btn`;
      btn.textContent = "\u{1F4E4} \u5BFC\u51FA";
      btn.onclick = () => {
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
      const dialog = document.createElement("div");
      dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
      const title = document.createElement("div");
      title.className = `${CSS_CLASS_PREFIX}-dialog-title`;
      title.textContent = "\u9AD8\u7EA7\u6E05\u6D17\u89C4\u5219";
      const rulesContainer = document.createElement("div");
      rulesContainer.className = `${CSS_CLASS_PREFIX}-dialog-rules`;
      const rules = [
        { id: "removeEmptyLines", label: "\u53BB\u9664\u7A7A\u884C" },
        { id: "mergeMultipleLines", label: "\u5408\u5E76\u591A\u884C\uFF08\u4F7F\u7528\u81EA\u5B9A\u4E49\u5206\u9694\u7B26\uFF09" },
        { id: "mergeToSingleLine", label: "\u5408\u5E76\u4E3A\u4E00\u884C\uFF08\u4F7F\u7528\u7A7A\u683C\u5206\u9694\uFF09" },
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
      checkboxes.mergeToSingleLine.addEventListener("change", () => {
        if (checkboxes.mergeToSingleLine.checked) {
          checkboxes.mergeMultipleLines.checked = false;
          separatorInput.disabled = true;
          separatorInput.style.opacity = "0.5";
        } else {
          separatorInput.disabled = false;
          separatorInput.style.opacity = "1";
        }
      });
      checkboxes.mergeMultipleLines.addEventListener("change", () => {
        if (checkboxes.mergeMultipleLines.checked) {
          checkboxes.mergeToSingleLine.checked = false;
          separatorInput.disabled = false;
          separatorInput.style.opacity = "1";
        }
      });
      const separatorItem = document.createElement("div");
      separatorItem.className = `${CSS_CLASS_PREFIX}-dialog-separator-item`;
      const separatorLabel = document.createElement("label");
      separatorLabel.textContent = "\u81EA\u5B9A\u4E49\u5206\u9694\u7B26\uFF1A";
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
          removeEmptyLines: checkboxes.removeEmptyLines.checked,
          mergeMultipleLines: checkboxes.mergeMultipleLines.checked,
          mergeToSingleLine: checkboxes.mergeToSingleLine.checked,
          removeDuplicates: checkboxes.removeDuplicates.checked,
          customSeparator: separatorInput.value || void 0
        };
        if (this.onActionRequest) {
          this.onActionRequest("advanced-clean", {
            text: textToClean,
            cleaningRules: selectedRules,
            operation: "copy"
            // 默认为复制操作
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
      const dialog = document.createElement("div");
      dialog.className = `${CSS_CLASS_PREFIX}-dialog`;
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
    const visibilityCache = /* @__PURE__ */ new Map();
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node2) => {
          if (!node2.textContent?.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node2.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          let visible = visibilityCache.get(parent);
          if (visible === void 0) {
            visible = isVisible(parent);
            visibilityCache.set(parent, visible);
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
    }
  };
  if (!window.tabular) {
    window.tabular = new Tabular();
    window.tabular.initialize();
  }
})();
