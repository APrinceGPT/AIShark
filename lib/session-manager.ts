/**
 * Session Manager
 * Handles saving and loading analysis sessions to/from Supabase
 */

import { supabase } from './supabase-client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { AnalysisSession, SessionWithDetails, AIInsight, SessionStatistics } from '@/types/database';

export interface SaveSessionData {
  name: string;
  fileName: string;
  fileSize: number;
  packets: Packet[];
  statistics: PacketStatistics;
  analysis: AnalysisResult;
  pcapFile?: File;
}

export interface LoadSessionData {
  session: AnalysisSession;
  statistics: PacketStatistics;
  packets: Packet[];
  insights: AIInsight[];
  anomalyData?: {
    insights: any[];
    errors: any[];
    latencyIssues: any[];
  };
}

/**
 * Save analysis session to database
 */
export async function saveSession(
  data: SaveSessionData,
  userId: string
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    // 1. Upload PCAP file to storage if provided
    let pcapFilePath: string | null = null;
    
    if (data.pcapFile) {
      const fileName = `${userId}/${Date.now()}_${data.fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pcap-files')
        .upload(fileName, data.pcapFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('File upload error:', uploadError);
        return { success: false, error: `Upload failed: ${uploadError.message}` };
      }

      pcapFilePath = uploadData.path;
    }

    // 2. Create session record
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .insert({
        user_id: userId,
        name: data.name,
        file_name: data.fileName,
        file_size: data.fileSize,
        packet_count: data.packets.length,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return { success: false, error: `Failed to create session: ${sessionError.message}` };
    }

    // 3. Save statistics
    const { error: statsError } = await supabase
      .from('session_statistics')
      .insert({
        session_id: session.id,
        protocol_distribution: data.statistics.protocolDistribution,
        top_talkers: data.statistics.topTalkers.slice(0, 20).map(t => ({
          address: `${t.source} → ${t.destination}`,
          packets: t.packets,
          bytes: t.bytes,
        })),
        timeline_data: (data.statistics as any).timeline || [],
        anomaly_data: {
          insights: data.analysis.insights,
          errors: data.analysis.errors,
          latencyIssues: data.analysis.latencyIssues,
        },
      });

    if (statsError) {
      console.error('Statistics save error:', statsError);
      // Rollback: delete the session record since statistics are critical
      await supabase
        .from('analysis_sessions')
        .delete()
        .eq('id', session.id);
      
      // Also clean up uploaded file if it exists
      if (pcapFilePath) {
        await supabase.storage
          .from('pcap-files')
          .remove([pcapFilePath]);
      }
      
      return { success: false, error: `Failed to save statistics: ${statsError.message}` };
    }

    return { success: true, sessionId: session.id };
  } catch (error) {
    console.error('Save session error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Load session from database
 */
export async function loadSession(sessionId: string): Promise<LoadSessionData | null> {
  if (!supabase) {
    return null;
  }

  try {
    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session fetch error:', sessionError);
      return null;
    }

    // Fetch statistics
    const { data: stats, error: statsError } = await supabase
      .from('session_statistics')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (statsError || !stats) {
      console.error('Statistics fetch error:', statsError);
      return null;
    }

    // Fetch insights
    const { data: insights, error: insightsError } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (insightsError) {
      console.error('Insights fetch error:', insightsError);
    }

    // Convert statistics back to PacketStatistics format
    const convertedStats: PacketStatistics = {
      totalPackets: session.packet_count,
      protocolDistribution: stats.protocol_distribution,
      topTalkers: (stats.top_talkers || []).map((t: any) => ({
        source: t.address?.split(' → ')[0] || '',
        destination: t.address?.split(' → ')[1] || '',
        packets: t.packets,
        bytes: t.bytes,
      })),
      errors: {
        retransmissions: stats.anomaly_data?.errors?.length || 0,
        duplicateAcks: 0,
        resets: 0,
      },
      bandwidth: {
        total: 0,
        perSecond: 0,
      },
    };

    return {
      session,
      statistics: convertedStats,
      packets: [], // Packets not stored in DB, would need to reparse PCAP file
      insights: insights || [],
      anomalyData: stats.anomaly_data || undefined,
    };
  } catch (error) {
    console.error('Load session error:', error);
    return null;
  }
}

/**
 * List user sessions
 */
export async function listSessions(
  userId: string,
  limit: number = 50
): Promise<SessionWithDetails[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data: sessions, error } = await supabase
      .from('analysis_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('List sessions error:', error);
      return [];
    }

    return sessions || [];
  } catch (error) {
    console.error('List sessions error:', error);
    return [];
  }
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string, userId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    // Delete from storage first (if exists)
    const { data: session } = await supabase
      .from('analysis_sessions')
      .select('file_name')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (session) {
      // Try to delete file from storage - matches the upload path pattern
      // Files are stored as: userId/timestamp_fileName
      const storagePath = `${userId}/${session.file_name}`;
      const { error: storageError } = await supabase.storage
        .from('pcap-files')
        .remove([storagePath]);
      
      if (storageError) {
        console.warn('Storage file deletion failed (may not exist):', storageError.message);
        // Continue with session deletion even if file doesn't exist
      }
    }

    // Delete session (cascade will delete related records)
    const { error } = await supabase
      .from('analysis_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete session error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete session error:', error);
    return false;
  }
}

/**
 * Save AI insight
 */
export async function saveAIInsight(
  sessionId: string,
  type: 'summary' | 'anomaly' | 'chat',
  response: string,
  question?: string
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('ai_insights')
      .insert({
        session_id: sessionId,
        insight_type: type,
        response,
        question: question || null,
      });

    if (error) {
      console.error('Save AI insight error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Save AI insight error:', error);
    return false;
  }
}

/**
 * Save multiple AI insights from cache
 */
export async function saveCachedInsights(
  sessionId: string,
  cachedInsights: Array<{endpoint: string; data: any}>
): Promise<{success: boolean; saved: number; failed: number}> {
  if (!supabase) {
    return { success: false, saved: 0, failed: 0 };
  }

  let saved = 0;
  let failed = 0;

  for (const insight of cachedInsights) {
    try {
      let type: 'summary' | 'anomaly' | 'chat';
      let response: string;
      let question: string | undefined;

      // Determine type from endpoint
      if (insight.endpoint.includes('/summary')) {
        type = 'summary';
        response = insight.data.summary || '';
      } else if (insight.endpoint.includes('/anomaly')) {
        type = 'anomaly';
        response = insight.data.analysis || '';
      } else if (insight.endpoint.includes('/query')) {
        type = 'chat';
        response = insight.data.answer || '';
        question = insight.data.question;
      } else {
        continue; // Skip unknown types
      }

      const result = await saveAIInsight(sessionId, type, response, question);
      if (result) {
        saved++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error('Error saving cached insight:', error);
      failed++;
    }
  }

  return { success: saved > 0, saved, failed };
}

/**
 * Download PCAP file from storage
 */
export async function downloadSessionFile(filePath: string): Promise<Blob | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase.storage
      .from('pcap-files')
      .download(filePath);

    if (error) {
      console.error('File download error:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('File download error:', error);
    return null;
  }
}
