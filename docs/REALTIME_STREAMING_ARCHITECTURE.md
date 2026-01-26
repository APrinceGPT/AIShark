# Real-Time Packet Streaming Architecture

## Overview

This document outlines the architecture for implementing real-time packet streaming capabilities in AIShark. This feature would enable live capture analysis without requiring file uploads.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   WebSocket     │  │   Streaming     │  │   Virtual       │  │
│  │   Manager       │←→│   Parser        │→→│   Packet List   │  │
│  └────────┬────────┘  └─────────────────┘  └─────────────────┘  │
└───────────┼─────────────────────────────────────────────────────┘
            │ WebSocket / SSE
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Function / API Route                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   Connection    │  │   Packet        │  │   Rate          │  │
│  │   Handler       │→→│   Processor     │→→│   Controller    │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└───────────┬─────────────────────────────────────────────────────┘
            │ gRPC / TCP
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Capture Agent (Remote)                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │   libpcap       │→→│   Packet        │→→│   Stream        │  │
│  │   Interface     │  │   Encoder       │  │   Sender        │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Capture Agent (Remote System)

A lightweight agent installed on the target system that performs packet capture.

**Technologies:**
- libpcap/npcap for packet capture
- Go or Rust for performance
- Protocol Buffers for efficient serialization

**Key Features:**
- BPF filter support
- Configurable capture interfaces
- Authentication with API key
- Reconnection logic
- Bandwidth throttling

**Example Agent Configuration:**
```yaml
agent:
  interface: eth0
  filter: "tcp port 80 or tcp port 443"
  snaplen: 65535
  buffer_size: 10MB
  
server:
  url: wss://aishark.example.com/api/stream
  api_key: ${AISHARK_API_KEY}
  reconnect_interval: 5s
  max_retries: 10
  
performance:
  max_packets_per_second: 10000
  batch_size: 100
  compression: gzip
```

### 2. Edge Function / API Route

Server-side handler for managing WebSocket connections and packet processing.

**Implementation with Next.js:**
```typescript
// app/api/stream/route.ts
import { WebSocket } from 'ws';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session');
  
  // Upgrade to WebSocket
  const { socket, response } = Deno.upgradeWebSocket(request);
  
  socket.onopen = () => {
    console.log('Client connected to stream');
    // Register client for packet forwarding
  };
  
  socket.onmessage = (event) => {
    // Handle incoming packets from capture agent
    const packets = decodePackets(event.data);
    broadcastToClients(sessionId, packets);
  };
  
  socket.onclose = () => {
    // Cleanup
  };
  
  return response;
}
```

### 3. Client-Side Streaming Manager

React hook for managing real-time packet streams.

```typescript
// lib/use-packet-stream.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { Packet } from '@/types/packet';

interface UsePacketStreamOptions {
  url: string;
  onPacket?: (packet: Packet) => void;
  maxBufferSize?: number;
  autoReconnect?: boolean;
}

export function usePacketStream(options: UsePacketStreamOptions) {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const bufferRef = useRef<Packet[]>([]);
  const maxBuffer = options.maxBufferSize || 100000;

  const connect = useCallback(() => {
    const ws = new WebSocket(options.url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      const newPackets = JSON.parse(event.data) as Packet[];
      
      bufferRef.current = [
        ...bufferRef.current.slice(-maxBuffer + newPackets.length),
        ...newPackets,
      ];
      
      setPackets([...bufferRef.current]);
      newPackets.forEach(p => options.onPacket?.(p));
    };

    ws.onclose = () => {
      setIsConnected(false);
      if (options.autoReconnect) {
        setTimeout(connect, 5000);
      }
    };

    ws.onerror = (e) => {
      setError(new Error('WebSocket error'));
    };
  }, [options]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
  }, []);

  const clearBuffer = useCallback(() => {
    bufferRef.current = [];
    setPackets([]);
  }, []);

  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return {
    packets,
    isConnected,
    error,
    connect,
    disconnect,
    clearBuffer,
    packetCount: bufferRef.current.length,
  };
}
```

### 4. Streaming Parser

Efficiently parse packets as they arrive.

```typescript
// lib/streaming-parser.ts
export class StreamingPacketParser {
  private decoder: TextDecoder;
  private buffer: Uint8Array;
  private packetId: number = 0;

  constructor() {
    this.decoder = new TextDecoder();
    this.buffer = new Uint8Array(0);
  }

  parse(data: ArrayBuffer): Packet[] {
    const packets: Packet[] = [];
    const view = new DataView(data);
    let offset = 0;

    while (offset < data.byteLength) {
      // Read packet header
      const timestamp = view.getFloat64(offset, true);
      offset += 8;
      const length = view.getUint32(offset, true);
      offset += 4;

      // Read packet data
      const packetData = new Uint8Array(data, offset, length);
      offset += length;

      // Parse packet
      const packet = this.parsePacket(this.packetId++, timestamp, packetData);
      if (packet) {
        packets.push(packet);
      }
    }

    return packets;
  }

  private parsePacket(id: number, timestamp: number, data: Uint8Array): Packet | null {
    // Implementation similar to pcap-parser.ts
    // ...
  }
}
```

