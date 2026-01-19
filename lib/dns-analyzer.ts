import { Packet, DNSLayer, DNSQuery, DNSAnswer } from '@/types/packet';
import { readUInt16BE } from './utils';

export function analyzeDNS(packet: Packet): DNSLayer | null {
  const udp = packet.layers.udp;
  if (!udp || !udp.payload) return null;
  if (udp.sourcePort !== 53 && udp.destinationPort !== 53) return null;

  try {
    const data = udp.payload;
    const transactionId = readUInt16BE(data, 0);
    const flags = readUInt16BE(data, 2);
    const isQuery = (flags & 0x8000) === 0;
    
    const questionCount = readUInt16BE(data, 4);
    const answerCount = readUInt16BE(data, 6);

    const queries: DNSQuery[] = [];
    const answers: DNSAnswer[] = [];

    let offset = 12;

    // Parse questions
    for (let i = 0; i < questionCount; i++) {
      const { name, newOffset } = parseDNSName(data, offset);
      const type = readUInt16BE(data, newOffset);
      const qclass = readUInt16BE(data, newOffset + 2);
      
      queries.push({
        name,
        type: getDNSType(type),
        class: getDNSClass(qclass),
      });
      
      offset = newOffset + 4;
    }

    // Parse answers
    for (let i = 0; i < answerCount; i++) {
      const { name, newOffset } = parseDNSName(data, offset);
      const type = readUInt16BE(data, newOffset);
      const rclass = readUInt16BE(data, newOffset + 2);
      const ttl = (readUInt16BE(data, newOffset + 4) << 16) | readUInt16BE(data, newOffset + 6);
      const rdLength = readUInt16BE(data, newOffset + 8);
      const rdata = data.slice(newOffset + 10, newOffset + 10 + rdLength);

      let rdataString = '';
      if (type === 1) { // A record
        rdataString = Array.from(rdata).join('.');
      } else if (type === 28) { // AAAA record
        rdataString = formatIPv6(rdata);
      } else if (type === 5 || type === 2) { // CNAME or NS
        rdataString = parseDNSName(data, newOffset + 10).name;
      } else {
        rdataString = Array.from(rdata).map(b => b.toString(16).padStart(2, '0')).join(':');
      }

      answers.push({
        name,
        type: getDNSType(type),
        class: getDNSClass(rclass),
        ttl,
        data: rdataString,
      });

      offset = newOffset + 10 + rdLength;
    }

    return {
      transactionId,
      isQuery,
      queries,
      answers,
    };
  } catch (error) {
    console.error('Error parsing DNS:', error);
    return null;
  }
}

function parseDNSName(data: Uint8Array, offset: number): { name: string; newOffset: number } {
  const labels: string[] = [];
  let currentOffset = offset;
  let jumped = false;
  let maxOffset = offset;

  while (currentOffset < data.length) {
    const length = data[currentOffset];

    if (length === 0) {
      currentOffset++;
      break;
    }

    if ((length & 0xc0) === 0xc0) {
      // Pointer
      if (!jumped) {
        maxOffset = currentOffset + 2;
      }
      const pointer = ((length & 0x3f) << 8) | data[currentOffset + 1];
      currentOffset = pointer;
      jumped = true;
    } else {
      // Label
      currentOffset++;
      const labelBytes = data.slice(currentOffset, currentOffset + length);
      const label = String.fromCharCode(...Array.from(labelBytes));
      labels.push(label);
      currentOffset += length;
    }
  }

  return {
    name: labels.join('.'),
    newOffset: jumped ? maxOffset : currentOffset,
  };
}

function getDNSType(type: number): string {
  const types: Record<number, string> = {
    1: 'A',
    2: 'NS',
    5: 'CNAME',
    6: 'SOA',
    12: 'PTR',
    15: 'MX',
    16: 'TXT',
    28: 'AAAA',
    33: 'SRV',
  };
  return types[type] || `TYPE${type}`;
}

function getDNSClass(qclass: number): string {
  return qclass === 1 ? 'IN' : `CLASS${qclass}`;
}

function formatIPv6(bytes: Uint8Array): string {
  const groups: string[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    groups.push(((bytes[i] << 8) | bytes[i + 1]).toString(16));
  }
  return groups.join(':');
}
