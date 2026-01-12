/**
 * Content 入口（事件监听 / 消息 - 重构版）
 * 
 * 职责：
 * - 事件监听（mousedown / mousemove / mouseup）
 * - 消息发送（REQUEST_ACTION）
 * - UI Action 执行（根据 uiAction 调用 panel）
 * 
 * 禁止：
 * - 不得包含业务逻辑判断
 * - 不得读取 usage、pro 状态
 * - 不得根据 status 二次判断
 * - 不得 import background 下的任何文件
 */

import { Selection } from './selection';
import { Panel } from './panel';
import { collect, layout, format } from './extractor';
import type { 
  RequestActionMessage, 
  ActionResultMessage, 
  PluginSettings,
  SelectionRect
} from '../shared/types';
import { IGNORED_TAGS, DEFAULT_LAYOUT_OPTIONS } from '../shared/constants';

/**
 * 浏览器框选复制插件 - 内容脚本
 */
class BrowserSelectionCopy {
  private selection: Selection;
  private panel: Panel;
  private ignoreNextOutsideClick = false;
  private lastSelectionRect: SelectionRect | null = null;
  private settings: PluginSettings = {
    enabled: false,
    panelPosition: 'center'
  };
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
   * 绑定事件
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
          this.applySettings(payload.payload).then(() => {
            sendResponse?.({ ok: true });
          });
          return true; // 表示异步响应
        }
        return false; // 不处理的消息
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
    if (event.button !== 0) return;

    // 忽略在面板上的点击
    if (this.panel.contains(event.target as Node)) return;

    // 忽略在交互元素上的点击
    const target = event.target as Element;
    if (IGNORED_TAGS.includes(target.tagName)) return;

    this.selection.start(event.clientX, event.clientY);
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * 鼠标移动事件
   */
  private handleMouseMove(event: MouseEvent): void {
    // 始终更新鼠标位置（用于跟随鼠标定位）
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
  private async handleMouseUp(event: MouseEvent): Promise<void> {
    if (!this.settings.enabled) return;
    if (!this.selection.getIsSelecting()) return;

    const rect = this.selection.finish();

    if (rect && this.selection.isValid(rect)) {
      // 1. 执行数据提取（核心资产，保留在 content）
      const items = collect(rect);
      const lines = layout(items, DEFAULT_LAYOUT_OPTIONS);
      const text = format(lines);

      // 2. 发送 REQUEST_ACTION 到 background
      try {
        const result = await this.requestAction('text-extract', text);
        // 3. 根据 uiAction 执行 UI 渲染（无条件执行）
        this.executeUIAction(result);
      } catch (error) {
        // 通信失败时静默处理，避免影响用户体验
        console.error('Communication with background failed:', error);
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
        this.ignoreNextOutsideClick = false;
        return;
      }
    }
    this.ignoreNextOutsideClick = false;
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
        panelPosition: (['center', 'mouse', 'none'] as const).includes(result.panelPosition)
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
   * 向 background 请求执行操作
   */
  private async requestAction(
    action: RequestActionMessage['payload']['action'],
    data?: unknown
  ): Promise<ActionResultMessage['payload']> {
    const message: RequestActionMessage = {
      type: 'REQUEST_ACTION',
      payload: { action, data }
    };

    try {
      const response = await chrome.runtime.sendMessage(message);
      return response as ActionResultMessage['payload'];
    } catch (error) {
      console.error('Failed to request action:', error);
      throw error;
    }
  }

  /**
   * 执行 UI 动作
   * 
   * 关键：content 不判断 status，只执行 uiAction
   */
  private executeUIAction(result: ActionResultMessage['payload']): void {
    const { uiAction, uiData } = result;

    // 无条件执行 background 下发的 UI 指令
    switch (uiAction) {
      case 'SHOW_RESULT_PANEL':
        this.panel.showResult(uiData, this.settings.panelPosition);
        this.ignoreNextOutsideClick = true;
        break;

      case 'SHOW_LIMIT_PANEL':
        this.panel.showLimit(uiData);
        break;

      case 'SHOW_PRO_PANEL':
        this.panel.showPro(uiData);
        break;

      case 'SHOW_TRIAL_EXHAUSTED':
        this.panel.showTrialExhausted(uiData);
        break;

      default:
        console.warn('Unknown UI action:', uiAction);
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
