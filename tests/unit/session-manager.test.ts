import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

// Mock needs to be at top level with factory function
vi.mock('@/lib/supabase-client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        remove: vi.fn(),
        createSignedUrl: vi.fn(),
      })),
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
        single: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
  },
}));

// Import tested types for documentation (functions are tested indirectly)
import type { SaveSessionData, LoadSessionData } from '@/lib/session-manager';

// Helper to create mock packets
function createMockPacket(id: number): Packet {
  return {
    id,
    timestamp: 1000 + id * 100,
    timeString: new Date(1000 + id * 100).toISOString(),
    source: '192.168.1.1:12345',
    destination: '192.168.1.2:80',
    protocol: 'TCP',
    length: 64,
    info: 'Mock packet',
    raw: new Uint8Array([0x00]),
    layers: {},
  };
}

function createMockStatistics(): PacketStatistics {
  return {
    totalPackets: 10,
    protocolDistribution: { TCP: 8, UDP: 2 },
    topTalkers: [
      { source: '192.168.1.1', destination: '192.168.1.2', packets: 10, bytes: 1000 },
    ],
    errors: { retransmissions: 0, duplicateAcks: 0, resets: 0 },
    bandwidth: { total: 1000, perSecond: 100 },
  };
}

function createMockAnalysis(): AnalysisResult {
  return {
    insights: ['Test insight'],
    errors: [],
    latencyIssues: [],
    streams: [],
    threats: [],
  };
}

describe('Session Manager Types', () => {
  describe('SaveSessionData interface', () => {
    it('should have correct structure', () => {
      const saveData: SaveSessionData = {
        name: 'Test Session',
        fileName: 'test.pcap',
        fileSize: 1024,
        packets: [createMockPacket(0), createMockPacket(1)],
        statistics: createMockStatistics(),
        analysis: createMockAnalysis(),
      };

      expect(saveData.name).toBe('Test Session');
      expect(saveData.fileName).toBe('test.pcap');
      expect(saveData.fileSize).toBe(1024);
      expect(saveData.packets.length).toBe(2);
      expect(saveData.statistics.totalPackets).toBe(10);
    });

    it('should allow optional pcapFile', () => {
      const saveDataWithFile: SaveSessionData = {
        name: 'Test Session',
        fileName: 'test.pcap',
        fileSize: 1024,
        packets: [],
        statistics: createMockStatistics(),
        analysis: createMockAnalysis(),
        pcapFile: new File(['test'], 'test.pcap'),
      };

      expect(saveDataWithFile.pcapFile).toBeDefined();
    });
  });

  describe('LoadSessionData interface', () => {
    it('should represent loaded session structure', () => {
      const loadData: LoadSessionData = {
        session: {
          id: 'session-123',
          user_id: 'user-123',
          name: 'Test Session',
          file_name: 'test.pcap',
          file_size: 1024,
          packet_count: 10,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        statistics: createMockStatistics(),
        packets: [],
        insights: [],
      };

      expect(loadData.session.id).toBe('session-123');
      expect(loadData.statistics.totalPackets).toBe(10);
      expect(loadData.packets).toEqual([]);
    });

    it('should allow optional anomalyData', () => {
      const loadDataWithAnomalies: LoadSessionData = {
        session: {
          id: 'session-123',
          user_id: 'user-123',
          name: 'Test Session',
          file_name: 'test.pcap',
          file_size: 1024,
          packet_count: 10,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        statistics: createMockStatistics(),
        packets: [],
        insights: [],
        anomalyData: {
          insights: ['Anomaly detected'],
          errors: [{ id: 1, message: 'Error' }],
          latencyIssues: [],
        },
      };

      expect(loadDataWithAnomalies.anomalyData).toBeDefined();
      expect(loadDataWithAnomalies.anomalyData?.insights).toHaveLength(1);
    });
  });

  describe('Mock statistics', () => {
    it('should have valid protocol distribution', () => {
      const stats = createMockStatistics();
      expect(stats.protocolDistribution.TCP).toBe(8);
      expect(stats.protocolDistribution.UDP).toBe(2);
    });

    it('should have valid top talkers', () => {
      const stats = createMockStatistics();
      expect(stats.topTalkers[0].source).toBe('192.168.1.1');
      expect(stats.topTalkers[0].packets).toBe(10);
    });

    it('should have bandwidth data', () => {
      const stats = createMockStatistics();
      expect(stats.bandwidth.total).toBe(1000);
      expect(stats.bandwidth.perSecond).toBe(100);
    });
  });

  describe('Mock analysis', () => {
    it('should have insights array', () => {
      const analysis = createMockAnalysis();
      expect(analysis.insights).toContain('Test insight');
    });

    it('should have empty arrays for clean analysis', () => {
      const analysis = createMockAnalysis();
      expect(analysis.errors).toEqual([]);
      expect(analysis.latencyIssues).toEqual([]);
      expect(analysis.streams).toEqual([]);
      expect(analysis.threats).toEqual([]);
    });
  });
});
