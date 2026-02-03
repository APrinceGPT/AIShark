/**
 * Packet Indexer
 * Indexes packet data into vector embeddings for RAG semantic search
 * Groups packets for efficient embedding and storage
 */

import { supabase } from '@/lib/supabase-client';
import { Packet } from '@/types/packet';
import { 
  generateEmbeddingsBatch, 
  createPacketGroupSummary,
  createPacketSummary 
} from './embeddings';

// Configuration
const PACKETS_PER_GROUP = 5;  // Group packets for embedding efficiency
const BATCH_SIZE = 20;        // Number of groups to embed at once
const MAX_CONCURRENT_BATCHES = 2;

export interface IndexingProgress {
  sessionId: string;
  status: 'pending' | 'indexing' | 'complete' | 'failed' | 'partial';
  totalPackets: number;
  indexedPackets: number;
  embeddingGroups: number;
  percentage: number;
  error?: string;
}

export interface IndexingResult {
  success: boolean;
  sessionId: string;
  embeddingsCreated: number;
  packetsIndexed: number;
  error?: string;
}

/**
 * Index all packets in a session for RAG search
 */
export async function indexSessionPackets(
  sessionId: string,
  packets: Packet[],
  onProgress?: (progress: IndexingProgress) => void
): Promise<IndexingResult> {
  if (!supabase) {
    return { 
      success: false, 
      sessionId, 
      embeddingsCreated: 0, 
      packetsIndexed: 0,
      error: 'Database not available' 
    };
  }

  const totalPackets = packets.length;
  
  // Initialize or update status
  await updateEmbeddingStatus(sessionId, {
    status: 'indexing',
    totalPackets,
    indexedPackets: 0,
    embeddingGroups: 0,
    startedAt: new Date().toISOString(),
  });

  try {
    // Group packets for efficient embedding
    const packetGroups = createPacketGroups(packets, PACKETS_PER_GROUP);
    
    let embeddingsCreated = 0;
    let packetsIndexed = 0;

    // Process in batches
    for (let i = 0; i < packetGroups.length; i += BATCH_SIZE * MAX_CONCURRENT_BATCHES) {
      const batchEnd = Math.min(i + BATCH_SIZE * MAX_CONCURRENT_BATCHES, packetGroups.length);
      const currentBatch = packetGroups.slice(i, batchEnd);
      
      // Create summaries for this batch
      const summaries = currentBatch.map(group => {
        if (group.packets.length === 1) {
          const p = group.packets[0];
          return createPacketSummary({
            id: p.id,
            protocol: p.protocol,
            source: p.source,
            destination: p.destination,
            length: p.length,
            info: p.info,
            timestamp: p.timestamp,
            layers: p.layers as Record<string, unknown>,
            flags: p.flags,
          });
        } else {
          return createPacketGroupSummary(group.packets.map(p => ({
            id: p.id,
            protocol: p.protocol,
            source: p.source,
            destination: p.destination,
            length: p.length,
            info: p.info,
            timestamp: p.timestamp,
            layers: p.layers as Record<string, unknown>,
            flags: p.flags,
          })));
        }
      });
      
      // Generate embeddings in batch
      const embeddings = await generateEmbeddingsBatch(summaries);
      
      // Prepare records for insertion
      const records = currentBatch.map((group, idx) => ({
        session_id: sessionId,
        packet_number: group.packets[0].id,
        packet_group_start: group.startIndex,
        packet_group_end: group.endIndex,
        protocols: extractProtocols(group.packets),
        source_ip: group.packets[0].source?.split(':')[0] || null,
        destination_ip: group.packets[0].destination?.split(':')[0] || null,
        source_port: extractPort(group.packets[0].source),
        destination_port: extractPort(group.packets[0].destination),
        timestamp_ms: group.packets[0].timestamp,
        content_summary: summaries[idx],
        embedding: `[${embeddings[idx].join(',')}]`, // pgvector format
      }));

      // Insert into database
      const { error: insertError } = await supabase
        .from('packet_embeddings')
        .insert(records);

      if (insertError) {
        console.error('Failed to insert embeddings:', insertError);
        throw insertError;
      }

      embeddingsCreated += records.length;
      packetsIndexed += currentBatch.reduce((sum, g) => sum + g.packets.length, 0);

      // Update progress
      const progress: IndexingProgress = {
        sessionId,
        status: 'indexing',
        totalPackets,
        indexedPackets: packetsIndexed,
        embeddingGroups: embeddingsCreated,
        percentage: Math.round((packetsIndexed / totalPackets) * 100),
      };

      await updateEmbeddingStatus(sessionId, {
        indexedPackets: packetsIndexed,
        embeddingGroups: embeddingsCreated,
      });

      onProgress?.(progress);
    }

    // Mark complete
    await updateEmbeddingStatus(sessionId, {
      status: 'complete',
      indexedPackets: packetsIndexed,
      embeddingGroups: embeddingsCreated,
      completedAt: new Date().toISOString(),
    });

    onProgress?.({
      sessionId,
      status: 'complete',
      totalPackets,
      indexedPackets: packetsIndexed,
      embeddingGroups: embeddingsCreated,
      percentage: 100,
    });

    return {
      success: true,
      sessionId,
      embeddingsCreated,
      packetsIndexed,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await updateEmbeddingStatus(sessionId, {
      status: 'failed',
      errorMessage,
    });

    return {
      success: false,
      sessionId,
      embeddingsCreated: 0,
      packetsIndexed: 0,
      error: errorMessage,
    };
  }
}

/**
 * Check if a session has been indexed
 */
export async function getIndexingStatus(sessionId: string): Promise<IndexingProgress | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('embedding_status')
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error || !data) return null;

  return {
    sessionId: data.session_id,
    status: data.status,
    totalPackets: data.total_packets,
    indexedPackets: data.indexed_packets,
    embeddingGroups: data.embedding_groups,
    percentage: data.total_packets > 0 
      ? Math.round((data.indexed_packets / data.total_packets) * 100) 
      : 0,
    error: data.error_message,
  };
}

