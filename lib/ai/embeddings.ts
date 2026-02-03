/**
 * Embedding Service
 * Generates vector embeddings for packet data using OpenAI's embedding API
 * Used for RAG (Retrieval-Augmented Generation) semantic search
 */

import OpenAI from 'openai';

// Embedding model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// Batch processing limits
const MAX_BATCH_SIZE = 100;  // OpenAI limit is 2048, but we keep it smaller for reliability
const MAX_TOKENS_PER_TEXT = 8000;  // Leave headroom under 8191 limit

let embeddingClient: OpenAI | null = null;

/**
 * Initialize embedding client
 * Uses same credentials as chat completion, but different endpoint behavior
 */
function getEmbeddingClient(): OpenAI {
  if (!embeddingClient) {
    const baseURL = process.env.OPENAI_BASE_URL;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!baseURL || !apiKey) {
      throw new Error('Missing AI configuration for embeddings');
    }

    embeddingClient = new OpenAI({
      baseURL,
      apiKey,
    });
  }

  return embeddingClient;
}

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = getEmbeddingClient();
  
  // Truncate if too long
  const truncatedText = truncateText(text, MAX_TOKENS_PER_TEXT);
  
  try {
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: truncatedText,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Embedding generation failed:', error);
    throw error;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than individual calls
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const client = getEmbeddingClient();
  
  // Process in batches to avoid API limits
  const allEmbeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const truncatedBatch = batch.map(t => truncateText(t, MAX_TOKENS_PER_TEXT));
    
    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: truncatedBatch,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      // Sort by index to maintain order
      const sortedData = response.data.sort((a, b) => a.index - b.index);
      allEmbeddings.push(...sortedData.map(d => d.embedding));
    } catch (error) {
      console.error(`Batch embedding failed at index ${i}:`, error);
      throw error;
    }
  }
  
  return allEmbeddings;
}

/**
 * Truncate text to approximately the specified token count
 * Rough approximation: 1 token ≈ 4 characters
 */
function truncateText(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars) + '...';
}

/**
 * Create a searchable summary from packet data
 * This is what gets embedded - optimized for semantic search
 */
export function createPacketSummary(packet: {
  id: number;
  protocol: string;
  source: string;
  destination: string;
  length: number;
  info: string;
  timestamp: number;
  layers?: {
    tcp?: { flags?: string; sourcePort?: number; destinationPort?: number };
    http?: { method?: string; uri?: string; statusCode?: number; host?: string };
    dns?: { queryName?: string; queryType?: string; answers?: string[] };
    tls?: { version?: string; handshakeType?: string; serverName?: string };
  };
  flags?: { hasError?: boolean };
}): string {
  const parts: string[] = [];
  
  // Basic packet info
  parts.push(`Packet ${packet.id + 1}: ${packet.protocol}`);
  parts.push(`From ${packet.source} to ${packet.destination}`);
  parts.push(`Size: ${packet.length} bytes`);
  
  // Protocol-specific details
  const { layers } = packet;
  
  if (layers?.http) {
    const http = layers.http;
    if (http.method && http.uri) {
      parts.push(`HTTP ${http.method} ${http.uri}`);
    }
    if (http.statusCode) {
      parts.push(`Status: ${http.statusCode}`);
    }
    if (http.host) {
      parts.push(`Host: ${http.host}`);
    }
  }
  
  if (layers?.dns) {
    const dns = layers.dns;
    if (dns.queryName) {
      parts.push(`DNS query: ${dns.queryName} (${dns.queryType || 'A'})`);
    }
    if (dns.answers?.length) {
      parts.push(`DNS answers: ${dns.answers.slice(0, 3).join(', ')}`);
    }
  }
  
  if (layers?.tls) {
    const tls = layers.tls;
    if (tls.handshakeType) {
      parts.push(`TLS ${tls.handshakeType}`);
    }
    if (tls.serverName) {
      parts.push(`SNI: ${tls.serverName}`);
    }
  }
  
  if (layers?.tcp?.flags) {
    parts.push(`TCP flags: ${layers.tcp.flags}`);
  }
  
  // Error indicator
  if (packet.flags?.hasError) {
    parts.push('ERROR/ANOMALY DETECTED');
  }
  
  // Info field (usually contains important details)
  if (packet.info && packet.info.length > 0) {
    // Truncate long info
    const info = packet.info.length > 200 ? packet.info.slice(0, 200) + '...' : packet.info;
    parts.push(info);
  }
  
  return parts.join(' | ');
}

/**
 * Create a grouped summary for multiple packets
 * Used when embedding groups of related packets together
 */
export function createPacketGroupSummary(packets: Array<{
  id: number;
  protocol: string;
  source: string;
  destination: string;
  length: number;
  info: string;
  timestamp: number;
  layers?: Record<string, unknown>;
  flags?: { hasError?: boolean };
}>): string {
  if (packets.length === 0) return '';
  if (packets.length === 1) return createPacketSummary(packets[0] as Parameters<typeof createPacketSummary>[0]);
  
  // Aggregate statistics
  const protocols = new Set(packets.map(p => p.protocol));
  const sources = new Set(packets.map(p => p.source.split(':')[0]));
  const destinations = new Set(packets.map(p => p.destination.split(':')[0]));
  const totalBytes = packets.reduce((sum, p) => sum + p.length, 0);
  const errorCount = packets.filter(p => p.flags?.hasError).length;
  
  const parts: string[] = [];
  
  // Range and count
  parts.push(`Packets ${packets[0].id + 1}-${packets[packets.length - 1].id + 1} (${packets.length} packets)`);
  
  // Protocols
  parts.push(`Protocols: ${Array.from(protocols).join(', ')}`);
  
  // Endpoints
  if (sources.size <= 3) {
    parts.push(`Sources: ${Array.from(sources).join(', ')}`);
  } else {
    parts.push(`Sources: ${sources.size} unique IPs`);
  }
  
  if (destinations.size <= 3) {
    parts.push(`Destinations: ${Array.from(destinations).join(', ')}`);
  } else {
    parts.push(`Destinations: ${destinations.size} unique IPs`);
  }
  
  // Volume
  parts.push(`Total: ${(totalBytes / 1024).toFixed(1)} KB`);
  
  // Errors
  if (errorCount > 0) {
    parts.push(`ERRORS: ${errorCount} packets with anomalies`);
  }
  
  // Sample info from key packets (first, middle, last)
  const sampleIndices = [0, Math.floor(packets.length / 2), packets.length - 1];
  const uniqueInfos = new Set<string>();
  
  for (const idx of sampleIndices) {
    const p = packets[idx];
    if (p.info && p.info.length > 10 && !uniqueInfos.has(p.info.slice(0, 50))) {
      uniqueInfos.add(p.info.slice(0, 50));
      const info = p.info.length > 100 ? p.info.slice(0, 100) + '...' : p.info;
      parts.push(`Sample: ${info}`);
    }
  }
  
  return parts.join(' | ');
}

/**
 * Get embedding dimensions
 */
export function getEmbeddingDimensions(): number {
  return EMBEDDING_DIMENSIONS;
}

/**
 * Validate embedding format
 */
export function isValidEmbedding(embedding: unknown): embedding is number[] {
  return Array.isArray(embedding) && 
         embedding.length === EMBEDDING_DIMENSIONS &&
         embedding.every(n => typeof n === 'number');
}