## Data Flow

### Packet Capture Flow
1. Agent captures raw packets using libpcap
2. Packets are batched and compressed (gzip/lz4)
3. Batch is sent to Edge Function via WebSocket
4. Edge Function decodes and broadcasts to connected clients
5. Client receives and adds to virtual list

### Client Subscription Flow
1. User initiates "Live Capture" from UI
2. Client opens WebSocket connection to `/api/stream`
3. Authentication via token in connection handshake
4. Server registers client for session updates
5. Packets flow from agent → server → client in real-time

## Performance Considerations

### Client-Side Optimizations
- **Virtual Scrolling**: Only render visible packets (already implemented)
- **Web Workers**: Parse packets in background thread
- **Debounced Updates**: Batch DOM updates (requestAnimationFrame)
- **Memory Management**: Circular buffer with configurable max size
- **Binary Protocol**: Use ArrayBuffer instead of JSON for efficiency

### Server-Side Optimizations
- **Connection Pooling**: Reuse WebSocket connections
- **Backpressure**: Slow down capture if client can't keep up
- **Sampling**: Option to capture every Nth packet under high load
- **Compression**: gzip/lz4 for packet batches

### Network Optimizations
- **Binary Protocol**: Protocol Buffers or MessagePack
- **Batch Size**: 100-500 packets per message
- **Heartbeat**: Keep connections alive with ping/pong

## Security Considerations

1. **Authentication**: JWT tokens for session authentication
2. **Authorization**: Only authorized users can start captures
3. **Encryption**: WSS (WebSocket Secure) for all connections
4. **Rate Limiting**: Prevent abuse of capture resources
5. **Data Isolation**: Captures isolated per user/session
6. **Agent Security**: Signed binaries, secure key storage

## Implementation Phases

### Phase 1: Local File Streaming (Current)
- ✅ Upload PCAP file
- ✅ Parse and display packets
- ✅ Virtual scrolling for large files

### Phase 2: Server-Side Streaming
- SSE/WebSocket API for packet streaming
- Chunked file upload with progress
- Background parsing with progress updates

### Phase 3: Live Capture Agent
- Capture agent binary for major platforms
- Agent ↔ Server communication protocol
- Real-time packet forwarding

### Phase 4: Advanced Features
- Multi-source capture aggregation
- Capture filters (BPF expressions)
- Capture start/stop controls
- Save live capture to file

## API Endpoints

### Stream Management
```
POST   /api/stream/start     # Start a new capture session
DELETE /api/stream/:id       # Stop a capture session
GET    /api/stream/:id/ws    # WebSocket connection for packets
GET    /api/stream/:id/stats # Get capture statistics
```

### Agent Management
```
POST   /api/agents           # Register a new capture agent
GET    /api/agents           # List registered agents
DELETE /api/agents/:id       # Unregister an agent
POST   /api/agents/:id/start # Start capture on agent
POST   /api/agents/:id/stop  # Stop capture on agent
```

## Example UI Integration

```tsx
// components/LiveCapture.tsx
'use client';

import { useState } from 'react';
import { usePacketStream } from '@/lib/use-packet-stream';
import PacketList from './PacketList';
import TimelineVisualization from './TimelineVisualization';

export default function LiveCapture() {
  const { 
    packets, 
    isConnected, 
    connect, 
    disconnect,
    packetCount 
  } = usePacketStream({
    url: 'wss://aishark.example.com/api/stream',
    maxBufferSize: 50000,
    autoReconnect: true,
  });

  return (
    <div>
      <div className="flex gap-4 mb-4">
        {!isConnected ? (
          <button onClick={connect}>Start Live Capture</button>
        ) : (
          <button onClick={disconnect}>Stop Capture</button>
        )}
        <span>{packetCount} packets captured</span>
      </div>
      
      <TimelineVisualization packets={packets} />
      <PacketList packets={packets} onPacketSelect={...} />
    </div>
  );
}
```

## Future Enhancements

1. **Distributed Capture**: Multiple agents feeding single session
2. **Capture Profiles**: Predefined filter/settings templates
3. **Alert Rules**: Real-time detection and notification
4. **Export During Capture**: Save to PCAP while capturing
5. **Bandwidth Visualization**: Live traffic graph
6. **Protocol Breakdown**: Real-time protocol distribution pie chart

---

*This document is a technical specification for future implementation. The architecture described here requires additional infrastructure (capture agents, WebSocket servers) beyond the current web application.*
