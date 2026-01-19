import { NextRequest, NextResponse } from 'next/server';
import { prepareAnalysisContext, AIContext } from '@/lib/ai/context-builder';
import { COMPARE_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface CaptureData {
  name: string;
  packets: Packet[];
  statistics: PacketStatistics;
  analysis: AnalysisResult;
}

interface CompareRequest {
  before: CaptureData;
  after: CaptureData;
}

/**
 * POST /api/analyze/compare
 * Compare two packet captures with AI insights
 * Cost-optimized: Only compares summary statistics and key issues
 */
export async function POST(request: NextRequest) {
  try {
    const body: CompareRequest = await request.json();
    const { before, after } = body;

    if (!before || !after) {
      return NextResponse.json(
        { error: 'Both before and after captures are required' },
        { status: 400 }
      );
    }

    if (before.packets.length === 0 || after.packets.length === 0) {
      return NextResponse.json(
        { error: 'Captures must contain packets' },
        { status: 400 }
      );
    }

    // Prepare optimized contexts (summary only, no packet samples for cost efficiency)
    const beforeContext = prepareComparisonContext(
      before.packets,
      before.statistics,
      before.analysis,
      before.name
    );

    const afterContext = prepareComparisonContext(
      after.packets,
      after.statistics,
      after.analysis,
      after.name
    );

    // Generate AI comparison
    const comparison = await getCompletion(
      COMPARE_PROMPT.system,
      COMPARE_PROMPT.user({
        before: beforeContext,
        after: afterContext,
      })
    );

    return NextResponse.json({
      success: true,
      comparison,
      beforeName: before.name,
      afterName: after.name,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Comparison error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to compare captures',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Prepare lightweight context for comparison
 * Only includes summary stats and issues (no packet samples)
 */
function prepareComparisonContext(
  packets: Packet[],
  statistics: PacketStatistics,
  analysis: AnalysisResult,
  name: string
): any {
  const duration = packets.length > 0 
    ? (packets[packets.length - 1].timestamp - packets[0].timestamp) / 1000 
    : 0;

  return {
    captureName: name,
    summary: {
      totalPackets: packets.length,
      duration: duration.toFixed(2),
      protocols: statistics.protocolDistribution,
      bandwidth: {
        total: `${(statistics.bandwidth.total / 1024 / 1024).toFixed(2)} MB`,
        perSecond: `${(statistics.bandwidth.perSecond / 1024).toFixed(2)} KB/s`,
      },
    },
    issues: {
      retransmissions: statistics.errors.retransmissions,
      duplicateAcks: statistics.errors.duplicateAcks,
      resets: statistics.errors.resets,
      totalErrors: statistics.errors.retransmissions + 
                   statistics.errors.duplicateAcks + 
                   statistics.errors.resets,
      latencyIssues: analysis.latencyIssues.length,
      insights: analysis.insights,
    },
    topTalkers: statistics.topTalkers.slice(0, 3).map(t => ({
      connection: `${t.source} → ${t.destination}`,
      packets: t.packets,
      bytes: `${(t.bytes / 1024).toFixed(2)} KB`,
    })),
  };
}
