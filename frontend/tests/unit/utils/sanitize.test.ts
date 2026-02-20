import { describe, it, expect } from 'vitest';
import {
  sanitizeHTML,
  sanitizeInput,
  stripHTML,
  encodeHTML,
  sanitizeObject,
} from '@/utils/sanitize';

describe('sanitize', () => {
  describe('sanitizeHTML', () => {
    it('should strip all HTML tags and keep text content', () => {
      const result = sanitizeHTML('<p>Hello <strong>World</strong></p>');
      expect(result).toBe('Hello World');
    });

    it('should strip script tags', () => {
      const result = sanitizeHTML('<script>alert("xss")</script>Hello');
      expect(result).toBe('Hello');
    });

    it('should strip event handler attributes', () => {
      const result = sanitizeHTML('<div onclick="alert(1)">Click</div>');
      expect(result).toBe('Click');
    });

    it('should return empty string for null', () => {
      expect(sanitizeHTML(null as unknown as string)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(sanitizeHTML(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(sanitizeHTML('')).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(sanitizeHTML(123 as unknown as string)).toBe('');
    });

    it('should return plain text unchanged', () => {
      expect(sanitizeHTML('Hello World')).toBe('Hello World');
    });

    it('should strip nested tags', () => {
      const result = sanitizeHTML('<div><p><span>Nested</span></p></div>');
      expect(result).toBe('Nested');
    });

    it('should strip img tags', () => {
      const result = sanitizeHTML('<img src="x" onerror="alert(1)">Text');
      expect(result).toBe('Text');
    });
  });

  describe('sanitizeInput', () => {
    it('should strip all HTML when allowHTML is false (default)', () => {
      const result = sanitizeInput('<b>Bold</b> text');
      expect(result).toBe('Bold text');
    });

    it('should keep allowed tags when allowHTML is true', () => {
      const result = sanitizeInput('<b>Bold</b> <script>bad</script>', true);
      expect(result).toContain('<b>Bold</b>');
      expect(result).not.toContain('<script>');
    });

    it('should allow <em>, <strong>, <a>, <br>, <p>, <ul>, <ol>, <li> when allowHTML is true', () => {
      const html = '<em>italic</em><strong>bold</strong><a href="http://example.com">link</a><br><p>para</p><ul><li>item</li></ul><ol><li>num</li></ol>';
      const result = sanitizeInput(html, true);
      expect(result).toContain('<em>');
      expect(result).toContain('<strong>');
      expect(result).toContain('<a');
      expect(result).toContain('<br>');
      expect(result).toContain('<p>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>');
    });

    it('should strip disallowed tags even when allowHTML is true', () => {
      const result = sanitizeInput('<div>content</div><iframe src="x"></iframe>', true);
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<iframe');
      expect(result).toContain('content');
    });

    it('should strip disallowed attributes when allowHTML is true', () => {
      const result = sanitizeInput('<a href="http://example.com" onclick="alert(1)">link</a>', true);
      expect(result).toContain('href');
      expect(result).not.toContain('onclick');
    });

    it('should return empty string for null', () => {
      expect(sanitizeInput(null as unknown as string)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(sanitizeInput(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for non-string', () => {
      expect(sanitizeInput(42 as unknown as string)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(sanitizeInput('')).toBe('');
    });
  });

  describe('stripHTML', () => {
    it('should strip all HTML tags', () => {
      expect(stripHTML('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });

    it('should handle self-closing tags', () => {
      expect(stripHTML('Hello<br/>World')).toBe('HelloWorld');
    });

    it('should handle tags with attributes', () => {
      expect(stripHTML('<a href="http://example.com">Link</a>')).toBe('Link');
    });

    it('should return empty string for null', () => {
      expect(stripHTML(null as unknown as string)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(stripHTML(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for non-string', () => {
      expect(stripHTML(42 as unknown as string)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(stripHTML('')).toBe('');
    });

    it('should return plain text unchanged', () => {
      expect(stripHTML('No tags here')).toBe('No tags here');
    });

    it('should strip multiple nested tags', () => {
      expect(stripHTML('<div><p><span>Deep</span></p></div>')).toBe('Deep');
    });
  });

  describe('encodeHTML', () => {
    it('should encode ampersand', () => {
      expect(encodeHTML('foo & bar')).toBe('foo &amp; bar');
    });

    it('should encode less-than sign', () => {
      expect(encodeHTML('a < b')).toBe('a &lt; b');
    });

    it('should encode greater-than sign', () => {
      expect(encodeHTML('a > b')).toBe('a &gt; b');
    });

    it('should encode double quotes', () => {
      expect(encodeHTML('say "hello"')).toBe('say &quot;hello&quot;');
    });

    it('should encode single quotes', () => {
      expect(encodeHTML("it's")).toBe('it&#039;s');
    });

    it('should encode all special characters together', () => {
      expect(encodeHTML('<div class="test">&\'</div>')).toBe(
        '&lt;div class=&quot;test&quot;&gt;&amp;&#039;&lt;/div&gt;'
      );
    });

    it('should return empty string for null', () => {
      expect(encodeHTML(null as unknown as string)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(encodeHTML(undefined as unknown as string)).toBe('');
    });

    it('should return empty string for non-string', () => {
      expect(encodeHTML(42 as unknown as string)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(encodeHTML('')).toBe('');
    });

    it('should leave plain text unchanged', () => {
      expect(encodeHTML('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize string values in a flat object', () => {
      const obj = { name: '<script>bad</script>John', age: 30 };
      const result = sanitizeObject(obj);
      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
    });

    it('should sanitize nested objects recursively', () => {
      const obj = {
        user: {
          name: '<b>Bold</b> User',
          bio: '<script>xss</script>Hello',
        },
      };
      const result = sanitizeObject(obj);
      const user = result.user as { name: string; bio: string };
      expect(user.name).toBe('Bold User');
      expect(user.bio).toBe('Hello');
    });

    it('should only sanitize specified fields when fieldsToSanitize is provided', () => {
      const obj = {
        name: '<b>Bold</b>',
        description: '<b>Also Bold</b>',
        count: 5,
      };
      const result = sanitizeObject(obj, ['name']);
      expect(result.name).toBe('Bold');
      // description should remain unchanged
      expect(result.description).toBe('<b>Also Bold</b>');
      expect(result.count).toBe(5);
    });

    it('should not modify non-string, non-object values', () => {
      const obj = { count: 42, active: true, tags: ['a', 'b'] };
      const result = sanitizeObject(obj);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.tags).toEqual(['a', 'b']);
    });

    it('should handle object with null values', () => {
      const obj = { name: null, value: 'test' };
      const result = sanitizeObject(obj as Record<string, unknown>);
      expect(result.name).toBeNull();
      expect(result.value).toBe('test');
    });

    it('should not recurse into arrays', () => {
      const obj = { items: ['<b>item</b>'] };
      const result = sanitizeObject(obj);
      // Arrays are not recursed into (only plain objects)
      expect(result.items).toEqual(['<b>item</b>']);
    });

    it('should handle empty object', () => {
      const result = sanitizeObject({});
      expect(result).toEqual({});
    });
  });
});
