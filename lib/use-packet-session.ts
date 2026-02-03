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
  chunkSize?: number;           // Packets per chunk (default: 3000)
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (sessionId: string) => void;
  onError?: (error: string) => void;
}

// Increased from 1000 to 3000 - optimized packets average ~500-800 bytes each
// 3000 packets * 800 bytes = ~2.4MB, well under 4.5MB limit
const DEFAULT_CHUNK_SIZE = 3000;

// Maximum payload size (4MB to leave headroom under 4.5MB limit)
const MAX_CHUNK_BYTES = 4 * 1024 * 1024;

/**
 * Sanitize string to remove invalid Unicode escape sequences
 * PostgreSQL JSONB cannot handle certain Unicode escape sequences
 */
function sanitizeString(str: string): string {
  // Remove null bytes and other control characters that break JSONB
  // Also remove invalid Unicode surrogate pairs
  return str
    .replace(/\u0000/g, '') // Null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Control chars except \t, \n, \r
    .replace(/[\uD800-\uDFFF]/g, '') // Surrogate pairs (invalid in JSON)
    .replace(/\\u[0-9a-fA-F]{0,3}(?![0-9a-fA-F])/g, ''); // Incomplete unicode escapes
}

/**
 * Recursively sanitize all strings in an object
 */
function sanitizeObject(obj: unknown): unknown {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

/**
 * Optimize packet for upload by trimming large data
 * This reduces the packet size significantly while keeping essential data
 */
function optimizePacketForUpload(packet: Packet): Record<string, unknown> {
  // Create a shallow copy without the raw Uint8Array (which is very large)
  const { raw, ...packetWithoutRaw } = packet;
  
  // Create optimized packet object
  const optimized: Record<string, unknown> = { ...packetWithoutRaw };
  
  // Trim and sanitize info if it's too long
  if (typeof optimized.info === 'string') {
    let info = optimized.info as string;
    if (info.length > 500) {
      info = info.substring(0, 500) + '...';
    }
    optimized.info = sanitizeString(info);
  }
  
  // Deep copy and optimize layers
  if (packet.layers) {
    const layers: Record<string, unknown> = { ...packet.layers };
    
    // Trim TCP payload if present
    if (packet.layers.tcp?.payload) {
      layers.tcp = { ...packet.layers.tcp, payload: undefined };
    }
    
    // Trim HTTP body if too large
    if (packet.layers.http) {
      const http = { ...packet.layers.http };
      if (http.body && typeof http.body === 'string' && http.body.length > 500) {
        http.body = http.body.substring(0, 500) + '... [truncated]';
      }
      layers.http = http;
    }
    
    // Sanitize all layer data
    optimized.layers = sanitizeObject(layers);
  }
  
  return optimized;
}

/**
 * Estimate JSON payload size in bytes
 */
function estimatePayloadSize(packets: Record<string, unknown>[]): number {
  // Quick estimation: JSON.stringify a sample and extrapolate
  if (packets.length === 0) return 0;
  
  // Sample first 10 packets for average size estimation
  const sampleSize = Math.min(10, packets.length);
  const sample = packets.slice(0, sampleSize);
  const sampleJson = JSON.stringify(sample);
  const avgPacketSize = sampleJson.length / sampleSize;
  
  return Math.ceil(avgPacketSize * packets.length * 1.1); // 10% overhead for full JSON structure
}

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
   * Uses dynamic chunk sizing to maximize throughput while staying under 4.5MB limit
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

    // Pre-optimize all packets to calculate accurate chunk sizes
    const optimizedPackets = packets.map(optimizePacketForUpload);
    
    // Calculate dynamic chunk boundaries based on payload size
    const chunks: { start: number; end: number }[] = [];
    let currentStart = 0;
    
    console.log(`[PacketSession] Starting upload: ${packets.length} packets, target chunk size: ${chunkSize}`);
    
    while (currentStart < optimizedPackets.length) {
      // Start with the configured chunk size or remaining packets
      let testEnd = Math.min(currentStart + chunkSize, optimizedPackets.length);
      let testChunk = optimizedPackets.slice(currentStart, testEnd);
      let estimatedSize = estimatePayloadSize(testChunk);
      
      // If chunk is too large, reduce size until it fits
      while (estimatedSize > MAX_CHUNK_BYTES && testEnd > currentStart + 100) {
        testEnd = Math.floor(currentStart + (testEnd - currentStart) * 0.75);
        testChunk = optimizedPackets.slice(currentStart, testEnd);
        estimatedSize = estimatePayloadSize(testChunk);
      }
      
      chunks.push({ start: currentStart, end: testEnd });
      console.log(`[PacketSession] Chunk ${chunks.length}: packets ${currentStart}-${testEnd} (${testEnd - currentStart} packets, ~${Math.round(estimatedSize / 1024)}KB)`);
      currentStart = testEnd;
    }

    const totalChunks = chunks.length;
    console.log(`[PacketSession] Total chunks: ${totalChunks}, packets per chunk: ~${Math.round(packets.length / totalChunks)}`);
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

        const { start, end } = chunks[i];
        const chunkPackets = optimizedPackets.slice(start, end);
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
          // Handle 413 Payload Too Large specifically
          if (response.status === 413) {
            throw new Error('Chunk too large. Try with a smaller file or contact support.');
          }
          let errorMessage = 'Upload failed';
          try {
            const errorData = await response.json() as { error?: string };
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Response wasn't JSON (common with 413 errors)
            errorMessage = `Upload failed with status ${response.status}`;
          }
          throw new Error(errorMessage);
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
