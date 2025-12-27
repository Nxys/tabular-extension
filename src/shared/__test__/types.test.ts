/**
 * types.ts 类型测试
 * 
 * 验证：需求 3.1
 * 
 * 测试范围：
 * - RequestActionMessage 类型存在性
 * - ActionResultMessage 类型存在性
 * - ActionType 枚举值
 * - UIAction 枚举值
 * - ActionStatus 枚举值
 */

import type {
  RequestActionMessage,
  ActionResultMessage,
  ExtensionMessage,
  ActionType,
  UIAction,
  ActionStatus,
  SelectionRect,
  PluginSettings,
  TextItem,
  LayoutOptions
} from '../types';

describe('types.ts - 类型定义测试', () => {
  describe('消息协议类型', () => {
    it('应该正确定义 RequestActionMessage 类型', () => {
      // Arrange & Act
      const message: RequestActionMessage = {
        type: 'REQUEST_ACTION',
        payload: {
          action: 'text-extract',
          data: { test: 'data' }
        }
      };

      // Assert
      expect(message.type).toBe('REQUEST_ACTION');
      expect(message.payload.action).toBe('text-extract');
      expect(message.payload.data).toEqual({ test: 'data' });
    });

    it('应该正确定义 ActionResultMessage 类型', () => {
      // Arrange & Act
      const message: ActionResultMessage = {
        type: 'ACTION_RESULT',
        payload: {
          status: 'ok',
          uiAction: 'SHOW_RESULT_PANEL',
          data: { result: 'success' },
          uiData: {
            text: '提取的文本',
            message: '操作成功'
          }
        }
      };

      // Assert
      expect(message.type).toBe('ACTION_RESULT');
      expect(message.payload.status).toBe('ok');
      expect(message.payload.uiAction).toBe('SHOW_RESULT_PANEL');
      expect(message.payload.data).toEqual({ result: 'success' });
      expect(message.payload.uiData?.text).toBe('提取的文本');
      expect(message.payload.uiData?.message).toBe('操作成功');
    });

    it('应该支持 ExtensionMessage 联合类型', () => {
      // Arrange & Act
      const requestMessage: ExtensionMessage = {
        type: 'REQUEST_ACTION',
        payload: {
          action: 'table-detect'
        }
      };

      const resultMessage: ExtensionMessage = {
        type: 'ACTION_RESULT',
        payload: {
          status: 'limited',
          uiAction: 'SHOW_LIMIT_PANEL'
        }
      };

      // Assert
      expect(requestMessage.type).toBe('REQUEST_ACTION');
      expect(resultMessage.type).toBe('ACTION_RESULT');
    });
  });

  describe('ActionType 枚举', () => {
    it('应该包含所有操作类型', () => {
      // Arrange
      const validActions: ActionType[] = [
        'text-extract',
        'table-detect',
        'column-align',
        'csv-export'
      ];

      // Act & Assert
      validActions.forEach(action => {
        const message: RequestActionMessage = {
          type: 'REQUEST_ACTION',
          payload: { action }
        };
        expect(message.payload.action).toBe(action);
      });
    });

    it('应该正确使用 text-extract 类型', () => {
      // Arrange & Act
      const action: ActionType = 'text-extract';

      // Assert
      expect(action).toBe('text-extract');
    });

    it('应该正确使用 table-detect 类型', () => {
      // Arrange & Act
      const action: ActionType = 'table-detect';

      // Assert
      expect(action).toBe('table-detect');
    });

    it('应该正确使用 column-align 类型', () => {
      // Arrange & Act
      const action: ActionType = 'column-align';

      // Assert
      expect(action).toBe('column-align');
    });

    it('应该正确使用 csv-export 类型', () => {
      // Arrange & Act
      const action: ActionType = 'csv-export';

      // Assert
      expect(action).toBe('csv-export');
    });
  });

  describe('UIAction 枚举', () => {
    it('应该包含所有 UI 动作类型', () => {
      // Arrange
      const validUIActions: UIAction[] = [
        'SHOW_RESULT_PANEL',
        'SHOW_LIMIT_PANEL',
        'SHOW_PRO_PANEL'
      ];

      // Act & Assert
      validUIActions.forEach(uiAction => {
        const message: ActionResultMessage = {
          type: 'ACTION_RESULT',
          payload: {
            status: 'ok',
            uiAction
          }
        };
        expect(message.payload.uiAction).toBe(uiAction);
      });
    });

    it('应该正确使用 SHOW_RESULT_PANEL 类型', () => {
      // Arrange & Act
      const uiAction: UIAction = 'SHOW_RESULT_PANEL';

      // Assert
      expect(uiAction).toBe('SHOW_RESULT_PANEL');
    });

    it('应该正确使用 SHOW_LIMIT_PANEL 类型', () => {
      // Arrange & Act
      const uiAction: UIAction = 'SHOW_LIMIT_PANEL';

      // Assert
      expect(uiAction).toBe('SHOW_LIMIT_PANEL');
    });

    it('应该正确使用 SHOW_PRO_PANEL 类型', () => {
      // Arrange & Act
      const uiAction: UIAction = 'SHOW_PRO_PANEL';

      // Assert
      expect(uiAction).toBe('SHOW_PRO_PANEL');
    });
  });

  describe('ActionStatus 枚举', () => {
    it('应该包含所有状态类型', () => {
      // Arrange
      const validStatuses: ActionStatus[] = ['ok', 'limited', 'blocked'];

      // Act & Assert
      validStatuses.forEach(status => {
        const message: ActionResultMessage = {
          type: 'ACTION_RESULT',
          payload: {
            status,
            uiAction: 'SHOW_RESULT_PANEL'
          }
        };
        expect(message.payload.status).toBe(status);
      });
    });

    it('应该正确使用 ok 状态', () => {
      // Arrange & Act
      const status: ActionStatus = 'ok';

      // Assert
      expect(status).toBe('ok');
    });

    it('应该正确使用 limited 状态', () => {
      // Arrange & Act
      const status: ActionStatus = 'limited';

      // Assert
      expect(status).toBe('limited');
    });

    it('应该正确使用 blocked 状态', () => {
      // Arrange & Act
      const status: ActionStatus = 'blocked';

      // Assert
      expect(status).toBe('blocked');
    });
  });

  describe('跨层纯类型', () => {
    it('应该正确定义 SelectionRect 类型', () => {
      // Arrange & Act
      const rect: SelectionRect = {
        left: 10,
        top: 20,
        right: 100,
        bottom: 200
      };

      // Assert
      expect(rect.left).toBe(10);
      expect(rect.top).toBe(20);
      expect(rect.right).toBe(100);
      expect(rect.bottom).toBe(200);
    });

    it('应该正确定义 PluginSettings 类型', () => {
      // Arrange & Act
      const settings: PluginSettings = {
        enabled: true,
        panelPosition: 'center'
      };

      // Assert
      expect(settings.enabled).toBe(true);
      expect(settings.panelPosition).toBe('center');
    });

    it('应该正确定义 TextItem 类型', () => {
      // Arrange & Act
      const textItem: TextItem = {
        text: '测试文本',
        x: 10,
        y: 20,
        width: 100,
        height: 30
      };

      // Assert
      expect(textItem.text).toBe('测试文本');
      expect(textItem.x).toBe(10);
      expect(textItem.y).toBe(20);
      expect(textItem.width).toBe(100);
      expect(textItem.height).toBe(30);
    });

    it('应该正确定义 LayoutOptions 类型', () => {
      // Arrange & Act
      const options: LayoutOptions = {
        lineThresholdRatio: 5,
        minHorizontalGap: 10
      };

      // Assert
      expect(options.lineThresholdRatio).toBe(5);
      expect(options.minHorizontalGap).toBe(10);
    });
  });
});
