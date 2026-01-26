import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PCAPParser } from '@/lib/pcap-parser';

// Helper to create a minimal PCAP file header (big endian)
function createPCAPHeader(packets: Uint8Array[] = []): ArrayBuffer {
  const headerSize = 24;
  let totalSize = headerSize;
  
  // Calculate total size with packet headers (16 bytes each)
  for (const pkt of packets) {
    totalSize += 16 + pkt.length;
  }
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const data = new Uint8Array(buffer);
  
  // PCAP global header (big endian)
  view.setUint32(0, 0xa1b2c3d4, false); // Magic number
  view.setUint16(4, 2, false); // Version major
  view.setUint16(6, 4, false); // Version minor
  view.setInt32(8, 0, false); // Timezone (GMT)
  view.setUint32(12, 0, false); // Sigfigs
  view.setUint32(16, 65535, false); // Snaplen
  view.setUint32(20, 1, false); // Link type (Ethernet)
  
  // Add packets
  let offset = headerSize;
  for (let i = 0; i < packets.length; i++) {
    const pkt = packets[i];
    
    // Packet header
    view.setUint32(offset, 1609459200 + i, false); // Timestamp seconds
    view.setUint32(offset + 4, 0, false); // Timestamp microseconds
    view.setUint32(offset + 8, pkt.length, false); // Captured length
    view.setUint32(offset + 12, pkt.length, false); // Original length
    
    // Packet data
    data.set(pkt, offset + 16);
    offset += 16 + pkt.length;
  }
  
  return buffer;
}

// Helper to create a minimal PCAP file header (little endian)
function createPCAPHeaderLE(packets: Uint8Array[] = []): ArrayBuffer {
  const headerSize = 24;
  let totalSize = headerSize;
  
  for (const pkt of packets) {
    totalSize += 16 + pkt.length;
  }
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  const data = new Uint8Array(buffer);
  
  // PCAP global header (little endian - magic 0xd4c3b2a1)
  view.setUint32(0, 0xd4c3b2a1, false); // Magic number (LE magic in BE representation)
  view.setUint16(4, 2, true); // Version major
  view.setUint16(6, 4, true); // Version minor
  view.setInt32(8, 0, true); // Timezone
  view.setUint32(12, 0, true); // Sigfigs
  view.setUint32(16, 65535, true); // Snaplen
  view.setUint32(20, 1, true); // Link type (Ethernet)
  
  // Add packets
  let offset = headerSize;
  for (let i = 0; i < packets.length; i++) {
    const pkt = packets[i];
    
    // Packet header (little endian)
    view.setUint32(offset, 1609459200 + i, true); // Timestamp seconds
    view.setUint32(offset + 4, 0, true); // Timestamp microseconds
    view.setUint32(offset + 8, pkt.length, true); // Captured length
    view.setUint32(offset + 12, pkt.length, true); // Original length
    
    data.set(pkt, offset + 16);
    offset += 16 + pkt.length;
  }
  
  return buffer;
}

// Helper to create minimal Ethernet + IPv4 + TCP packet
function createEthernetIPv4TCPPacket(
  srcIP: string = '192.168.1.1',
  dstIP: string = '192.168.1.2',
  srcPort: number = 12345,
  dstPort: number = 80
): Uint8Array {
  const packet = new Uint8Array(54); // 14 Ethernet + 20 IP + 20 TCP
  
  // Ethernet header
  packet[12] = 0x08; // EtherType IPv4
  packet[13] = 0x00;
  
  // IPv4 header
  const ipOffset = 14;
  packet[ipOffset] = 0x45; // Version 4, IHL 5
  packet[ipOffset + 2] = 0x00; // Total length (high)
  packet[ipOffset + 3] = 40; // Total length (40 = 20 IP + 20 TCP)
  packet[ipOffset + 8] = 64; // TTL
  packet[ipOffset + 9] = 6; // Protocol: TCP
  
  // Source IP
  const srcParts = srcIP.split('.').map(Number);
  packet[ipOffset + 12] = srcParts[0];
  packet[ipOffset + 13] = srcParts[1];
  packet[ipOffset + 14] = srcParts[2];
  packet[ipOffset + 15] = srcParts[3];
  
  // Destination IP
  const dstParts = dstIP.split('.').map(Number);
  packet[ipOffset + 16] = dstParts[0];
  packet[ipOffset + 17] = dstParts[1];
  packet[ipOffset + 18] = dstParts[2];
  packet[ipOffset + 19] = dstParts[3];
  
  // TCP header
  const tcpOffset = 34;
  packet[tcpOffset] = (srcPort >> 8) & 0xff; // Source port high
  packet[tcpOffset + 1] = srcPort & 0xff; // Source port low
  packet[tcpOffset + 2] = (dstPort >> 8) & 0xff; // Dest port high
  packet[tcpOffset + 3] = dstPort & 0xff; // Dest port low
  packet[tcpOffset + 12] = 0x50; // Data offset (5 words = 20 bytes)
  packet[tcpOffset + 13] = 0x02; // Flags: SYN
  
  return packet;
}

