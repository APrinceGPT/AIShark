/**
 * Cron Job: Cleanup Stale Packet Sessions
 * This endpoint is called by Vercel Cron or external scheduler
 * Removes packet sessions older than 1 hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { cleanupStaleSessions } from '@/lib/packet-session';

// Vercel cron configuration - runs every hour
export const runtime = 'nodejs';
export const maxDuration = 60;

interface CronResponse {
  success: boolean;
  deletedCount?: number;
  error?: string;
  timestamp: string;
}

// Authorization key for cron job (set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest): Promise<NextResponse<CronResponse>> {
  const timestamp = new Date().toISOString();

  // Verify cron authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', timestamp },
      { status: 401 }
    );
  }

  try {
    // Clean up sessions older than 1 hour
    const result = await cleanupStaleSessions(1);

    if (!result.success) {
      console.error('Cron cleanup failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error, timestamp },
        { status: 500 }
      );
    }

    console.log(`Cron cleanup: Deleted ${result.deletedCount} stale sessions at ${timestamp}`);

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      timestamp,
    });
  } catch (error) {
    console.error('Cron cleanup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Cleanup failed',
        timestamp,
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest): Promise<NextResponse<CronResponse>> {
  return GET(request);
}
