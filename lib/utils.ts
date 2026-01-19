// Utility functions for packet parsing
import { IPLayer, TCPLayer, UDPLayer } from '@/types/packet';

export function parseEthernet(data: Uint8Array, offset: number = 0) {
  return {
    destination: formatMacAddress(data.slice(offset, offset + 6)),
    source: formatMacAddress(data.slice(offset + 6, offset + 12)),
    type: (data[offset + 12] << 8) | data[offset + 13],
  };
}

export function parseIPv4(data: Uint8Array, offset: number = 0): IPLayer {
  const version = (data[offset] >> 4) & 0x0f;
  const ihl = (data[offset] & 0x0f) * 4;
  const totalLength = (data[offset + 2] << 8) | data[offset + 3];
  const protocol = data[offset + 9];
  const ttl = data[offset + 8];
  
  const source = formatIPAddress(data.slice(offset + 12, offset + 16));
  const destination = formatIPAddress(data.slice(offset + 16, offset + 20));

  return {
    version,
    source,
    destination,
    protocol,
    ttl,
    length: totalLength,
  };
}

export function parseTCP(data: Uint8Array, offset: number = 0): TCPLayer {
  const sourcePort = (data[offset] << 8) | data[offset + 1];
  const destinationPort = (data[offset + 2] << 8) | data[offset + 3];
  const sequenceNumber = readUInt32BE(data, offset + 4);
  const acknowledgmentNumber = readUInt32BE(data, offset + 8);
  const dataOffset = ((data[offset + 12] >> 4) & 0x0f) * 4;
  const flagsByte = data[offset + 13];
  const windowSize = (data[offset + 14] << 8) | data[offset + 15];

  const flags = {
    fin: (flagsByte & 0x01) !== 0,
    syn: (flagsByte & 0x02) !== 0,
    rst: (flagsByte & 0x04) !== 0,
    psh: (flagsByte & 0x08) !== 0,
    ack: (flagsByte & 0x10) !== 0,
    urg: (flagsByte & 0x20) !== 0,
  };

  const payload = data.slice(offset + dataOffset);

  return {
    sourcePort,
    destinationPort,
    sequenceNumber,
    acknowledgmentNumber,
    flags,
    windowSize,
    payload: payload.length > 0 ? payload : undefined,
  };
}

export function parseUDP(data: Uint8Array, offset: number = 0): UDPLayer {
  const sourcePort = (data[offset] << 8) | data[offset + 1];
  const destinationPort = (data[offset + 2] << 8) | data[offset + 3];
  const length = (data[offset + 4] << 8) | data[offset + 5];
  const payload = data.slice(offset + 8);

  return {
    sourcePort,
    destinationPort,
    length,
    payload: payload.length > 0 ? payload : undefined,
  };
}

export function formatMacAddress(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join(':');
}

export function formatIPAddress(bytes: Uint8Array): string {
  return Array.from(bytes).join('.');
}

export function readUInt16BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

export function readUInt32BE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  ) >>> 0;
}

export function bytesToString(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return Array.from(bytes)
      .map(b => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
  }
}

export function getProtocolName(protocolNumber: number): string {
  const protocols: Record<number, string> = {
    1: 'ICMP',
    6: 'TCP',
    17: 'UDP',
  };
  return protocols[protocolNumber] || `Protocol ${protocolNumber}`;
}

export function getApplicationProtocol(port: number): string | null {
  const wellKnownPorts: Record<number, string> = {
    20: 'FTP-DATA',
    21: 'FTP',
    22: 'SSH',
    23: 'TELNET',
    25: 'SMTP',
    53: 'DNS',
    80: 'HTTP',
    110: 'POP3',
    143: 'IMAP',
    443: 'HTTPS',
    3306: 'MySQL',
    5432: 'PostgreSQL',
    6379: 'Redis',
    8080: 'HTTP-ALT',
  };
  return wellKnownPorts[port] || null;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').substring(0, 23);
}
