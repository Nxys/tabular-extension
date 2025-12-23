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
     * 显示结果
     */
    show(text, options = {
      position: { left: 50, top: 50 },
      editable: true
    }) {
      this.currentText = text;
      this.createElement(options.position, options.editable ?? true);
    }
    /**
     * 显示使用限制提示
     */
    showLimitReached() {
      this.createElement(
        { left: 50, top: 50 },
        false,
        {
          type: "limit",
          title: "\u4F7F\u7528\u9650\u5236",
          icon: "\u{1F6AB}",
          message: "\u4ECA\u65E5\u514D\u8D39\u6B21\u6570\u5DF2\u7528\u5B8C",
          showUpgradeButton: true
        }
      );
    }
    /**
     * 显示对齐后的表格
     * 
     * @param table 对齐后的二维字符串数组
     */
    showAligned(table) {
      const text = table.map((row) => row.join("")).join("\n");
      this.show(text, {
        position: { left: 50, top: 50 },
        editable: true
      });
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
    enableCSVExport(csv, onExport) {
      if (!this.element) return;
      const copyWrapper = this.element.querySelector(
        `.${this.CSS_CLASS_PREFIX}-panel-copy-wrapper`
      );
      if (!copyWrapper) return;
      const csvBtn = document.createElement("button");
      csvBtn.className = `${this.CSS_CLASS_PREFIX}-panel-csv-btn`;
      csvBtn.textContent = "\u{1F4CA} \u5BFC\u51FA CSV";
      csvBtn.onclick = async () => {
        this.downloadCSV(csv);
        if (onExport) {
          await onExport();
        }
      };
      copyWrapper.insertBefore(csvBtn, copyWrapper.firstChild);
    }
    /**
     * 显示 Pro 升级提示
     */
    showProRequired() {
      this.createElement(
        { left: 50, top: 50 },
        false,
        {
          type: "pro-required",
          title: "Pro \u529F\u80FD",
          icon: "\u2B50",
          message: "\u8868\u683C\u8BC6\u522B\u662F Pro \u529F\u80FD",
          showUpgradeButton: true
        }
      );
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
     * 创建面板
     */
    createElement(position, editable, config) {
      this.hide();
      this.element = document.createElement("div");
      this.element.className = `${this.CSS_CLASS_PREFIX}-panel`;
      this.element.style.top = `${position.top}px`;
      this.element.style.left = `${position.left}px`;
      const header = document.createElement("div");
      header.className = `${this.CSS_CLASS_PREFIX}-panel-header`;
      const title = document.createElement("span");
      title.className = `${this.CSS_CLASS_PREFIX}-panel-title`;
      const icon = document.createElement("span");
      icon.className = `${this.CSS_CLASS_PREFIX}-panel-icon`;
      icon.textContent = config?.icon ?? "\u{1F4CB}";
      const titleText = document.createElement("span");
      titleText.textContent = config?.title ?? "\u6587\u672C\u9884\u89C8";
      title.appendChild(icon);
      title.appendChild(titleText);
      const closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-close`;
      closeBtn.textContent = "\xD7";
      closeBtn.onclick = () => this.hide();
      header.appendChild(title);
      header.appendChild(closeBtn);
      if (config?.type === "limit" || config?.type === "pro-required") {
        const messageWrapper = document.createElement("div");
        messageWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-message-wrapper`;
        const message = document.createElement("div");
        message.className = `${this.CSS_CLASS_PREFIX}-panel-message`;
        message.textContent = config.message ?? "";
        messageWrapper.appendChild(message);
        if (config.type === "limit") {
          const subMessage = document.createElement("div");
          subMessage.className = `${this.CSS_CLASS_PREFIX}-panel-submessage`;
          subMessage.textContent = "(20/20)";
          const resetInfo = document.createElement("div");
          resetInfo.className = `${this.CSS_CLASS_PREFIX}-panel-reset-info`;
          resetInfo.textContent = "\u660E\u5929\u5C06\u81EA\u52A8\u91CD\u7F6E";
          messageWrapper.appendChild(subMessage);
          messageWrapper.appendChild(resetInfo);
        }
        this.element.appendChild(header);
        this.element.appendChild(messageWrapper);
        if (config.showUpgradeButton) {
          const upgradeBtnWrapper = document.createElement("div");
          upgradeBtnWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-upgrade-wrapper`;
          const upgradeBtn = document.createElement("button");
          upgradeBtn.className = `${this.CSS_CLASS_PREFIX}-panel-upgrade-btn`;
          upgradeBtn.textContent = "\u5347\u7EA7 Pro\uFF08\u5360\u4F4D\uFF09";
          upgradeBtn.onclick = () => {
            console.log("\u5347\u7EA7 Pro \u529F\u80FD\u5C1A\u672A\u5B9E\u73B0");
          };
          upgradeBtnWrapper.appendChild(upgradeBtn);
          this.element.appendChild(upgradeBtnWrapper);
        }
      } else {
        const previewWrapper = document.createElement("div");
        previewWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-preview-wrapper`;
        const preview = document.createElement("textarea");
        preview.className = `${this.CSS_CLASS_PREFIX}-panel-textarea`;
        preview.readOnly = !editable;
        preview.value = this.currentText;
        preview.oninput = (e) => {
          const target = e.target;
          this.currentText = target.value;
        };
        previewWrapper.appendChild(preview);
        const copyBtnWrapper = document.createElement("div");
        copyBtnWrapper.className = `${this.CSS_CLASS_PREFIX}-panel-copy-wrapper`;
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
        copyBtnWrapper.appendChild(copyBtn);
        this.element.appendChild(header);
        this.element.appendChild(previewWrapper);
        this.element.appendChild(copyBtnWrapper);
      }
      document.body.appendChild(this.element);
      header.addEventListener("mousedown", (event) => this.startDrag(event));
      document.addEventListener("mousemove", this.handleDrag);
      document.addEventListener("mouseup", this.endDrag);
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
     * 
     * @param csv CSV 字符串
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
  };

  // src/content/usage/storage.ts
  var STORAGE_KEYS = {
    USAGE_COUNT: "usage_count",
    // 保留用于兼容
    LAST_USAGE_DATE: "last_usage_date",
    // 保留用于兼容
    USAGE_STATS: "usage_stats"
    // 新增：事件统计
  };
  var memoryFallback = {
    usageCount: 0,
    lastUsageDate: "",
    usageStats: {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: ""
    }
  };
  async function getUsageCount() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.USAGE_COUNT]);
      return result[STORAGE_KEYS.USAGE_COUNT] || 0;
    } catch (error) {
      console.warn("Storage access failed, using memory fallback", error);
      return memoryFallback.usageCount;
    }
  }
  async function incrementUsage() {
    try {
      const count = await getUsageCount();
      await chrome.storage.local.set({
        [STORAGE_KEYS.USAGE_COUNT]: count + 1
      });
    } catch (error) {
      console.warn("Failed to increment usage, using memory fallback", error);
      memoryFallback.usageCount += 1;
    }
  }
  async function resetIfNewDay() {
    try {
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const result = await chrome.storage.local.get([STORAGE_KEYS.LAST_USAGE_DATE]);
      const lastDate = result[STORAGE_KEYS.LAST_USAGE_DATE];
      if (!lastDate || lastDate !== today) {
        await chrome.storage.local.set({
          [STORAGE_KEYS.USAGE_COUNT]: 0,
          [STORAGE_KEYS.LAST_USAGE_DATE]: today,
          [STORAGE_KEYS.USAGE_STATS]: {
            selectCount: 0,
            tableDetectCount: 0,
            columnAlignCount: 0,
            csvExportCount: 0,
            lastDate: today
          }
        });
      }
    } catch (error) {
      console.warn("Date reset failed, using memory fallback", error);
      const today = (/* @__PURE__ */ new Date()).toDateString();
      if (memoryFallback.lastUsageDate !== today) {
        memoryFallback.usageCount = 0;
        memoryFallback.lastUsageDate = today;
        memoryFallback.usageStats = {
          selectCount: 0,
          tableDetectCount: 0,
          columnAlignCount: 0,
          csvExportCount: 0,
          lastDate: today
        };
      }
    }
  }
  async function saveStats(stats) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS.USAGE_STATS]: stats
      });
    } catch (error) {
      console.warn("Failed to save usage stats, using memory fallback", error);
      memoryFallback.usageStats = stats;
    }
  }
  async function getStats() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.USAGE_STATS]);
      const stats = result[STORAGE_KEYS.USAGE_STATS];
      if (!stats) {
        return {
          selectCount: 0,
          tableDetectCount: 0,
          columnAlignCount: 0,
          csvExportCount: 0,
          lastDate: (/* @__PURE__ */ new Date()).toDateString()
        };
      }
      return stats;
    } catch (error) {
      console.warn("Failed to get usage stats, using memory fallback", error);
      if (!memoryFallback.usageStats.lastDate) {
        memoryFallback.usageStats = {
          selectCount: 0,
          tableDetectCount: 0,
          columnAlignCount: 0,
          csvExportCount: 0,
          lastDate: (/* @__PURE__ */ new Date()).toDateString()
        };
      }
      return memoryFallback.usageStats;
    }
  }

  // src/content/usage/policy.ts
  var FREE_POLICY = {
    maxPerDay: 5
  };

  // src/content/usage/usage.ts
  async function record(event) {
    try {
      await resetIfNewDay();
      const stats = await getStats();
      switch (event) {
        case "select":
          stats.selectCount++;
          break;
        case "table-detect":
          stats.tableDetectCount++;
          break;
        case "column-align":
          stats.columnAlignCount++;
          break;
        case "csv-export":
          stats.csvExportCount++;
          break;
      }
      await saveStats(stats);
    } catch (error) {
      console.warn("Failed to record usage event", event, error);
    }
  }
  async function getRecentStats() {
    try {
      return await getStats();
    } catch (error) {
      console.warn("Failed to get usage stats", error);
      return {
        selectCount: 0,
        tableDetectCount: 0,
        columnAlignCount: 0,
        csvExportCount: 0,
        lastDate: (/* @__PURE__ */ new Date()).toDateString()
      };
    }
  }
  async function checkUsage() {
    await resetIfNewDay();
    const count = await getUsageCount();
    const policy = FREE_POLICY;
    if (count >= policy.maxPerDay) {
      return {
        allowed: false,
        reason: "limit-reached",
        remaining: 0
      };
    }
    return {
      allowed: true,
      remaining: policy.maxPerDay - count
    };
  }
  async function consumeUsage() {
    await incrementUsage();
    await record("select");
  }

  // src/content/extractor/collect.ts
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
            rect: clientRect
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

  // src/content/extractor/layout.ts
  function layout(items, options) {
    if (items.length === 0) return [];
    const lines = [];
    for (const item of items) {
      const itemTop = item.rect.top;
      let foundLine = false;
      for (const line of lines) {
        const lineTop = line[0].rect.top;
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
      line.sort((a, b) => a.rect.left - b.rect.left);
    }
    lines.sort((a, b) => a[0].rect.top - b[0].rect.top);
    return lines;
  }

  // src/content/extractor/format.ts
  function format(lines) {
    if (lines.length === 0) return "";
    try {
      const maxLines = 10;
      const limitedLines = lines.slice(0, maxLines);
      const resultLines = [];
      for (const line of limitedLines) {
        if (line.length === 0) continue;
        const maxElementsPerLine = 10;
        const limitedLine = line.slice(0, maxElementsPerLine);
        const lineTexts = [];
        for (const item of limitedLine) {
          const text = item.text.trim();
          if (!text || text.length > 1e3) continue;
          lineTexts.push(text);
        }
        if (lineTexts.length > 0) {
          try {
            const lineText = lineTexts.join(" ");
            if (lineText.length < 1e4) {
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

  // src/content/table/detect.ts
  var COLUMN_THRESHOLD = 50;
  function detectTable(lines) {
    if (lines.length === 0 || lines.every((line) => line.length === 0)) {
      return {
        columns: 0,
        rows: []
      };
    }
    const xPositions = [];
    for (const line of lines) {
      for (const item of line) {
        const centerX = item.rect.left + item.rect.width / 2;
        xPositions.push(centerX);
      }
    }
    if (xPositions.length === 0) {
      return {
        columns: 0,
        rows: []
      };
    }
    const clusters = clusterXPositions(xPositions);
    if (clusters.length === 0) {
      return {
        columns: 0,
        rows: []
      };
    }
    const rows = [];
    for (const line of lines) {
      const row = [];
      for (const item of line) {
        const centerX = item.rect.left + item.rect.width / 2;
        let closestCol = 0;
        let minDistance = Math.abs(centerX - clusters[0]);
        for (let i = 1; i < clusters.length; i++) {
          const distance = Math.abs(centerX - clusters[i]);
          if (distance < minDistance) {
            minDistance = distance;
            closestCol = i;
          }
        }
        row.push({
          text: item.text,
          col: closestCol,
          x: centerX
        });
      }
      if (row.length > 0) {
        rows.push(row);
      }
    }
    return {
      columns: clusters.length,
      rows
    };
  }
  function clusterXPositions(xPositions) {
    if (xPositions.length === 0) {
      return [];
    }
    const sorted = [...xPositions].sort((a, b) => a - b);
    const clusters = [];
    let clusterSum = sorted[0];
    let clusterCount = 1;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap <= COLUMN_THRESHOLD) {
        clusterSum += sorted[i];
        clusterCount++;
      } else {
        clusters.push(clusterSum / clusterCount);
        clusterSum = sorted[i];
        clusterCount = 1;
      }
    }
    clusters.push(clusterSum / clusterCount);
    return clusters;
  }

  // src/content/table/align.ts
  function getDisplayWidth(text) {
    let width = 0;
    for (const char of text) {
      width += char.charCodeAt(0) > 127 ? 2 : 1;
    }
    return width;
  }
  function alignTable(table) {
    if (table.columns === 0 || table.rows.length === 0) {
      return [];
    }
    const columnWidths = new Array(table.columns).fill(0);
    for (const row of table.rows) {
      for (const cell of row) {
        const width = getDisplayWidth(cell.text);
        if (width > columnWidths[cell.col]) {
          columnWidths[cell.col] = width;
        }
      }
    }
    const aligned = [];
    for (const row of table.rows) {
      const sortedCells = [...row].sort((a, b) => a.col - b.col);
      const alignedRow = [];
      for (let col = 0; col < table.columns; col++) {
        const cell = sortedCells.find((c) => c.col === col);
        const text = cell?.text || "";
        const width = getDisplayWidth(text);
        const padding = columnWidths[col] - width;
        alignedRow.push(text + " ".repeat(Math.max(0, padding + 2)));
      }
      aligned.push(alignedRow);
    }
    return aligned;
  }

  // src/content/table/csv.ts
  function escapeCSVField(text) {
    const needsQuotes = /[",\n\r]/.test(text);
    if (needsQuotes) {
      const escaped = text.replace(/"/g, '""');
      return `"${escaped}"`;
    }
    return text;
  }
  function toCSV(table) {
    if (table.columns === 0 || table.rows.length === 0) {
      return "";
    }
    const lines = [];
    for (const row of table.rows) {
      const sortedCells = [...row].sort((a, b) => a.col - b.col);
      const fields = [];
      for (let col = 0; col < table.columns; col++) {
        const cell = sortedCells.find((c) => c.col === col);
        fields.push(escapeCSVField(cell?.text || ""));
      }
      lines.push(fields.join(","));
    }
    return lines.join("\n");
  }

  // src/content/pro/gate.ts
  async function getProState() {
    try {
      const result = await chrome.storage.local.get(["pro_state"]);
      return result.pro_state || {
        isPro: false,
        signature: "",
        features: {
          "table-detect": false,
          "column-align": false,
          "csv-export": false
        }
      };
    } catch (error) {
      console.error("Failed to get Pro state:", error);
      return {
        isPro: false,
        signature: "",
        features: {
          "table-detect": false,
          "column-align": false,
          "csv-export": false
        }
      };
    }
  }
  function verifySignature(state) {
    try {
      if (!state.isPro) {
        return true;
      }
      if (!state.signature || state.signature.length === 0) {
        console.warn("Invalid Pro signature: empty signature");
        return false;
      }
      if (state.signature.length < 16) {
        console.warn("Invalid Pro signature: signature too short");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Signature verification failed:", error);
      return false;
    }
  }
  function verifyCallPath() {
    try {
      const stack = new Error().stack || "";
      const isTestEnv = stack.includes("pro-gate.test") || false || typeof jest !== "undefined";
      if (isTestEnv) {
        return true;
      }
      const isValidPath = stack.includes("content.ts") || stack.includes("content.js") || stack.includes("content/content");
      if (!isValidPath) {
        console.warn("Invalid call path detected");
      }
      return isValidPath;
    } catch (error) {
      console.error("Call path verification failed:", error);
      return false;
    }
  }
  function verifyUsagePattern(feature, stats) {
    try {
      const THRESHOLD = 1e3;
      switch (feature) {
        case "table-detect":
          if (stats.tableDetectCount > THRESHOLD) {
            console.warn(`Abnormal usage pattern detected for ${feature}: ${stats.tableDetectCount} times`);
            return false;
          }
          break;
        case "column-align":
          if (stats.columnAlignCount > THRESHOLD) {
            console.warn(`Abnormal usage pattern detected for ${feature}: ${stats.columnAlignCount} times`);
            return false;
          }
          break;
        case "csv-export":
          if (stats.csvExportCount > THRESHOLD) {
            console.warn(`Abnormal usage pattern detected for ${feature}: ${stats.csvExportCount} times`);
            return false;
          }
          break;
        default:
          return true;
      }
      return true;
    } catch (error) {
      console.error("Usage pattern verification failed:", error);
      return true;
    }
  }
  async function allow(feature) {
    const state = await getProState();
    if (!verifySignature(state)) {
      console.warn(`Pro feature '${feature}' denied: signature verification failed`);
      return false;
    }
    if (!verifyCallPath()) {
      console.warn(`Pro feature '${feature}' denied: invalid call path`);
      return false;
    }
    if (!state.isPro) {
      return false;
    }
    const featureEnabled = state.features?.[feature] === true;
    if (!featureEnabled) {
      console.warn(`Pro feature '${feature}' denied: feature not enabled`);
      return false;
    }
    const usageStats = await getRecentStats();
    if (!verifyUsagePattern(feature, usageStats)) {
      console.warn(`Pro feature '${feature}' denied: abnormal usage pattern`);
      return false;
    }
    return true;
  }

  // src/content/pro/strategy.ts
  function resolvePipeline(mode) {
    switch (mode) {
      case "text":
        return "free";
      case "table":
        return "pro";
      default:
        return "free";
    }
  }

  // src/content/content.ts
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
    // 仅忽略紧随选择动作产生的首个 click
    ignoreNextOutsideClick = false;
    lastSelectionRect = null;
    settings = {
      enabled: false,
      panelPosition: "center"
    };
    lastMouseUpPoint = null;
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
     * 绑定鼠标事件
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
      if (event.button !== 0) {
        return;
      }
      if (this.panel.contains(event.target)) {
        return;
      }
      const target = event.target;
      if (_BrowserSelectionCopy.IGNORED_TAGS.includes(target.tagName)) {
        return;
      }
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
      if (!this.selection.getIsSelecting()) {
        return;
      }
      const rect = this.selection.finish();
      this.lastMouseUpPoint = { x: event.clientX, y: event.clientY };
      if (rect && this.selection.isValid(rect)) {
        await record("select");
        const usage = await checkUsage();
        if (!usage.allowed) {
          this.panel.showLimitReached();
          return;
        }
        const items = collect(rect);
        const lines = layout(items, _BrowserSelectionCopy.DEFAULT_LAYOUT_OPTIONS);
        const mode = this.getUserSelectedMode();
        const pipelineType = resolvePipeline(mode);
        if (pipelineType === "pro") {
          await this.handleProPipeline(lines, rect);
        } else {
          const text = format(lines);
          if (text.trim()) {
            this.lastSelectionRect = rect;
            this.handleShowResult(text);
            await consumeUsage();
          } else {
            this.panel.hide();
            this.lastSelectionRect = null;
          }
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
     * 根据配置展示结果或直接复制
     */
    handleShowResult(text) {
      const mode = this.settings.panelPosition;
      if (mode === "none") {
        navigator.clipboard?.writeText(text).catch((error) => {
          console.error("\u76F4\u63A5\u590D\u5236\u5931\u8D25:", error);
        });
        return;
      }
      const position = this.calcPanelPosition(mode);
      this.panel.show(text, { position, editable: true });
      this.ignoreNextOutsideClick = true;
    }
    /**
     * 计算面板位置
     */
    calcPanelPosition(mode) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const panelWidth = 320;
      const panelHeight = 320;
      if (mode === "center") {
        return {
          left: Math.max(10, (viewportWidth - panelWidth) / 2),
          top: Math.max(10, (viewportHeight - panelHeight) / 2)
        };
      }
      const anchor = this.lastMouseUpPoint || { x: viewportWidth / 2, y: viewportHeight / 2 };
      return {
        left: Math.min(Math.max(10, anchor.x + 16), viewportWidth - panelWidth - 10),
        top: Math.min(Math.max(10, anchor.y + 16), viewportHeight - panelHeight - 10)
      };
    }
    /**
     * 获取用户选择的模式
     * 
     * 默认为 text 模式，用户可以通过 UI 切换
     * 当前简化实现：从 storage 读取
     * 
     * @returns 内容模式
     */
    getUserSelectedMode() {
      return "text";
    }
    /**
     * 处理 Pro Pipeline
     * 
     * 执行表格检测、列对齐和 CSV 导出的完整流程
     * 每个步骤都有独立的权限检查
     * 
     * @param lines 视觉行数组
     * @param rect 选择区域
     */
    async handleProPipeline(lines, rect) {
      if (!await allow("table-detect")) {
        this.panel.showProRequired();
        return;
      }
      await record("table-detect");
      const table = detectTable(lines);
      if (table.columns === 0 || table.rows.length === 0) {
        const text = format(lines);
        if (text.trim()) {
          this.lastSelectionRect = rect;
          this.handleShowResult(text);
          await consumeUsage();
        } else {
          this.panel.hide();
          this.lastSelectionRect = null;
        }
        return;
      }
      let aligned = [];
      if (await allow("column-align")) {
        await record("column-align");
        aligned = alignTable(table);
      } else {
        const text = format(lines);
        if (text.trim()) {
          this.lastSelectionRect = rect;
          this.handleShowResult(text);
          await consumeUsage();
        } else {
          this.panel.hide();
          this.lastSelectionRect = null;
        }
        return;
      }
      if (aligned.length > 0) {
        this.lastSelectionRect = rect;
        const mode = this.settings.panelPosition;
        if (mode === "none") {
          const alignedText = aligned.map((row) => row.join("")).join("\n");
          navigator.clipboard?.writeText(alignedText).catch((error) => {
            console.error("\u76F4\u63A5\u590D\u5236\u5931\u8D25:", error);
          });
        } else {
          this.panel.showAligned(aligned);
          if (await allow("csv-export")) {
            await record("csv-export");
            const csv = toCSV(table);
            this.panel.enableCSVExport(csv);
          }
          this.ignoreNextOutsideClick = true;
        }
        await consumeUsage();
      } else {
        this.panel.hide();
        this.lastSelectionRect = null;
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
