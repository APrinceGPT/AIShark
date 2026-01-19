import { Packet, PacketLayers } from '@/types/packet';
import {
  parseEthernet,
  parseIPv4,
  parseTCP,
  parseUDP,
  getProtocolName,
  getApplicationProtocol,
  formatTimestamp,
  readUInt32BE,
} from './utils';

export class PCAPParser {
  private littleEndian: boolean = false;
  private nanosecondResolution: boolean = false;
  private snaplen: number = 0;
  private linkType: number = 0;

  async parse(buffer: ArrayBuffer): Promise<Packet[]> {
    const data = new Uint8Array(buffer);
    const packets: Packet[] = [];

    console.log('Parser: Buffer size:', buffer.byteLength);
    console.log('Parser: First 16 bytes:', Array.from(data.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));

    // Check magic number to determine file type
    const magic = readUInt32BE(data, 0);
    console.log('Parser: Magic number:', '0x' + magic.toString(16));
    
    if (magic === 0xa1b2c3d4 || magic === 0xd4c3b2a1) {
      // PCAP format
      console.log('Parser: Detected PCAP format');
      return this.parsePCAP(data);
    } else if (magic === 0x0a0d0d0a) {
      // PCAPNG format
      console.log('Parser: Detected PCAPNG format');
      return this.parsePCAPNG(data);
    } else {
      console.error('Parser: Unknown magic number');
      throw new Error(`Unsupported file format. Magic: 0x${magic.toString(16)}`);
    }
  }

  private parsePCAP(data: Uint8Array): Packet[] {
    const packets: Packet[] = [];
    const magic = readUInt32BE(data, 0);
    this.littleEndian = magic === 0xd4c3b2a1;

    const versionMajor = this.read16(data, 4);
    const versionMinor = this.read16(data, 6);
    this.snaplen = this.read32(data, 16);
    this.linkType = this.read32(data, 20);

    let offset = 24; // PCAP header size
    let packetId = 0;

    while (offset < data.length - 16) {
      try {
        const tsSec = this.read32(data, offset);
        const tsUsec = this.read32(data, offset + 4);
        const inclLen = this.read32(data, offset + 8);
        const origLen = this.read32(data, offset + 12);

        if (inclLen > this.snaplen || inclLen === 0) {
          break;
        }

        const timestamp = tsSec * 1000 + Math.floor(tsUsec / 1000);
        const packetData = data.slice(offset + 16, offset + 16 + inclLen);

        const packet = this.parsePacket(packetId++, timestamp, packetData);
        if (packet) {
          packets.push(packet);
        }

        offset += 16 + inclLen;
      } catch (error) {
        console.error('Error parsing packet:', error);
        break;
      }
    }

    return packets;
  }

  private parsePCAPNG(data: Uint8Array): Packet[] {
    const packets: Packet[] = [];
    let offset = 0;
    let packetId = 0;
    let tsResolution = 1000000; // Default: microseconds

    console.log('PCAPNG Parser: Starting, data length:', data.length);

    while (offset < data.length - 12) {
      try {
        // PCAPNG uses little-endian for block type and length
        const blockType = this.readUInt32LE(data, offset);
        const blockLength = this.readUInt32LE(data, offset + 4);

        if (offset % 100000 === 0) {
          console.log(`PCAPNG: Offset ${offset}, BlockType: 0x${blockType.toString(16)}, Length: ${blockLength}`);
        }

        if (blockLength < 12 || offset + blockLength > data.length) {
          console.log('PCAPNG: Invalid block length, stopping. BlockLength:', blockLength, 'Remaining:', data.length - offset);
          break;
        }

        if (blockType === 0x0a0d0d0a) {
          // Section Header Block (SHB)
          console.log('PCAPNG: Section Header Block');
        } else if (blockType === 0x00000001) {
          // Interface Description Block
          const linkType = data[offset + 8] | (data[offset + 9] << 8);
          this.linkType = linkType;
          console.log('PCAPNG: Interface Description Block, linkType:', linkType);
        } else if (blockType === 0x00000006) {
          // Enhanced Packet Block
          const timestampHigh = this.readUInt32LE(data, offset + 12);
          const timestampLow = this.readUInt32LE(data, offset + 16);
          // Calculate 64-bit timestamp (high 32 bits << 32 | low 32 bits)
          const timestamp = (timestampHigh * 0x100000000 + timestampLow) / (tsResolution / 1000);
          
          const capturedLen = this.readUInt32LE(data, offset + 20);
          const packetData = data.slice(offset + 28, offset + 28 + capturedLen);

          const packet = this.parsePacket(packetId++, timestamp, packetData);
          if (packet) {
            packets.push(packet);
          }
        }

        offset += blockLength;
      } catch (error) {
        console.error('Error parsing PCAPNG block:', error);
        break;
      }
    }

    console.log('PCAPNG Parser: Finished. Total packets:', packets.length);
    return packets;
  }

