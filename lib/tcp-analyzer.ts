import { Packet, TCPStream, PacketFlags } from '@/types/packet';

export function analyzeTCP(packets: Packet[]): Map<string, TCPStream> {
  const streams = new Map<string, TCPStream>();

  for (const packet of packets) {
    if (!packet.layers.tcp || !packet.layers.ip) continue;

    const tcp = packet.layers.tcp;
    const ip = packet.layers.ip;
    
    const streamKey = `${ip.source}:${tcp.sourcePort}-${ip.destination}:${tcp.destinationPort}`;
    const reverseKey = `${ip.destination}:${tcp.destinationPort}-${ip.source}:${tcp.sourcePort}`;

    let stream = streams.get(streamKey) || streams.get(reverseKey);

    if (!stream) {
      stream = {
        id: streamKey,
        source: ip.source,
        destination: ip.destination,
        sourcePort: tcp.sourcePort,
        destinationPort: tcp.destinationPort,
        packets: [],
        data: {
          client: [],
          server: [],
        },
      };
      streams.set(streamKey, stream);
    }

    stream.packets.push(packet);

    // Collect payload data
    if (tcp.payload && tcp.payload.length > 0) {
      const isClientToServer = 
        ip.source === stream.source && tcp.sourcePort === stream.sourcePort;
      
      if (isClientToServer) {
        stream.data.client.push(tcp.payload);
      } else {
        stream.data.server.push(tcp.payload);
      }
    }
  }

  return streams;
}

export function detectRetransmissions(packets: Packet[]): number[] {
  const retransmittedPacketIds: number[] = [];
  const seenSequences = new Map<string, Set<number>>();

  for (const packet of packets) {
    if (!packet.layers.tcp || !packet.layers.ip) continue;

    const tcp = packet.layers.tcp;
    const ip = packet.layers.ip;
    const key = `${ip.source}:${tcp.sourcePort}-${ip.destination}:${tcp.destinationPort}`;

    if (!seenSequences.has(key)) {
      seenSequences.set(key, new Set());
    }

    const sequences = seenSequences.get(key)!;
    
    if (sequences.has(tcp.sequenceNumber) && tcp.payload && tcp.payload.length > 0) {
      retransmittedPacketIds.push(packet.id);
      if (!packet.flags) {
        packet.flags = { hasError: true, isRetransmission: false, isDuplicateAck: false, hasWarning: false };
      }
      packet.flags.isRetransmission = true;
      packet.flags.hasError = true;
    } else {
      sequences.add(tcp.sequenceNumber);
    }
  }

  return retransmittedPacketIds;
}

export function detectDuplicateAcks(packets: Packet[]): number[] {
  const duplicateAckIds: number[] = [];
  const ackCounts = new Map<string, Map<number, number>>();

  for (const packet of packets) {
    if (!packet.layers.tcp || !packet.layers.ip || !packet.layers.tcp.flags.ack) continue;

    const tcp = packet.layers.tcp;
    const ip = packet.layers.ip;
    const key = `${ip.source}:${tcp.sourcePort}-${ip.destination}:${tcp.destinationPort}`;

    if (!ackCounts.has(key)) {
      ackCounts.set(key, new Map());
    }

    const acks = ackCounts.get(key)!;
    const currentCount = acks.get(tcp.acknowledgmentNumber) || 0;
    acks.set(tcp.acknowledgmentNumber, currentCount + 1);

    if (currentCount >= 2) { // Third or more duplicate
      duplicateAckIds.push(packet.id);
      if (!packet.flags) {
        packet.flags = { hasError: true, isRetransmission: false, isDuplicateAck: false, hasWarning: false };
      }
      packet.flags.isDuplicateAck = true;
      packet.flags.hasError = true;
    }
  }

  return duplicateAckIds;
}

export function analyzeHandshakes(packets: Packet[]): { successful: number; failed: number } {
  let successful = 0;
  let failed = 0;
  const connections = new Map<string, { syn: boolean; synAck: boolean; ack: boolean }>();

  for (const packet of packets) {
    if (!packet.layers.tcp || !packet.layers.ip) continue;

    const tcp = packet.layers.tcp;
    const ip = packet.layers.ip;
    const key = `${ip.source}:${tcp.sourcePort}-${ip.destination}:${tcp.destinationPort}`;

    if (!connections.has(key)) {
      connections.set(key, { syn: false, synAck: false, ack: false });
    }

    const conn = connections.get(key)!;

    if (tcp.flags.syn && !tcp.flags.ack) {
      conn.syn = true;
    } else if (tcp.flags.syn && tcp.flags.ack) {
      conn.synAck = true;
    } else if (tcp.flags.ack && !tcp.flags.syn && conn.synAck) {
      conn.ack = true;
      if (conn.syn && conn.synAck) {
        successful++;
      }
    } else if (tcp.flags.rst) {
      failed++;
    }
  }

  return { successful, failed };
}

export function calculateLatency(request: Packet, response: Packet): number {
  return response.timestamp - request.timestamp;
}

export function reconstructTCPStream(stream: TCPStream): { client: string; server: string } {
  const decoder = new TextDecoder('utf-8', { fatal: false });
  
  const clientData = new Uint8Array(
    stream.data.client.reduce((acc, arr) => acc + arr.length, 0)
  );
  let clientOffset = 0;
  for (const chunk of stream.data.client) {
    clientData.set(chunk, clientOffset);
    clientOffset += chunk.length;
  }

  const serverData = new Uint8Array(
    stream.data.server.reduce((acc, arr) => acc + arr.length, 0)
  );
  let serverOffset = 0;
  for (const chunk of stream.data.server) {
    serverData.set(chunk, serverOffset);
    serverOffset += chunk.length;
  }

  return {
    client: decoder.decode(clientData),
    server: decoder.decode(serverData),
  };
}
