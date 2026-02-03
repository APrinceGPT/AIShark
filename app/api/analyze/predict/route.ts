import { NextRequest, NextResponse } from 'next/server';
import { Packet, PacketStatistics } from '@/types/packet';
import { extractPatternSignature, predictIssues } from '@/lib/predictive-analyzer';
import { supabase } from '@/lib/supabase-client';
import { LearnedPattern } from '@/types/database';
import { getCompletion, ChatMessage } from '@/lib/ai/client';
import { getPacketSession } from '@/lib/packet-session';

export const maxDuration = 60;

interface PredictRequest {
  packets?: Packet[];
  statistics?: PacketStatistics;
  sessionId?: string;
}

/**
 * POST /api/analyze/predict
 * Analyzes current capture and predicts issues based on learned patterns
 */
export async function POST(request: NextRequest) {
  try {
    let { packets, statistics, sessionId }: PredictRequest = await request.json();

    // If sessionId is provided, fetch data from Supabase
    if (sessionId && (!packets || packets.length === 0)) {
      const sessionResult = await getPacketSession(sessionId);
      if (!sessionResult.success || !sessionResult.session) {
        return NextResponse.json(
          { success: false, error: sessionResult.error || 'Session not found' },
          { status: 404 }
        );
      }
      packets = sessionResult.session.packets;
      if (!statistics && sessionResult.session.statistics) {
        statistics = sessionResult.session.statistics;
      }
    }

    if (!packets || !Array.isArray(packets) || packets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or empty packet data (provide packets array or sessionId)' },
        { status: 400 }
      );
    }

    // Extract pattern signature from current capture
    const currentSignature = extractPatternSignature(
      packets as Packet[],
      statistics as PacketStatistics
    );

    // Get user's learned patterns from database
    let learnedPatterns: LearnedPattern[] = [];
    
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('learned_patterns')
          .select('*')
          .eq('user_id', user.id)
          .order('confidence_score', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Failed to fetch learned patterns:', error);
        } else {
          learnedPatterns = data || [];
        }
      }
    }

    // Predict issues based on pattern matching
    const prediction = predictIssues(currentSignature, learnedPatterns);

    // Generate AI insights about predictions
    const aiPrompt = `You are analyzing network predictions based on historical patterns.

Current Network Signature:
- Dominant Protocol: ${currentSignature.dominantProtocol}
- Average Packet Size: ${currentSignature.avgPacketSize} bytes
- Retransmission Rate: ${currentSignature.retransmissionRate}%
- Error Rate: ${currentSignature.errorRate}%
- Unique IPs: ${currentSignature.uniqueIPs}

Predicted Issues:
${prediction.predictedIssues.map((issue, i) => 
  `${i + 1}. [${issue.severity.toUpperCase()}] ${issue.description} (${issue.confidence}% confidence)`
).join('\n')}

Similar Historical Patterns Found: ${prediction.similarPatterns.length}

Provide a concise analysis:
1. Risk Assessment: Explain the overall risk level (score: ${prediction.overallRiskScore}/100)
2. Priority Issues: Which predicted issue needs immediate attention?
3. Pattern Insights: What do the similar patterns tell us?
4. Proactive Steps: What should be done now to prevent future issues?

Keep it technical but actionable. Focus on prevention and monitoring.`;

    const aiInsights = await getCompletion(
      'You are a network prediction specialist helping engineers prevent issues before they occur.',
      aiPrompt
    );

    return NextResponse.json({
      success: true,
      prediction,
      patternSignature: currentSignature,
      aiInsights,
      learnedPatternsCount: learnedPatterns.length
    });

  } catch (error) {
    console.error('Prediction analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Prediction failed'
      },
      { status: 500 }
    );
  }
}
