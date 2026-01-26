import { describe, it, expect } from 'vitest';
import { analyzeTLS } from '@/lib/tls-analyzer';
import { Packet, TCPLayer } from '@/types/packet';

// Helper to create a packet with TCP payload
function createPacketWithTLSPayload(payload: Uint8Array): Packet {
  return {
    id: 0,
    timestamp: 1000,
    timeString: '2024-01-01T00:00:00.000Z',
    source: '192.168.1.1:12345',
    destination: '192.168.1.2:443',
    protocol: 'TCP',
    length: 64 + payload.length,
    info: 'TLS packet',
    raw: new Uint8Array([0x00]),
    layers: {
      ip: {
        version: 4,
        source: '192.168.1.1',
        destination: '192.168.1.2',
        protocol: 6,
        ttl: 64,
        length: 64 + payload.length,
      },
      tcp: {
        sourcePort: 12345,
        destinationPort: 443,
        sequenceNumber: 1000,
        acknowledgmentNumber: 0,
        flags: { syn: false, ack: true, fin: false, rst: false, psh: true, urg: false },
        windowSize: 65535,
        payload,
      },
    },
  };
}

describe('TLS Analyzer', () => {
  describe('analyzeTLS', () => {
    it('should return null for packet without TCP layer', () => {
      const packet: Packet = {
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

      const result = analyzeTLS(packet);
      expect(result).toBeNull();
    });

    it('should return null for packet without TCP payload', () => {
      const packet: Packet = {
        id: 0,
        timestamp: 1000,
        timeString: '2024-01-01T00:00:00.000Z',
        source: '192.168.1.1:12345',
        destination: '192.168.1.2:443',
        protocol: 'TCP',
        length: 64,
        info: 'TCP packet',
        raw: new Uint8Array([0x00]),
        layers: {
          ip: {
            version: 4,
            source: '192.168.1.1',
            destination: '192.168.1.2',
            protocol: 6,
            ttl: 64,
            length: 64,
          },
          tcp: {
            sourcePort: 12345,
            destinationPort: 443,
            sequenceNumber: 1000,
            acknowledgmentNumber: 0,
            flags: { syn: true, ack: false, fin: false, rst: false, psh: false, urg: false },
            windowSize: 65535,
          },
        },
      };

      const result = analyzeTLS(packet);
      expect(result).toBeNull();
    });

    it('should return null for non-TLS payload (invalid content type)', () => {
      // Content type must be between 20-23
      const invalidPayload = new Uint8Array([
        0x00, // Invalid content type
        0x03, 0x03, // Version TLS 1.2
        0x00, 0x05, // Length
        0x01, 0x02, 0x03, 0x04, 0x05, // Data
      ]);

      const packet = createPacketWithTLSPayload(invalidPayload);
      const result = analyzeTLS(packet);
      expect(result).toBeNull();
    });

    it('should parse TLS 1.2 handshake record', () => {
      // TLS Handshake record with Client Hello
      const tlsPayload = new Uint8Array([
        0x16, // Content type: Handshake (22)
        0x03, 0x03, // Version: TLS 1.2
        0x00, 0x10, // Length: 16 bytes
        // Handshake header
        0x01, // Handshake type: Client Hello
        0x00, 0x00, 0x0c, // Length
        0x03, 0x03, // Client version
        // Random (32 bytes) - abbreviated for test
        ...new Array(32).fill(0x00),
        // Session ID length (0)
        0x00,
        // Cipher suites length
        0x00, 0x02,
        0x00, 0x2f, // TLS_RSA_WITH_AES_128_CBC_SHA
        // Compression methods
        0x01, 0x00,
      ]);

      const packet = createPacketWithTLSPayload(tlsPayload);
      const result = analyzeTLS(packet);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('TLS 1.2');
      expect(result?.contentType).toBe('Handshake');
      expect(result?.handshakeType).toBe('Client Hello');
    });

    it('should parse TLS 1.3 record', () => {
      const tlsPayload = new Uint8Array([
        0x16, // Content type: Handshake
        0x03, 0x04, // Version: TLS 1.3
        0x00, 0x05, // Length
        0x01, 0x02, 0x03, 0x04, 0x05, // Data
      ]);

      const packet = createPacketWithTLSPayload(tlsPayload);
      const result = analyzeTLS(packet);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('TLS 1.3');
      expect(result?.contentType).toBe('Handshake');
    });

    it('should parse TLS Application Data record', () => {
      const tlsPayload = new Uint8Array([
        0x17, // Content type: Application Data (23)
        0x03, 0x03, // Version: TLS 1.2
        0x00, 0x20, // Length
        ...new Array(32).fill(0xAB), // Encrypted data
      ]);

      const packet = createPacketWithTLSPayload(tlsPayload);
      const result = analyzeTLS(packet);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('TLS 1.2');
      expect(result?.contentType).toBe('Application Data');
    });

    it('should parse TLS Alert record', () => {
      const tlsPayload = new Uint8Array([
        0x15, // Content type: Alert (21)
        0x03, 0x03, // Version: TLS 1.2
        0x00, 0x02, // Length
        0x02, 0x28, // Fatal alert: handshake_failure
      ]);

      const packet = createPacketWithTLSPayload(tlsPayload);
      const result = analyzeTLS(packet);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('TLS 1.2');
      expect(result?.contentType).toBe('Alert');
    });

    it('should parse Change Cipher Spec record', () => {
      const tlsPayload = new Uint8Array([
        0x14, // Content type: Change Cipher Spec (20)
        0x03, 0x03, // Version: TLS 1.2
        0x00, 0x01, // Length
        0x01, // Change Cipher Spec message
      ]);

      const packet = createPacketWithTLSPayload(tlsPayload);
      const result = analyzeTLS(packet);

      expect(result).not.toBeNull();
      expect(result?.version).toBe('TLS 1.2');
      expect(result?.contentType).toBe('Change Cipher Spec');
    });

    it('should return null for too short payload', () => {
      const shortPayload = new Uint8Array([0x16, 0x03, 0x03]); // Only 3 bytes
      const packet = createPacketWithTLSPayload(shortPayload);
      const result = analyzeTLS(packet);

      expect(result).toBeNull();
    });

    it('should handle TLS 1.0 and 1.1 versions', () => {
      // TLS 1.0
      const tls10Payload = new Uint8Array([
        0x17, 0x03, 0x01, // TLS 1.0
        0x00, 0x05, 0x01, 0x02, 0x03, 0x04, 0x05,
      ]);
      const result10 = analyzeTLS(createPacketWithTLSPayload(tls10Payload));
      expect(result10?.version).toBe('TLS 1.0');

      // TLS 1.1
      const tls11Payload = new Uint8Array([
        0x17, 0x03, 0x02, // TLS 1.1
        0x00, 0x05, 0x01, 0x02, 0x03, 0x04, 0x05,
      ]);
      const result11 = analyzeTLS(createPacketWithTLSPayload(tls11Payload));
      expect(result11?.version).toBe('TLS 1.1');
    });

    it('should handle unknown TLS version gracefully', () => {
      const unknownVersionPayload = new Uint8Array([
        0x17, 0x03, 0xFF, // Unknown version
        0x00, 0x05, 0x01, 0x02, 0x03, 0x04, 0x05,
      ]);
      const result = analyzeTLS(createPacketWithTLSPayload(unknownVersionPayload));
      expect(result?.version).toContain('Unknown');
    });
  });
});
