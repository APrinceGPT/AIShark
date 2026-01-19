import { NextRequest, NextResponse } from 'next/server';
import { prepareAnalysisContext, optimizeContextForQuery } from '@/lib/ai/context-builder';
import { ANOMALY_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface AnomalyRequest {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
}

/**
 * POST /api/analyze/anomaly
 * Detect and explain anomalies in packet capture
 */
export async function POST(request: NextRequest) {
  try {
    const body: AnomalyRequest = await request.json();
    const { packets, statistics, analysis } = body;

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets provided' },
        { status: 400 }
      );
    }

    // Prepare and optimize context for anomaly detection
    const fullContext = prepareAnalysisContext(packets, statistics, analysis);
    const optimizedContext = optimizeContextForQuery(fullContext, 'anomaly');

    // Generate anomaly analysis
    const anomalyAnalysis = await getCompletion(
      ANOMALY_PROMPT.system,
      ANOMALY_PROMPT.user(optimizedContext)
    );

    return NextResponse.json({
      success: true,
      analysis: anomalyAnalysis,
      timestamp: Date.now(),
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
