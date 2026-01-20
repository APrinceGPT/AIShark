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

export interface ContextMetrics {
  estimatedTokens: number;
  packetCount: number;
  samplingRate: number;
  compressionRatio: number;
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

/**
 * Estimate token count for context
 * Uses rough approximation: 1 token ≈ 4 characters
 */
export function estimateTokenCount(context: Partial<AIContext>): number {
  const jsonString = JSON.stringify(context);
  return Math.ceil(jsonString.length / 4);
}

/**
 * Adaptive sampling based on capture size and token budget
 */
export function adaptiveSample(
  packets: Packet[],
  maxTokens: number = 4000
): { samples: PacketSample[]; errors: PacketSample[]; metrics: ContextMetrics } {
  const totalPackets = packets.length;
  
  // Start with initial sampling limits
  let sampleLimit = 20;
  let errorLimit = 10;
  
  // Adjust based on packet count
  if (totalPackets > 10000) {
    sampleLimit = 10; // Large captures: less sampling
    errorLimit = 5;
  } else if (totalPackets > 5000) {
    sampleLimit = 15;
    errorLimit = 7;
  } else if (totalPackets < 1000) {
    sampleLimit = Math.min(30, totalPackets); // Small captures: more detail
    errorLimit = 15;
  }
  
  let samples = sampleRepresentativePackets(packets, sampleLimit);
  let errors = extractErrorPackets(packets, errorLimit);
  
  // Check estimated tokens
  let estimatedTokens = estimateTokenCount({ samplePackets: samples, errorPackets: errors });
  
  // If over budget, reduce sampling
  while (estimatedTokens > maxTokens && sampleLimit > 5) {
    sampleLimit = Math.floor(sampleLimit * 0.7);
    errorLimit = Math.floor(errorLimit * 0.7);
    
    samples = sampleRepresentativePackets(packets, sampleLimit);
    errors = extractErrorPackets(packets, errorLimit);
    estimatedTokens = estimateTokenCount({ samplePackets: samples, errorPackets: errors });
  }
  
  const samplingRate = (samples.length + errors.length) / totalPackets;
  const compressionRatio = totalPackets / (samples.length + errors.length);
  
  return {
    samples,
    errors,
    metrics: {
      estimatedTokens,
      packetCount: totalPackets,
      samplingRate,
      compressionRatio,
    },
  };
}

/**
 * Prepare optimized context with token budget control
 */
export function prepareOptimizedContext(
  packets: Packet[],
  statistics: PacketStatistics | null,
  analysis: AnalysisResult | null,
  maxTokens: number = 4000
): { context: AIContext; metrics: ContextMetrics } {
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
  
  // Use adaptive sampling
  const { samples, errors, metrics } = adaptiveSample(packets, maxTokens);

  const context: AIContext = {
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
    samplePackets: samples,
    errorPackets: errors,
  };
  
  return { context, metrics };
}

/**
 * Validate context size and warn if over limits
 */
export function validateContextSize(context: Partial<AIContext>): { 
  valid: boolean; 
  tokens: number; 
  warning?: string 
} {
  const tokens = estimateTokenCount(context);
  const maxRecommended = 6000; // Leave room for response
  const maxAbsolute = 8000; // Hard limit
  
  if (tokens > maxAbsolute) {
    return {
      valid: false,
      tokens,
      warning: `Context too large (${tokens} tokens). Reduce packet samples.`,
    };
  }
  
  if (tokens > maxRecommended) {
    return {
      valid: true,
      tokens,
      warning: `Context large (${tokens} tokens). Consider reducing for faster responses.`,
    };
  }
  
  return { valid: true, tokens };
}
