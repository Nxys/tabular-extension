/**
 * 设置管理集成测试
 * 验证设置持久化、更新生效、无效设置处理等行为
 * 
 * Feature: integration-testing
 * 需求：10.1, 10.2, 10.3, 10.4
 */

import * as fc from 'fast-check';
import { createChromeMock, resetChromeMock } from '../mocks/chrome';
import {
  setupTestState,
  cleanupTestState,
} from './helpers';
import {
  clearMessageHistory,
  clearMessageInterceptor,
} from './messaging';
import { getSettings, updateSettings } from '../../background/settings';
import type { PluginSettings } from '../../shared/types';

// 设置 chrome mock
beforeAll(() => {
  (global as any).chrome = createChromeMock();
});

// 每个测试前重置状态
beforeEach(async () => {
  resetChromeMock();
  clearMessageInterceptor();
  clearMessageHistory();
  await cleanupTestState();
});

describe('设置管理集成测试', () => {
  describe('设置持久化到 storage', () => {
    test('更新 enabled 设置应该持久化到 storage', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 更新 enabled 设置
      await updateSettings({ enabled: true });
      
      // Assert: 验证设置已持久化到 storage
      const storage = await chrome.storage.local.get(['enabled']);
      expect(storage.enabled).toBe(true);
    });
    
    test('更新 panelPosition 设置应该持久化到 storage', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: true,
          panelPosition: 'center',
        },
      });
      
      // Act: 更新 panelPosition 设置
      await updateSettings({ panelPosition: 'mouse' });
      
      // Assert: 验证设置已持久化到 storage
      const storage = await chrome.storage.local.get(['panelPosition']);
      expect(storage.panelPosition).toBe('mouse');
    });
    
    test('同时更新多个设置应该都持久化', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 同时更新多个设置
      await updateSettings({
        enabled: true,
        panelPosition: 'mouse',
      });
      
      // Assert: 验证所有设置都已持久化
      const storage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      expect(storage.enabled).toBe(true);
      expect(storage.panelPosition).toBe('mouse');
    });
    
    test('部分更新设置不应该影响其他设置', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: true,
          panelPosition: 'center',
        },
      });
      
      // Act: 只更新 enabled
      await updateSettings({ enabled: false });
      
      // Assert: 验证 enabled 更新，panelPosition 保持不变
      const storage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      expect(storage.enabled).toBe(false);
      expect(storage.panelPosition).toBe('center');
    });
    
    test('多次更新设置应该保持最新值', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 多次更新同一设置
      await updateSettings({ enabled: true });
      await updateSettings({ enabled: false });
      await updateSettings({ enabled: true });
      
      // Assert: 验证保持最新值
      const storage = await chrome.storage.local.get(['enabled']);
      expect(storage.enabled).toBe(true);
    });
    
    test('读取设置应该从 storage 获取持久化的值', async () => {
      // Arrange: 直接在 storage 中设置值
      await chrome.storage.local.set({
        enabled: true,
        panelPosition: 'mouse',
      });
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证读取的值与 storage 一致
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('mouse');
    });
    
    test('首次使用时应该使用默认设置', async () => {
      // Arrange: 清空 storage（模拟首次使用）
      await chrome.storage.local.clear();
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证使用默认值
      expect(settings.enabled).toBe(false);
      expect(settings.panelPosition).toBe('center');
    });
    
    test('设置持久化后重启应该保持', async () => {
      // Arrange: 更新设置
      await updateSettings({
        enabled: true,
        panelPosition: 'mouse',
      });
      
      // Act: 模拟重启（清理内存但保留 storage）
      // 直接从 storage 读取
      const storage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      
      // Assert: 验证设置保持
      expect(storage.enabled).toBe(true);
      expect(storage.panelPosition).toBe('mouse');
    });
  });
  
  describe('设置更新后立即生效', () => {
    test('更新设置后立即读取应该获得新值', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 更新设置
      await updateSettings({ enabled: true });
      
      // 立即读取设置
      const settings = await getSettings();
      
      // Assert: 验证获得新值
      expect(settings.enabled).toBe(true);
    });
    
    test('更新 panelPosition 后立即读取应该获得新值', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: true,
          panelPosition: 'center',
        },
      });
      
      // Act: 更新设置
      await updateSettings({ panelPosition: 'mouse' });
      
      // 立即读取设置
      const settings = await getSettings();
      
      // Assert: 验证获得新值
      expect(settings.panelPosition).toBe('mouse');
    });
    
    test('连续更新设置应该每次都立即生效', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act & Assert: 连续更新并验证
      await updateSettings({ enabled: true });
      let settings = await getSettings();
      expect(settings.enabled).toBe(true);
      
      await updateSettings({ panelPosition: 'mouse' });
      settings = await getSettings();
      expect(settings.panelPosition).toBe('mouse');
      
      await updateSettings({ enabled: false });
      settings = await getSettings();
      expect(settings.enabled).toBe(false);
    });
    
    test('更新设置后其他模块应该能读取到新值', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 更新设置
      await updateSettings({ enabled: true });
      
      // 模拟其他模块读取设置（直接从 storage 读取）
      const storage = await chrome.storage.local.get(['enabled']);
      
      // Assert: 验证其他模块能读取到新值
      expect(storage.enabled).toBe(true);
    });
    
    test('快速连续更新设置应该保持最终值', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 快速连续更新
      await updateSettings({ enabled: true });
      await updateSettings({ enabled: false });
      await updateSettings({ enabled: true });
      
      // Assert: 验证保持最终值
      const settings = await getSettings();
      expect(settings.enabled).toBe(true);
    });
    
    test('更新设置不应该影响其他未更新的设置', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: true,
          panelPosition: 'center',
        },
      });
      
      // Act: 只更新 enabled
      await updateSettings({ enabled: false });
      
      // Assert: 验证 panelPosition 保持不变
      const settings = await getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.panelPosition).toBe('center');
    });
  });
  
  describe('无效设置使用默认值', () => {
    test('读取不存在的设置应该返回默认值', async () => {
      // Arrange: 清空 storage
      await chrome.storage.local.clear();
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证返回默认值
      expect(settings.enabled).toBe(false);
      expect(settings.panelPosition).toBe('center');
    });
    
    test('enabled 为 undefined 时应该使用默认值', async () => {
      // Arrange: 设置 enabled 为 undefined
      await chrome.storage.local.set({
        enabled: undefined,
        panelPosition: 'mouse',
      });
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证 enabled 使用默认值
      expect(settings.enabled).toBe(false);
      expect(settings.panelPosition).toBe('mouse');
    });
    
    test('panelPosition 为 undefined 时应该使用默认值', async () => {
      // Arrange: 设置 panelPosition 为 undefined
      await chrome.storage.local.set({
        enabled: true,
        panelPosition: undefined,
      });
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证 panelPosition 使用默认值
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('center');
    });
    
    test('部分设置缺失时应该使用默认值补全', async () => {
      // Arrange: 只设置 enabled
      await chrome.storage.local.set({
        enabled: true,
      });
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证缺失的设置使用默认值
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('center');
    });
    
    test('所有设置都缺失时应该返回完整的默认设置', async () => {
      // Arrange: 清空 storage
      await chrome.storage.local.clear();
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证返回完整的默认设置
      expect(settings).toEqual({
        enabled: false,
        panelPosition: 'center',
      });
    });
    
    test('storage 中有其他数据时不应该影响设置读取', async () => {
      // Arrange: 设置一些其他数据
      await chrome.storage.local.set({
        enabled: true,
        panelPosition: 'mouse',
        usage_count: 10,
        pro_state: { isPro: true },
      });
      
      // Act: 读取设置
      const settings = await getSettings();
      
      // Assert: 验证只读取设置相关的数据
      expect(settings).toEqual({
        enabled: true,
        panelPosition: 'mouse',
      });
    });
  });
  
  describe('跨层设置一致性', () => {
    test('Background 层和 Content 层读取的设置应该一致', async () => {
      // Arrange: 在 storage 中设置值
      await chrome.storage.local.set({
        enabled: true,
        panelPosition: 'mouse',
      });
      
      // Act: Background 层读取设置
      const backgroundSettings = await getSettings();
      
      // Content 层模拟读取设置（直接从 storage 读取）
      const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      const contentSettings: PluginSettings = {
        enabled: contentStorage.enabled ?? false,
        panelPosition: contentStorage.panelPosition ?? 'center',
      };
      
      // Assert: 验证两层读取的设置一致
      expect(backgroundSettings).toEqual(contentSettings);
      expect(backgroundSettings.enabled).toBe(true);
      expect(backgroundSettings.panelPosition).toBe('mouse');
    });
    
    test('Background 层更新设置后 Content 层应该能读取到', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: Background 层更新设置
      await updateSettings({
        enabled: true,
        panelPosition: 'mouse',
      });
      
      // Content 层读取设置
      const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      
      // Assert: 验证 Content 层能读取到更新后的值
      expect(contentStorage.enabled).toBe(true);
      expect(contentStorage.panelPosition).toBe('mouse');
    });
    
    test('多次更新后两层读取的设置应该保持一致', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 多次更新设置
      await updateSettings({ enabled: true });
      await updateSettings({ panelPosition: 'mouse' });
      await updateSettings({ enabled: false });
      
      // Background 层读取
      const backgroundSettings = await getSettings();
      
      // Content 层读取
      const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      const contentSettings: PluginSettings = {
        enabled: contentStorage.enabled ?? false,
        panelPosition: contentStorage.panelPosition ?? 'center',
      };
      
      // Assert: 验证两层设置一致
      expect(backgroundSettings).toEqual(contentSettings);
      expect(backgroundSettings.enabled).toBe(false);
      expect(backgroundSettings.panelPosition).toBe('mouse');
    });
    
    test('使用默认值时两层应该一致', async () => {
      // Arrange: 清空 storage
      await chrome.storage.local.clear();
      
      // Act: Background 层读取（使用默认值）
      const backgroundSettings = await getSettings();
      
      // Content 层读取（使用默认值）
      const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      const contentSettings: PluginSettings = {
        enabled: contentStorage.enabled ?? false,
        panelPosition: contentStorage.panelPosition ?? 'center',
      };
      
      // Assert: 验证两层默认值一致
      expect(backgroundSettings).toEqual(contentSettings);
      expect(backgroundSettings.enabled).toBe(false);
      expect(backgroundSettings.panelPosition).toBe('center');
    });
    
    test('部分设置缺失时两层应该使用相同的默认值', async () => {
      // Arrange: 只设置 enabled
      await chrome.storage.local.set({
        enabled: true,
      });
      
      // Act: Background 层读取
      const backgroundSettings = await getSettings();
      
      // Content 层读取
      const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      const contentSettings: PluginSettings = {
        enabled: contentStorage.enabled ?? false,
        panelPosition: contentStorage.panelPosition ?? 'center',
      };
      
      // Assert: 验证两层对缺失设置使用相同的默认值
      expect(backgroundSettings).toEqual(contentSettings);
      expect(backgroundSettings.enabled).toBe(true);
      expect(backgroundSettings.panelPosition).toBe('center');
    });
    
    test('快速连续更新后两层应该保持一致', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: 快速连续更新
      await updateSettings({ enabled: true });
      await updateSettings({ panelPosition: 'mouse' });
      await updateSettings({ enabled: false });
      await updateSettings({ panelPosition: 'none' });
      
      // 等待所有更新完成
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Background 层读取
      const backgroundSettings = await getSettings();
      
      // Content 层读取
      const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
      const contentSettings: PluginSettings = {
        enabled: contentStorage.enabled ?? false,
        panelPosition: contentStorage.panelPosition ?? 'center',
      };
      
      // Assert: 验证两层设置一致
      expect(backgroundSettings).toEqual(contentSettings);
      expect(backgroundSettings.enabled).toBe(false);
      expect(backgroundSettings.panelPosition).toBe('none');
    });
    
    test('设置更新应该通过 storage 同步到所有层', async () => {
      // Arrange: 设置初始状态
      await setupTestState({
        settings: {
          enabled: false,
          panelPosition: 'center',
        },
      });
      
      // Act: Background 层更新设置
      await updateSettings({
        enabled: true,
        panelPosition: 'mouse',
      });
      
      // 模拟多个层同时读取
      const [backgroundSettings, contentStorage1, contentStorage2] = await Promise.all([
        getSettings(),
        chrome.storage.local.get(['enabled', 'panelPosition']),
        chrome.storage.local.get(['enabled', 'panelPosition']),
      ]);
      
      // Assert: 验证所有层读取的值一致
      expect(backgroundSettings.enabled).toBe(true);
      expect(backgroundSettings.panelPosition).toBe('mouse');
      expect(contentStorage1.enabled).toBe(true);
      expect(contentStorage1.panelPosition).toBe('mouse');
      expect(contentStorage2.enabled).toBe(true);
      expect(contentStorage2.panelPosition).toBe('mouse');
    });
  });
  
  describe('属性测试：设置更新立即生效', () => {
    /**
     * 属性 19：设置更新立即生效
     * Feature: integration-testing, Property 19: 设置更新立即生效
     * 验证：需求 10.2
     * 
     * 对于任何设置更新，后续操作应该使用新的设置值，而不是旧的设置值。
     */
    test('属性 19：对于任何设置更新，后续读取应该立即获得新值', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机设置
          fc.record({
            enabled: fc.boolean(),
            panelPosition: fc.constantFrom('center' as const, 'mouse' as const, 'none' as const),
          }),
          async (randomSettings) => {
            // Arrange: 设置初始状态（与随机设置相反）
            await setupTestState({
              settings: {
                enabled: !randomSettings.enabled,
                panelPosition: randomSettings.panelPosition === 'center' ? 'mouse' : 'center',
              },
            });
            
            // Act: 更新设置为随机生成的值
            await updateSettings(randomSettings);
            
            // 立即读取设置
            const settings = await getSettings();
            
            // Assert: 验证读取的值与更新的值一致
            expect(settings.enabled).toBe(randomSettings.enabled);
            expect(settings.panelPosition).toBe(randomSettings.panelPosition);
            
            // 清理状态
            await cleanupTestState();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 增加超时时间以适应 100 次迭代
  });
  
  describe('属性测试：跨层设置一致性', () => {
    /**
     * 属性 21：跨层设置一致性
     * Feature: integration-testing, Property 21: 跨层设置一致性
     * 验证：需求 10.4
     * 
     * 对于任何设置，在 Background 层和 Content 层读取的设置值应该一致。
     */
    test('属性 21：对于任何设置，Background 层和 Content 层读取的值应该一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机设置
          fc.record({
            enabled: fc.boolean(),
            panelPosition: fc.constantFrom('center' as const, 'mouse' as const, 'none' as const),
          }),
          async (randomSettings) => {
            // Arrange: 在 storage 中设置随机值
            await chrome.storage.local.set({
              enabled: randomSettings.enabled,
              panelPosition: randomSettings.panelPosition,
            });
            
            // Act: Background 层读取设置
            const backgroundSettings = await getSettings();
            
            // Content 层模拟读取设置（直接从 storage 读取）
            const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
            const contentSettings: PluginSettings = {
              enabled: contentStorage.enabled ?? false,
              panelPosition: contentStorage.panelPosition ?? 'center',
            };
            
            // Assert: 验证两层读取的设置一致
            expect(backgroundSettings).toEqual(contentSettings);
            expect(backgroundSettings.enabled).toBe(randomSettings.enabled);
            expect(backgroundSettings.panelPosition).toBe(randomSettings.panelPosition);
            expect(contentSettings.enabled).toBe(randomSettings.enabled);
            expect(contentSettings.panelPosition).toBe(randomSettings.panelPosition);
            
            // 清理状态
            await cleanupTestState();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 增加超时时间以适应 100 次迭代
    
    test('属性 21：对于任何设置更新，两层读取的值应该保持一致', async () => {
      await fc.assert(
        fc.asyncProperty(
          // 生成随机设置序列
          fc.array(
            fc.record({
              enabled: fc.boolean(),
              panelPosition: fc.constantFrom('center' as const, 'mouse' as const, 'none' as const),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (settingsSequence) => {
            // Arrange: 设置初始状态
            await setupTestState({
              settings: {
                enabled: false,
                panelPosition: 'center',
              },
            });
            
            // Act: 依次更新设置
            for (const settings of settingsSequence) {
              await updateSettings(settings);
            }
            
            // 获取最后一次更新的设置
            const lastSettings = settingsSequence[settingsSequence.length - 1];
            
            // Background 层读取
            const backgroundSettings = await getSettings();
            
            // Content 层读取
            const contentStorage = await chrome.storage.local.get(['enabled', 'panelPosition']);
            const contentSettings: PluginSettings = {
              enabled: contentStorage.enabled ?? false,
              panelPosition: contentStorage.panelPosition ?? 'center',
            };
            
            // Assert: 验证两层设置一致，且等于最后一次更新的值
            expect(backgroundSettings).toEqual(contentSettings);
            expect(backgroundSettings.enabled).toBe(lastSettings.enabled);
            expect(backgroundSettings.panelPosition).toBe(lastSettings.panelPosition);
            expect(contentSettings.enabled).toBe(lastSettings.enabled);
            expect(contentSettings.panelPosition).toBe(lastSettings.panelPosition);
            
            // 清理状态
            await cleanupTestState();
          }
        ),
        { numRuns: 100 }
      );
    }, 30000); // 增加超时时间以适应 100 次迭代
  });
});
