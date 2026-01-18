/**
 * Pro 状态加密模块
 * 
 * 职责：
 * - 使用 AES-GCM 算法加密/解密 Pro 状态
 * - 基于扩展 ID 派生加密密钥
 * - 处理加密解密错误
 * 
 * 安全特性：
 * - 使用 Web Crypto API（浏览器原生）
 * - AES-GCM 认证加密（防篡改）
 * - 每次加密生成新的随机 IV
 * - 密钥基于扩展 ID 派生（每个安装唯一）
 */

import type { ProState } from './pro';

/**
 * 加密算法配置
 */
const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // GCM 推荐 12 字节
const SALT = 'table-capture-pro-v1'; // 固定盐值

/**
 * 派生加密密钥
 * 
 * 使用扩展 ID 作为密码，通过 PBKDF2 派生密钥
 * 确保每个扩展安装有唯一的密钥
 * 
 * @returns 加密密钥
 */
async function deriveKey(): Promise<CryptoKey> {
  // 获取扩展 ID（每个安装唯一）
  const extensionId = chrome.runtime.id;
  
  // 将扩展 ID 和盐值组合作为密码
  const password = `${extensionId}-${SALT}`;
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // 导入密码作为密钥材料
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // 使用 PBKDF2 派生密钥
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(SALT),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
  
  return key;
}

/**
 * 加密 Pro 状态
 * 
 * 使用 AES-GCM 算法加密状态对象
 * 返回格式：base64(iv + encrypted_data)
 * 
 * @param state Pro 状态对象
 * @returns 加密后的 base64 字符串
 * @throws 加密失败时抛出错误
 */
export async function encryptProState(state: ProState): Promise<string> {
  try {
    // 序列化状态对象
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(state));
    
    // 生成随机 IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // 派生密钥
    const key = await deriveKey();
    
    // 加密数据
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    // 组合 IV 和加密数据
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // 转换为 base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Error encrypting Pro state:', error);
    throw new Error('Failed to encrypt Pro state');
  }
}

/**
 * 解密 Pro 状态
 * 
 * 解密 base64 编码的加密数据
 * 格式：base64(iv + encrypted_data)
 * 
 * @param encrypted 加密的 base64 字符串
 * @returns Pro 状态对象，解密失败返回 null
 */
export async function decryptProState(encrypted: string): Promise<ProState | null> {
  try {
    // 从 base64 解码
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    
    // 分离 IV 和加密数据
    const iv = combined.slice(0, IV_LENGTH);
    const data = combined.slice(IV_LENGTH);
    
    // 派生密钥
    const key = await deriveKey();
    
    // 解密数据
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    // 反序列化状态对象
    const decoder = new TextDecoder();
    const json = decoder.decode(decrypted);
    const state = JSON.parse(json) as ProState;
    
    return state;
  } catch (error) {
    console.error('Error decrypting Pro state:', error);
    // 解密失败返回 null（按设计要求）
    return null;
  }
}
