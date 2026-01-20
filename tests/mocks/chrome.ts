/**
 * Chrome API Mock 实现
 * 提供 chrome.storage、chrome.runtime、chrome.tabs 的 mock
 */

/**
 * Mock Storage 接口
 */
export interface MockStorage {
  data: Map<string, unknown>;
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): void;
}

/**
 * Mock Runtime 接口
 */
export interface MockRuntime {
  sendMessage(message: unknown): Promise<unknown>;
  onMessage: {
    addListener(callback: Function): void;
    removeListener(callback: Function): void;
    listeners: Function[];
  };
  mockResponse: unknown;
}

/**
 * Mock Tabs 接口
 */
export interface MockTabs {
  query(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
  sendMessage(tabId: number, message: unknown): Promise<unknown>;
  mockTabs: chrome.tabs.Tab[];
  mockResponse: unknown;
}

// 内存存储实现
const storageData = new Map<string, unknown>();

// Runtime 监听器列表
const runtimeListeners: Function[] = [];

// Commands 监听器列表
const commandsListeners: Function[] = [];

// Mock tabs 数据
let mockTabs: chrome.tabs.Tab[] = [];

// Mock 响应数据
let mockRuntimeResponse: unknown = null;
let mockTabsResponse: unknown = null;

/**
 * 创建 chrome.storage.local mock
 */
function createStorageMock(): MockStorage {
  return {
    data: storageData,
    
    async get(keys: string | string[]): Promise<Record<string, unknown>> {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      const result: Record<string, unknown> = {};
      
      for (const key of keyArray) {
        if (storageData.has(key)) {
          result[key] = storageData.get(key);
        }
      }
      
      return result;
    },
    
    async set(items: Record<string, unknown>): Promise<void> {
      for (const [key, value] of Object.entries(items)) {
        storageData.set(key, value);
      }
    },
    
    async remove(keys: string | string[]): Promise<void> {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      for (const key of keyArray) {
        storageData.delete(key);
      }
    },
    
    clear(): void {
      storageData.clear();
    }
  };
}

/**
 * 创建 chrome.runtime mock
 */
function createRuntimeMock(): MockRuntime {
  return {
    async sendMessage(message: unknown): Promise<unknown> {
      // 如果有监听器，触发它们
      if (runtimeListeners.length > 0) {
        return new Promise((resolve) => {
          const sender = {} as chrome.runtime.MessageSender;
          const sendResponse = (response: unknown) => {
            resolve(response);
          };
          
          // 调用第一个监听器（通常只有一个）
          for (const listener of runtimeListeners) {
            const result = listener(message, sender, sendResponse);
            // 如果监听器返回 true，表示异步响应
            if (result === true) {
              break;
            }
          }
        });
      }
      
      return mockRuntimeResponse || {};
    },
    
    onMessage: {
      addListener(callback: Function): void {
        runtimeListeners.push(callback);
      },
      
      removeListener(callback: Function): void {
        const index = runtimeListeners.indexOf(callback);
        if (index > -1) {
          runtimeListeners.splice(index, 1);
        }
      },
      
      listeners: runtimeListeners
    },
    
    mockResponse: mockRuntimeResponse
  };
}

/**
 * 创建 chrome.tabs mock
 */
function createTabsMock(): MockTabs {
  return {
    async query(_queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
      // 简单的 mock 实现，返回所有 mock tabs
      return mockTabs;
    },
    
    async sendMessage(_tabId: number, _message: unknown): Promise<unknown> {
      return mockTabsResponse || {};
    },
    
    mockTabs,
    mockResponse: mockTabsResponse
  };
}

/**
 * 创建完整的 chrome API mock
 */
export function createChromeMock(): typeof chrome {
  const storageMock = createStorageMock();
  const runtimeMock = createRuntimeMock();
  const tabsMock = createTabsMock();
  
  // Mock URL.createObjectURL and URL.revokeObjectURL
  if (typeof global.URL === 'undefined') {
    (global as any).URL = {};
  }
  global.URL.createObjectURL = jest.fn((_blob: Blob) => {
    return `blob:mock-url-${Date.now()}`;
  });
  global.URL.revokeObjectURL = jest.fn();
  
  // 使用 unknown 作为中间类型以避免类型检查错误
  return {
    storage: {
      local: storageMock as any,
      sync: storageMock as any,
      managed: storageMock as any,
      session: storageMock as any,
      onChanged: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
        hasListener: jest.fn(),
        hasListeners: jest.fn()
      }
    },
    runtime: runtimeMock as any,
    tabs: tabsMock as any,
    commands: {
      onCommand: {
        addListener: (callback: Function) => {
          commandsListeners.push(callback);
        },
        removeListener: (callback: Function) => {
          const index = commandsListeners.indexOf(callback);
          if (index > -1) {
            commandsListeners.splice(index, 1);
          }
        },
        hasListener: jest.fn(),
        hasListeners: jest.fn(),
        listeners: commandsListeners
      }
    } as any,
    downloads: {
      download: jest.fn((_options: { url: string; filename: string; saveAs: boolean }, callback?: (downloadId?: number) => void) => {
        if (callback) {
          setTimeout(() => callback(Date.now()), 0);
        }
      })
    } as any
  } as unknown as typeof chrome;
}

/**
 * 重置 chrome mock 状态
 * 清空所有存储数据、监听器和 mock 响应
 */
export function resetChromeMock(): void {
  storageData.clear();
  runtimeListeners.length = 0;
  commandsListeners.length = 0;
  mockTabs = [];
  mockRuntimeResponse = null;
  mockTabsResponse = null;
}

/**
 * 设置 runtime.sendMessage 的 mock 响应
 */
export function setMockRuntimeResponse(response: unknown): void {
  mockRuntimeResponse = response;
}

/**
 * 设置 tabs.sendMessage 的 mock 响应
 */
export function setMockTabsResponse(response: unknown): void {
  mockTabsResponse = response;
}

/**
 * 设置 mock tabs 数据
 */
export function setMockTabs(tabs: chrome.tabs.Tab[]): void {
  mockTabs = tabs;
}
