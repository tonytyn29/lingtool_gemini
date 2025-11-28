// 工具函数测试

import {
  getLanguageName,
  formatDate,
  truncateText,
  calculateMasteryRate,
  generateId
} from '../helpers';

describe('Helper Functions', () => {
  describe('getLanguageName', () => {
    it('should return correct language name for valid code', () => {
      expect(getLanguageName('zh-CN')).toBe('中文（简体）');
      expect(getLanguageName('en-US')).toBe('English (US)');
      expect(getLanguageName('ja-JP')).toBe('日本語');
    });

    it('should return code for invalid language code', () => {
      expect(getLanguageName('invalid')).toBe('invalid');
    });
  });

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15T10:30:00');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(formatDate(date, 'YYYY-MM-DD HH:mm')).toBe('2024-01-15 10:30');
    });

    it('should handle invalid date', () => {
      expect(formatDate('invalid', 'YYYY-MM-DD')).toBe('');
    });
  });

  describe('truncateText', () => {
    it('should truncate long text', () => {
      const longText = 'This is a very long text that should be truncated';
      expect(truncateText(longText, 20)).toBe('This is a very long...');
    });

    it('should not truncate short text', () => {
      const shortText = 'Short text';
      expect(truncateText(shortText, 20)).toBe('Short text');
    });
  });

  describe('calculateMasteryRate', () => {
    it('should calculate mastery rate correctly', () => {
      expect(calculateMasteryRate(20, 100)).toBe(20);
      expect(calculateMasteryRate(0, 100)).toBe(0);
      expect(calculateMasteryRate(100, 100)).toBe(100);
    });

    it('should handle zero total', () => {
      expect(calculateMasteryRate(10, 0)).toBe(0);
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });
});
