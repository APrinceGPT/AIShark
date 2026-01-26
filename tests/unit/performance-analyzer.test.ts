import { describe, it, expect } from 'vitest';
import { analyzePerformance, PerformanceReport } from '@/lib/performance-analyzer';
import { Packet, PacketStatistics } from '@/types/packet';

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

const createMockStatistics = (overrides: Partial<PacketStatistics> = {}): PacketStatistics => ({
  totalPackets: 0,
  protocolDistribution: {},
  topTalkers: [],
  errors: {
    retransmissions: 0,
    duplicateAcks: 0,
    resets: 0,
  },
  bandwidth: {
    total: 0,
    perSecond: 0,
  },
  ...overrides,
});

describe('Performance Analyzer - analyzePerformance', () => {
  describe('Report Structure', () => {
    it('should return a valid performance report structure', () => {
      const packets = [createMockPacket({ id: 1 })];
      const stats = createMockStatistics({ totalPackets: 1 });

      const report = analyzePerformance(packets, stats);

      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('bottlenecks');
      expect(report).toHaveProperty('score');
      expect(report).toHaveProperty('scoreBreakdown');
    });

    it('should have valid metrics properties', () => {
      const packets = [createMockPacket({ id: 1 })];
      const stats = createMockStatistics({ totalPackets: 1 });

      const report = analyzePerformance(packets, stats);

      // Latency metrics
      expect(report.metrics).toHaveProperty('averageLatency');
      expect(report.metrics).toHaveProperty('p50Latency');
      expect(report.metrics).toHaveProperty('p95Latency');
      expect(report.metrics).toHaveProperty('p99Latency');
      expect(report.metrics).toHaveProperty('maxLatency');

      // TCP metrics
      expect(report.metrics).toHaveProperty('retransmissionRate');
      expect(report.metrics).toHaveProperty('retransmissionCount');
      expect(report.metrics).toHaveProperty('duplicateAckCount');
      expect(report.metrics).toHaveProperty('resetCount');

      // Throughput metrics
      expect(report.metrics).toHaveProperty('totalBytes');
      expect(report.metrics).toHaveProperty('throughputBps');
      expect(report.metrics).toHaveProperty('throughputMbps');
      expect(report.metrics).toHaveProperty('packetsPerSecond');

      // HTTP metrics
      expect(report.metrics).toHaveProperty('httpRequests');
      expect(report.metrics).toHaveProperty('httpErrors');
      expect(report.metrics).toHaveProperty('httpErrorRate');

      // DNS metrics
      expect(report.metrics).toHaveProperty('dnsQueries');
      expect(report.metrics).toHaveProperty('dnsFailures');
    });

    it('should have score breakdown components', () => {
      const packets = [createMockPacket({ id: 1 })];
      const stats = createMockStatistics({ totalPackets: 1 });

      const report = analyzePerformance(packets, stats);

      expect(report.scoreBreakdown).toHaveProperty('latency');
      expect(report.scoreBreakdown).toHaveProperty('reliability');
      expect(report.scoreBreakdown).toHaveProperty('throughput');
      expect(report.scoreBreakdown).toHaveProperty('errors');
    });
  });

  describe('Throughput Calculations', () => {
    it('should calculate throughput based on capture time', () => {
      const baseTime = 1000000;
      const packets = [
        createMockPacket({ id: 1, timestamp: baseTime, length: 1000 }),
        createMockPacket({ id: 2, timestamp: baseTime + 1000, length: 1000 }),
      ];
      const stats = createMockStatistics({
        totalPackets: 2,
        bandwidth: { total: 2000, perSecond: 2 },
      });

      const report = analyzePerformance(packets, stats);

      expect(report.metrics.totalBytes).toBe(2000);
      expect(report.metrics.packetsPerSecond).toBeGreaterThan(0);
    });

    it('should calculate packets per second', () => {
      const baseTime = 1000;
      const packets = [
        createMockPacket({ id: 1, timestamp: baseTime }),
        createMockPacket({ id: 2, timestamp: baseTime + 500 }),
        createMockPacket({ id: 3, timestamp: baseTime + 1000 }),
      ];
      const stats = createMockStatistics({ totalPackets: 3 });

      const report = analyzePerformance(packets, stats);

      expect(report.metrics.packetsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('Error Rate Calculations', () => {
    it('should count reset packets', () => {
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
              flags: { fin: false, syn: false, rst: true, psh: false, ack: false, urg: false },
            },
          },
        }),
        createMockPacket({
          id: 2,
          layers: {
            tcp: {
              sourcePort: 443,
              destinationPort: 80,
              sequenceNumber: 1,
              acknowledgmentNumber: 1,
              dataOffset: 5,
              flags: { fin: false, syn: false, rst: true, psh: false, ack: false, urg: false },
            },
          },
        }),
        createMockPacket({ id: 3 }), // Normal packet
      ];
      const stats = createMockStatistics({ totalPackets: 3 });

      const report = analyzePerformance(packets, stats);

      expect(report.metrics.resetCount).toBe(2);
    });

    it('should calculate HTTP error rate', () => {
      const stringToBytes = (str: string): Uint8Array => {
        return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
      };

      // Simulating HTTP error packet
      const packets = [
        createMockPacket({
          id: 1,
          layers: {
            http: {
              isRequest: true,
              method: 'GET',
              uri: '/test',
              version: '1.1',
              headers: {},
            },
          },
        }),
        createMockPacket({
          id: 2,
          layers: {
            http: {
              isRequest: false,
              statusCode: 500,
              statusText: 'Internal Server Error',
              version: '1.1',
              headers: {},
            },
          },
        }),
      ];
      const stats = createMockStatistics({ totalPackets: 2 });

      const report = analyzePerformance(packets, stats);

      expect(report.metrics.httpRequests).toBe(1);
      expect(report.metrics.httpErrors).toBe(1);
      expect(report.metrics.httpErrorRate).toBe(100);
    });
  });

  describe('Score Calculation', () => {
    it('should return a score between 0 and 100', () => {
      const packets = [
        createMockPacket({ id: 1 }),
        createMockPacket({ id: 2 }),
        createMockPacket({ id: 3 }),
      ];
      const stats = createMockStatistics({ totalPackets: 3 });

      const report = analyzePerformance(packets, stats);

      expect(report.score).toBeGreaterThanOrEqual(0);
      expect(report.score).toBeLessThanOrEqual(100);
    });

    it('should return high score for healthy network', () => {
      // Healthy network: no errors, normal traffic
      const baseTime = 1000000;
      const packets = Array.from({ length: 100 }, (_, i) =>
        createMockPacket({
          id: i + 1,
          timestamp: baseTime + i * 10,
          length: 500,
        })
      );
      const stats = createMockStatistics({
        totalPackets: 100,
        bandwidth: { total: 50000, perSecond: 5000 },
        errors: { retransmissions: 0, duplicateAcks: 0, resets: 0 },
      });

      const report = analyzePerformance(packets, stats);

      // Should have a relatively high score (no errors)
      expect(report.score).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Bottleneck Detection', () => {
    it('should return bottlenecks array', () => {
      const packets = [createMockPacket({ id: 1 })];
      const stats = createMockStatistics({ totalPackets: 1 });

      const report = analyzePerformance(packets, stats);

      expect(Array.isArray(report.bottlenecks)).toBe(true);
    });

    it('bottlenecks should have correct structure when present', () => {
      // Create packets that would trigger bottleneck detection
      const packets = Array.from({ length: 100 }, (_, i) =>
        createMockPacket({
          id: i + 1,
          flags: { isRetransmission: i < 20 }, // 20% retransmissions
        })
      );
      const stats = createMockStatistics({
        totalPackets: 100,
        errors: { retransmissions: 20, duplicateAcks: 0, resets: 0 },
      });

      const report = analyzePerformance(packets, stats);

      // If bottlenecks detected, verify structure
      if (report.bottlenecks.length > 0) {
        const bottleneck = report.bottlenecks[0];
        expect(bottleneck).toHaveProperty('type');
        expect(bottleneck).toHaveProperty('severity');
        expect(bottleneck).toHaveProperty('description');
        expect(bottleneck).toHaveProperty('recommendation');
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty packet array', () => {
      const packets: Packet[] = [];
      const stats = createMockStatistics({ totalPackets: 0 });

      const report = analyzePerformance(packets, stats);

      expect(report).toBeDefined();
      expect(report.metrics.totalBytes).toBe(0);
      expect(report.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle single packet', () => {
      const packets = [createMockPacket({ id: 1 })];
      const stats = createMockStatistics({ totalPackets: 1 });

      const report = analyzePerformance(packets, stats);

      expect(report).toBeDefined();
      expect(report.metrics.packetsPerSecond).toBeGreaterThanOrEqual(0);
    });
  });
});