/**
 * Delete embeddings for a session
 */
export async function deleteSessionEmbeddings(sessionId: string): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('packet_embeddings')
    .delete()
    .eq('session_id', sessionId);

  if (error) {
    console.error('Failed to delete embeddings:', error);
    return false;
  }

  await supabase
    .from('embedding_status')
    .delete()
    .eq('session_id', sessionId);

  return true;
}

// ============================================================
// Helper Functions
// ============================================================

interface PacketGroup {
  startIndex: number;
  endIndex: number;
  packets: Packet[];
}

/**
 * Group packets for efficient embedding
 */
function createPacketGroups(packets: Packet[], groupSize: number): PacketGroup[] {
  const groups: PacketGroup[] = [];
  
  for (let i = 0; i < packets.length; i += groupSize) {
    const endIndex = Math.min(i + groupSize - 1, packets.length - 1);
    groups.push({
      startIndex: i,
      endIndex,
      packets: packets.slice(i, endIndex + 1),
    });
  }
  
  return groups;
}

/**
 * Extract unique protocols from packet group
 */
function extractProtocols(packets: Packet[]): string[] {
  const protocols = new Set<string>();
  for (const p of packets) {
    if (p.protocol) protocols.add(p.protocol);
  }
  return Array.from(protocols);
}

/**
 * Extract port number from address string (e.g., "192.168.1.1:443" -> 443)
 */
function extractPort(address?: string): number | null {
  if (!address) return null;
  const parts = address.split(':');
  if (parts.length >= 2) {
    const port = parseInt(parts[parts.length - 1], 10);
    return isNaN(port) ? null : port;
  }
  return null;
}

/**
 * Update embedding status in database
 */
async function updateEmbeddingStatus(
  sessionId: string,
  updates: {
    status?: string;
    totalPackets?: number;
    indexedPackets?: number;
    embeddingGroups?: number;
    errorMessage?: string;
    startedAt?: string;
    completedAt?: string;
  }
): Promise<void> {
  if (!supabase) return;

  // Check if status exists
  const { data: existing } = await supabase
    .from('embedding_status')
    .select('session_id')
    .eq('session_id', sessionId)
    .single();

  const updateData: Record<string, unknown> = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Convert camelCase to snake_case
  if (updates.totalPackets !== undefined) updateData.total_packets = updates.totalPackets;
  if (updates.indexedPackets !== undefined) updateData.indexed_packets = updates.indexedPackets;
  if (updates.embeddingGroups !== undefined) updateData.embedding_groups = updates.embeddingGroups;
  if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
  if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
  if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

  // Clean up camelCase keys
  delete updateData.totalPackets;
  delete updateData.indexedPackets;
  delete updateData.embeddingGroups;
  delete updateData.errorMessage;
  delete updateData.startedAt;
  delete updateData.completedAt;

  if (existing) {
    await supabase
      .from('embedding_status')
      .update(updateData)
      .eq('session_id', sessionId);
  } else {
    await supabase
      .from('embedding_status')
      .insert({
        session_id: sessionId,
        ...updateData,
      });
  }
}