  private parsePacket(id: number, timestamp: number, data: Uint8Array): Packet | null {
    try {
      const layers: PacketLayers = {};
      let offset = 0;

      // Parse Ethernet (assuming linkType 1)
      if (this.linkType === 1) {
        layers.ethernet = parseEthernet(data, 0);
        offset = 14;

        // Check for IPv4
        if (layers.ethernet.type === 0x0800) {
          layers.ip = parseIPv4(data, offset);
          const ipHeaderLength = (data[offset] & 0x0f) * 4;
          offset += ipHeaderLength;

          // Parse transport layer
          if (layers.ip.protocol === 6) {
            // TCP
            layers.tcp = parseTCP(data, offset);
          } else if (layers.ip.protocol === 17) {
            // UDP
            layers.udp = parseUDP(data, offset);
          }
        }
      }

      // Determine protocol and info
      let protocol = 'Unknown';
      let info = '';
      let source = '';
      let destination = '';

      if (layers.ip) {
        source = layers.ip.source;
        destination = layers.ip.destination;
        protocol = getProtocolName(layers.ip.protocol);

        if (layers.tcp) {
          const appProto = getApplicationProtocol(layers.tcp.destinationPort) || 
                          getApplicationProtocol(layers.tcp.sourcePort);
          if (appProto) {
            protocol = appProto;
          }
          info = `${layers.tcp.sourcePort} → ${layers.tcp.destinationPort} `;
          const flags = [];
          if (layers.tcp.flags.syn) flags.push('SYN');
          if (layers.tcp.flags.ack) flags.push('ACK');
          if (layers.tcp.flags.fin) flags.push('FIN');
          if (layers.tcp.flags.rst) flags.push('RST');
          if (layers.tcp.flags.psh) flags.push('PSH');
          info += `[${flags.join(', ')}]`;
        } else if (layers.udp) {
          const appProto = getApplicationProtocol(layers.udp.destinationPort) || 
                          getApplicationProtocol(layers.udp.sourcePort);
          if (appProto) {
            protocol = appProto;
          }
          info = `${layers.udp.sourcePort} → ${layers.udp.destinationPort}`;
        }
      }

      return {
        id,
        timestamp,
        timeString: formatTimestamp(timestamp),
        source,
        destination,
        protocol,
        length: data.length,
        info,
        raw: data,
        layers,
      };
    } catch (error) {
      console.error('Error parsing packet:', error);
      return null;
    }
  }

  private read16(data: Uint8Array, offset: number): number {
    return this.littleEndian
      ? data[offset] | (data[offset + 1] << 8)
      : (data[offset] << 8) | data[offset + 1];
  }

  private read32(data: Uint8Array, offset: number): number {
    return this.littleEndian
      ? data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)
      : (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
  }

  private readUInt32LE(data: Uint8Array, offset: number): number {
    return (
      data[offset] |
      (data[offset + 1] << 8) |
      (data[offset + 2] << 16) |
      (data[offset + 3] << 24)
    ) >>> 0;
  }
}