// Helper to create Ethernet + IPv4 + UDP packet
function createEthernetIPv4UDPPacket(
  srcIP: string = '192.168.1.1',
  dstIP: string = '192.168.1.2',
  srcPort: number = 53,
  dstPort: number = 53
): Uint8Array {
  const packet = new Uint8Array(42); // 14 Ethernet + 20 IP + 8 UDP
  
  // Ethernet header
  packet[12] = 0x08;
  packet[13] = 0x00;
  
  // IPv4 header
  const ipOffset = 14;
  packet[ipOffset] = 0x45;
  packet[ipOffset + 2] = 0x00;
  packet[ipOffset + 3] = 28; // Total length (20 IP + 8 UDP)
  packet[ipOffset + 8] = 64;
  packet[ipOffset + 9] = 17; // Protocol: UDP
  
  // Source IP
  const srcParts = srcIP.split('.').map(Number);
  packet[ipOffset + 12] = srcParts[0];
  packet[ipOffset + 13] = srcParts[1];
  packet[ipOffset + 14] = srcParts[2];
  packet[ipOffset + 15] = srcParts[3];
  
  // Destination IP
  const dstParts = dstIP.split('.').map(Number);
  packet[ipOffset + 16] = dstParts[0];
  packet[ipOffset + 17] = dstParts[1];
  packet[ipOffset + 18] = dstParts[2];
  packet[ipOffset + 19] = dstParts[3];
  
  // UDP header
  const udpOffset = 34;
  packet[udpOffset] = (srcPort >> 8) & 0xff;
  packet[udpOffset + 1] = srcPort & 0xff;
  packet[udpOffset + 2] = (dstPort >> 8) & 0xff;
  packet[udpOffset + 3] = dstPort & 0xff;
  packet[udpOffset + 4] = 0x00;
  packet[udpOffset + 5] = 0x08; // Length: 8 (header only)
  
  return packet;
}

describe('PCAP Parser', () => {
  let parser: PCAPParser;

  beforeEach(() => {
    parser = new PCAPParser();
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('parse', () => {
    it('should throw error for unsupported file format', async () => {
      const invalidBuffer = new ArrayBuffer(100);
      const view = new DataView(invalidBuffer);
      view.setUint32(0, 0xDEADBEEF, false); // Invalid magic

      await expect(parser.parse(invalidBuffer)).rejects.toThrow('Unsupported file format');
    });

    it('should detect and parse big-endian PCAP format', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket();
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets.length).toBe(1);
      // Port 80 is detected as HTTP, which is correct behavior
      expect(packets[0].protocol).toBe('HTTP');
    });

    it('should detect and parse little-endian PCAP format', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket();
      const buffer = createPCAPHeaderLE([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets.length).toBe(1);
    });

    it('should parse empty PCAP file', async () => {
      const buffer = createPCAPHeader([]);

      const packets = await parser.parse(buffer);

      expect(packets).toEqual([]);
    });

    it('should parse multiple packets', async () => {
      const packets = [
        createEthernetIPv4TCPPacket('192.168.1.1', '192.168.1.2', 12345, 80),
        createEthernetIPv4TCPPacket('192.168.1.2', '192.168.1.1', 80, 12345),
        createEthernetIPv4UDPPacket('192.168.1.1', '8.8.8.8', 53000, 53),
      ];
      const buffer = createPCAPHeader(packets);

      const result = await parser.parse(buffer);

      expect(result.length).toBe(3);
    });
  });

  describe('packet parsing', () => {
    it('should parse TCP packet with correct source and destination', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket('10.0.0.1', '10.0.0.2', 8080, 443);
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].source).toBe('10.0.0.1');
      expect(packets[0].destination).toBe('10.0.0.2');
    });

    it('should parse UDP packet correctly', async () => {
      const udpPacket = createEthernetIPv4UDPPacket('192.168.1.1', '8.8.8.8', 53000, 53);
      const buffer = createPCAPHeader([udpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].protocol).toBe('DNS'); // Port 53 should be detected as DNS
      expect(packets[0].layers.udp).toBeDefined();
    });

    it('should identify HTTP protocol from port 80', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket('192.168.1.1', '192.168.1.2', 12345, 80);
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].protocol).toBe('HTTP');
    });

    it('should identify HTTPS protocol from port 443', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket('192.168.1.1', '192.168.1.2', 12345, 443);
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].protocol).toBe('HTTPS');
    });

    it('should parse TCP flags correctly', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket();
      // Set SYN+ACK flags
      tcpPacket[34 + 13] = 0x12; // SYN (0x02) + ACK (0x10)
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].layers.tcp?.flags.syn).toBe(true);
      expect(packets[0].layers.tcp?.flags.ack).toBe(true);
    });

    it('should include port info in packet info string', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket('192.168.1.1', '192.168.1.2', 55555, 8080);
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].info).toContain('55555');
      expect(packets[0].info).toContain('8080');
    });

    it('should preserve raw packet data', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket();
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].raw).toBeDefined();
      expect(packets[0].raw.length).toBe(tcpPacket.length);
    });

    it('should assign sequential IDs to packets', async () => {
      const packets = [
        createEthernetIPv4TCPPacket(),
        createEthernetIPv4TCPPacket(),
        createEthernetIPv4TCPPacket(),
      ];
      const buffer = createPCAPHeader(packets);

      const result = await parser.parse(buffer);

      expect(result[0].id).toBe(0);
      expect(result[1].id).toBe(1);
      expect(result[2].id).toBe(2);
    });

    it('should include timestamp in packet', async () => {
      const tcpPacket = createEthernetIPv4TCPPacket();
      const buffer = createPCAPHeader([tcpPacket]);

      const packets = await parser.parse(buffer);

      expect(packets[0].timestamp).toBeDefined();
      expect(typeof packets[0].timestamp).toBe('number');
      expect(packets[0].timeString).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle malformed packets gracefully', async () => {
      // Create a PCAP with too-short packet data
      const shortPacket = new Uint8Array([0x08, 0x00]); // Only 2 bytes
      const buffer = createPCAPHeader([shortPacket]);

      // Should not throw, may return empty or partial results
      const packets = await parser.parse(buffer);
      
      // Parser should handle gracefully (either skip or parse what it can)
      expect(Array.isArray(packets)).toBe(true);
    });
  });
});
