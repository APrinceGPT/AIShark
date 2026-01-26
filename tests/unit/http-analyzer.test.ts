import { describe, it, expect } from 'vitest';
import { analyzeHTTP } from '@/lib/http-analyzer';
import { Packet } from '@/types/packet';

const createMockPacket = (overrides: Partial<Packet> = {}): Packet => ({
  id: 1,
  timestamp: Date.now() / 1000,
  source: '192.168.1.1',
  destination: '192.168.1.2',
  protocol: 'TCP',
  length: 100,
  info: 'Test packet',
  details: '',
  rawData: '',
  layers: {},
  ...overrides,
});

// Helper to convert string to Uint8Array for payload
const stringToBytes = (str: string): Uint8Array => {
  return new Uint8Array(str.split('').map(c => c.charCodeAt(0)));
};

describe('HTTP Analyzer - analyzeHTTP', () => {
  describe('HTTP Request Parsing', () => {
    it('should parse GET request', () => {
      const httpRequest = 'GET /api/users HTTP/1.1\r\nHost: example.com\r\nUser-Agent: Test\r\n\r\n';
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 12345,
            destinationPort: 80,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
            payload: stringToBytes(httpRequest),
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result).not.toBeNull();
      expect(result?.method).toBe('GET');
      expect(result?.uri).toBe('/api/users');
      expect(result?.version).toBe('1.1');
      expect(result?.isRequest).toBe(true);
    });

    it('should parse POST request', () => {
      const httpRequest = 'POST /api/data HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/json\r\n\r\n{"key":"value"}';
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 12345,
            destinationPort: 80,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
            payload: stringToBytes(httpRequest),
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result).not.toBeNull();
      expect(result?.method).toBe('POST');
      expect(result?.uri).toBe('/api/data');
      expect(result?.isRequest).toBe(true);
      expect(result?.body).toBe('{"key":"value"}');
    });

    it('should parse request headers', () => {
      const httpRequest = 'GET / HTTP/1.1\r\nHost: example.com\r\nAccept: text/html\r\nConnection: keep-alive\r\n\r\n';
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 12345,
            destinationPort: 80,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
            payload: stringToBytes(httpRequest),
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result).not.toBeNull();
      expect(result?.headers).toHaveProperty('Host', 'example.com');
      expect(result?.headers).toHaveProperty('Accept', 'text/html');
      expect(result?.headers).toHaveProperty('Connection', 'keep-alive');
    });

    it('should parse various HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'OPTIONS', 'PATCH'];
      
      for (const method of methods) {
        const httpRequest = `${method} /test HTTP/1.1\r\nHost: example.com\r\n\r\n`;
        const packet = createMockPacket({
          layers: {
            tcp: {
              sourcePort: 12345,
              destinationPort: 80,
              sequenceNumber: 1,
              acknowledgmentNumber: 1,
              dataOffset: 5,
              flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
              payload: stringToBytes(httpRequest),
            },
          },
        });

        const result = analyzeHTTP(packet);
        expect(result?.method).toBe(method);
      }
    });
  });

  describe('HTTP Response Parsing', () => {
    it('should parse HTTP 200 response', () => {
      const httpResponse = 'HTTP/1.1 200 OK\r\nContent-Type: text/html\r\nContent-Length: 13\r\n\r\n<html></html>';
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 80,
            destinationPort: 12345,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
            payload: stringToBytes(httpResponse),
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(200);
      expect(result?.statusText).toBe('OK');
      expect(result?.version).toBe('1.1');
      expect(result?.isRequest).toBe(false);
    });

    it('should parse HTTP 404 response', () => {
      const httpResponse = 'HTTP/1.1 404 Not Found\r\nContent-Type: text/plain\r\n\r\nPage not found';
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 80,
            destinationPort: 12345,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
            payload: stringToBytes(httpResponse),
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result).not.toBeNull();
      expect(result?.statusCode).toBe(404);
      expect(result?.statusText).toBe('Not Found');
      expect(result?.body).toBe('Page not found');
    });

    it('should parse response headers', () => {
      const httpResponse = 'HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nCache-Control: no-cache\r\n\r\n';
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 80,
            destinationPort: 12345,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
            payload: stringToBytes(httpResponse),
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result?.headers).toHaveProperty('Content-Type', 'application/json');
      expect(result?.headers).toHaveProperty('Cache-Control', 'no-cache');
    });
  });

  describe('Edge Cases', () => {
    it('should return null for non-TCP packets', () => {
      const packet = createMockPacket({
        layers: {},
      });

      const result = analyzeHTTP(packet);
      expect(result).toBeNull();
    });

    it('should return null for TCP packets without payload', () => {
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 80,
            destinationPort: 12345,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: false, ack: true, urg: false },
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result).toBeNull();
    });

    it('should return null for non-HTTP payload', () => {
      const nonHttpData = 'This is not HTTP data\x00\x01\x02\x03';
      const packet = createMockPacket({
        layers: {
          tcp: {
            sourcePort: 12345,
            destinationPort: 80,
            sequenceNumber: 1,
            acknowledgmentNumber: 1,
            dataOffset: 5,
            flags: { fin: false, syn: false, rst: false, psh: true, ack: true, urg: false },
            payload: stringToBytes(nonHttpData),
          },
        },
      });

      const result = analyzeHTTP(packet);
      expect(result).toBeNull();
    });
  });
});
