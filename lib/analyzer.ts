import { Packet, PacketStatistics, AnalysisResult, LatencyIssue, PacketError } from '@/types/packet';
import { detectRetransmissions, detectDuplicateAcks, analyzeHandshakes, calculateLatency } from './tcp-analyzer';
import { analyzeHTTP } from './http-analyzer';
import { analyzeDNS } from './dns-analyzer';
import { analyzeTLS } from './tls-analyzer';

export function enhancePackets(packets: Packet[]): Packet[] {
  return packets.map(packet => {
    // Analyze protocols
    if (packet.layers.tcp) {
      const tcp = packet.layers.tcp;
      
      // Check for HTTP
      if ((tcp.sourcePort === 80 || tcp.destinationPort === 80 ||
           tcp.sourcePort === 8080 || tcp.destinationPort === 8080) && tcp.payload) {
        const http = analyzeHTTP(packet);
        if (http) {
          packet.layers.http = http;
          packet.protocol = 'HTTP';
        }
      }
      
      // Check for HTTPS/TLS
      if ((tcp.sourcePort === 443 || tcp.destinationPort === 443) && tcp.payload) {
        const tls = analyzeTLS(packet);
        if (tls) {
          packet.layers.tls = tls;
          packet.protocol = 'TLS';
        }
      }
    }
    
    // Check for DNS
    if (packet.layers.udp) {
      const dns = analyzeDNS(packet);
      if (dns) {
        packet.layers.dns = dns;
        packet.protocol = 'DNS';
        packet.info = dns.isQuery 
          ? `Query: ${dns.queries.map(q => q.name).join(', ')}`
          : `Response: ${dns.answers.map(a => `${a.name} → ${a.data}`).join(', ')}`;
      }
    }
    
    return packet;
  });
}

export function calculateStatistics(packets: Packet[]): PacketStatistics {
  const protocolDistribution: Record<string, number> = {};
  const talkerMap = new Map<string, { packets: number; bytes: number }>();
  
  let totalBytes = 0;
  const timeSpan = packets.length > 0 
    ? (packets[packets.length - 1].timestamp - packets[0].timestamp) / 1000 
    : 1;

  for (const packet of packets) {
    // Protocol distribution
    protocolDistribution[packet.protocol] = (protocolDistribution[packet.protocol] || 0) + 1;
    
    // Top talkers
    if (packet.source && packet.destination) {
      const key = `${packet.source} ↔ ${packet.destination}`;
      const talker = talkerMap.get(key) || { packets: 0, bytes: 0 };
      talker.packets++;
      talker.bytes += packet.length;
      talkerMap.set(key, talker);
    }
    
    totalBytes += packet.length;
  }

  // Convert talker map to array and sort
  const topTalkers = Array.from(talkerMap.entries())
    .map(([key, data]) => {
      const [source, destination] = key.split(' ↔ ');
      return { source, destination, ...data };
    })
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 10);

  // Detect errors
  const retransmissions = detectRetransmissions(packets);
  const duplicateAcks = detectDuplicateAcks(packets);
  const resets = packets.filter(p => p.layers.tcp?.flags.rst).length;

  return {
    totalPackets: packets.length,
    protocolDistribution,
    topTalkers,
    errors: {
      retransmissions: retransmissions.length,
      duplicateAcks: duplicateAcks.length,
      resets,
    },
    bandwidth: {
      total: totalBytes,
      perSecond: totalBytes / timeSpan,
    },
  };
}

export function performAnalysis(packets: Packet[]): AnalysisResult {
  const latencyIssues: LatencyIssue[] = [];
  const packetLoss: any[] = [];
  const errors: PacketError[] = [];
  const insights: string[] = [];

  // Detect high latency
  const httpPackets = packets.filter(p => p.layers.http);
  for (let i = 0; i < httpPackets.length - 1; i++) {
    const request = httpPackets[i];
    const response = httpPackets[i + 1];
    
    if (request.layers.http?.isRequest && response.layers.http && !response.layers.http.isRequest) {
      const latency = calculateLatency(request, response);
      
      if (latency > 1000) { // > 1 second
        latencyIssues.push({
          timestamp: request.timestamp,
          source: request.source,
          destination: request.destination,
          latency,
          packetId: request.id,
        });
      }
    }
  }

  // Detect TCP errors
  for (const packet of packets) {
    if (packet.flags?.isRetransmission) {
      errors.push({
        packetId: packet.id,
        timestamp: packet.timestamp,
        type: 'reset',
        description: 'TCP retransmission detected',
      });
    }
    
    if (packet.layers.tcp?.flags.rst) {
      errors.push({
        packetId: packet.id,
        timestamp: packet.timestamp,
        type: 'reset',
        description: 'Connection reset',
      });
    }
  }

  // Generate insights
  const stats = calculateStatistics(packets);
  
  if (stats.errors.retransmissions > packets.length * 0.05) {
    insights.push(`High retransmission rate detected (${stats.errors.retransmissions} retransmissions)`);
  }
  
  if (latencyIssues.length > 0) {
    insights.push(`${latencyIssues.length} high-latency requests detected (>1s response time)`);
  }
  
  if (stats.errors.resets > 10) {
    insights.push(`${stats.errors.resets} connection resets detected - possible connectivity issues`);
  }

  const handshakes = analyzeHandshakes(packets);
  if (handshakes.failed > 0) {
    insights.push(`${handshakes.failed} failed TCP handshakes detected`);
  }

  return {
    latencyIssues,
    packetLoss,
    errors,
    insights,
  };
}
