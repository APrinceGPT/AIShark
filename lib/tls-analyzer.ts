import { Packet, TLSLayer } from '@/types/packet';
import { readUInt16BE } from './utils';

export function analyzeTLS(packet: Packet): TLSLayer | null {
  const tcp = packet.layers.tcp;
  if (!tcp || !tcp.payload) return null;

  try {
    const data = tcp.payload;
    
    // Check for TLS record layer
    const contentType = data[0];
    if (contentType < 20 || contentType > 23) return null;

    const version = (data[1] << 8) | data[2];
    const length = readUInt16BE(data, 3);

    if (data.length < 5 + length) return null;

    const layer: TLSLayer = {
      version: getTLSVersion(version),
      contentType: getContentType(contentType),
    };

    // Parse handshake messages
    if (contentType === 22) { // Handshake
      const handshakeType = data[5];
      layer.handshakeType = getHandshakeType(handshakeType);

      // Client Hello
      if (handshakeType === 1) {
        const sni = extractSNI(data, 5);
        if (sni) {
          layer.serverName = sni;
        }
        layer.cipherSuites = extractCipherSuites(data, 5);
      }
    }

    return layer;
  } catch (error) {
    return null;
  }
}

function getTLSVersion(version: number): string {
  const versions: Record<number, string> = {
    0x0301: 'TLS 1.0',
    0x0302: 'TLS 1.1',
    0x0303: 'TLS 1.2',
    0x0304: 'TLS 1.3',
  };
  return versions[version] || `Unknown (0x${version.toString(16)})`;
}

function getContentType(type: number): string {
  const types: Record<number, string> = {
    20: 'Change Cipher Spec',
    21: 'Alert',
    22: 'Handshake',
    23: 'Application Data',
  };
  return types[type] || `Unknown (${type})`;
}

function getHandshakeType(type: number): string {
  const types: Record<number, string> = {
    0: 'Hello Request',
    1: 'Client Hello',
    2: 'Server Hello',
    11: 'Certificate',
    12: 'Server Key Exchange',
    13: 'Certificate Request',
    14: 'Server Hello Done',
    15: 'Certificate Verify',
    16: 'Client Key Exchange',
    20: 'Finished',
  };
  return types[type] || `Unknown (${type})`;
}

function extractSNI(data: Uint8Array, offset: number): string | null {
  try {
    // Skip handshake header (4 bytes)
    let pos = offset + 4;
    
    // Skip client version (2 bytes) and random (32 bytes)
    pos += 34;
    
    // Skip session ID
    const sessionIdLength = data[pos];
    pos += 1 + sessionIdLength;
    
    // Skip cipher suites
    const cipherSuitesLength = readUInt16BE(data, pos);
    pos += 2 + cipherSuitesLength;
    
    // Skip compression methods
    const compressionMethodsLength = data[pos];
    pos += 1 + compressionMethodsLength;
    
    // Parse extensions
    if (pos + 2 > data.length) return null;
    const extensionsLength = readUInt16BE(data, pos);
    pos += 2;
    
    const extensionsEnd = pos + extensionsLength;
    
    while (pos + 4 <= extensionsEnd) {
      const extensionType = readUInt16BE(data, pos);
      const extensionLength = readUInt16BE(data, pos + 2);
      pos += 4;
      
      // Server Name Indication extension (type 0)
      if (extensionType === 0) {
        const listLength = readUInt16BE(data, pos);
        pos += 2;
        
        if (pos < data.length) {
          const nameType = data[pos];
          pos += 1;
          
          if (nameType === 0) { // host_name
            const nameLength = readUInt16BE(data, pos);
            pos += 2;
            
            const nameBytes = data.slice(pos, pos + nameLength);
            return new TextDecoder().decode(nameBytes);
          }
        }
      }
      
      pos += extensionLength;
    }
  } catch (error) {
    return null;
  }
  
  return null;
}

function extractCipherSuites(data: Uint8Array, offset: number): string[] {
  try {
    let pos = offset + 4 + 34; // Skip to after random
    
    // Skip session ID
    const sessionIdLength = data[pos];
    pos += 1 + sessionIdLength;
    
    // Read cipher suites
    const cipherSuitesLength = readUInt16BE(data, pos);
    pos += 2;
    
    const suites: string[] = [];
    const end = pos + cipherSuitesLength;
    
    while (pos < end) {
      const suite = readUInt16BE(data, pos);
      suites.push(`0x${suite.toString(16).padStart(4, '0')}`);
      pos += 2;
    }
    
    return suites.slice(0, 10); // Return first 10 cipher suites
  } catch (error) {
    return [];
  }
}
