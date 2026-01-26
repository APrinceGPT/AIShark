import { describe, it, expect } from 'vitest';
import { analyzeDNS } from '@/lib/dns-analyzer';
import { Packet } from '@/types/packet';

const createMockPacket = (overrides: Partial<Packet> = {}): Packet => ({
  id: 1,
  timestamp: Date.now() / 1000,
  source: '192.168.1.1',
  destination: '8.8.8.8',
  protocol: 'UDP',
  length: 100,
  info: 'Test packet',
  details: '',
  rawData: '',
  layers: {},
  ...overrides,
});

// Helper to create a mock DNS query packet
const createDNSQueryPayload = (domain: string): Uint8Array => {
  // Simple DNS query structure:
  // Transaction ID (2 bytes) + Flags (2 bytes) + Question count (2 bytes)
  // + Answer count (2 bytes) + Authority count (2 bytes) + Additional count (2 bytes)
  // + Query name + Query type (2 bytes) + Query class (2 bytes)
  
  const labels = domain.split('.');
  const nameBytes: number[] = [];
  
  for (const label of labels) {
    nameBytes.push(label.length);
    for (let i = 0; i < label.length; i++) {
      nameBytes.push(label.charCodeAt(i));
    }
  }
  nameBytes.push(0); // End of name
  
  const payload = new Uint8Array(12 + nameBytes.length + 4);
  
  // Transaction ID
  payload[0] = 0x00;
  payload[1] = 0x01;
  
  // Flags: Standard query (0x0100)
  payload[2] = 0x01;
  payload[3] = 0x00;
  
  // Questions: 1
  payload[4] = 0x00;
  payload[5] = 0x01;
  
  // Answers: 0
  payload[6] = 0x00;
  payload[7] = 0x00;
  
  // Authority: 0
  payload[8] = 0x00;
  payload[9] = 0x00;
  
  // Additional: 0
  payload[10] = 0x00;
  payload[11] = 0x00;
  
  // Query name
  for (let i = 0; i < nameBytes.length; i++) {
    payload[12 + i] = nameBytes[i];
  }
  
  // Query type: A (0x0001)
  payload[12 + nameBytes.length] = 0x00;
  payload[12 + nameBytes.length + 1] = 0x01;
  
  // Query class: IN (0x0001)
  payload[12 + nameBytes.length + 2] = 0x00;
  payload[12 + nameBytes.length + 3] = 0x01;
  
  return payload;
};

describe('DNS Analyzer - analyzeDNS', () => {
  describe('DNS Query Parsing', () => {
    it('should parse DNS query', () => {
      const packet = createMockPacket({
        layers: {
          udp: {
            sourcePort: 12345,
            destinationPort: 53,
            length: 100,
            payload: createDNSQueryPayload('example.com'),
          },
        },
      });

      const result = analyzeDNS(packet);
      expect(result).not.toBeNull();
      expect(result?.isQuery).toBe(true);
      expect(result?.queries.length).toBeGreaterThan(0);
    });

    it('should extract domain name from query', () => {
      const packet = createMockPacket({
        layers: {
          udp: {
            sourcePort: 12345,
            destinationPort: 53,
            length: 100,
            payload: createDNSQueryPayload('test.example.com'),
          },
        },
      });

      const result = analyzeDNS(packet);
      expect(result?.queries[0]?.name).toBe('test.example.com');
    });

    it('should identify query type', () => {
      const packet = createMockPacket({
        layers: {
          udp: {
            sourcePort: 12345,
            destinationPort: 53,
            length: 100,
            payload: createDNSQueryPayload('example.com'),
          },
        },
      });

      const result = analyzeDNS(packet);
      expect(result?.queries[0]?.type).toBe('A'); // Default type in our mock
    });

    it('should extract transaction ID', () => {
      const packet = createMockPacket({
        layers: {
          udp: {
            sourcePort: 12345,
            destinationPort: 53,
            length: 100,
            payload: createDNSQueryPayload('example.com'),
          },
        },
      });

      const result = analyzeDNS(packet);
      expect(result?.transactionId).toBe(1); // 0x0001
    });
  });

  describe('Edge Cases', () => {
    it('should return null for non-UDP packets', () => {
      const packet = createMockPacket({
        layers: {},
      });

      const result = analyzeDNS(packet);
      expect(result).toBeNull();
    });

    it('should return null for UDP packets without payload', () => {
      const packet = createMockPacket({
        layers: {
          udp: {
            sourcePort: 12345,
            destinationPort: 53,
            length: 8,
          },
        },
      });

      const result = analyzeDNS(packet);
      expect(result).toBeNull();
    });

    it('should return null for non-DNS UDP traffic', () => {
      const packet = createMockPacket({
        layers: {
          udp: {
            sourcePort: 12345,
            destinationPort: 8080, // Not port 53
            length: 100,
            payload: new Uint8Array([0x01, 0x02, 0x03]),
          },
        },
      });

      const result = analyzeDNS(packet);
      expect(result).toBeNull();
    });

    it('should handle DNS response on port 53 source', () => {
      // Create a response packet (source port 53)
      const payload = createDNSQueryPayload('example.com');
      // Modify flags to make it a response (set QR bit)
      payload[2] = 0x81; // Response flag
      
      const packet = createMockPacket({
        layers: {
          udp: {
            sourcePort: 53,
            destinationPort: 12345,
            length: 100,
            payload,
          },
        },
      });

      const result = analyzeDNS(packet);
      expect(result).not.toBeNull();
      expect(result?.isQuery).toBe(false);
    });
  });
});
