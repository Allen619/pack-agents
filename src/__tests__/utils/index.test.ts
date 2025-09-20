import {
  generateId,
  cn,
  formatDate,
  formatDuration,
  formatBytes,
  sanitizeFileName,
  isValidUrl,
  debounce,
  throttle,
  sleep,
  capitalizeFirst,
  truncate,
  removeMarkdown,
  getAgentRoleColor,
  getStatusColor,
  copyToClipboard,
  validateJson,
  deepClone,
  mergeDeep,
} from '@/lib/utils';

describe('工具函数测试', () => {
  describe('generateId', () => {
    test('应该生成唯一的 ID', () => {
      const id = generateId();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    test('生成的 ID 应该是唯一的', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('cn (class name merger)', () => {
    test('应该合并类名', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
    });

    test('应该处理条件类名', () => {
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });

    test('应该去重 Tailwind 类名', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });
  });

  describe('formatDate', () => {
    test('应该正确格式化日期', () => {
      const date = new Date('2024-01-01T10:30:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/2024/);
      expect(formatted).toMatch(/01/);
    });

    test('应该处理字符串日期', () => {
      const formatted = formatDate('2024-01-01T10:30:00Z');
      expect(formatted).toMatch(/2024/);
    });
  });

  describe('formatDuration', () => {
    test('应该正确格式化毫秒', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(1000)).toBe('1.0s');
      expect(formatDuration(60000)).toBe('1.0m');
      expect(formatDuration(3600000)).toBe('1.0h');
    });

    test('应该处理零值', () => {
      expect(formatDuration(0)).toBe('0ms');
    });
  });

  describe('formatBytes', () => {
    test('应该正确格式化文件大小', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    test('应该处理零字节', () => {
      expect(formatBytes(0)).toBe('0 B');
    });

    test('应该处理小于 1KB 的文件', () => {
      expect(formatBytes(512)).toBe('512 B');
    });
  });

  describe('sanitizeFileName', () => {
    test('应该移除非法字符', () => {
      expect(sanitizeFileName('file<>name')).toBe('file__name');
      expect(sanitizeFileName('file:name')).toBe('file_name');
      expect(sanitizeFileName('file"name')).toBe('file_name');
    });

    test('应该保留合法字符', () => {
      expect(sanitizeFileName('file_name-123.txt')).toBe('file_name-123.txt');
    });
  });

  describe('isValidUrl', () => {
    test('应该验证有效 URL', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('ftp://example.com')).toBe(true);
    });

    test('应该拒绝无效 URL', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('debounce', () => {
    test('应该延迟执行函数', async () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      await sleep(150);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('throttle', () => {
    test('应该限制函数执行频率', async () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 100);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      await sleep(150);
      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('capitalizeFirst', () => {
    test('应该首字母大写', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('WORLD')).toBe('WORLD');
      expect(capitalizeFirst('')).toBe('');
    });
  });

  describe('truncate', () => {
    test('应该截断长字符串', () => {
      expect(truncate('这是一个很长的字符串', 5)).toBe('这是...');
    });

    test('应该保留短字符串', () => {
      expect(truncate('短字符串', 10)).toBe('短字符串');
    });
  });

  describe('removeMarkdown', () => {
    test('应该移除 Markdown 语法', () => {
      expect(removeMarkdown('**粗体**文本')).toBe('粗体文本');
      expect(removeMarkdown('# 标题')).toBe('标题');
      expect(removeMarkdown('[链接](url)')).toBe('链接');
    });
  });

  describe('getAgentRoleColor', () => {
    test('应该返回正确的角色颜色', () => {
      expect(getAgentRoleColor('main')).toBe('text-green-600 bg-green-50');
      expect(getAgentRoleColor('sub')).toBe('text-blue-600 bg-blue-50');
      expect(getAgentRoleColor('synthesis')).toBe(
        'text-purple-600 bg-purple-50'
      );
    });
  });

  describe('getStatusColor', () => {
    test('应该返回正确的状态颜色', () => {
      expect(getStatusColor('running')).toBe('text-blue-600 bg-blue-50');
      expect(getStatusColor('completed')).toBe('text-green-600 bg-green-50');
      expect(getStatusColor('failed')).toBe('text-red-600 bg-red-50');
      expect(getStatusColor('unknown')).toBe('text-gray-600 bg-gray-50');
    });
  });

  describe('validateJson', () => {
    test('应该验证有效的 JSON', () => {
      const result = validateJson('{"name": "test"}');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('应该检测无效的 JSON', () => {
      const result = validateJson('invalid json');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('deepClone', () => {
    test('应该深度复制对象', () => {
      const original = { a: 1, b: { c: 2 } };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });

    test('应该处理数组', () => {
      const original = [1, { a: 2 }, [3, 4]];
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });
  });

  describe('mergeDeep', () => {
    test('应该深度合并对象', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { b: { d: 3 }, e: 4 };
      const merged = mergeDeep(obj1, obj2);

      expect(merged).toEqual({
        a: 1,
        b: { c: 2, d: 3 },
        e: 4,
      });
    });

    test('应该覆盖相同键的值', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 3, c: 4 };
      const merged = mergeDeep(obj1, obj2);

      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  // Browser API 相关的测试需要 mock
  describe('copyToClipboard', () => {
    test('应该调用 clipboard API', async () => {
      const mockWriteText = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      });

      await copyToClipboard('test text');
      expect(mockWriteText).toHaveBeenCalledWith('test text');
    });
  });
});
