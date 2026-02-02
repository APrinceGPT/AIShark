/**
 * usePacketSession Hook
 * Client-side hook for managing packet session uploads and cleanup
 * Handles chunked uploads, progress tracking, and cleanup on page close
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export interface UploadProgress {
  status: 'idle' | 'uploading' | 'complete' | 'error';
  currentChunk: number;
  totalChunks: number;
  uploadedPackets: number;
  totalPackets: number;
  percentage: number;
  error?: string;
}

export interface PacketSessionState {
  sessionId: string | null;
  isUploaded: boolean;
  progress: UploadProgress;
}

interface UploadOptions {
  chunkSize?: number;           // Packets per chunk (default: 2000)
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

const DEFAULT_CHUNK_SIZE = 2000;

/**
 * Hook for managing packet session uploads to Supabase
 */
export function usePacketSession(options: UploadOptions = {}) {
  const { 
    chunkSize = DEFAULT_CHUNK_SIZE,
    onProgress,
    onComplete,
    onError,
  } = options;

  const [state, setState] = useState<PacketSessionState>({
    sessionId: null,
    isUploaded: false,
    progress: {
      status: 'idle',
      currentChunk: 0,
      totalChunks: 0,
      uploadedPackets: 0,
      totalPackets: 0,
      percentage: 0,
    },
  });

  const sessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    sessionIdRef.current = state.sessionId;
  }, [state.sessionId]);

  /**
   * Upload packets to Supabase in chunks
   */
  const uploadPackets = useCallback(async (
    packets: Packet[],
    fileName: string,
    fileSize: number,
    statistics?: PacketStatistics,
    analysis?: AnalysisResult,
    userId?: string
  ): Promise<string | null> => {
    // Cancel any ongoing upload
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const totalChunks = Math.ceil(packets.length / chunkSize);
    let currentSessionId: string | null = null;

    // Initialize progress
    const initialProgress: UploadProgress = {
      status: 'uploading',
      currentChunk: 0,
      totalChunks,
      uploadedPackets: 0,
      totalPackets: packets.length,
      percentage: 0,
    };

    setState(prev => ({
      ...prev,
      progress: initialProgress,
    }));
    onProgress?.(initialProgress);

    try {
      for (let i = 0; i < totalChunks; i++) {
        // Check for abort
        if (abortControllerRef.current?.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, packets.length);
        const chunkPackets = packets.slice(start, end);
        const isLastChunk = i === totalChunks - 1;

        const response: Response = await fetch('/api/packets/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            packets: chunkPackets,
            sessionId: currentSessionId,
            chunkIndex: i,
            totalChunks,
            isLastChunk,
            fileName,
            fileSize,
            statistics: isLastChunk ? statistics : undefined,
            analysis: isLastChunk ? analysis : undefined,
            userId,
          }),
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          const errorData = await response.json() as { error?: string };
          throw new Error(errorData.error || 'Upload failed');
        }

        const result = await response.json() as { success: boolean; sessionId?: string; error?: string };
        
        if (!result.success) {
          throw new Error(result.error || 'Upload failed');
        }

        // Store session ID from first chunk
        if (!currentSessionId && result.sessionId) {
          currentSessionId = result.sessionId;
        }

        // Update progress
        const uploadedPackets = end;
        const percentage = Math.round((uploadedPackets / packets.length) * 100);
        
        const progress: UploadProgress = {
          status: 'uploading',
          currentChunk: i + 1,
          totalChunks,
          uploadedPackets,
          totalPackets: packets.length,
          percentage,
        };

        setState(prev => ({
          ...prev,
          sessionId: currentSessionId,
          progress,
        }));
        onProgress?.(progress);
      }

      // Upload complete
      const completeProgress: UploadProgress = {
        status: 'complete',
        currentChunk: totalChunks,
        totalChunks,
        uploadedPackets: packets.length,
        totalPackets: packets.length,
        percentage: 100,
      };

      setState({
        sessionId: currentSessionId,
        isUploaded: true,
        progress: completeProgress,
      });
      onProgress?.(completeProgress);
      onComplete?.(currentSessionId!);

      return currentSessionId;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      const errorProgress: UploadProgress = {
        status: 'error',
        currentChunk: state.progress.currentChunk,
        totalChunks,
        uploadedPackets: state.progress.uploadedPackets,
        totalPackets: packets.length,
        percentage: state.progress.percentage,
        error: errorMessage,
      };

      setState(prev => ({
        ...prev,
        progress: errorProgress,
      }));
      onProgress?.(errorProgress);
      onError?.(errorMessage);

      // Clean up partial upload
      if (currentSessionId) {
        await cleanupSession(currentSessionId);
      }

      return null;
    }
  }, [chunkSize, onProgress, onComplete, onError, state.progress]);

  /**
   * Cleanup session data from Supabase
   */
  const cleanupSession = useCallback(async (sessionId?: string): Promise<boolean> => {
    const targetSessionId = sessionId || sessionIdRef.current;
    if (!targetSessionId) return true;

    try {
      const response: Response = await fetch('/api/packets/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: targetSessionId }),
      });

      if (!response.ok) {
        console.error('Cleanup failed:', await response.text());
        return false;
      }

      // Reset state if cleaning up current session
      if (!sessionId || sessionId === state.sessionId) {
        setState({
          sessionId: null,
          isUploaded: false,
          progress: {
            status: 'idle',
            currentChunk: 0,
            totalChunks: 0,
            uploadedPackets: 0,
            totalPackets: 0,
            percentage: 0,
          },
        });
      }

      return true;
    } catch (error) {
      console.error('Cleanup error:', error);
      return false;
    }
  }, [state.sessionId]);

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Reset state without cleanup (for new file upload)
   */
  const resetState = useCallback(() => {
    setState({
      sessionId: null,
      isUploaded: false,
      progress: {
        status: 'idle',
        currentChunk: 0,
        totalChunks: 0,
        uploadedPackets: 0,
        totalPackets: 0,
        percentage: 0,
      },
    });
  }, []);

  // Cleanup on page unload using sendBeacon
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        // Use sendBeacon for reliable cleanup on page close
        const data = JSON.stringify({ sessionId: sessionIdRef.current });
        navigator.sendBeacon('/api/packets/cleanup', data);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Cleanup on unmount
      if (sessionIdRef.current) {
        cleanupSession(sessionIdRef.current);
      }
    };
  }, [cleanupSession]);

  return {
    ...state,
    uploadPackets,
    cleanupSession,
    cancelUpload,
    resetState,
  };
}

/**
 * Get session ID from URL or storage (for shared sessions)
 */
export function getStoredSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Check URL params first
  const params = new URLSearchParams(window.location.search);
  const urlSessionId = params.get('session');
  if (urlSessionId) return urlSessionId;
  
  // Check session storage
  return sessionStorage.getItem('packetSessionId');
}

/**
 * Store session ID for persistence
 */
export function storeSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem('packetSessionId', sessionId);
}

/**
 * Clear stored session ID
 */
export function clearStoredSessionId(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('packetSessionId');
}
