import { VisualTextExtractor } from '../components/VisualTextExtractor.js';
import * as fc from 'fast-check';

/**
 * 视觉文本提取器属性测试
 * **Feature: browser-selection-copy, Property 2: 文本元素过滤准确性**
 * **验证需求: 2.1, 2.2, 2.3, 2.4, 2.5**
 */
describe('VisualTextExtractor 文本元素过滤属性测试', () => {
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

  /**
   * 属性 2: 文本元素过滤准确性
   * 对于任何选择区域和页面文本元素集合，只有可见且与选择区域相交的文本元素应该被包含在提取结果中
   */
  test('属性 2: 文本元素过滤准确性', () => {
    fc.assert(
      fc.property(
        // 生成选择区域 (0-500 范围内的坐标)
        fc.record({
          left: fc.integer({ min: 0, max: 500 }),
          top: fc.integer({ min: 0, max: 500 }),
          right: fc.integer({ min: 0, max: 500 }),
          bottom: fc.integer({ min: 0, max: 500 })
        }).filter(rect => rect.left < rect.right && rect.top < rect.bottom),
        
        // 生成文本元素数组 (1-10个元素)
        fc.array(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
            left: fc.integer({ min: 0, max: 600 }),
            top: fc.integer({ min: 0, max: 600 }),
            width: fc.integer({ min: 10, max: 100 }),
            height: fc.integer({ min: 10, max: 50 }),
            visible: fc.boolean()
          }),
          { minLength: 1, maxLength: 10 }
        ),
        
        (selectionRect, textElements) => {
          // 创建测试 DOM 结构
          document.body.innerHTML = '';
          const elementsData: Array<{
            element: HTMLElement;
            text: string;
            rect: DOMRect;
            visible: boolean;
            intersects: boolean;
          }> = [];

          textElements.forEach((textData, index) => {
            const div = document.createElement('div');
            div.id = `text-${index}`;
            div.textContent = textData.text;
            document.body.appendChild(div);

            const rect = {
              left: textData.left,
              top: textData.top,
              right: textData.left + textData.width,
              bottom: textData.top + textData.height,
              width: textData.width,
              height: textData.height,
              x: textData.left,
              y: textData.top,
              toJSON: () => ({})
            } as DOMRect;

            // 计算是否与选择区域相交
            const intersects = !(
              rect.right < selectionRect.left ||
              rect.left > selectionRect.right ||
              rect.bottom < selectionRect.top ||
              rect.top > selectionRect.bottom
            );

            elementsData.push({
              element: div,
              text: textData.text,
              rect,
              visible: textData.visible,
              intersects
            });
          });

          // 模拟 getComputedStyle 返回可见性状态
          mockGetComputedStyle.mockImplementation((element: Element) => {
            const elementData = elementsData.find(data => data.element === element);
            if (elementData && elementData.visible) {
              return {
                display: 'block',
                visibility: 'visible',
                opacity: '1'
              };
            } else {
              return {
                display: 'none',
                visibility: 'hidden',
                opacity: '0'
              };
            }
          });

          // 模拟 getClientRects 返回位置信息
          mockGetClientRects.mockImplementation(function(this: Element) {
            const elementData = elementsData.find(data => data.element === this);
            if (elementData) {
              return [elementData.rect];
            }
            return [];
          });

          // 执行文本提取
          const extractedElements = extractor.getTextElements(selectionRect);

          // 验证过滤准确性
          // 1. 验证需求 2.1: 检测矩形区域内所有可见的文本元素
          // 2. 验证需求 2.2: 使用 getClientRects API 获取精确位置
          // 3. 验证需求 2.3: 包含部分位于选择框内的文本元素
          // 4. 验证需求 2.4: 排除完全位于选择框外的文本元素
          // 5. 验证需求 2.5: 忽略不可见的文本元素

          // 计算应该被包含的元素（可见且相交）
          const expectedElements = elementsData.filter(data => 
            data.visible && data.intersects
          );

          // 验证提取的元素数量正确
          expect(extractedElements.length).toBe(expectedElements.length);

          // 验证每个提取的元素都应该被包含
          extractedElements.forEach(extracted => {
            const shouldBeIncluded = expectedElements.some(expected => 
              expected.text === extracted.text
            );
            expect(shouldBeIncluded).toBe(true);
          });

          // 验证每个应该被包含的元素都被提取了
          expectedElements.forEach(expected => {
            const wasExtracted = extractedElements.some(extracted => 
              extracted.text === expected.text
            );
            expect(wasExtracted).toBe(true);
          });

          // 验证不应该包含不可见的元素
          const invisibleElements = elementsData.filter(data => !data.visible);
          invisibleElements.forEach(invisible => {
            const wasExtracted = extractedElements.some(extracted => 
              extracted.text === invisible.text
            );
            expect(wasExtracted).toBe(false);
          });

          // 验证不应该包含不相交的元素
          const nonIntersectingElements = elementsData.filter(data => !data.intersects);
          nonIntersectingElements.forEach(nonIntersecting => {
            const wasExtracted = extractedElements.some(extracted => 
              extracted.text === nonIntersecting.text
            );
            expect(wasExtracted).toBe(false);
          });
        }
      ),
      { numRuns: 100 } // 运行100次迭代以确保充分的随机性覆盖
    );
  });

  /**
   * 属性测试：空白文本过滤
   * 验证空白和纯空格文本被正确过滤
   */
  test('属性测试：空白文本过滤', () => {
    fc.assert(
      fc.property(
        // 生成选择区域
        fc.record({
          left: fc.integer({ min: 0, max: 200 }),
          top: fc.integer({ min: 0, max: 200 }),
          right: fc.integer({ min: 200, max: 400 }),
          bottom: fc.integer({ min: 200, max: 400 })
        }),
        
        // 生成包含空白文本的元素数组
        fc.array(
          fc.record({
            text: fc.oneof(
              fc.constant(''),           // 空字符串
              fc.constant('   '),        // 纯空格
              fc.constant('\t\n  '),     // 制表符和换行符
              fc.string({ minLength: 1, maxLength: 10 }).filter(s => s.trim().length > 0) // 有效文本
            ),
            left: fc.integer({ min: 50, max: 150 }),
            top: fc.integer({ min: 50, max: 150 }),
            width: fc.integer({ min: 20, max: 80 }),
            height: fc.integer({ min: 15, max: 30 })
          }),
          { minLength: 1, maxLength: 8 }
        ),
        
        (selectionRect, textElements) => {
          // 创建测试 DOM 结构
          document.body.innerHTML = '';
          
          textElements.forEach((textData, index) => {
            const div = document.createElement('div');
            div.id = `text-${index}`;
            div.textContent = textData.text;
            document.body.appendChild(div);
          });

          // 模拟所有元素都可见
          mockGetComputedStyle.mockReturnValue({
            display: 'block',
            visibility: 'visible',
            opacity: '1'
          });

          // 模拟 getClientRects 返回相交的位置
          mockGetClientRects.mockImplementation(function(this: Element) {
            const index = parseInt((this as HTMLElement).id.split('-')[1]);
            const textData = textElements[index];
            if (textData) {
              return [{
                left: textData.left,
                top: textData.top,
                right: textData.left + textData.width,
                bottom: textData.top + textData.height,
                width: textData.width,
                height: textData.height
              }];
            }
            return [];
          });

          // 执行文本提取
          const extractedElements = extractor.getTextElements(selectionRect);

          // 验证只有非空白文本被提取
          extractedElements.forEach(extracted => {
            expect(extracted.text.trim().length).toBeGreaterThan(0);
          });

          // 验证空白文本被过滤掉
          // 计算应该被提取的文本：非空白且与选择区域相交
          const validTexts = textElements.filter(textData => {
            if (textData.text.trim().length === 0) return false;
            
            // 检查是否与选择区域相交
            const rect = {
              left: textData.left,
              top: textData.top,
              right: textData.left + textData.width,
              bottom: textData.top + textData.height
            };
            
            return !(rect.right < selectionRect.left ||
                     rect.left > selectionRect.right ||
                     rect.bottom < selectionRect.top ||
                     rect.top > selectionRect.bottom);
          });
          
          expect(extractedElements.length).toBe(validTexts.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性测试：边界相交检测
   * 验证边界情况下的相交检测准确性
   */
  test('属性测试：边界相交检测', () => {
    fc.assert(
      fc.property(
        // 生成基准矩形
        fc.record({
          left: fc.integer({ min: 100, max: 200 }),
          top: fc.integer({ min: 100, max: 200 }),
          right: fc.integer({ min: 300, max: 400 }),
          bottom: fc.integer({ min: 300, max: 400 })
        }),
        
        // 生成相对偏移来创建边界情况
        fc.record({
          leftOffset: fc.integer({ min: -50, max: 50 }),
          topOffset: fc.integer({ min: -50, max: 50 }),
          rightOffset: fc.integer({ min: -50, max: 50 }),
          bottomOffset: fc.integer({ min: -50, max: 50 })
        }),
        
        (baseRect, offset) => {
          const selectionRect = baseRect;
          
          // 创建边界测试元素
          const testRect = {
            left: baseRect.left + offset.leftOffset,
            top: baseRect.top + offset.topOffset,
            right: baseRect.right + offset.rightOffset,
            bottom: baseRect.bottom + offset.bottomOffset
          };

          // 计算预期的相交结果
          const expectedIntersects = !(
            testRect.right < selectionRect.left ||
            testRect.left > selectionRect.right ||
            testRect.bottom < selectionRect.top ||
            testRect.top > selectionRect.bottom
          );

          // 创建测试 DOM
          document.body.innerHTML = '<div id="test">测试文本</div>';
          
          mockGetComputedStyle.mockReturnValue({
            display: 'block',
            visibility: 'visible',
            opacity: '1'
          });

          mockGetClientRects.mockReturnValue([{
            left: testRect.left,
            top: testRect.top,
            right: testRect.right,
            bottom: testRect.bottom,
            width: testRect.right - testRect.left,
            height: testRect.bottom - testRect.top
          }]);

          // 执行文本提取
          const extractedElements = extractor.getTextElements(selectionRect);

          // 验证相交检测结果
          if (expectedIntersects) {
            expect(extractedElements.length).toBe(1);
            expect(extractedElements[0].text).toBe('测试文本');
          } else {
            expect(extractedElements.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * 属性测试：多个 ClientRects 处理
   * 验证元素有多个 ClientRects 时的处理逻辑
   */
  test('属性测试：多个 ClientRects 处理', () => {
    fc.assert(
      fc.property(
        // 生成选择区域
        fc.record({
          left: fc.integer({ min: 0, max: 100 }),
          top: fc.integer({ min: 0, max: 100 }),
          right: fc.integer({ min: 200, max: 300 }),
          bottom: fc.integer({ min: 200, max: 300 })
        }),
        
        // 生成多个矩形，其中一些相交，一些不相交
        fc.array(
          fc.record({
            left: fc.integer({ min: 0, max: 400 }),
            top: fc.integer({ min: 0, max: 400 }),
            width: fc.integer({ min: 20, max: 80 }),
            height: fc.integer({ min: 15, max: 30 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        
        (selectionRect, rects) => {
          // 创建测试 DOM
          document.body.innerHTML = '<div id="multi-rect">多矩形文本</div>';
          
          mockGetComputedStyle.mockReturnValue({
            display: 'block',
            visibility: 'visible',
            opacity: '1'
          });

          // 创建多个 ClientRects
          const clientRects = rects.map(rect => ({
            left: rect.left,
            top: rect.top,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height,
            width: rect.width,
            height: rect.height
          }));

          mockGetClientRects.mockReturnValue(clientRects);

          // 计算是否有任何矩形与选择区域相交
          const hasIntersection = clientRects.some(rect => 
            !(rect.right < selectionRect.left ||
              rect.left > selectionRect.right ||
              rect.bottom < selectionRect.top ||
              rect.top > selectionRect.bottom)
          );

          // 执行文本提取
          const extractedElements = extractor.getTextElements(selectionRect);

          // 验证：如果有相交，应该提取一次；如果没有相交，不应该提取
          if (hasIntersection) {
            expect(extractedElements.length).toBe(1);
            expect(extractedElements[0].text).toBe('多矩形文本');
          } else {
            expect(extractedElements.length).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});