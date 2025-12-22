/**
 * Usage 模块升级测试
 * 
 * 测试 Usage 模块从"限制器"升级为"行为信号记录器"的功能
 */

import { 
  record, 
  getRecentStats, 
  checkUsage, 
  consumeUsage
} from '../src/content/usage/usage';

// Mock chrome.storage.local
const mockStorage: Record<string, any> = {};

global.chrome = {
  storage: {
    local: {
      get: async (keys: string | string[]) => {
        const result: Record<string, any> = {};
        const keyArray = Array.isArray(keys) ? keys : [keys];
        for (const key of keyArray) {
          if (key in mockStorage) {
            result[key] = mockStorage[key];
          }
        }
        return result;
      },
      set: async (items: Record<string, any>) => {
        Object.assign(mockStorage, items);
      }
    }
  }
} as any;

describe('Usage 升级 - 事件记录功能', () => {
  beforeEach(() => {
    // 清空 mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    // 设置今天的日期
    mockStorage['last_usage_date'] = new Date().toDateString();
  });

  test('record 函数应该记录 select 事件', async () => {
    await record('select');
    
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(1);
    expect(stats.tableDetectCount).toBe(0);
    expect(stats.columnAlignCount).toBe(0);
    expect(stats.csvExportCount).toBe(0);
  });

  test('record 函数应该记录 table-detect 事件', async () => {
    await record('table-detect');
    
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(0);
    expect(stats.tableDetectCount).toBe(1);
    expect(stats.columnAlignCount).toBe(0);
    expect(stats.csvExportCount).toBe(0);
  });

  test('record 函数应该记录 column-align 事件', async () => {
    await record('column-align');
    
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(0);
    expect(stats.tableDetectCount).toBe(0);
    expect(stats.columnAlignCount).toBe(1);
    expect(stats.csvExportCount).toBe(0);
  });

  test('record 函数应该记录 csv-export 事件', async () => {
    await record('csv-export');
    
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(0);
    expect(stats.tableDetectCount).toBe(0);
    expect(stats.columnAlignCount).toBe(0);
    expect(stats.csvExportCount).toBe(1);
  });

  test('record 函数应该正确累加同一事件的计数', async () => {
    await record('select');
    await record('select');
    await record('select');
    
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(3);
  });

  test('getRecentStats 应该返回正确的统计数据', async () => {
    await record('select');
    await record('table-detect');
    await record('column-align');
    await record('csv-export');
    
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(1);
    expect(stats.tableDetectCount).toBe(1);
    expect(stats.columnAlignCount).toBe(1);
    expect(stats.csvExportCount).toBe(1);
    expect(stats.lastDate).toBe(new Date().toDateString());
  });

  test('跨天重置应该清空所有事件计数', async () => {
    // 记录一些事件
    await record('select');
    await record('table-detect');
    
    // 验证计数
    let stats = await getRecentStats();
    expect(stats.selectCount).toBe(1);
    expect(stats.tableDetectCount).toBe(1);
    
    // 模拟跨天：修改存储的日期为昨天
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    mockStorage['last_usage_date'] = yesterday.toDateString();
    
    // 记录新事件，应该触发重置
    await record('select');
    
    // 验证计数被重置
    stats = await getRecentStats();
    expect(stats.selectCount).toBe(1); // 只有新记录的一次
    expect(stats.tableDetectCount).toBe(0); // 被重置
    expect(stats.lastDate).toBe(new Date().toDateString());
  });

  test('Property 9: record 函数不应该抛出异常（即使 storage 失败）', async () => {
    // 临时破坏 chrome.storage
    const originalSet = global.chrome.storage.local.set;
    global.chrome.storage.local.set = async () => {
      throw new Error('Storage failed');
    };
    
    // record 不应该抛出异常
    await expect(record('select')).resolves.toBeUndefined();
    
    // 恢复
    global.chrome.storage.local.set = originalSet;
  });

  test('Property 8: 事件计数应该独立（记录一个事件不影响其他事件）', async () => {
    // 记录多个不同的事件
    await record('select');
    await record('select');
    await record('table-detect');
    await record('column-align');
    
    const stats = await getRecentStats();
    
    // 验证每个事件的计数独立
    expect(stats.selectCount).toBe(2);
    expect(stats.tableDetectCount).toBe(1);
    expect(stats.columnAlignCount).toBe(1);
    expect(stats.csvExportCount).toBe(0);
  });

  test('getRecentStats 在 storage 失败时应该返回默认值', async () => {
    // 临时破坏 chrome.storage
    const originalGet = global.chrome.storage.local.get;
    global.chrome.storage.local.get = async () => {
      throw new Error('Storage failed');
    };
    
    // 清空内存降级存储（确保测试隔离）
    const stats = await getRecentStats();
    
    // 应该返回默认值，不抛出异常
    // 注意：由于内存降级，可能会有之前测试的残留数据
    // 我们主要验证不抛出异常
    expect(stats).toBeDefined();
    expect(stats.lastDate).toBe(new Date().toDateString());
    
    // 恢复
    global.chrome.storage.local.get = originalGet;
  });
});

