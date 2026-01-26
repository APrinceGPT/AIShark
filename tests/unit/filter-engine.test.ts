import { describe, it, expect } from 'vitest';
import { applyAdvancedFilter } from '@/lib/filter-engine';
import { Packet } from '@/types/packet';

const createMockPacket = (overrides: Partial<Packet> = {}): Packet => ({
  id: 1,
  timestamp: Date.now() / 1000,
  source: '192.168.1.1',
  destination: '192.168.1.2',
  protocol: 'TCP',
  length: 100,
  info: 'Test packet',
  details: '',
  rawData: '',
  layers: {},
  ...overrides,
});

describe('Filter Engine - applyAdvancedFilter', () => {
  it('should filter by source IP', () => {
    const packets = [
      createMockPacket({ id: 1, source: '192.168.1.1' }),
      createMockPacket({ id: 2, source: '192.168.1.2' }),
      createMockPacket({ id: 3, source: '10.0.0.1' }),
    ];

    const filter = {
      sourceIP: '192.168.1',
    };

    const result = applyAdvancedFilter(packets, filter);
    expect(result).toHaveLength(2);
    expect(result[0].source).toContain('192.168.1');
  });

  it('should filter by protocol', () => {
    const packets = [
      createMockPacket({ id: 1, protocol: 'TCP' }),
      createMockPacket({ id: 2, protocol: 'UDP' }),
      createMockPacket({ id: 3, protocol: 'HTTP' }),
    ];

    const filter = {
      protocols: ['TCP', 'HTTP'],
    };

    const result = applyAdvancedFilter(packets, filter);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.protocol)).toEqual(['TCP', 'HTTP']);
  });

  it('should filter by search term', () => {
    const packets = [
      createMockPacket({ id: 1, info: 'HTTP GET request' }),
      createMockPacket({ id: 2, info: 'TCP SYN packet' }),
      createMockPacket({ id: 3, info: 'HTTP POST request' }),
    ];

    const filter = {
      searchTerm: 'HTTP',
    };

    const result = applyAdvancedFilter(packets, filter);
    expect(result).toHaveLength(2);
    expect(result.every(p => p.info.includes('HTTP'))).toBe(true);
  });

  it('should filter by time range', () => {
    const now = Date.now() / 1000;
    const packets = [
      createMockPacket({ id: 1, timestamp: now - 100 }),
      createMockPacket({ id: 2, timestamp: now }),
      createMockPacket({ id: 3, timestamp: now + 100 }),
    ];

    const filter = {
      timeRange: { start: now - 10, end: now + 150 },
    };

    const result = applyAdvancedFilter(packets, filter);
    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toEqual([2, 3]);
  });

  it('should return all packets with empty filter', () => {
    const packets = [
      createMockPacket({ id: 1 }),
      createMockPacket({ id: 2 }),
      createMockPacket({ id: 3 }),
    ];

    const filter = {};

    const result = applyAdvancedFilter(packets, filter);
    expect(result).toHaveLength(3);
  });
});
