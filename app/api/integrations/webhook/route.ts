import { NextRequest, NextResponse } from 'next/server';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

export const maxDuration = 30;

/**
 * Webhook payload structure
 */
interface WebhookPayload {
  event: string;
  timestamp: number;
  data: {
    captureInfo: {
      packetCount: number;
      totalBytes: number;
      duration: number;
      protocols: Record<string, number>;
    };
    alerts?: Array<{
      severity: string;
      message: string;
      details: string;
    }>;
    statistics?: Partial<PacketStatistics>;
    analysis?: Partial<AnalysisResult>;
  };
}

/**
 * POST /api/integrations/webhook
 * Sends network analysis data to external webhook endpoints
 */
export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, packets, statistics, analysis, eventType } = await request.json();

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Valid webhook URL required' },
        { status: 400 }
      );
    }

    if (!packets || !Array.isArray(packets)) {
      return NextResponse.json(
        { success: false, error: 'Invalid packet data' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid webhook URL format' },
        { status: 400 }
      );
    }

    // Build webhook payload
    const payload = buildWebhookPayload(
      packets as Packet[],
      statistics as PacketStatistics,
      analysis as AnalysisResult,
      eventType || 'network.analysis.complete'
    );

    // Send webhook
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'AIShark-PCAP-Analyzer/1.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text().catch(() => 'Unknown error');
      return NextResponse.json(
        {
          success: false,
          error: `Webhook failed with status ${webhookResponse.status}: ${errorText}`
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook delivered successfully',
      statusCode: webhookResponse.status
    });

  } catch (error) {
    console.error('Webhook integration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Webhook delivery failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Build standardized webhook payload
 */
function buildWebhookPayload(
  packets: Packet[],
  statistics: PacketStatistics | null,
  analysis: AnalysisResult | null,
  eventType: string
): WebhookPayload {
  // Protocol distribution
  const protocolCounts: Record<string, number> = {};
  packets.forEach(p => {
    protocolCounts[p.protocol] = (protocolCounts[p.protocol] || 0) + 1;
  });

  // Calculate duration
  const timestamps = packets.map(p => p.timestamp);
  const duration = timestamps.length > 0 
    ? Math.max(...timestamps) - Math.min(...timestamps) 
    : 0;

  // Extract alerts from analysis
  const alerts: WebhookPayload['data']['alerts'] = [];
  
  if (analysis) {
    // Check for packet errors
    if (analysis.errors && analysis.errors.length > 0) {
      analysis.errors.forEach(error => {
        alerts.push({
          severity: 'high',
          message: `Packet error: ${error.type}`,
          details: error.description
        });
      });
    }

    // Check for latency issues
    if (analysis.latencyIssues && analysis.latencyIssues.length > 0) {
      analysis.latencyIssues.slice(0, 5).forEach(issue => {
        alerts.push({
          severity: 'medium',
          message: 'High latency detected',
          details: `${issue.source} -> ${issue.destination}: ${issue.latency}ms`
        });
      });
    }
  }

  return {
    event: eventType,
    timestamp: Date.now(),
    data: {
      captureInfo: {
        packetCount: packets.length,
        totalBytes: packets.reduce((sum, p) => sum + p.length, 0),
        duration,
        protocols: protocolCounts
      },
      alerts: alerts.length > 0 ? alerts : undefined,
      statistics: statistics ? {
        totalPackets: statistics.totalPackets,
        protocolDistribution: statistics.protocolDistribution,
        topTalkers: statistics.topTalkers?.slice(0, 5),
        errors: statistics.errors
      } : undefined,
      analysis: analysis ? {
        latencyIssues: analysis.latencyIssues?.slice(0, 5),
        errors: analysis.errors?.slice(0, 5),
        insights: analysis.insights?.slice(0, 5)
      } : undefined
    }
  };
}
