/**
 * Jest 全局测试配置文件
 * 提供测试工具函数和全局钩子配置
 */

import { createChromeMock, resetChromeMock } from './mocks/chrome';
import { webcrypto } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

// 初始化 chrome API mock
global.chrome = createChromeMock();

// 添加 Web Crypto API polyfill
// @ts-ignore - Node.js crypto polyfill
global.crypto = webcrypto as unknown as Crypto;

// 确保 crypto.subtle 可用
if (!global.crypto.subtle) {
  // @ts-ignore
  global.crypto.subtle = webcrypto.subtle;
}

// 添加 TextEncoder/TextDecoder polyfill
if (!global.TextEncoder) {
  // @ts-ignore - Node.js util polyfill
  global.TextEncoder = TextEncoder;
}
if (!global.TextDecoder) {
  // @ts-ignore - Node.js util polyfill
  global.TextDecoder = TextDecoder;
}

// 保存原始的 Date 对象
let originalDate: DateConstructor;

/**
 * 重置所有 mock 状态
 * 在每个测试前调用，确保测试隔离
 */
export function resetMocks(): void {
  resetChromeMock();
  jest.clearAllMocks();
}

/**
 * Mock 日期为指定时间
 * @param date - 日期字符串，如 '2024-01-01'
 */
export function mockDate(date: string): void {
  originalDate = global.Date;
  const mockDate = new Date(date);
  
  // @ts-ignore - Mock Date 构造函数
  global.Date = class extends Date {
    constructor() {
      super();
      return mockDate;
    }
    
    static now(): number {
      return mockDate.getTime();
    }
  } as DateConstructor;
}

/**
 * 恢复原始的 Date 对象
 */
export function restoreDate(): void {
  if (originalDate) {
    global.Date = originalDate;
  }
}

// 全局 beforeEach 钩子
beforeEach(() => {
  resetMocks();
});

// 全局 afterEach 钩子
afterEach(() => {
  restoreDate();
  jest.restoreAllMocks();
});
