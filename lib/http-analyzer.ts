import { Packet, HTTPLayer } from '@/types/packet';
import { bytesToString } from './utils';

export function analyzeHTTP(packet: Packet): HTTPLayer | null {
  const tcp = packet.layers.tcp;
  if (!tcp || !tcp.payload) return null;

  const payload = tcp.payload;
  const text = bytesToString(payload);

  // Check for HTTP request
  const requestMatch = text.match(/^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH|TRACE|CONNECT)\s+(\S+)\s+HTTP\/([\d.]+)/);
  if (requestMatch) {
    const [, method, uri, version] = requestMatch;
    const headers = parseHTTPHeaders(text);
    const bodyStart = text.indexOf('\r\n\r\n');
    const body = bodyStart !== -1 ? text.substring(bodyStart + 4) : undefined;

    return {
      method,
      uri,
      version,
      headers,
      body,
      isRequest: true,
    };
  }

  // Check for HTTP response
  const responseMatch = text.match(/^HTTP\/([\d.]+)\s+(\d+)\s+(.+)/);
  if (responseMatch) {
    const [, version, statusCode, statusText] = responseMatch;
    const headers = parseHTTPHeaders(text);
    const bodyStart = text.indexOf('\r\n\r\n');
    const body = bodyStart !== -1 ? text.substring(bodyStart + 4) : undefined;

    return {
      version,
      statusCode: parseInt(statusCode, 10),
      statusText: statusText.trim(),
      headers,
      body,
      isRequest: false,
    };
  }

  return null;
}

function parseHTTPHeaders(text: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = text.split('\r\n');
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') break;
    
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      headers[key] = value;
    }
  }
  
  return headers;
}
