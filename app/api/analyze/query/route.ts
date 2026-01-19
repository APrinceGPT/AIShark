import { NextRequest, NextResponse } from 'next/server';
import { prepareAnalysisContext, optimizeContextForQuery } from '@/lib/ai/context-builder';
import { QUERY_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface QueryRequest {
  question: string;
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
}

/**
 * POST /api/analyze/query
 * Answer natural language questions about packet capture
 */
export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();
    const { question, packets, statistics, analysis } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'No question provided' },
        { status: 400 }
      );
    }

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets provided' },
        { status: 400 }
      );
    }

    // Prepare and optimize context
    const fullContext = prepareAnalysisContext(packets, statistics, analysis);
    const optimizedContext = optimizeContextForQuery(fullContext, 'query');

    // Generate answer
    const answer = await getCompletion(
      QUERY_PROMPT.system,
      QUERY_PROMPT.user({
        question,
        captureContext: optimizedContext,
      })
    );

    return NextResponse.json({
      success: true,
      question,
      answer,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Query processing error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
