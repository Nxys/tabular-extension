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
import { scanTables, injectExportButton } from './detector';
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
class Tabular {
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
  private injectedTables = new WeakSet<HTMLElement>(); // 记录已注入按钮的表格
  private mutationObserver: MutationObserver | null = null;
  
  // 智能延迟和错误处理
  private failureCount: number = 0;
  private fallbackMode: boolean = false;
  private fallbackInterval: ReturnType<typeof setInterval> | null = null;
  
  // URL 监听（SPA 路由）
  private currentURL: string = '';
  private urlCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.selection = new Selection();
    this.panel = new Panel();
    
    // 设置 panel 的操作请求回调
    this.panel.setActionRequestCallback(async (action, data) => {
      try {
        const result = await this.requestAction(action as RequestActionMessage['payload']['action'], data);
        this.executeUIAction(result);
      } catch (error) {
        console.error('Action request failed:', error);
      }
    });
    
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

    // 监听 storage 变化（用于测试环境和其他场景）
    if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
          const updates: Partial<PluginSettings> = {};
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
      // 移除所有表格导出按钮
      this.removeAllExportButtons();
    }
    
    // 当被启用时扫描表格
    if (!prevEnabled && this.settings.enabled) {
      const delay = this.calculateSmartDelay();
      setTimeout(() => {
        this.scanAndInjectTableButtons();
      }, delay);
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
    // 检查 extension context 是否有效
    if (!chrome.runtime?.id) {
      console.warn('Extension context invalidated, page needs refresh');
      throw new Error('Extension context invalidated');
    }

    const message: RequestActionMessage = {
      type: 'REQUEST_ACTION',
      payload: { action, data }
    };

    try {
      const response = await chrome.runtime.sendMessage(message);
      return response as ActionResultMessage['payload'];
    } catch (error) {
      // 检查是否是 context invalidated 错误
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated, page needs refresh');
      } else {
        console.error('Failed to request action:', error);
      }
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

      case 'SHOW_CLEANING_DIALOG':
        this.panel.showCleaningDialog(uiData);
        break;

      case 'SHOW_EXPORT_DIALOG':
        this.panel.showExportDialog(uiData);
        break;

      default:
        console.warn('Unknown UI action:', uiAction);
    }
  }

  /**
   * 初始化插件
   */
  initialize(): void {
    // 等待设置加载完成后，扫描并注入表格导出按钮
    this.settingsReady.then(() => {
      // 只在插件启用时才扫描表格
      if (this.settings.enabled) {
        // 使用智能延迟替代固定 1s 延迟
        const delay = this.calculateSmartDelay();
        
        setTimeout(() => {
          this.scanAndInjectTableButtons();
        }, delay);
      }
    });
    
    // 启动 URL 监听（SPA 路由切换，每 500ms 检查一次）
    this.currentURL = window.location.href;
    this.urlCheckInterval = setInterval(() => {
      this.checkURLChange();
    }, 500);
    
    // 监听 DOM 变化，动态注入按钮（处理 SPA 页面）
    // 使用防抖避免频繁触发
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    this.mutationObserver = new MutationObserver((mutations) => {
      // 检查是否是插件自己的 DOM 变化（避免死循环）
      if (this.isPluginMutation(mutations)) {
        return;
      }
      
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // 从 3000ms 优化到 500ms
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
  private isPluginMutation(mutations: MutationRecord[]): boolean {
    return mutations.some(mutation => {
      const target = mutation.target as Element;
      if (target.className && typeof target.className === 'string') {
        if (/^(tabular-extension|table-export-button)/.test(target.className)) {
          return true;
        }
      }
      for (const node of mutation.addedNodes) {
        if (node instanceof Element) {
          const className = node.className;
          if (className && typeof className === 'string') {
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
  private checkURLChange(): void {
    const newURL = window.location.href;
    
    if (this.currentURL !== newURL) {
      // 检查是否是主路由变化（忽略 hash 和 query）
      const oldPath = new URL(this.currentURL).pathname;
      const newPath = new URL(newURL).pathname;
      
      if (oldPath !== newPath) {
        // 主路由变化：清理旧按钮，重新扫描
        this.handleRouteChange();
      }
      
      this.currentURL = newURL;
    }
  }
  
  /**
   * 处理路由切换
   */
  private handleRouteChange(): void {
    // 清理所有导出按钮
    this.removeAllExportButtons();
    
    // 清空已注入表格记录
    this.injectedTables = new WeakSet<HTMLElement>();
    
    // 延迟重新扫描（使用智能延迟）
    const delay = this.calculateSmartDelay();
    setTimeout(() => {
      this.scanAndInjectTableButtons();
    }, delay);
  }
  
  /**
   * 移除所有导出按钮
   */
  private removeAllExportButtons(): void {
    const buttons = document.querySelectorAll('.table-export-button');
    buttons.forEach(button => button.remove());
  }
  
  /**
   * 重新启动 MutationObserver
   */
  private restartMutationObserver(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
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
  private enterFallbackMode(): void {
    this.fallbackMode = true;
    
    // 停止 MutationObserver
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    
    // 启动定时轮询（每 5 秒）
    this.fallbackInterval = setInterval(() => {
      this.scanAndInjectTableButtons();
    }, 5000);
    
    console.warn('[Tabular] Entered fallback mode (polling every 5s)');
  }
  
  /**
   * 退出降级模式（恢复正常）
   */
  private exitFallbackMode(): void {
    this.fallbackMode = false;
    
    // 停止定时轮询
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
    
    // 重新启动 MutationObserver
    this.restartMutationObserver();
    
    console.log('[Tabular] Exited fallback mode');
  }
  
  /**
   * 检测页面中的表格 UI 框架
   * 检查 body 类名中是否包含已知框架特征
   */
  private detectPageFrameworks(): boolean {
    const frameworkPatterns = [
      /ant-table/,      // Ant Design
      /el-table/,       // Element UI
      /arco-table/,     // Arco Design
      /n-data-table/,   // Naive UI
      /v-data-table/,   // Vuetify
      /MuiTable/        // Material-UI
    ];
    
    const bodyClassName = document.body.className;
    return frameworkPatterns.some(pattern => pattern.test(bodyClassName));
  }
  
  /**
   * 计算智能延迟时间
   * 根据页面框架特征调整延迟：有框架 200ms，无框架 500ms
   */
  private calculateSmartDelay(): number {
    const hasKnownFramework = this.detectPageFrameworks();
    return hasKnownFramework ? 200 : 500;
  }
  
  /**
   * 扫描页面表格并注入导出按钮
   */
  private scanAndInjectTableButtons(): void {
    // 检查插件是否启用
    if (!this.settings.enabled) {
      return;
    }
    
    try {
      const tables = scanTables();
      
      let injectedCount = 0;
      for (const table of tables) {
        // 检查是否已经注入过（使用 WeakSet）
        if (this.injectedTables.has(table.element)) {
          continue;
        }
        
        // 检查是否已经有按钮（双重保险）
        const existingButton = table.element.querySelector('.table-export-button');
        if (existingButton) {
          this.injectedTables.add(table.element);
          continue;
        }
        
        // 排除插件自己的 UI 元素（panel 内的表格）
        if (this.panel.contains(table.element)) {
          this.injectedTables.add(table.element);
          continue;
        }
        
        // 注入按钮
        injectExportButton(table, async () => {
          try {
            // 提取表格数据
            const tableData = table.data;
            
            // 发送表格导出请求到 background（不传递 exportFormat）
            const result = await this.requestAction('table-export', {
              table: tableData
            });
            
            // 执行 UI 动作
            this.executeUIAction(result);
          } catch (error) {
            console.error('[Tabular] Table export failed:', error);
          }
        });
        
        // 标记为已注入
        this.injectedTables.add(table.element);
        injectedCount++;
      }
      
      if (injectedCount > 0) {
        console.log('[Tabular] Injected', injectedCount, 'export buttons');
      }
      
      // 成功：重置失败计数
      this.failureCount = 0;
      
      // 如果处于降级模式，恢复正常模式
      if (this.fallbackMode) {
        this.exitFallbackMode();
      }
    } catch (error) {
      console.error('[Tabular] Error scanning tables:', error);
      
      // 失败计数 +1
      this.failureCount++;
      
      // 达到阈值（3次），进入降级模式
      if (this.failureCount >= 3 && !this.fallbackMode) {
        this.enterFallbackMode();
      }
    }
  }

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
    
    // 断开 MutationObserver
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // 清理 URL 监听
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
      this.urlCheckInterval = null;
    }
    
    // 清理降级模式
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }
}

// 全局初始化
declare global {
  interface Window {
    tabular?: Tabular;
  }
}

// 防止重复初始化
if (!window.tabular) {
  window.tabular = new Tabular();
  window.tabular.initialize();
}

export { Tabular };
