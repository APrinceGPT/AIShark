import { NextRequest, NextResponse } from 'next/server';
import { EXPLAIN_PACKET_PROMPT } from '@/lib/ai/prompts';
import { getCompletion } from '@/lib/ai/client';
import { Packet } from '@/types/packet';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface ExplainPacketRequest {
  packet: Packet;
}

/**
 * POST /api/analyze/explain-packet
 * Get AI explanation of a specific packet
 */
export async function POST(request: NextRequest) {
  try {
    const body: ExplainPacketRequest = await request.json();
    const { packet } = body;

    if (!packet) {
      return NextResponse.json(
        { error: 'No packet provided' },
        { status: 400 }
      );
    }

    // Generate packet explanation
    const explanation = await getCompletion(
      EXPLAIN_PACKET_PROMPT.system,
      EXPLAIN_PACKET_PROMPT.user({ packet })
    );

    return NextResponse.json({
      success: true,
      packetId: packet.id,
      explanation,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Packet explanation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to explain packet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
