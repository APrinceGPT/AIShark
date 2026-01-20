import { NextRequest, NextResponse } from 'next/server';
import { 
  prepareOptimizedContext, 
  validateContextSize,
  optimizeContextForQuery 
} from '@/lib/ai/context-builder';
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

    // Prepare optimized context
    const { context: fullContext, metrics } = prepareOptimizedContext(
      packets, 
      statistics, 
      analysis,
      3500 // Lower for queries to leave room for question
    );
    
    const optimizedContext = optimizeContextForQuery(fullContext, 'query');
    
    // Validate context size
    const validation = validateContextSize(optimizedContext);
    if (!validation.valid) {
      console.warn('Context validation failed:', validation.warning);
      return NextResponse.json(
        { error: validation.warning },
        { status: 400 }
      );
    }

    console.log(`Query context: ${metrics.estimatedTokens} tokens for question: "${question}"`);

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
      metrics: {
        tokens: metrics.estimatedTokens,
      },
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
