/**
 * settings.ts 单元测试
 * 
 * 测试范围：
 * - getSettings() 默认设置
 * - updateSettings() 部分更新
 * - updateSettings() 完整更新
 */

import { getSettings, updateSettings } from '../settings';
import { setToStorage } from '../storage';

describe('settings.ts', () => {
  beforeEach(() => {
    // 清空存储
    if (global.chrome?.storage?.local) {
      (global.chrome.storage.local as any).data?.clear();
    }
  });

  describe('getSettings', () => {
    it('应该返回默认设置', async () => {
      // Act
      const settings = await getSettings();
      
      // Assert
      expect(settings.enabled).toBe(false);
      expect(settings.panelPosition).toBe('center');
    });

    it('应该返回存储的设置', async () => {
      // Arrange
      await setToStorage('enabled', true);
      await setToStorage('panelPosition', 'mouse');
      
      // Act
      const settings = await getSettings();
      
      // Assert
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('mouse');
    });

    it('应该返回部分存储的设置（enabled 已设置）', async () => {
      // Arrange
      await setToStorage('enabled', true);
      
      // Act
      const settings = await getSettings();
      
      // Assert
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('center'); // 默认值
    });

    it('应该返回部分存储的设置（panelPosition 已设置）', async () => {
      // Arrange
      await setToStorage('panelPosition', 'none');
      
      // Act
      const settings = await getSettings();
      
      // Assert
      expect(settings.enabled).toBe(false); // 默认值
      expect(settings.panelPosition).toBe('none');
    });
  });

  describe('updateSettings', () => {
    it('应该更新 enabled 设置', async () => {
      // Act
      await updateSettings({ enabled: true });
      
      // Assert
      const settings = await getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('center'); // 保持默认值
    });

    it('应该更新 panelPosition 设置', async () => {
      // Act
      await updateSettings({ panelPosition: 'mouse' });
      
      // Assert
      const settings = await getSettings();
      expect(settings.enabled).toBe(false); // 保持默认值
      expect(settings.panelPosition).toBe('mouse');
    });

    it('应该同时更新多个设置', async () => {
      // Act
      await updateSettings({ 
        enabled: true, 
        panelPosition: 'none' 
      });
      
      // Assert
      const settings = await getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('none');
    });

    it('应该覆盖已有的设置', async () => {
      // Arrange
      await updateSettings({ enabled: true, panelPosition: 'mouse' });
      
      // Act
      await updateSettings({ enabled: false });
      
      // Assert
      const settings = await getSettings();
      expect(settings.enabled).toBe(false);
      expect(settings.panelPosition).toBe('mouse'); // 保持之前的值
    });

    it('应该处理空的部分更新', async () => {
      // Arrange
      await updateSettings({ enabled: true, panelPosition: 'mouse' });
      
      // Act
      await updateSettings({});
      
      // Assert
      const settings = await getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('mouse');
    });

    it('应该支持所有 panelPosition 选项', async () => {
      // Act & Assert
      await updateSettings({ panelPosition: 'center' });
      expect((await getSettings()).panelPosition).toBe('center');
      
      await updateSettings({ panelPosition: 'mouse' });
      expect((await getSettings()).panelPosition).toBe('mouse');
      
      await updateSettings({ panelPosition: 'none' });
      expect((await getSettings()).panelPosition).toBe('none');
    });
  });
});
