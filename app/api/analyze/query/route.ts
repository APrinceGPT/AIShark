import { NextRequest, NextResponse } from 'next/server';
import { 
  prepareOptimizedContext, 
  validateContextSize,
  optimizeContextForQuery 
} from '@/lib/ai/context-builder';
import { QUERY_PROMPT, HELP_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { getPacketSession } from '@/lib/packet-session';
import { isHelpQuestion, buildHelpContext } from '@/lib/ai/project-knowledge';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface QueryRequest {
  question: string;
  packets?: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
  sessionId?: string;
}

/**
 * POST /api/analyze/query
 * Answer natural language questions about packet capture OR about AIShark usage
 */
export async function POST(request: NextRequest) {
  try {
    const body: QueryRequest = await request.json();
    let { question, packets, statistics, analysis, sessionId } = body;

    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'No question provided' },
        { status: 400 }
      );
    }

    // Check if this is a help question about the project
    if (isHelpQuestion(question)) {
      console.log(`Help question detected: "${question}"`);
      
      const helpContext = buildHelpContext();
      const answer = await getCompletion(
        HELP_PROMPT.system,
        HELP_PROMPT.user({ question, helpContext })
      );

      return NextResponse.json({
        success: true,
        question,
        answer,
        timestamp: Date.now(),
        isHelpResponse: true,
      });
    }

    // Regular packet analysis question - need packets
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
      // Use stored statistics/analysis if not provided
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

    // Prepare optimized context
    const { context: fullContext, metrics } = prepareOptimizedContext(
      packets, 
      statistics || null, 
      analysis || null,
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
