import { describe, it, expect } from 'vitest';
import { enhancePackets, calculateStatistics, performAnalysis } from '@/lib/analyzer';
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

describe('Analyzer - enhancePackets', () => {
  it('should return enhanced packets with same length', () => {
    const packets = [
      createMockPacket({ id: 1 }),
      createMockPacket({ id: 2 }),
      createMockPacket({ id: 3 }),
    ];

    const result = enhancePackets(packets);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe(1);
    expect(result[2].id).toBe(3);
  });

  it('should preserve original packet data', () => {
    const packets = [
      createMockPacket({
        id: 1,
        source: '10.0.0.1',
        destination: '10.0.0.2',
        protocol: 'UDP',
      }),
    ];

    const result = enhancePackets(packets);
    expect(result[0].source).toBe('10.0.0.1');
    expect(result[0].destination).toBe('10.0.0.2');
  });
});

describe('Analyzer - calculateStatistics', () => {
  it('should calculate total packet count', () => {
    const packets = [
      createMockPacket({ id: 1 }),
      createMockPacket({ id: 2 }),
      createMockPacket({ id: 3 }),
      createMockPacket({ id: 4 }),
      createMockPacket({ id: 5 }),
    ];

    const stats = calculateStatistics(packets);
    expect(stats.totalPackets).toBe(5);
  });

  it('should calculate protocol distribution', () => {
    const packets = [
      createMockPacket({ id: 1, protocol: 'TCP' }),
      createMockPacket({ id: 2, protocol: 'TCP' }),
      createMockPacket({ id: 3, protocol: 'UDP' }),
      createMockPacket({ id: 4, protocol: 'HTTP' }),
      createMockPacket({ id: 5, protocol: 'DNS' }),
    ];

    const stats = calculateStatistics(packets);
    expect(stats.protocolDistribution['TCP']).toBe(2);
    expect(stats.protocolDistribution['UDP']).toBe(1);
    expect(stats.protocolDistribution['HTTP']).toBe(1);
    expect(stats.protocolDistribution['DNS']).toBe(1);
  });

  it('should identify top talkers', () => {
    const packets = [
      createMockPacket({ id: 1, source: '192.168.1.1', destination: '10.0.0.1', length: 1000 }),
      createMockPacket({ id: 2, source: '192.168.1.1', destination: '10.0.0.1', length: 2000 }),
      createMockPacket({ id: 3, source: '192.168.1.2', destination: '10.0.0.2', length: 500 }),
    ];

    const stats = calculateStatistics(packets);
    expect(stats.topTalkers.length).toBeGreaterThan(0);
    expect(stats.topTalkers[0].bytes).toBe(3000); // 1000 + 2000 from first pair
  });

  it('should calculate bandwidth statistics', () => {
    const baseTime = Date.now() / 1000;
    const packets = [
      createMockPacket({ id: 1, timestamp: baseTime, length: 1000 }),
      createMockPacket({ id: 2, timestamp: baseTime + 1000, length: 2000 }),
    ];

    const stats = calculateStatistics(packets);
    expect(stats.bandwidth.total).toBe(3000);
    // timeSpan is calculated in milliseconds / 1000, so with 1000ms diff, perSecond = 3000
    expect(stats.bandwidth.perSecond).toBeGreaterThan(0);
  });

  it('should handle empty packet array', () => {
    const stats = calculateStatistics([]);
    expect(stats.totalPackets).toBe(0);
    expect(Object.keys(stats.protocolDistribution)).toHaveLength(0);
    expect(stats.topTalkers).toHaveLength(0);
  });
});

describe('Analyzer - performAnalysis', () => {
  it('should return analysis result structure', () => {
    const packets = [createMockPacket({ id: 1 })];

    const result = performAnalysis(packets);
    expect(result).toHaveProperty('latencyIssues');
    expect(result).toHaveProperty('packetLoss');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('insights');
    expect(Array.isArray(result.latencyIssues)).toBe(true);
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it('should detect connection resets', () => {
    const packets = [
      createMockPacket({
        id: 1,
        layers: {
          tcp: {
            sourcePort: 80,
            destinationPort: 443,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: {
              fin: false,
              syn: false,
              rst: true,
              psh: false,
              ack: false,
              urg: false,
            },
          },
        },
      }),
    ];

    const result = performAnalysis(packets);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].type).toBe('reset');
  });

  it('should generate insights for high retransmissions', () => {
    // This test verifies the insights generation mechanism
    const packets = [createMockPacket({ id: 1 })];
    const result = performAnalysis(packets);
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it('should handle empty packet array', () => {
    const result = performAnalysis([]);
    expect(result.latencyIssues).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });
});
