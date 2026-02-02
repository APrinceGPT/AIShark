import { NextRequest, NextResponse } from 'next/server';
import { 
  prepareOptimizedContext, 
  validateContextSize 
} from '@/lib/ai/context-builder';
import { TROUBLESHOOT_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { getPacketSession } from '@/lib/packet-session';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TroubleshootRequest {
  problem: string;
  packets?: Packet[];
  statistics?: PacketStatistics | null;
  analysis?: AnalysisResult | null;
  sessionId?: string;
}

/**
 * POST /api/analyze/troubleshoot
 * Perform deep root cause analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body: TroubleshootRequest = await request.json();
    let { problem, packets, statistics, analysis, sessionId } = body;

    if (!problem || problem.trim().length === 0) {
      return NextResponse.json(
        { error: 'No problem description provided' },
        { status: 400 }
      );
    }

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

    // Prepare full context (troubleshooting needs more complete data)
    const { context: fullContext, metrics } = prepareOptimizedContext(
      packets, 
      statistics || null, 
      analysis || null,
      5000 // Higher budget for troubleshooting
    );
    
    // Validate context size
    const validation = validateContextSize(fullContext);
    if (!validation.valid) {
      console.warn('Context validation failed:', validation.warning);
      return NextResponse.json(
        { error: validation.warning },
        { status: 400 }
      );
    }

    console.log(`Troubleshoot context: ${metrics.estimatedTokens} tokens for problem: "${problem}"`);

    // Generate troubleshooting analysis
    const troubleshootAnalysis = await getCompletion(
      TROUBLESHOOT_PROMPT.system,
      TROUBLESHOOT_PROMPT.user({
        problem,
        captureContext: fullContext,
      })
    );

    return NextResponse.json({
      success: true,
      problem,
      analysis: troubleshootAnalysis,
      timestamp: Date.now(),
      metrics: {
        tokens: metrics.estimatedTokens,
      },
    });

  } catch (error) {
    console.error('Troubleshooting error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to perform troubleshooting',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
