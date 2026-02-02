import { NextRequest, NextResponse } from 'next/server';
import { 
  prepareOptimizedContext, 
  validateContextSize,
  optimizeContextForQuery 
} from '@/lib/ai/context-builder';
import { ANOMALY_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { getPacketSession } from '@/lib/packet-session';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AnomalyRequest {
  packets?: Packet[];
  statistics?: PacketStatistics | null;
  analysis?: AnalysisResult | null;
  sessionId?: string;
}

/**
 * POST /api/analyze/anomaly
 * Detect and explain anomalies in packet capture
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnomalyRequest = await request.json();
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

    // Prepare optimized context for anomaly detection
    const { context: fullContext, metrics } = prepareOptimizedContext(
      packets, 
      statistics || null, 
      analysis || null,
      4500 // Slightly higher for error packets
    );
    
    const optimizedContext = optimizeContextForQuery(fullContext, 'anomaly');
    
    // Validate context size
    const validation = validateContextSize(optimizedContext);
    if (!validation.valid) {
      console.warn('Context validation failed:', validation.warning);
      return NextResponse.json(
        { error: validation.warning },
        { status: 400 }
      );
    }

    console.log(`Anomaly context: ${metrics.estimatedTokens} tokens, ${fullContext.errorPackets.length} error packets`);

    // Generate anomaly analysis
    const anomalyAnalysis = await getCompletion(
      ANOMALY_PROMPT.system,
      ANOMALY_PROMPT.user(optimizedContext)
    );

    return NextResponse.json({
      success: true,
      analysis: anomalyAnalysis,
      timestamp: Date.now(),
      metrics: {
        tokens: metrics.estimatedTokens,
        errorPackets: fullContext.errorPackets.length,
      },
    });

  } catch (error) {
    console.error('Anomaly detection error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
