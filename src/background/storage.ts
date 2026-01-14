/**
 * chrome.storage 统一封装
 * 
 * 职责：
 * - 提供 get / set / remove 等方法
 * - 内存降级存储
 * - 错误处理
 */

/**
 * 内存降级存储
 */
const memoryFallback = new Map<string, unknown>();

/**
 * 危险键名列表（防止原型污染）
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * 检查键名是否安全
 * @param key 存储键名
 * @returns 是否安全
 */
function isSafeKey(key: string): boolean {
  return !DANGEROUS_KEYS.includes(key);
}

/**
 * 从 storage 读取数据
 * 
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 存储的值或默认值
 */
export async function getFromStorage<T>(key: string, defaultValue: T): Promise<T> {
  // 防止原型污染
  if (!isSafeKey(key)) {
    console.warn(`Dangerous key rejected: ${key}`);
    return defaultValue;
  }
  
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (error) {
    console.warn(`Storage get failed for key: ${key}, using memory fallback`, error);
    return memoryFallback.has(key) ? memoryFallback.get(key) as T : defaultValue;
  }
}

/**
 * 向 storage 写入数据
 * 
 * @param key 存储键名
 * @param value 要存储的值
 */
export async function setToStorage(key: string, value: unknown): Promise<void> {
  // 防止原型污染
  if (!isSafeKey(key)) {
    console.warn(`Dangerous key rejected: ${key}`);
    return;
  }
  
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (error) {
    console.warn(`Storage set failed for key: ${key}, using memory fallback`, error);
    memoryFallback.set(key, value);
  }
}

/**
 * 从 storage 删除数据
 * 
 * @param key 存储键名
 */
export async function removeFromStorage(key: string): Promise<void> {
  // 防止原型污染
  if (!isSafeKey(key)) {
    console.warn(`Dangerous key rejected: ${key}`);
    return;
  }
  
  try {
    await chrome.storage.local.remove(key);
  } catch (error) {
    console.warn(`Storage remove failed for key: ${key}, using memory fallback`, error);
    memoryFallback.delete(key);
  }
}