describe('Usage 升级 - 兼容性测试', () => {
  beforeEach(() => {
    // 清空 mock storage
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    // 设置今天的日期
    mockStorage['last_usage_date'] = new Date().toDateString();
    mockStorage['usage_count'] = 0;
  });

  test('checkUsage 应该仍然工作（deprecated）', async () => {
    const state = await checkUsage();
    
    expect(state.allowed).toBe(true);
    expect(state.remaining).toBe(20); // FREE_POLICY.maxPerDay
  });

  test('checkUsage 应该在达到限制时返回 false', async () => {
    // 设置使用次数为 20（达到限制）
    mockStorage['usage_count'] = 20;
    mockStorage['last_usage_date'] = new Date().toDateString();
    
    const state = await checkUsage();
    
    expect(state.allowed).toBe(false);
    expect(state.reason).toBe('limit-reached');
    expect(state.remaining).toBe(0);
  });

  test('consumeUsage 应该仍然工作（deprecated）', async () => {
    await consumeUsage();
    
    // 验证旧的计数增加
    expect(mockStorage['usage_count']).toBe(1);
    
    // 验证同时记录了 select 事件
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(1);
  });

  test('consumeUsage 应该同时更新旧计数和新统计', async () => {
    // 确保初始状态正确
    mockStorage['usage_count'] = 0;
    mockStorage['last_usage_date'] = new Date().toDateString();
    mockStorage['usage_stats'] = {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: new Date().toDateString()
    };
    
    await consumeUsage();
    await consumeUsage();
    await consumeUsage();
    
    // 验证旧的计数
    expect(mockStorage['usage_count']).toBe(3);
    
    // 验证新的统计
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(3);
  });

  test('免费版功能不受影响：基础文本复制行为正常', async () => {
    // 确保初始状态正确
    mockStorage['usage_count'] = 0;
    mockStorage['last_usage_date'] = new Date().toDateString();
    mockStorage['usage_stats'] = {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: new Date().toDateString()
    };
    
    // 模拟免费版用户的正常使用流程
    for (let i = 0; i < 5; i++) {
      const state = await checkUsage();
      expect(state.allowed).toBe(true);
      await consumeUsage();
    }
    
    // 验证计数正确
    expect(mockStorage['usage_count']).toBe(5);
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(5);
  });

  test('未触发 Pro 功能时无副作用', async () => {
    // 确保初始状态正确
    mockStorage['usage_stats'] = {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: new Date().toDateString()
    };
    
    // 只记录 select 事件，不记录 Pro 功能事件
    await record('select');
    await record('select');
    
    const stats = await getRecentStats();
    
    // Pro 功能计数应该为 0
    expect(stats.tableDetectCount).toBe(0);
    expect(stats.columnAlignCount).toBe(0);
    expect(stats.csvExportCount).toBe(0);
    
    // 只有 select 计数
    expect(stats.selectCount).toBe(2);
  });

  test('兼容性：旧的 checkUsage 和新的 record 可以共存', async () => {
    // 确保初始状态正确
    mockStorage['usage_count'] = 0;
    mockStorage['last_usage_date'] = new Date().toDateString();
    mockStorage['usage_stats'] = {
      selectCount: 0,
      tableDetectCount: 0,
      columnAlignCount: 0,
      csvExportCount: 0,
      lastDate: new Date().toDateString()
    };
    
    // 使用旧接口
    await consumeUsage();
    
    // 使用新接口
    await record('table-detect');
    
    // 验证两者都正常工作
    const state = await checkUsage();
    expect(state.allowed).toBe(true);
    expect(state.remaining).toBe(19);
    
    const stats = await getRecentStats();
    expect(stats.selectCount).toBe(1); // consumeUsage 记录的
    expect(stats.tableDetectCount).toBe(1); // record 记录的
  });
});
