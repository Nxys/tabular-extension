"use strict";
(() => {
  // src/content/selection.ts
  var Selection = class {
    element = null;
    startX = 0;
    startY = 0;
    isSelecting = false;
    CSS_CLASS_PREFIX = "browser-selection-copy";
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
      return width > 5 && height > 5;
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
      this.element.className = `${this.CSS_CLASS_PREFIX}-box`;
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
  var Panel = class {
    element = null;
    currentText = "";
    CSS_CLASS_PREFIX = "browser-selection-copy";
    dragState = null;
    /**
     * 显示结果面板
     * 
     * 接收 background 生成的数据，纯渲染
     */
    showResult(uiData) {
      this.hide();
      this.element = document.createElement("div");
      this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
      const header = this.createHeader("\u{1F4CB}", "\u6587\u672C\u9884\u89C8");
      const previewWrapper = document.createElement("div");
      previewWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-preview-wrapper`;
      const preview = document.createElement("textarea");
      preview.className = `${this.CSS_CLASS_PREFIX}-panel-textarea`;
      preview.readOnly = false;
      if (uiData?.text) {
        this.currentText = uiData.text;
        preview.value = uiData.text;
      } else if (uiData?.table) {
        this.currentText = uiData.table.map((row) => row.join("")).join("\n");
        preview.value = this.currentText;
        this.element.classList.add(`${this.CSS_CLASS_PREFIX}-table-mode`);
      }
      preview.oninput = (e) => {
        const target = e.target;
        this.currentText = target.value;
      };
      previewWrapper.appendChild(preview);
      const copyBtnWrapper = document.createElement("div");
      copyBtnWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-copy-wrapper`;
      const copyBtn = this.createCopyButton();
      copyBtnWrapper.appendChild(copyBtn);
      if (uiData?.csv) {
        const csvBtn = this.createCSVButton(uiData.csv);
        copyBtnWrapper.insertBefore(csvBtn, copyBtn);
      }
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
    showLimit(uiData) {
      this.hide();
      this.element = document.createElement("div");
      this.element.className = `${this.CSS_CLASS_PREFIX}-panel ${this.CSS_CLASS_PREFIX}-panel-force-center`;
      const header = this.createHeader("\u{1F6AB}", "\u4F7F\u7528\u9650\u5236");
      const messageWrapper = document.createElement("div");
      messageWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-message-wrapper`;
      const message = document.createElement("div");
      message.className = `${this.CSS_CLASS_PREFIX}-panel-message`;
      message.textContent = uiData?.message || "\u4ECA\u65E5\u514D\u8D39\u6B21\u6570\u5DF2\u7528\u5B8C";
      messageWrapper.appendChild(message);
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
    showPro(uiData) {
      this.hide();
      this.element = document.createElement("div");
      this.element.className = `${this.CSS_CLASS_PREFIX}-panel ${this.CSS_CLASS_PREFIX}-panel-force-center`;
      const header = this.createHeader("\u2B50", "Pro \u529F\u80FD");
      const messageWrapper = document.createElement("div");
      messageWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-message-wrapper`;
      const message = document.createElement("div");
      message.className = `${this.CSS_CLASS_PREFIX}-panel-message`;
      message.textContent = uiData?.message || "\u8FD9\u662F Pro \u529F\u80FD";
      messageWrapper.appendChild(message);
      this.element.appendChild(header);
      this.element.appendChild(messageWrapper);
      document.body.appendChild(this.element);
      this.bindDragEvents(header);
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
      this.dragState = null;
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
     * 创建标题栏
     */
    createHeader(icon, title) {
      const header = document.createElement("div");
      header.className = `${this.CSS_CLASS_PREFIX}-panel-header`;
      const titleSpan = document.createElement("span");
      titleSpan.className = `${this.CSS_CLASS_PREFIX}-panel-title`;
      const iconSpan = document.createElement("span");
      iconSpan.className = `${this.CSS_CLASS_PREFIX}-panel-icon`;
      iconSpan.textContent = icon;
      const titleText = document.createElement("span");
      titleText.textContent = title;
      titleSpan.appendChild(iconSpan);
      titleSpan.appendChild(titleText);
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-close`;
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
      copyBtn.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn`;
      copyBtn.dataset.role = "copy";
      const copyBtnContent = document.createElement("span");
      copyBtnContent.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn-content`;
      const copyBtnIcon = document.createElement("span");
      copyBtnIcon.className = `${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`;
      copyBtnIcon.textContent = "\u{1F4C4}";
      const copyBtnText = document.createElement("span");
      copyBtnText.textContent = "\u590D\u5236\u5230\u526A\u8D34\u677F";
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
    createCSVButton(csv) {
      const csvBtn = document.createElement("button");
      csvBtn.className = `${this.CSS_CLASS_PREFIX}-panel-csv-btn`;
      csvBtn.textContent = "\u{1F4CA} \u5BFC\u51FA CSV";
      csvBtn.onclick = () => {
        this.downloadCSV(csv);
      };
      return csvBtn;
    }
    /**
     * 复制到剪贴板
     */
    async copyToClipboard() {
      try {
        await navigator.clipboard.writeText(this.currentText);
        this.showCopySuccess();
      } catch (error) {
        console.error("\u590D\u5236\u5931\u8D25:", error);
        this.showCopyError();
      }
    }
    /**
     * 下载 CSV 文件
     */
    downloadCSV(csv) {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `table-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
    /**
     * 显示复制成功
     */
    showCopySuccess() {
      const btn = this.element?.querySelector('button[data-role="copy"]');
      if (btn) {
        const originalHTML = btn.innerHTML;
        const iconSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
        const textSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
        if (iconSpan && textSpan) {
          iconSpan.textContent = "\u2713";
          textSpan.textContent = "\u5DF2\u590D\u5236";
        }
        btn.classList.add("success");
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalHTML;
            btn.classList.remove("success");
          }
        }, 1500);
      }
    }
    /**
     * 显示复制错误
     */
    showCopyError() {
      const btn = this.element?.querySelector('button[data-role="copy"]');
      if (btn) {
        const originalHTML = btn.innerHTML;
        const iconSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-icon`);
        const textSpan = btn.querySelector(`.${this.CSS_CLASS_PREFIX}-panel-copy-btn-content span:last-child`);
        if (iconSpan && textSpan) {
          iconSpan.textContent = "\u2717";
          textSpan.textContent = "\u590D\u5236\u5931\u8D25";
        }
        btn.classList.add("error");
        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalHTML;
            btn.classList.remove("error");
          }
        }, 1500);
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
     * 调整面板位置以确保完整显示在视口内
     */
    adjustPositionForViewport() {
      if (!this.element) return;
      const rect = this.element.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      let left = rect.left;
      let top = rect.top;
      let adjusted = false;
      if (rect.right > viewportWidth) {
        left = viewportWidth - rect.width;
        adjusted = true;
      }
      if (rect.bottom > viewportHeight) {
        top = viewportHeight - rect.height;
        adjusted = true;
      }
      if (left < 0) {
        left = 0;
        adjusted = true;
      }
      if (top < 0) {
        top = 0;
        adjusted = true;
      }
      if (adjusted) {
        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
      }
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
  var BrowserSelectionCopy = class _BrowserSelectionCopy {
    // 需要忽略的交互元素标签名
    static IGNORED_TAGS = ["INPUT", "TEXTAREA", "SELECT", "BUTTON"];
    // 默认布局选项
    static DEFAULT_LAYOUT_OPTIONS = {
      lineThresholdRatio: 5,
      minHorizontalGap: 10
    };
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
            this.applySettings(payload.payload);
            sendResponse?.({ ok: true });
          }
        };
        chrome.runtime.onMessage.addListener(this.messageListener);
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
      if (_BrowserSelectionCopy.IGNORED_TAGS.includes(target.tagName)) return;
      this.selection.start(event.clientX, event.clientY);
      event.preventDefault();
      event.stopPropagation();
    }
    /**
     * 鼠标移动事件
     */
    handleMouseMove(event) {
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
        const lines = layout(items, _BrowserSelectionCopy.DEFAULT_LAYOUT_OPTIONS);
        const text = format(lines);
        const result = await this.requestAction("text-extract", text);
        this.executeUIAction(result);
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
      const message = {
        type: "REQUEST_ACTION",
        payload: { action, data }
      };
      try {
        const response = await chrome.runtime.sendMessage(message);
        return response;
      } catch (error) {
        console.error("Failed to request action:", error);
        return {
          status: "blocked",
          uiAction: "SHOW_RESULT_PANEL",
          uiData: {
            message: "\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5"
          }
        };
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
          this.panel.showResult(uiData);
          this.ignoreNextOutsideClick = true;
          break;
        case "SHOW_LIMIT_PANEL":
          this.panel.showLimit(uiData);
          break;
        case "SHOW_PRO_PANEL":
          this.panel.showPro(uiData);
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
  if (!window.browserSelectionCopy) {
    window.browserSelectionCopy = new BrowserSelectionCopy();
    window.browserSelectionCopy.initialize();
  }
})();
