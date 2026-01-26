import { describe, it, expect, beforeEach } from 'vitest';
import { 
  detectRetransmissions, 
  detectDuplicateAcks, 
  analyzeHandshakes, 
  calculateLatency 
} from '@/lib/tcp-analyzer';
import { Packet, PacketFlags, TCPLayer, IPLayer } from '@/types/packet';

// Helper to create mock packets with TCP layer
function createTCPPacket(
  id: number,
  timestamp: number,
  sourceIP: string,
  destIP: string,
  sourcePort: number,
  destPort: number,
  seqNum: number,
  ackNum: number,
  flags: Partial<TCPLayer['flags']> = {},
  payload?: Uint8Array
): Packet {
  const tcpFlags = {
    syn: false,
    ack: false,
    fin: false,
    rst: false,
    psh: false,
    urg: false,
    ...flags,
  };

  return {
    id,
    timestamp,
    timeString: new Date(timestamp).toISOString(),
    source: `${sourceIP}:${sourcePort}`,
    destination: `${destIP}:${destPort}`,
    protocol: 'TCP',
    length: 64,
    info: 'TCP packet',
    raw: new Uint8Array([0x00]),
    layers: {
      ip: {
        version: 4,
        source: sourceIP,
        destination: destIP,
        protocol: 6,
        ttl: 64,
        length: 64,
      },
      tcp: {
        sourcePort,
        destinationPort: destPort,
        sequenceNumber: seqNum,
        acknowledgmentNumber: ackNum,
        flags: tcpFlags,
        windowSize: 65535,
        payload,
      },
    },
  };
}

