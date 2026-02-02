/**
 * Cleanup Packets API
 * Handles deletion of packet sessions from Supabase
 * Supports both individual session cleanup and stale session purge
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  deletePacketSession, 
  deactivatePacketSession, 
  cleanupStaleSessions 
} from '@/lib/packet-session';

interface CleanupRequest {
  sessionId?: string;        // Specific session to delete
  action?: 'delete' | 'deactivate' | 'purge-stale';
  hoursOld?: number;         // For purge-stale action (default: 1 hour)
}

interface CleanupResponse {
  success: boolean;
  deletedCount?: number;
  sessionId?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<CleanupResponse>> {
  try {
    const body: CleanupRequest = await request.json();
    const action = body.action || 'delete';

    // Handle stale session purge (used by cron job)
    if (action === 'purge-stale') {
      const result = await cleanupStaleSessions(body.hoursOld || 1);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        deletedCount: result.deletedCount,
      });
    }

    // For individual session operations, sessionId is required
    if (!body.sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    // Handle deactivate (soft delete)
    if (action === 'deactivate') {
      const result = await deactivatePacketSession(body.sessionId);
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        sessionId: body.sessionId,
      });
    }

    // Handle delete (hard delete)
    const result = await deletePacketSession(body.sessionId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: body.sessionId,
    });

  } catch (error) {
    console.error('Cleanup packets error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cleanup failed' 
      },
      { status: 500 }
    );
  }
}

// DELETE method for RESTful cleanup (alternative to POST)
export async function DELETE(request: NextRequest): Promise<NextResponse<CleanupResponse>> {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }

    const result = await deletePacketSession(sessionId);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId,
    });

  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Delete failed' 
      },
      { status: 500 }
    );
  }
}
