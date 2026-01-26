import { describe, it, expect } from 'vitest';
import { formatBytes, formatDuration, formatTimestamp } from '@/lib/utils';

describe('Utils - formatBytes', () => {
  it('should format bytes correctly', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });

  it('should handle decimal places', () => {
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(2560)).toBe('2.50 KB');
  });
});

describe('Utils - formatDuration', () => {
  it('should format duration in milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(999)).toBe('999ms');
  });

  it('should format duration in seconds', () => {
    expect(formatDuration(1000)).toBe('1.00s');
    expect(formatDuration(1500)).toBe('1.50s');
    expect(formatDuration(59999)).toBe('60.00s');
  });

  it('should format duration in minutes', () => {
    expect(formatDuration(60000)).toBe('1.00m');
    expect(formatDuration(90000)).toBe('1.50m');
  });
});

describe('Utils - formatTimestamp', () => {
  it('should format timestamp correctly', () => {
    const timestamp = new Date('2026-01-22T12:00:00Z').getTime() / 1000;
    const result = formatTimestamp(timestamp);
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
  });

  it('should handle zero timestamp', () => {
    expect(formatTimestamp(0)).toMatch(/\d{2}:\d{2}:\d{2}/);
  });
});
