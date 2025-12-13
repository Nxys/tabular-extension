import { VisualTextExtractor } from '../components/VisualTextExtractor.js';
import { SelectionRect } from '../types/index.js';

describe('VisualTextExtractor - 文本元素检测', () => {
  let extractor: VisualTextExtractor;
  let mockGetComputedStyle: jest.SpyInstance;
  let mockGetClientRects: jest.SpyInstance;

  beforeEach(() => {
    extractor = new VisualTextExtractor();
    // 清理 DOM
    document.body.innerHTML = '';
    
    // 重置模拟函数
    mockGetComputedStyle = jest.spyOn(window, 'getComputedStyle');
    mockGetClientRects = jest.spyOn(Element.prototype, 'getClientRects');
  });

  afterEach(() => {
    mockGetComputedStyle.mockRestore();
    mockGetClientRects.mockRestore();
  });

  describe('getTextElements', () => {
    test('应该检测到可见文本元素', () => {
      // 创建测试 HTML 结构
      document.body.innerHTML = `
        <div id="text1">可见文本</div>
        <div id="text2">另一个文本</div>
      `;

      // 模拟 getComputedStyle 返回可见状态
      mockGetComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      });

      // 模拟 getClientRects 返回位置信息
      mockGetClientRects.mockImplementation(() => {
        return [{
          left: 10,
          top: 10,
          right: 110,
          bottom: 30,
          width: 100,
          height: 20
        }];
      });

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 100
      };

      const elements = extractor.getTextElements(selectionRect);
      
      expect(elements.length).toBeGreaterThan(0);
      expect(elements.some(el => el.text.includes('可见文本'))).toBe(true);
      expect(elements.some(el => el.text.includes('另一个文本'))).toBe(true);
    });

    test('应该过滤掉隐藏的文本元素', () => {
      document.body.innerHTML = `
        <div id="visible">可见文本</div>
        <div id="hidden">隐藏文本</div>
        <div id="invisible">不可见文本</div>
      `;

      // 模拟 getComputedStyle 返回不同的可见性状态
      mockGetComputedStyle.mockImplementation((element: Element) => {
        const id = (element as HTMLElement).id;
        if (id === 'hidden') {
          return { display: 'none', visibility: 'visible', opacity: '1' };
        } else if (id === 'invisible') {
          return { display: 'block', visibility: 'hidden', opacity: '1' };
        } else {
          return { display: 'block', visibility: 'visible', opacity: '1' };
        }
      });

      // 模拟 getClientRects 返回位置信息
      mockGetClientRects.mockImplementation(() => {
        return [{
          left: 10,
          top: 10,
          right: 110,
          bottom: 30,
          width: 100,
          height: 20
        }];
      });

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 150
      };

      const elements = extractor.getTextElements(selectionRect);
      
      expect(elements.some(el => el.text.includes('可见文本'))).toBe(true);
      expect(elements.some(el => el.text.includes('隐藏文本'))).toBe(false);
      expect(elements.some(el => el.text.includes('不可见文本'))).toBe(false);
    });

    test('应该只包含与选择区域相交的文本元素', () => {
      document.body.innerHTML = `
        <div id="inside">区域内文本</div>
        <div id="outside">区域外文本</div>
      `;

      // 模拟 getComputedStyle 返回可见状态
      mockGetComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      });

      let callCount = 0;
      // 模拟 getClientRects 返回不同的位置
      mockGetClientRects.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 第一个元素在选择区域内
          return [{
            left: 10,
            top: 10,
            right: 60,
            bottom: 30,
            width: 50,
            height: 20
          }];
        } else {
          // 第二个元素在选择区域外
          return [{
            left: 200,
            top: 200,
            right: 250,
            bottom: 220,
            width: 50,
            height: 20
          }];
        }
      });

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 100,
        bottom: 50
      };

      const elements = extractor.getTextElements(selectionRect);
      
      expect(elements.some(el => el.text.includes('区域内文本'))).toBe(true);
      expect(elements.some(el => el.text.includes('区域外文本'))).toBe(false);
    });

    test('应该过滤掉空白文本', () => {
      document.body.innerHTML = `
        <div id="valid">有效文本</div>
        <div id="whitespace1">   </div>
        <div id="whitespace2"></div>
      `;

      // 模拟 getComputedStyle 返回可见状态
      mockGetComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      });

      // 模拟 getClientRects 返回位置信息
      mockGetClientRects.mockImplementation(() => {
        return [{
          left: 10,
          top: 10,
          right: 110,
          bottom: 30,
          width: 100,
          height: 20
        }];
      });

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 200,
        bottom: 150
      };

      const elements = extractor.getTextElements(selectionRect);
      
      expect(elements.length).toBe(1);
      expect(elements[0].text.includes('有效文本')).toBe(true);
    });
  });

  describe('extractText', () => {
    test('应该提取并按视觉顺序排列文本', () => {
      document.body.innerHTML = `
        <div id="line1-1">第一行</div>
        <div id="line1-2">第一行续</div>
        <div id="line2">第二行</div>
      `;

      // 模拟 getComputedStyle 返回可见状态
      mockGetComputedStyle.mockReturnValue({
        display: 'block',
        visibility: 'visible',
        opacity: '1'
      });

      let callCount = 0;
      // 模拟 getClientRects 返回位置信息，模拟视觉布局
      mockGetClientRects.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // 第一行第一部分
          return [{
            left: 10,
            top: 10,
            right: 60,
            bottom: 30,
            width: 50,
            height: 20
          }];
        } else if (callCount === 2) {
          // 第一行第二部分
          return [{
            left: 70,
            top: 10,
            right: 120,
            bottom: 30,
            width: 50,
            height: 20
          }];
        } else {
          // 第二行
          return [{
            left: 10,
            top: 40,
            right: 60,
            bottom: 60,
            width: 50,
            height: 20
          }];
        }
      });

      const selectionRect: SelectionRect = {
        left: 0,
        top: 0,
        right: 150,
        bottom: 70
      };

      const result = extractor.extractText(selectionRect);
      
      expect(result).toContain('第一行');
      expect(result).toContain('第一行续');
      expect(result).toContain('第二行');
      
      // 验证顺序：第一行应该在第二行之前
      const firstLineIndex = result.indexOf('第一行');
      const secondLineIndex = result.indexOf('第二行');
      expect(firstLineIndex).toBeLessThan(secondLineIndex);
    });
  });
});