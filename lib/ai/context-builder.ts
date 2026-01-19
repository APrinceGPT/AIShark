import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

/**
 * Context Builder for AI Analysis
 * Prepares structured data from packets for AI consumption
 * Limits data size to optimize API costs
 */

export interface AIContext {
  summary: {
    totalPackets: number;
    duration: number;
    protocols: Record<string, number>;
    topEndpoints: string[];
    bandwidth: {
      total: number;
      perSecond: number;
    };
  };
  issues: {
    retransmissions: number;
    totalErrors: number;
    failedHandshakes: number;
    latencyIssues: number;
  };
  samplePackets: PacketSample[];
  errorPackets: PacketSample[];
}

export interface PacketSample {
  number: number;
  timestamp: number;
  protocol: string;
  source: string;
  destination: string;
  length: number;
  info: string;
  hasError?: boolean;
}

/**
 * Prepare analysis context from packets and statistics
 */
export function prepareAnalysisContext(
  packets: Packet[],
  statistics: PacketStatistics | null,
  analysis: AnalysisResult | null
): AIContext {
  const duration = packets.length > 0 
    ? (packets[packets.length - 1].timestamp - packets[0].timestamp) / 1000 
    : 0;

  const protocols = statistics?.protocolDistribution || {};
  const topEndpoints = extractTopEndpoints(packets, 5);
  
  const issues = {
    retransmissions: analysis?.errors.filter(e => 
      e.description.toLowerCase().includes('retransmission')
    ).length || 0,
    totalErrors: (statistics?.errors.retransmissions || 0) + 
                 (statistics?.errors.duplicateAcks || 0) + 
                 (statistics?.errors.resets || 0),
    failedHandshakes: analysis?.insights.filter(i => 
      i.toLowerCase().includes('handshake')
    ).length || 0,
    latencyIssues: analysis?.latencyIssues.length || 0,
  };

  return {
    summary: {
      totalPackets: packets.length,
      duration,
      protocols,
      topEndpoints,
      bandwidth: {
        total: statistics?.bandwidth.total || 0,
        perSecond: statistics?.bandwidth.perSecond || 0,
      },
    },
    issues,
    samplePackets: sampleRepresentativePackets(packets, 20),
    errorPackets: extractErrorPackets(packets, 10),
  };
}

/**
 * Extract top communication endpoints
 */
function extractTopEndpoints(packets: Packet[], limit: number): string[] {
  const endpointCounts = new Map<string, number>();
  
  packets.forEach(packet => {
    if (packet.source && packet.destination) {
      const key = `${packet.source} ↔ ${packet.destination}`;
      endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
    }
  });

  return Array.from(endpointCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([endpoint]) => endpoint);
}

/**
 * Sample representative packets (avoid sending all packets to AI)
 */
function sampleRepresentativePackets(packets: Packet[], limit: number): PacketSample[] {
  if (packets.length <= limit) {
    return packets.map(convertToSample);
  }

  const samples: Packet[] = [];
  const step = Math.floor(packets.length / limit);

  for (let i = 0; i < packets.length; i += step) {
    if (samples.length >= limit) break;
    samples.push(packets[i]);
  }

  return samples.map(convertToSample);
}

/**
 * Extract error packets for focused analysis
 */
function extractErrorPackets(packets: Packet[], limit: number): PacketSample[] {
  const errorPackets = packets.filter(p => p.flags?.hasError);
  return errorPackets.slice(0, limit).map(convertToSample);
}

/**
 * Convert full packet to lightweight sample
 */
function convertToSample(packet: Packet): PacketSample {
  const ip = packet.layers.ip;
  const tcp = packet.layers.tcp;
  const udp = packet.layers.udp;
  
  return {
    number: packet.id,
    timestamp: packet.timestamp,
    protocol: packet.protocol,
    source: `${ip?.source || 'unknown'}:${tcp?.sourcePort || udp?.sourcePort || ''}`,
    destination: `${ip?.destination || 'unknown'}:${tcp?.destinationPort || udp?.destinationPort || ''}`,
    length: packet.length,
    info: packet.info,
    hasError: packet.flags?.hasError,
  };
}

/**
 * Optimize context for specific query type
 */
export function optimizeContextForQuery(
  context: AIContext,
  queryType: 'summary' | 'anomaly' | 'troubleshoot' | 'query'
): Partial<AIContext> {
  switch (queryType) {
    case 'summary':
      return {
        summary: context.summary,
        issues: context.issues,
      };
    
    case 'anomaly':
      return {
        summary: context.summary,
        issues: context.issues,
        errorPackets: context.errorPackets,
      };
    
    case 'troubleshoot':
      return context; // Full context needed
    
    case 'query':
      return {
        summary: context.summary,
        samplePackets: context.samplePackets.slice(0, 10), // Limit samples
      };
    
    default:
      return context;
  }
}
