import { Selection } from './selection';
import type { LayoutOptions, TextItem } from './extractor/index';
import { Panel } from './panel';
import type { PanelPosition, PluginSettings, SelectionRect } from '../types';
import { checkUsage, consumeUsage, record } from './usage/usage';
import { collect } from './extractor/collect';
import { layout } from './extractor/layout';
import { format } from './extractor/format';
import { detectTable } from './table/detect';
import { alignTable } from './table/align';
import { toCSV } from './table/csv';
import { allow } from './pro/gate';
import { resolvePipeline, type ContentMode } from './pro/strategy';

/**
 * 浏览器框选复制插件 - 内容脚本
 * 组合选择框、文本提取器和结果面板
 */
class BrowserSelectionCopy {
  // 需要忽略的交互元素标签名
  private static readonly IGNORED_TAGS = ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];

  // 默认布局选项
  private static readonly DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
    lineThresholdRatio: 5,
    minHorizontalGap: 10
  };

  private selection: Selection;
  private panel: Panel;
  // 仅忽略紧随选择动作产生的首个 click
  private ignoreNextOutsideClick = false;
  private lastSelectionRect: SelectionRect | null = null;
  private settings: PluginSettings = {
    enabled: false,
    panelPosition: 'center'
  };
  private lastMouseUpPoint: { x: number; y: number } | null = null;
  private readonly handleMouseDownBound = this.handleMouseDown.bind(this);
  private readonly handleMouseMoveBound = this.handleMouseMove.bind(this);
  private readonly handleMouseUpBound = this.handleMouseUp.bind(this);
  private readonly handleOutsideClickBound = this.handleOutsideClick.bind(this);
  private readonly handleKeydownBound = this.handleKeydown.bind(this);
  private messageListener: ((message: unknown, _sender: unknown, sendResponse: (response: unknown) => void) => void) | null = null;
  private settingsReady: Promise<void>;

  constructor() {
    this.selection = new Selection();
    this.panel = new Panel();
    this.settingsReady = this.initializeSettings();
    this.bindEvents();
  }

  /**
   * 绑定鼠标事件
   */
  private bindEvents(): void {
    document.addEventListener('mousedown', this.handleMouseDownBound);
    document.addEventListener('mousemove', this.handleMouseMoveBound);
    document.addEventListener('mouseup', this.handleMouseUpBound);
    document.addEventListener('click', this.handleOutsideClickBound);
    document.addEventListener('keydown', this.handleKeydownBound);

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      this.messageListener = (message, _sender, sendResponse) => {
        const payload = message as { type?: string; payload?: Partial<PluginSettings> };
        if (payload?.type === 'updateSettings' && payload.payload) {
          this.applySettings(payload.payload);
          sendResponse?.({ ok: true });
        }
      };
      chrome.runtime.onMessage.addListener(this.messageListener as (message: any, sender: any, sendResponse: (response?: any) => void) => void);
    }
  }

  /**
   * 鼠标按下事件
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.settings.enabled) return;

    // 忽略右键和中键
    if (event.button !== 0) {
      return;
    }

    // 忽略在面板上的点击
    if (this.panel.contains(event.target as Node)) {
      return;
    }

    // 忽略在交互元素上的点击
    const target = event.target as Element;
    if (BrowserSelectionCopy.IGNORED_TAGS.includes(target.tagName)) {
      return;
    }

    this.selection.start(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * 鼠标移动事件
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.settings.enabled) return;
    if (!this.selection.getIsSelecting()) return;
    this.selection.update(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * 鼠标释放事件
   */
  private async handleMouseUp(event: MouseEvent): Promise<void> {
    if (!this.settings.enabled) return;

    if (!this.selection.getIsSelecting()) {
      return;
    }

    const rect = this.selection.finish();
    this.lastMouseUpPoint = { x: event.clientX, y: event.clientY };

    if (rect && this.selection.isValid(rect)) {
      // 记录选择事件（需求 14.4, 14.7, 16.1）
      await record('select');
      
      // 检查使用限制（保留用于免费版限制）
      const usage = await checkUsage();
      if (!usage.allowed) {
        this.panel.showLimitReached();
        return;
      }

      // 执行 collect 和 layout（核心资产）
      const items = collect(rect);
      const lines = layout(items, BrowserSelectionCopy.DEFAULT_LAYOUT_OPTIONS);

      // 获取用户选择的模式（默认 text）
      const mode = this.getUserSelectedMode();

      // 根据模式选择 pipeline
      const pipelineType = resolvePipeline(mode);

      if (pipelineType === 'pro') {
        // Pro Pipeline
        await this.handleProPipeline(lines, rect);
      } else {
        // Free Pipeline（现有逻辑）
        const text = format(lines);
        
        if (text.trim()) {
          this.lastSelectionRect = rect;
          this.handleShowResult(text);
          // 消耗使用次数
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
  private handleOutsideClick(event: Event): void {
    if (this.ignoreNextOutsideClick && this.lastSelectionRect) {
      const docX = (event as MouseEvent).clientX + window.scrollX;
      const docY = (event as MouseEvent).clientY + window.scrollY;
      const { left, right, top, bottom } = this.lastSelectionRect;
      const insideSelection = docX >= left && docX <= right && docY >= top && docY <= bottom;
      if (insideSelection) {
        // 忽略释放鼠标后紧随而来的点击
        this.ignoreNextOutsideClick = false;
        return;
      }
    }
    // 重置忽略标记，确保后续点击正常处理
    this.ignoreNextOutsideClick = false;

    // 不再自动关闭面板，只能通过关闭按钮或复制按钮关闭
  }

  /**
   * 快捷键切换启用状态
   */
  private handleKeydown(event: KeyboardEvent): void {
    // Ctrl + Shift + Y
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyY') {
      if (
        (event.target instanceof HTMLInputElement) ||
        (event.target instanceof HTMLTextAreaElement) ||
        (event.target instanceof HTMLSelectElement) ||
        (event.target instanceof HTMLButtonElement) ||
        (event.target && (event.target as HTMLElement).isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      this.toggleEnabled();
    }
  }

  /**
   * 切换启用状态
   */
  private async toggleEnabled(): Promise<void> {
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
  private async initializeSettings(): Promise<void> {
    const defaults: PluginSettings = { enabled: false, panelPosition: 'center' };
    if (typeof chrome === 'undefined' || !chrome.storage?.local) {
      this.settings = defaults;
      return;
    }

    try {
      const result = await chrome.storage.local.get(['enabled', 'panelPosition']);
      this.settings = {
        enabled: typeof result.enabled === 'boolean' ? result.enabled : defaults.enabled,
        panelPosition: (['center', 'mouse', 'none'] as PanelPosition[]).includes(result.panelPosition)
          ? result.panelPosition
          : defaults.panelPosition
      };
    } catch (error) {
      console.warn('读取存储失败，使用默认设置', error);
      this.settings = defaults;
    }
  }

  /**
   * 应用并可选持久化设置
   */
  async applySettings(partial: Partial<PluginSettings>, persist = false): Promise<void> {
    await this.settingsReady;
    const prevEnabled = this.settings.enabled;
    this.settings = { ...this.settings, ...partial };

    // 当被关闭时立刻清理 UI
    if (prevEnabled && !this.settings.enabled) {
      this.selection.clear();
      this.panel.hide();
    }

    if (persist && typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        await chrome.storage.local.set({
          enabled: this.settings.enabled,
          panelPosition: this.settings.panelPosition
        });
      } catch (error) {
        console.warn('保存设置失败', error);
      }
    }
  }

  /**
   * 根据配置展示结果或直接复制
   */
  private handleShowResult(text: string): void {
    const mode = this.settings.panelPosition;
    if (mode === 'none') {
      navigator.clipboard?.writeText(text).catch((error) => {
        console.error('直接复制失败:', error);
      });
      return;
    }

    const position = this.calcPanelPosition(mode);
    this.panel.show(text, { position, editable: true });
    // 只忽略紧随本次选择动作的首个 click
    this.ignoreNextOutsideClick = true;
  }

  /**
   * 计算面板位置
   */
  private calcPanelPosition(mode: PanelPosition): { left: number; top: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const panelWidth = 320;
    const panelHeight = 320;

    if (mode === 'center') {
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
  private getUserSelectedMode(): ContentMode {
    // 简化实现：默认返回 'text'
    // 实际应该有 UI 开关让用户选择
    // 可以从 storage 读取用户偏好
    return 'text';
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
  private async handleProPipeline(lines: TextItem[][], rect: SelectionRect): Promise<void> {
    // 1. 检查表格检测权限
    if (!await allow('table-detect')) {
      this.panel.showProRequired();
      return;
    }

    // 2. 记录表格检测事件（需求 14.4, 14.7, 16.1）
    await record('table-detect');

    // 3. 执行表格检测
    const table = detectTable(lines);

    // 如果检测到的表格为空，回退到 free pipeline
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

    // 4. 检查列对齐权限
    let aligned: string[][] = [];
    if (await allow('column-align')) {
      // 记录列对齐事件（需求 14.4, 14.7, 16.1）
      await record('column-align');
      aligned = alignTable(table);
    } else {
      // 如果没有列对齐权限，使用基础格式化
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

    // 5. 显示结果
    if (aligned.length > 0) {
      this.lastSelectionRect = rect;
      
      // 使用 showAligned 方法显示表格
      const mode = this.settings.panelPosition;
      if (mode === 'none') {
        // 直接复制模式：转换为文本后复制
        const alignedText = aligned.map(row => row.join('')).join('\n');
        navigator.clipboard?.writeText(alignedText).catch((error) => {
          console.error('直接复制失败:', error);
        });
      } else {
        // 显示对齐的表格
        this.panel.showAligned(aligned);
        
        // 检查 CSV 导出权限
        if (await allow('csv-export')) {
          // 记录 CSV 导出事件（需求 14.4, 14.7, 16.1）
          await record('csv-export');
          const csv = toCSV(table);
          this.panel.enableCSVExport(csv);
        }
        
        this.ignoreNextOutsideClick = true;
      }
      
      // 消耗使用次数
      await consumeUsage();
    } else {
      this.panel.hide();
      this.lastSelectionRect = null;
    }
  }

  /**
   * 初始化插件
   */
  initialize(): void { }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.selection.clear();
    this.panel.hide();
    document.removeEventListener('mousedown', this.handleMouseDownBound);
    document.removeEventListener('mousemove', this.handleMouseMoveBound);
    document.removeEventListener('mouseup', this.handleMouseUpBound);
    document.removeEventListener('click', this.handleOutsideClickBound);
    document.removeEventListener('keydown', this.handleKeydownBound);
    if (this.messageListener && typeof chrome !== 'undefined' && chrome.runtime?.onMessage?.removeListener) {
      chrome.runtime.onMessage.removeListener(this.messageListener as (message: any, sender: any, sendResponse: (response?: unknown) => void) => void);
    }
    this.messageListener = null;
  }
}

// 全局初始化
declare global {
  interface Window {
    browserSelectionCopy?: BrowserSelectionCopy;
  }
}

// 防止重复初始化
if (!window.browserSelectionCopy) {
  window.browserSelectionCopy = new BrowserSelectionCopy();
  window.browserSelectionCopy.initialize();
}

export { BrowserSelectionCopy };
