import { NextRequest, NextResponse } from 'next/server';
import { prepareAnalysisContext } from '@/lib/ai/context-builder';
import { TROUBLESHOOT_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface TroubleshootRequest {
  problem: string;
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
}

/**
 * POST /api/analyze/troubleshoot
 * Perform deep root cause analysis
 */
export async function POST(request: NextRequest) {
  try {
    const body: TroubleshootRequest = await request.json();
    const { problem, packets, statistics, analysis } = body;

    if (!problem || problem.trim().length === 0) {
      return NextResponse.json(
        { error: 'No problem description provided' },
        { status: 400 }
      );
    }

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets provided' },
        { status: 400 }
      );
    }

    // Prepare full context (troubleshooting needs complete data)
    const fullContext = prepareAnalysisContext(packets, statistics, analysis);

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
