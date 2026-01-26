import { describe, it, expect } from 'vitest';
import { 
  prepareAnalysisContext, 
  AIContext, 
  PacketSample,
} from '@/lib/ai/context-builder';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

// Helper to create mock packets
function createMockPacket(
  id: number,
  timestamp: number,
  protocol: string = 'TCP',
  source: string = '192.168.1.1',
  destination: string = '192.168.1.2',
  hasError: boolean = false
): Packet {
  return {
    id,
    timestamp,
    timeString: new Date(timestamp).toISOString(),
    source: `${source}:${12345 + id}`,
    destination: `${destination}:80`,
    protocol,
    length: 64,
    info: `${protocol} packet ${id}`,
    raw: new Uint8Array([0x00]),
    layers: {
      ip: {
        version: 4,
        source,
        destination,
        protocol: 6,
        ttl: 64,
        length: 64,
      },
    },
    flags: hasError ? {
      hasError: true,
      isRetransmission: false,
      isDuplicateAck: false,
      hasWarning: false,
    } : undefined,
  };
}

function createMockStatistics(): PacketStatistics {
  return {
    totalPackets: 100,
    protocolDistribution: { TCP: 60, UDP: 30, HTTP: 10 },
    topTalkers: [
      { source: '192.168.1.1', destination: '192.168.1.2', packets: 50, bytes: 50000 },
      { source: '192.168.1.3', destination: '192.168.1.4', packets: 30, bytes: 30000 },
    ],
    errors: {
      retransmissions: 5,
      duplicateAcks: 3,
      resets: 2,
    },
    bandwidth: {
      total: 100000,
      perSecond: 10000,
    },
  };
}

function createMockAnalysis(): AnalysisResult {
  return {
    insights: ['Handshake failed for connection X', 'High latency detected'],
    errors: [
      { packetId: 5, type: 'error', description: 'TCP retransmission detected' },
      { packetId: 10, type: 'error', description: 'Connection reset' },
    ],
    latencyIssues: [
      { source: '192.168.1.1', destination: '192.168.1.2', averageLatency: 500, maxLatency: 1000 },
    ],
    streams: [],
    threats: [],
  };
}

describe('Context Builder', () => {
  describe('prepareAnalysisContext', () => {
    it('should return valid context for empty packet list', () => {
      const context = prepareAnalysisContext([], null, null);

      expect(context).toBeDefined();
      expect(context.summary.totalPackets).toBe(0);
      expect(context.summary.duration).toBe(0);
      expect(context.samplePackets).toEqual([]);
      expect(context.errorPackets).toEqual([]);
    });

    it('should calculate duration correctly', () => {
      const packets = [
        createMockPacket(0, 1000),
        createMockPacket(1, 2000),
        createMockPacket(2, 5000), // 4 seconds duration
      ];

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.summary.totalPackets).toBe(3);
      expect(context.summary.duration).toBe(4); // (5000 - 1000) / 1000 = 4 seconds
    });

    it('should include protocol distribution from statistics', () => {
      const packets = [createMockPacket(0, 1000)];
      const stats = createMockStatistics();

      const context = prepareAnalysisContext(packets, stats, null);

      expect(context.summary.protocols).toEqual({ TCP: 60, UDP: 30, HTTP: 10 });
    });

    it('should extract top endpoints', () => {
      const packets = [
        createMockPacket(0, 1000, 'TCP', '192.168.1.1', '10.0.0.1'),
        createMockPacket(1, 1100, 'TCP', '192.168.1.1', '10.0.0.1'),
        createMockPacket(2, 1200, 'TCP', '192.168.1.2', '10.0.0.2'),
      ];

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.summary.topEndpoints.length).toBeGreaterThan(0);
      expect(context.summary.topEndpoints[0]).toContain('192.168.1.1');
    });

    it('should count issues from analysis', () => {
      const packets = [createMockPacket(0, 1000)];
      const stats = createMockStatistics();
      const analysis = createMockAnalysis();

      const context = prepareAnalysisContext(packets, stats, analysis);

      expect(context.issues.retransmissions).toBe(1); // Based on description filter
      expect(context.issues.totalErrors).toBe(10); // 5 + 3 + 2
      expect(context.issues.failedHandshakes).toBe(1);
      expect(context.issues.latencyIssues).toBe(1);
    });

    it('should include bandwidth from statistics', () => {
      const packets = [createMockPacket(0, 1000)];
      const stats = createMockStatistics();

      const context = prepareAnalysisContext(packets, stats, null);

      expect(context.summary.bandwidth.total).toBe(100000);
      expect(context.summary.bandwidth.perSecond).toBe(10000);
    });

    it('should sample representative packets when under limit', () => {
      const packets = [
        createMockPacket(0, 1000),
        createMockPacket(1, 1100),
        createMockPacket(2, 1200),
      ];

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.samplePackets.length).toBe(3);
      expect(context.samplePackets[0].number).toBe(0);
      expect(context.samplePackets[1].number).toBe(1);
      expect(context.samplePackets[2].number).toBe(2);
    });

    it('should sample representative packets when over limit', () => {
      // Create 50 packets
      const packets = Array.from({ length: 50 }, (_, i) =>
        createMockPacket(i, 1000 + i * 100)
      );

      const context = prepareAnalysisContext(packets, null, null);

      // Should be limited to 20 samples
      expect(context.samplePackets.length).toBeLessThanOrEqual(20);
    });

    it('should extract error packets', () => {
      const packets = [
        createMockPacket(0, 1000, 'TCP', '192.168.1.1', '192.168.1.2', false),
        createMockPacket(1, 1100, 'TCP', '192.168.1.1', '192.168.1.2', true), // Error
        createMockPacket(2, 1200, 'TCP', '192.168.1.1', '192.168.1.2', false),
        createMockPacket(3, 1300, 'TCP', '192.168.1.1', '192.168.1.2', true), // Error
      ];

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.errorPackets.length).toBe(2);
      expect(context.errorPackets[0].number).toBe(1);
      expect(context.errorPackets[1].number).toBe(3);
    });

    it('should limit error packets to 10', () => {
      // Create 20 error packets
      const packets = Array.from({ length: 20 }, (_, i) =>
        createMockPacket(i, 1000 + i * 100, 'TCP', '192.168.1.1', '192.168.1.2', true)
      );

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.errorPackets.length).toBe(10);
    });

    it('should handle null statistics gracefully', () => {
      const packets = [createMockPacket(0, 1000)];

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.summary.protocols).toEqual({});
      expect(context.summary.bandwidth.total).toBe(0);
      expect(context.summary.bandwidth.perSecond).toBe(0);
    });

    it('should handle null analysis gracefully', () => {
      const packets = [createMockPacket(0, 1000)];

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.issues.retransmissions).toBe(0);
      expect(context.issues.failedHandshakes).toBe(0);
      expect(context.issues.latencyIssues).toBe(0);
    });

    it('should convert packets to samples with correct structure', () => {
      const packets = [
        createMockPacket(0, 1000, 'HTTP', '192.168.1.1', '192.168.1.2'),
      ];

      const context = prepareAnalysisContext(packets, null, null);

      expect(context.samplePackets[0]).toMatchObject({
        number: 0,
        timestamp: 1000,
        protocol: 'HTTP',
      });
    });
  });
});
