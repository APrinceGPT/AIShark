import { NextRequest, NextResponse } from 'next/server';
import { 
  prepareOptimizedContext, 
  validateContextSize,
  optimizeContextForQuery 
} from '@/lib/ai/context-builder';
import { SUMMARY_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface SummaryRequest {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
}

/**
 * POST /api/analyze/summary
 * Generate AI-powered summary of packet capture
 */
export async function POST(request: NextRequest) {
  try {
    const body: SummaryRequest = await request.json();
    const { packets, statistics, analysis } = body;

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets provided' },
        { status: 400 }
      );
    }

    // Prepare optimized context with token budget
    const { context: fullContext, metrics } = prepareOptimizedContext(
      packets, 
      statistics, 
      analysis,
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
