/**
 * RAG Retriever
 * Retrieves relevant packet data using semantic search
 * Core component for RAG-enhanced AI responses
 */

import { supabase } from '@/lib/supabase-client';
import { Packet } from '@/types/packet';
import { generateEmbedding } from './embeddings';
import { getIndexingStatus } from './packet-indexer';

// Configuration
const DEFAULT_MATCH_COUNT = 20;       // Number of relevant groups to retrieve
const DEFAULT_THRESHOLD = 0.65;       // Minimum similarity threshold
const MAX_PACKETS_TO_RETURN = 100;    // Maximum packets in context

export interface RelevantPacketGroup {
  packetGroupStart: number;
  packetGroupEnd: number;
  protocols: string[];
  sourceIp: string | null;
  destinationIp: string | null;
  contentSummary: string;
  similarity: number;
}

export interface RAGResult {
  success: boolean;
  isIndexed: boolean;
  relevantGroups: RelevantPacketGroup[];
  relevantPackets: Packet[];
  packetNumbers: number[];
  query: string;
  matchCount: number;
  error?: string;
}

export interface RAGOptions {
  matchCount?: number;
  threshold?: number;
  protocolFilter?: string;
}

/**
 * Retrieve relevant packets for a query using semantic search
 */
export async function retrieveRelevantPackets(
  sessionId: string,
  query: string,
  allPackets: Packet[],
  options: RAGOptions = {}
): Promise<RAGResult> {
  const {
    matchCount = DEFAULT_MATCH_COUNT,
    threshold = DEFAULT_THRESHOLD,
    protocolFilter,
  } = options;

  // Check if session is indexed
  const indexStatus = await getIndexingStatus(sessionId);
  
  if (!indexStatus || indexStatus.status !== 'complete') {
    return {
      success: false,
      isIndexed: false,
      relevantGroups: [],
      relevantPackets: [],
      packetNumbers: [],
      query,
      matchCount: 0,
      error: indexStatus?.status === 'failed' 
        ? 'Indexing failed: ' + indexStatus.error
        : 'Session not indexed for RAG search',
    };
  }

  if (!supabase) {
    return {
      success: false,
      isIndexed: true,
      relevantGroups: [],
      relevantPackets: [],
      packetNumbers: [],
      query,
      matchCount: 0,
      error: 'Database not available',
    };
  }

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Search for similar packet groups
    let searchResult;
    
    if (protocolFilter) {
      // Use protocol-filtered search
      searchResult = await supabase.rpc('match_packets_by_protocol', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_session_id: sessionId,
        protocol_filter: protocolFilter.toUpperCase(),
        match_threshold: threshold,
        match_count: matchCount,
      });
    } else {
      // Use general search
      searchResult = await supabase.rpc('match_packets', {
        query_embedding: `[${queryEmbedding.join(',')}]`,
        match_session_id: sessionId,
        match_threshold: threshold,
        match_count: matchCount,
      });
    }

    if (searchResult.error) {
      console.error('RAG search error:', searchResult.error);
      return {
        success: false,
        isIndexed: true,
        relevantGroups: [],
        relevantPackets: [],
        packetNumbers: [],
        query,
        matchCount: 0,
        error: searchResult.error.message,
      };
    }

    const matches = searchResult.data || [];
    
    // Convert to RelevantPacketGroup format
    const relevantGroups: RelevantPacketGroup[] = matches.map((m: {
      packet_group_start: number;
      packet_group_end: number;
      protocols: string[];
      source_ip: string | null;
      destination_ip: string | null;
      content_summary: string;
      similarity: number;
    }) => ({
      packetGroupStart: m.packet_group_start,
      packetGroupEnd: m.packet_group_end,
      protocols: m.protocols,
      sourceIp: m.source_ip,
      destinationIp: m.destination_ip,
      contentSummary: m.content_summary,
      similarity: m.similarity,
    }));

    // Collect all packet numbers from relevant groups
    const packetNumbers = new Set<number>();
    for (const group of relevantGroups) {
      for (let i = group.packetGroupStart; i <= group.packetGroupEnd; i++) {
        packetNumbers.add(i);
        if (packetNumbers.size >= MAX_PACKETS_TO_RETURN) break;
      }
      if (packetNumbers.size >= MAX_PACKETS_TO_RETURN) break;
    }

    // Get actual packets from the provided array
    const packetNumberArray = Array.from(packetNumbers).sort((a, b) => a - b);
    const relevantPackets = packetNumberArray
      .map(num => allPackets.find(p => p.id === num))
      .filter((p): p is Packet => p !== undefined);

    return {
      success: true,
      isIndexed: true,
      relevantGroups,
      relevantPackets,
      packetNumbers: packetNumberArray,
      query,
      matchCount: relevantGroups.length,
    };

  } catch (error) {
    console.error('RAG retrieval error:', error);
    return {
      success: false,
      isIndexed: true,
      relevantGroups: [],
      relevantPackets: [],
      packetNumbers: [],
      query,
      matchCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Extract protocol from query for filtered search
 * Returns protocol name if query mentions a specific protocol
 */
export function extractProtocolFromQuery(query: string): string | null {
  const protocolPatterns: Record<string, RegExp> = {
    'HTTP': /\b(http|web|request|response|get|post|put|delete|api)\b/i,
    'HTTPS': /\b(https|ssl|tls|secure|certificate)\b/i,
    'DNS': /\b(dns|domain|resolve|lookup|nameserver|nslookup)\b/i,
    'TCP': /\b(tcp|connection|handshake|syn|ack|fin|rst|retransmission)\b/i,
    'UDP': /\b(udp|datagram)\b/i,
    'ICMP': /\b(icmp|ping|traceroute|echo)\b/i,
    'ARP': /\b(arp|mac address|gateway)\b/i,
    'SSH': /\b(ssh|secure shell)\b/i,
    'FTP': /\b(ftp|file transfer)\b/i,
    'SMTP': /\b(smtp|email|mail server)\b/i,
    'DHCP': /\b(dhcp|ip assignment|lease)\b/i,
  };

  for (const [protocol, pattern] of Object.entries(protocolPatterns)) {
    if (pattern.test(query)) {
      return protocol;
    }
  }

  return null;
}

/**
 * Enhance query with context hints for better embedding matching
 */
export function enhanceQueryForEmbedding(query: string): string {
  const enhancements: string[] = [query];
  
  // Add network analysis context
  const lowerQuery = query.toLowerCase();
  
  if (lowerQuery.includes('slow') || lowerQuery.includes('latency') || lowerQuery.includes('delay')) {
    enhancements.push('high latency retransmission timeout slow response');
  }
  
  if (lowerQuery.includes('error') || lowerQuery.includes('fail') || lowerQuery.includes('problem')) {
    enhancements.push('error anomaly failure reset connection refused timeout');
  }
  
  if (lowerQuery.includes('security') || lowerQuery.includes('attack') || lowerQuery.includes('malicious')) {
    enhancements.push('security threat attack exploit vulnerability suspicious malicious');
  }
  
  if (lowerQuery.includes('connection') || lowerQuery.includes('handshake')) {
    enhancements.push('TCP SYN ACK handshake connection establish close reset');
  }
  
  return enhancements.join(' ');
}

/**
 * Check if RAG is available for a session
 */
export async function isRAGAvailable(sessionId: string): Promise<{
  available: boolean;
  status: string;
  coverage: number;
}> {
  const indexStatus = await getIndexingStatus(sessionId);
  
  if (!indexStatus) {
    return { available: false, status: 'not_indexed', coverage: 0 };
  }
  
  return {
    available: indexStatus.status === 'complete',
    status: indexStatus.status,
    coverage: indexStatus.percentage,
  };
}

/**
 * Build context from RAG results for AI prompt
 */
export function buildRAGContext(ragResult: RAGResult): string {
  if (!ragResult.success || ragResult.relevantPackets.length === 0) {
    return '';
  }

  const contextParts: string[] = [];
  
  contextParts.push(`=== RELEVANT PACKETS (${ragResult.matchCount} matching groups found) ===`);
  contextParts.push(`Query: "${ragResult.query}"`);
  contextParts.push('');
  
  // Add top matching summaries
  const topGroups = ragResult.relevantGroups.slice(0, 10);
  for (const group of topGroups) {
    const similarity = (group.similarity * 100).toFixed(1);
    contextParts.push(`[${similarity}% match] Packets ${group.packetGroupStart + 1}-${group.packetGroupEnd + 1}:`);
    contextParts.push(`  Protocols: ${group.protocols.join(', ')}`);
    contextParts.push(`  ${group.sourceIp} → ${group.destinationIp}`);
    contextParts.push(`  Summary: ${group.contentSummary}`);
    contextParts.push('');
  }

  // Add detailed packet info for highest matches
  contextParts.push('=== DETAILED PACKET DATA ===');
  const detailPackets = ragResult.relevantPackets.slice(0, 20);
  
  for (const packet of detailPackets) {
    contextParts.push(`Packet #${packet.id + 1}: ${packet.protocol}`);
    contextParts.push(`  ${packet.source} → ${packet.destination}`);
    contextParts.push(`  Size: ${packet.length} bytes`);
    contextParts.push(`  Info: ${packet.info}`);
    if (packet.flags?.hasError) {
      contextParts.push(`  ⚠️ ERROR/ANOMALY DETECTED`);
    }
    contextParts.push('');
  }

  return contextParts.join('\n');
}
