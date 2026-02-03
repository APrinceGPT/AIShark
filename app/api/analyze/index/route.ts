/**
 * POST /api/analyze/index
 * Index packet session for RAG semantic search
 * Called after upload completes to enable enhanced AI responses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPacketSession } from '@/lib/packet-session';
import { indexSessionPackets, getIndexingStatus } from '@/lib/ai/packet-indexer';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large captures

interface IndexRequest {
  sessionId: string;
}

interface IndexStatusRequest {
  sessionId: string;
}

/**
 * POST - Start indexing a session for RAG
 */
export async function POST(request: NextRequest) {
  try {
    const body: IndexRequest = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Check if already indexed
    const existingStatus = await getIndexingStatus(sessionId);
    if (existingStatus?.status === 'complete') {
      return NextResponse.json({
        success: true,
        sessionId,
        status: 'already_indexed',
        message: 'Session already indexed for RAG',
        progress: existingStatus,
      });
    }

    if (existingStatus?.status === 'indexing') {
      return NextResponse.json({
        success: true,
        sessionId,
        status: 'in_progress',
        message: 'Indexing already in progress',
        progress: existingStatus,
      });
    }

    // Fetch packets from session
    const sessionResult = await getPacketSession(sessionId);
    if (!sessionResult.success || !sessionResult.session) {
      return NextResponse.json(
        { error: sessionResult.error || 'Session not found' },
        { status: 404 }
      );
    }

    const { packets } = sessionResult.session;

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets in session to index' },
        { status: 400 }
      );
    }

    console.log(`Starting RAG indexing for session ${sessionId} (${packets.length} packets)`);

    // Start indexing (runs in background for large captures)
    const result = await indexSessionPackets(sessionId, packets);

    if (result.success) {
      return NextResponse.json({
        success: true,
        sessionId,
        status: 'complete',
        message: `Indexed ${result.packetsIndexed} packets into ${result.embeddingsCreated} embedding groups`,
        embeddingsCreated: result.embeddingsCreated,
        packetsIndexed: result.packetsIndexed,
      });
    } else {
      return NextResponse.json({
        success: false,
        sessionId,
        status: 'failed',
        error: result.error,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Indexing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to index session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check indexing status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const status = await getIndexingStatus(sessionId);

    if (!status) {
      return NextResponse.json({
        success: true,
        sessionId,
        indexed: false,
        status: 'not_indexed',
        message: 'Session has not been indexed for RAG',
      });
    }

    return NextResponse.json({
      success: true,
      sessionId,
      indexed: status.status === 'complete',
      status: status.status,
      progress: status,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check indexing status' },
      { status: 500 }
    );
  }
}
