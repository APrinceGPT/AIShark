import { NextRequest, NextResponse } from 'next/server';
import { 
  prepareOptimizedContext, 
  validateContextSize,
  optimizeContextForQuery 
} from '@/lib/ai/context-builder';
import { SUMMARY_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { getPacketSession } from '@/lib/packet-session';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface SummaryRequest {
  packets?: Packet[];
  statistics?: PacketStatistics | null;
  analysis?: AnalysisResult | null;
  sessionId?: string;
}

/**
 * POST /api/analyze/summary
 * Generate AI-powered summary of packet capture
 */
export async function POST(request: NextRequest) {
  try {
    const body: SummaryRequest = await request.json();
    let { packets, statistics, analysis, sessionId } = body;

    // If sessionId is provided, fetch data from Supabase
    if (sessionId && (!packets || packets.length === 0)) {
      const sessionResult = await getPacketSession(sessionId);
      if (!sessionResult.success || !sessionResult.session) {
        return NextResponse.json(
          { error: sessionResult.error || 'Session not found' },
          { status: 404 }
        );
      }
      packets = sessionResult.session.packets;
      if (!statistics && sessionResult.session.statistics) {
        statistics = sessionResult.session.statistics;
      }
      if (!analysis && sessionResult.session.analysis) {
        analysis = sessionResult.session.analysis;
      }
    }

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets provided (provide packets array or sessionId)' },
        { status: 400 }
      );
    }

    // Prepare optimized context with token budget
    const { context: fullContext, metrics } = prepareOptimizedContext(
      packets, 
      statistics || null, 
      analysis || null,
      4000 // Max tokens for summary
    );
    
    const optimizedContext = optimizeContextForQuery(fullContext, 'summary');
    
    // Validate context size
    const validation = validateContextSize(optimizedContext);
    if (!validation.valid) {
      console.warn('Context validation failed:', validation.warning);
      return NextResponse.json(
        { error: validation.warning },
        { status: 400 }
      );
    }

    console.log(`Context metrics: ${metrics.estimatedTokens} tokens, compression ${metrics.compressionRatio.toFixed(1)}x`);

    // Generate AI summary
    const summary = await getCompletion(
      SUMMARY_PROMPT.system,
      SUMMARY_PROMPT.user(optimizedContext)
    );

    return NextResponse.json({
      success: true,
      summary,
      timestamp: Date.now(),
      metrics: {
        tokens: metrics.estimatedTokens,
        packets: metrics.packetCount,
        samplingRate: metrics.samplingRate.toFixed(3),
        compression: `${metrics.compressionRatio.toFixed(1)}x`,
      },
    });

  } catch (error) {
    console.error('Summary generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
