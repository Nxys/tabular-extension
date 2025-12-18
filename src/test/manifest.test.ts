// Manifest v3 规范验证测试

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Manifest v3 规范验证', () => {
  let manifest: any;

  beforeAll(() => {
    // 读取 manifest.json 文件
    const manifestPath = join(process.cwd(), 'src/manifest.json');
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  });

  test('应该使用 Manifest v3 规范', () => {
    expect(manifest.manifest_version).toBe(3);
  });

  test('应该包含必要的基本信息', () => {
    expect(manifest.name).toBeDefined();
    expect(manifest.version).toBeDefined();
    expect(manifest.description).toBeDefined();
    expect(typeof manifest.name).toBe('string');
    expect(typeof manifest.version).toBe('string');
    expect(typeof manifest.description).toBe('string');
  });

  test('应该只请求必要的权限', () => {
    expect(manifest.permissions).toEqual(['activeTab', 'clipboardWrite']);
    // 验证没有请求 host 权限
    expect(manifest.host_permissions).toBeUndefined();
  });

  test('应该正确配置 content script', () => {
    expect(manifest.content_scripts).toBeDefined();
    expect(Array.isArray(manifest.content_scripts)).toBe(true);
    expect(manifest.content_scripts.length).toBe(1);

    const contentScript = manifest.content_scripts[0];
    expect(contentScript.matches).toEqual(['<all_urls>']);
    expect(contentScript.js).toEqual(['content.js']);
    expect(contentScript.css).toEqual(['content.css']);
    expect(contentScript.run_at).toBe('document_end');
  });

  test('应该正确配置 service worker', () => {
    expect(manifest.background).toBeDefined();
    expect(manifest.background.service_worker).toBe('background.js');
    // Manifest v3 不应该有 persistent 属性
    expect(manifest.background.persistent).toBeUndefined();
  });

  test('应该配置扩展操作', () => {
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_title).toBeDefined();
    expect(typeof manifest.action.default_title).toBe('string');
  });

  test('不应该包含外部依赖', () => {
    // 验证没有外部脚本或资源
    expect(manifest.externally_connectable).toBeUndefined();
    expect(manifest.web_accessible_resources).toBeUndefined();
  });
});