describe('TCP Analyzer', () => {
  describe('detectRetransmissions', () => {
    it('should return empty array for empty packet list', () => {
      const result = detectRetransmissions([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when no retransmissions exist', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, {}, new Uint8Array([1])),
        createTCPPacket(1, 1100, '192.168.1.1', '192.168.1.2', 12345, 80, 1100, 0, {}, new Uint8Array([2])),
        createTCPPacket(2, 1200, '192.168.1.1', '192.168.1.2', 12345, 80, 1200, 0, {}, new Uint8Array([3])),
      ];

      const result = detectRetransmissions(packets);
      expect(result).toEqual([]);
    });

    it('should detect retransmission when same sequence number is seen twice with payload', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, {}, new Uint8Array([1])),
        createTCPPacket(1, 1100, '192.168.1.1', '192.168.1.2', 12345, 80, 1100, 0, {}, new Uint8Array([2])),
        createTCPPacket(2, 1200, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, {}, new Uint8Array([1])), // Retransmission
      ];

      const result = detectRetransmissions(packets);
      expect(result).toContain(2);
      expect(packets[2].flags?.isRetransmission).toBe(true);
      expect(packets[2].flags?.hasError).toBe(true);
    });

    it('should not flag retransmission for packets without payload', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, { syn: true }),
        createTCPPacket(1, 1100, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, { syn: true }), // Same seq but no payload
      ];

      const result = detectRetransmissions(packets);
      expect(result).toEqual([]);
    });

    it('should track retransmissions per connection separately', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, {}, new Uint8Array([1])),
        createTCPPacket(1, 1100, '192.168.1.3', '192.168.1.4', 12346, 443, 1000, 0, {}, new Uint8Array([2])), // Different connection, same seq
      ];

      const result = detectRetransmissions(packets);
      expect(result).toEqual([]); // No retransmission - different connections
    });

    it('should skip packets without TCP layer', () => {
      const udpPacket: Packet = {
        id: 0,
        timestamp: 1000,
        timeString: '2024-01-01T00:00:00.000Z',
        source: '192.168.1.1:53',
        destination: '192.168.1.2:53',
        protocol: 'UDP',
        length: 64,
        info: 'UDP packet',
        raw: new Uint8Array([0x00]),
        layers: {
          ip: {
            version: 4,
            source: '192.168.1.1',
            destination: '192.168.1.2',
            protocol: 17,
            ttl: 64,
            length: 64,
          },
          udp: {
            sourcePort: 53,
            destinationPort: 53,
            length: 20,
          },
        },
      };

      const result = detectRetransmissions([udpPacket]);
      expect(result).toEqual([]);
    });
  });

  describe('detectDuplicateAcks', () => {
    it('should return empty array for empty packet list', () => {
      const result = detectDuplicateAcks([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when no duplicate ACKs exist', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 1000, { ack: true }),
        createTCPPacket(1, 1100, '192.168.1.1', '192.168.1.2', 12345, 80, 1100, 2000, { ack: true }),
        createTCPPacket(2, 1200, '192.168.1.1', '192.168.1.2', 12345, 80, 1200, 3000, { ack: true }),
      ];

      const result = detectDuplicateAcks(packets);
      expect(result).toEqual([]);
    });

    it('should detect duplicate ACKs (3rd or more occurrence)', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 5000, { ack: true }),
        createTCPPacket(1, 1100, '192.168.1.1', '192.168.1.2', 12345, 80, 1100, 5000, { ack: true }),
        createTCPPacket(2, 1200, '192.168.1.1', '192.168.1.2', 12345, 80, 1200, 5000, { ack: true }), // 3rd duplicate
      ];

      const result = detectDuplicateAcks(packets);
      expect(result).toContain(2);
      expect(packets[2].flags?.isDuplicateAck).toBe(true);
    });

    it('should skip packets without ACK flag', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 5000, { syn: true }),
        createTCPPacket(1, 1100, '192.168.1.1', '192.168.1.2', 12345, 80, 1100, 5000, { syn: true }),
        createTCPPacket(2, 1200, '192.168.1.1', '192.168.1.2', 12345, 80, 1200, 5000, { syn: true }),
      ];

      const result = detectDuplicateAcks(packets);
      expect(result).toEqual([]);
    });
  });

  describe('analyzeHandshakes', () => {
    it('should return zeros for empty packet list', () => {
      const result = analyzeHandshakes([]);
      expect(result).toEqual({ successful: 0, failed: 0 });
    });

    it('should detect SYN packets in connection tracking', () => {
      // The implementation tracks connections per direction
      // SYN from client creates one key, SYN-ACK from server creates another
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, { syn: true }),
      ];

      const result = analyzeHandshakes(packets);
      // No complete handshakes yet
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should detect failed connection with RST', () => {
      const packets = [
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, { syn: true }),
        createTCPPacket(1, 1100, '192.168.1.2', '192.168.1.1', 80, 12345, 0, 0, { rst: true }),
      ];

      const result = analyzeHandshakes(packets);
      expect(result.failed).toBe(1);
    });

    it('should count RST packets as failed connections', () => {
      const packets = [
        // Multiple RST packets
        createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0, { rst: true }),
        createTCPPacket(1, 1100, '192.168.1.3', '192.168.1.4', 12346, 443, 2000, 0, { rst: true }),
      ];

      const result = analyzeHandshakes(packets);
      expect(result.failed).toBe(2);
    });

    it('should handle packets without TCP layer', () => {
      const udpPacket: Packet = {
        id: 0,
        timestamp: 1000,
        timeString: '2024-01-01T00:00:00.000Z',
        source: '192.168.1.1:53',
        destination: '192.168.1.2:53',
        protocol: 'UDP',
        length: 64,
        info: 'UDP packet',
        raw: new Uint8Array([0x00]),
        layers: {
          ip: {
            version: 4,
            source: '192.168.1.1',
            destination: '192.168.1.2',
            protocol: 17,
            ttl: 64,
            length: 64,
          },
          udp: {
            sourcePort: 53,
            destinationPort: 53,
            length: 20,
          },
        },
      };

      const result = analyzeHandshakes([udpPacket]);
      expect(result).toEqual({ successful: 0, failed: 0 });
    });
  });

  describe('calculateLatency', () => {
    it('should calculate latency between request and response', () => {
      const request = createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0);
      const response = createTCPPacket(1, 1500, '192.168.1.2', '192.168.1.1', 80, 12345, 2000, 1001);

      const latency = calculateLatency(request, response);
      expect(latency).toBe(500);
    });

    it('should return 0 for same timestamp', () => {
      const request = createTCPPacket(0, 1000, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0);
      const response = createTCPPacket(1, 1000, '192.168.1.2', '192.168.1.1', 80, 12345, 2000, 1001);

      const latency = calculateLatency(request, response);
      expect(latency).toBe(0);
    });

    it('should handle large latency values', () => {
      const request = createTCPPacket(0, 0, '192.168.1.1', '192.168.1.2', 12345, 80, 1000, 0);
      const response = createTCPPacket(1, 60000, '192.168.1.2', '192.168.1.1', 80, 12345, 2000, 1001);

      const latency = calculateLatency(request, response);
      expect(latency).toBe(60000);
    });
  });
});
