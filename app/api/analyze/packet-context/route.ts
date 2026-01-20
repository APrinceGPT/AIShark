import { NextRequest, NextResponse } from 'next/server';
import { getCompletion } from '@/lib/ai/client';
import { Packet } from '@/types/packet';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface PacketContextRequest {
  packet: Packet;
  relatedPackets?: Packet[];
}

/**
 * POST /api/analyze/packet-context
 * Provide real-time AI insights for a selected packet
 */
export async function POST(request: NextRequest) {
  try {
    const body: PacketContextRequest = await request.json();
    const { packet, relatedPackets = [] } = body;

    if (!packet) {
      return NextResponse.json(
        { error: 'No packet provided' },
        { status: 400 }
      );
    }

    // Build lightweight context
    const context = buildPacketContext(packet, relatedPackets);
    
    // Generate AI analysis
    const analysis = await getCompletion(
      getSystemPrompt(),
      getUserPrompt(context)
    );

    return NextResponse.json({
      success: true,
      packetId: packet.id,
      analysis,
      timestamp: Date.now(),
    });

  } catch (error) {
    console.error('Packet context analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze packet context',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Build lightweight context for single packet analysis
 */
function buildPacketContext(packet: Packet, relatedPackets: Packet[]) {
  const tcp = packet.layers.tcp;
  const udp = packet.layers.udp;
  const ip = packet.layers.ip;
  const http = packet.layers.http;
  const dns = packet.layers.dns;
  const tls = packet.layers.tls;

  return {
    packet: {
      number: packet.id + 1,
      timestamp: packet.timeString,
      protocol: packet.protocol,
      source: packet.source,
      destination: packet.destination,
      length: packet.length,
      info: packet.info,
      hasError: packet.flags?.hasError,
      isRetransmission: packet.flags?.isRetransmission,
    },
    layers: {
      ip: ip ? {
        version: ip.version,
        ttl: ip.ttl,
        protocol: ip.protocol,
      } : null,
      tcp: tcp ? {
        sourcePort: tcp.sourcePort,
        destPort: tcp.destinationPort,
        flags: tcp.flags,
        seq: tcp.sequenceNumber,
        ack: tcp.acknowledgmentNumber,
      } : null,
      udp: udp ? {
        sourcePort: udp.sourcePort,
        destPort: udp.destinationPort,
      } : null,
      http: http ? {
        method: http.method,
        uri: http.uri,
        statusCode: http.statusCode,
        headers: Object.keys(http.headers || {}).slice(0, 5), // Just header names
      } : null,
      dns: dns ? {
        queries: dns.queries.slice(0, 3).map(q => ({ name: q.name, type: q.type })),
        isQuery: dns.isQuery,
        answerCount: dns.answers?.length || 0,
      } : null,
      tls: tls ? {
        version: tls.version,
        handshakeType: tls.handshakeType,
        serverName: tls.serverName,
      } : null,
    },
    context: {
      relatedPacketsCount: relatedPackets.length,
      conversationSummary: relatedPackets.length > 0 
        ? `Part of ${relatedPackets.length + 1} packet conversation`
        : 'Standalone packet',
    },
  };
}

/**
 * System prompt for packet context analysis
 */
function getSystemPrompt(): string {
  return `You are a network packet analysis assistant providing real-time insights.

Your role:
- Provide BRIEF (2-3 sentences max) analysis of the selected packet
- Highlight what's interesting or concerning about it
- Suggest what to look for next
- Be concise and actionable

Format:
1. What this packet is doing
2. Why it matters (if significant)
3. Any concerns or suggestions`;
}

/**
 * User prompt for packet context
 */
function getUserPrompt(context: any): string {
  return `Analyze this network packet:

${JSON.stringify(context, null, 2)}

Provide a brief, actionable insight (2-3 sentences max).
Focus on what's interesting, unusual, or important about this packet.`;
}
