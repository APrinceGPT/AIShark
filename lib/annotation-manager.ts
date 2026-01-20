/**
 * Packet Annotations Manager
 * Handles creating, editing, and deleting packet bookmarks/annotations
 */

import { supabase } from './supabase-client';
import { PacketAnnotation } from '@/types/database';

/**
 * Add annotation to a packet
 */
export async function addAnnotation(
  sessionId: string,
  packetNumber: number,
  annotation: string,
  severity: 'info' | 'warning' | 'critical'
): Promise<{ success: boolean; annotation?: PacketAnnotation; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Database not available' };
  }

  try {
    const { data, error } = await supabase
      .from('packet_annotations')
      .insert({
        session_id: sessionId,
        packet_number: packetNumber,
        annotation,
        severity,
      })
      .select()
      .single();

    if (error) {
      console.error('Add annotation error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, annotation: data };
  } catch (error) {
    console.error('Add annotation error:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get annotations for a session
 */
export async function getAnnotations(sessionId: string): Promise<PacketAnnotation[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('packet_annotations')
      .select('*')
      .eq('session_id', sessionId)
      .order('packet_number', { ascending: true });

    if (error) {
      console.error('Get annotations error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Get annotations error:', error);
    return [];
  }
}

/**
 * Update annotation
 */
export async function updateAnnotation(
  annotationId: string,
  updates: { annotation?: string; severity?: 'info' | 'warning' | 'critical' }
): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('packet_annotations')
      .update(updates)
      .eq('id', annotationId);

    if (error) {
      console.error('Update annotation error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Update annotation error:', error);
    return false;
  }
}

/**
 * Delete annotation
 */
export async function deleteAnnotation(annotationId: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('packet_annotations')
      .delete()
      .eq('id', annotationId);

    if (error) {
      console.error('Delete annotation error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete annotation error:', error);
    return false;
  }
}
