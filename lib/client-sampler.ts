import { Packet } from '@/types/packet';

/**
 * Client-side packet sampler to reduce payload size before sending to API
 * Uses intelligent sampling to maintain analysis accuracy
 */

export interface SampledPacket {
  id: number;
  timestamp: number;
  protocol: string;
  source: string;
  destination: string;
  length: number;
  info: string;
  hasError?: boolean;
}

/**
 * Intelligently sample packets for AI analysis
 * Includes: distributed samples, error packets, diverse protocols
 */
export function intelligentSample(packets: Packet[], maxSamples: number = 100): SampledPacket[] {
  if (packets.length === 0) return [];
  if (packets.length <= maxSamples) {
    return packets.map(convertToSample);
  }

  const samples: Packet[] = [];

  // 1. Sample evenly across entire capture (not just beginning)
  const step = Math.floor(packets.length / (maxSamples * 0.6)); // 60% for even distribution
  for (let i = 0; i < packets.length && samples.length < maxSamples * 0.6; i += step) {
    samples.push(packets[i]);
  }

  // 2. Include error packets (high priority)
  const errorPackets = packets.filter(p => p.flags?.hasError || p.info.toLowerCase().includes('error'));
  const errorSamples = errorPackets.slice(0, Math.floor(maxSamples * 0.2)); // 20% for errors
  samples.push(...errorSamples);

  // 3. Include diverse protocols (ensure protocol coverage)
  const protocolMap = new Map<string, Packet[]>();
  packets.forEach(p => {
    if (!protocolMap.has(p.protocol)) {
      protocolMap.set(p.protocol, []);
    }
    protocolMap.get(p.protocol)!.push(p);
  });

  // Add at least one packet per protocol
  const protocolSamples: Packet[] = [];
  protocolMap.forEach((pkts, protocol) => {
    if (protocolSamples.length < maxSamples * 0.2) { // 20% for protocol diversity
      const mid = Math.floor(pkts.length / 2);
      protocolSamples.push(pkts[mid] || pkts[0]);
    }
  });
  samples.push(...protocolSamples);

  // Remove duplicates based on packet ID
  const uniqueSamples = Array.from(
    new Map(samples.map(p => [p.id, p])).values()
  );

  // Limit to maxSamples and sort by timestamp
  return uniqueSamples
    .slice(0, maxSamples)
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(convertToSample);
}

/**
 * Sample packets relevant to a specific query
 * Searches for keywords and includes related packets
 */
export function querySample(packets: Packet[], query: string, maxSamples: number = 150): SampledPacket[] {
  const queryLower = query.toLowerCase();
  const keywords = extractKeywords(queryLower);

  // Find packets matching query keywords
  const relevantPackets = packets.filter(p => {
    const searchText = `${p.source} ${p.destination} ${p.info} ${p.protocol}`.toLowerCase();
    return keywords.some(keyword => searchText.includes(keyword));
  });

  if (relevantPackets.length > 0) {
    // If we found relevant packets, prioritize them
    const samples: Packet[] = [];
    
    // 70% relevant packets
    const relevantSampleSize = Math.min(relevantPackets.length, Math.floor(maxSamples * 0.7));
    samples.push(...relevantPackets.slice(0, relevantSampleSize));

    // 30% context packets (distributed sample from all packets)
    const contextSize = maxSamples - samples.length;
    const step = Math.floor(packets.length / contextSize);
    for (let i = 0; i < packets.length && samples.length < maxSamples; i += step) {
      if (!samples.find(s => s.id === packets[i].id)) {
        samples.push(packets[i]);
      }
    }

    return samples
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(convertToSample);
  }

  // No specific matches, use intelligent sampling
  return intelligentSample(packets, maxSamples);
}

/**
 * Extract meaningful keywords from query for packet matching
 */
function extractKeywords(query: string): string[] {
  // Remove common words and extract important terms
  const commonWords = ['is', 'are', 'the', 'any', 'what', 'why', 'how', 'there', 'this', 'that', 'can', 'you'];
  const words = query.split(/\s+/).filter(w => w.length > 2 && !commonWords.includes(w));
  
  // Add protocol keywords
  const protocolMap: Record<string, string[]> = {
    'facebook': ['facebook', 'fb', 'graph.facebook'],
    'google': ['google', 'googleapis', 'gstatic'],
    'twitter': ['twitter', 'twimg'],
    'youtube': ['youtube', 'ytimg', 'googlevideo'],
    'slow': ['retransmission', 'dup ack', 'timeout'],
    'error': ['error', 'rst', 'refused', 'failed'],
    'dns': ['dns', 'query', 'response'],
    'http': ['http', 'get', 'post'],
    'tls': ['tls', 'ssl', 'handshake'],
  };

  const expandedKeywords = new Set(words);
  words.forEach(word => {
    if (protocolMap[word]) {
      protocolMap[word].forEach(kw => expandedKeywords.add(kw));
    }
  });

  return Array.from(expandedKeywords);
}

/**
 * Convert full packet to lightweight sample
 */
function convertToSample(packet: Packet): SampledPacket {
  return {
    id: packet.id,
    timestamp: packet.timestamp,
    protocol: packet.protocol,
    source: packet.source,
    destination: packet.destination,
    length: packet.length,
    info: packet.info,
    hasError: packet.flags?.hasError,
  };
}
