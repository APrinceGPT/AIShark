/**
 * Upload Packets API
 * Handles chunked packet uploads to Supabase for large file analysis
 * Bypasses Vercel's 4.5MB request body limit
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOrUpdatePacketSession, getSessionPacketCount } from '@/lib/packet-session';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

interface UploadRequest {
  packets: Packet[];
  sessionId?: string;           // If provided, appends to existing session
  chunkIndex?: number;          // Current chunk number (0-based)
  totalChunks?: number;         // Total number of chunks
  isLastChunk?: boolean;        // True if this is the final chunk
  fileName: string;
  fileSize: number;
  statistics?: PacketStatistics; // Only sent with last chunk
  analysis?: AnalysisResult;     // Only sent with last chunk
  userId?: string;
}

interface UploadResponse {
  success: boolean;
  sessionId?: string;
  packetCount?: number;
  chunkIndex?: number;
  isComplete?: boolean;
  error?: string;
}

// Maximum packets per chunk (staying under 4.5MB limit)
const MAX_PACKETS_PER_CHUNK = 2000;

export async function POST(request: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    const body: UploadRequest = await request.json();

    // Validate required fields
    if (!body.packets || !Array.isArray(body.packets)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid packets array' },
        { status: 400 }
      );
    }

    if (!body.fileName) {
      return NextResponse.json(
        { success: false, error: 'Missing fileName' },
        { status: 400 }
      );
    }

    // Warn if chunk is too large (shouldn't happen if client chunks properly)
    if (body.packets.length > MAX_PACKETS_PER_CHUNK) {
      console.warn(`Large chunk received: ${body.packets.length} packets. Consider smaller chunks.`);
    }

    // Create or update session
    const result = await createOrUpdatePacketSession(
      {
        packets: body.packets,
        statistics: body.statistics,
        analysis: body.analysis,
        fileName: body.fileName,
        fileSize: body.fileSize,
        userId: body.userId,
      },
      body.sessionId
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Get current packet count
    const countResult = await getSessionPacketCount(result.sessionId!);

    return NextResponse.json({
      success: true,
      sessionId: result.sessionId,
      packetCount: countResult.count,
      chunkIndex: body.chunkIndex,
      isComplete: body.isLastChunk === true,
    });

  } catch (error) {
    console.error('Upload packets error:', error);
    
    // Handle JSON parse errors (usually means payload too large)
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON or payload too large' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check session status
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    const countResult = await getSessionPacketCount(sessionId);

    if (countResult.error) {
      return NextResponse.json(
        { success: false, error: countResult.error },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
      packetCount: countResult.count,
    });

  } catch (error) {
    console.error('Get session status error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get status' 
      },
      { status: 500 }
    );
  }
}
