/**
 * Packet Session Manager
 * Handles temporary storage of packet data in Supabase for large file analysis
 * This bypasses Vercel's 4.5MB request body limit by storing packets in database
 */

import { supabase } from './supabase-client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export interface PacketSession {
  id: string;
  user_id: string | null;
  packets: Packet[];
  packet_count: number;
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
  file_name: string;
  file_size: number;
  created_at: string;
  last_accessed_at: string;
  is_active: boolean;
}

export interface CreateSessionData {
  packets: Packet[];
  statistics?: PacketStatistics;
  analysis?: AnalysisResult;
  fileName: string;
  fileSize: number;
  userId?: string;
}

export interface SessionUploadResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export interface SessionFetchResult {
  success: boolean;
  session?: PacketSession;
  error?: string;
}

/**
 * Creates a new packet session or updates existing one
 * Used for chunked uploads where packets are sent in batches
 */
export async function createOrUpdatePacketSession(
  data: CreateSessionData,
  existingSessionId?: string
): Promise<SessionUploadResult> {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    if (existingSessionId) {
      // Append to existing session
      const { data: existing, error: fetchError } = await supabase
        .from('packet_sessions')
        .select('packets, packet_count')
        .eq('id', existingSessionId)
        .single();

      if (fetchError) {
        return { success: false, error: `Failed to fetch session: ${fetchError.message}` };
      }

      // Merge packets - existing packets + new packets
      const existingPackets = existing.packets as Packet[] || [];
      const mergedPackets = [...existingPackets, ...data.packets];

      const { error: updateError } = await supabase
        .from('packet_sessions')
        .update({
          packets: mergedPackets,
          packet_count: mergedPackets.length,
          statistics: data.statistics || null,
          analysis: data.analysis || null,
          last_accessed_at: new Date().toISOString(),
        })
        .eq('id', existingSessionId);

      if (updateError) {
        return { success: false, error: `Failed to update session: ${updateError.message}` };
      }

      return { success: true, sessionId: existingSessionId };
    } else {
      // Create new session
      const { data: session, error: createError } = await supabase
        .from('packet_sessions')
        .insert({
          user_id: data.userId || null,
          packets: data.packets,
          packet_count: data.packets.length,
          statistics: data.statistics || null,
          analysis: data.analysis || null,
          file_name: data.fileName,
          file_size: data.fileSize,
          is_active: true,
        })
        .select('id')
        .single();

      if (createError) {
        return { success: false, error: `Failed to create session: ${createError.message}` };
      }

      return { success: true, sessionId: session.id };
    }
  } catch (error) {
    console.error('Packet session error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Fetches a packet session by ID
 * Updates last_accessed_at to keep session alive
 */
export async function getPacketSession(sessionId: string): Promise<SessionFetchResult> {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // First update last_accessed_at
    await supabase
      .from('packet_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Then fetch the session
    const { data, error } = await supabase
      .from('packet_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (error) {
      return { success: false, error: `Failed to fetch session: ${error.message}` };
    }

    if (!data) {
      return { success: false, error: 'Session not found or expired' };
    }

    return { success: true, session: data as PacketSession };
  } catch (error) {
    console.error('Get packet session error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Deletes a packet session (cleanup)
 */
export async function deletePacketSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    const { error } = await supabase
      .from('packet_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: `Failed to delete session: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Delete packet session error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Marks a session as inactive (soft delete)
 * Useful for cleanup triggers that don't want to hard delete immediately
 */
export async function deactivatePacketSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    const { error } = await supabase
      .from('packet_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: `Failed to deactivate session: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Deactivate packet session error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Cleans up stale sessions (older than specified hours)
 * Called by cron job or manual cleanup
 */
export async function cleanupStaleSessions(
  hoursOld: number = 1
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  if (!supabase) {
    return { success: false, deletedCount: 0, error: 'Database not available' };
  }

  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursOld);

    // Delete sessions older than cutoff
    const { data, error } = await supabase
      .from('packet_sessions')
      .delete()
      .lt('last_accessed_at', cutoffTime.toISOString())
      .select('id');

    if (error) {
      return { success: false, deletedCount: 0, error: `Cleanup failed: ${error.message}` };
    }

    return { success: true, deletedCount: data?.length || 0 };
  } catch (error) {
    console.error('Cleanup stale sessions error:', error);
    return { 
      success: false, 
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Updates session with analysis results and statistics
 * Called after initial packet upload and analysis
 */
export async function updateSessionAnalysis(
  sessionId: string,
  statistics: PacketStatistics,
  analysis: AnalysisResult
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    const { error } = await supabase
      .from('packet_sessions')
      .update({
        statistics,
        analysis,
        last_accessed_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: `Failed to update analysis: ${error.message}` };
    }

    return { success: true };
  } catch (error) {
    console.error('Update session analysis error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Gets packet count for a session without fetching all packets
 * Useful for validation and progress tracking
 */
export async function getSessionPacketCount(sessionId: string): Promise<{ count: number; error?: string }> {
  if (!supabase) {
    return { count: 0, error: 'Database not available' };
  }

  try {
    const { data, error } = await supabase
      .from('packet_sessions')
      .select('packet_count')
      .eq('id', sessionId)
      .single();

    if (error) {
      return { count: 0, error: `Failed to get count: ${error.message}` };
    }

    return { count: data?.packet_count || 0 };
  } catch (error) {
    return { count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
