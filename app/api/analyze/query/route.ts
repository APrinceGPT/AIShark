import { NextRequest, NextResponse } from 'next/server';
import { 
  prepareRAGContext,
  checkRAGReadiness,
  type RAGNotReadyError
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
 * Uses RAG-only mode - no sampling fallback
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

    // Regular packet analysis question - requires sessionId for RAG
    if (!sessionId) {
      return NextResponse.json(
        { 
          error: 'Session ID required for packet analysis',
          ragNotReady: true,
          ragStatus: {
            status: 'no_session',
            coverage: 0,
            message: 'Please upload a packet capture file first.',
          }
        },
        { status: 400 }
      );
    }

    // Fetch packets from session
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

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets in session' },
        { status: 400 }
      );
    }

    console.log(`[Query API] Session: ${sessionId}, Packets: ${packets.length}`);

    // Check RAG readiness before attempting query
    const ragReadiness = await checkRAGReadiness(sessionId);
    
    if (!ragReadiness.ready) {
      console.log(`[Query API] RAG not ready: ${ragReadiness.message}`);
      return NextResponse.json({
        success: false,
        error: 'SharkAI is not ready yet',
        ragNotReady: true,
        ragStatus: {
          status: ragReadiness.status,
          coverage: ragReadiness.coverage,
          message: ragReadiness.message,
        },
      }, { status: 503 }); // Service Unavailable
    }

    // Use RAG context building (no fallback)
    console.log(`[Query API] Using RAG for session ${sessionId}`);
    
    const ragContext = await prepareRAGContext(
      sessionId,
      question,
      packets,
      statistics || null,
      analysis || null,
      4500
    );
    
    console.log(`[Query API] RAG context: ${ragContext.metrics.estimatedTokens} tokens, ${ragContext.metrics.matchCount} matches`);

    // Generate answer
    const answer = await getCompletion(
      QUERY_PROMPT.system,
      QUERY_PROMPT.user({
        question,
        captureContext: ragContext.context,
      })
    );

    return NextResponse.json({
      success: true,
      question,
      answer,
      timestamp: Date.now(),
      metrics: {
        tokens: ragContext.metrics.estimatedTokens,
        method: 'rag',
        ragMatches: ragContext.metrics.matchCount,
        relevantPackets: ragContext.metrics.relevantPacketCount,
      },
    });

  } catch (error) {
    console.error('Query processing error:', error);
    
    // Check if it's a RAG not ready error
    if (error && typeof error === 'object' && 'type' in error) {
      const ragError = error as RAGNotReadyError;
      if (ragError.type === 'rag_not_ready') {
        return NextResponse.json({
          success: false,
          error: 'SharkAI is not ready yet',
          ragNotReady: true,
          ragStatus: {
            status: ragError.status,
            coverage: ragError.coverage,
            message: ragError.message,
          },
        }, { status: 503 });
      }
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
