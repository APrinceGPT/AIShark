import { NextRequest, NextResponse } from 'next/server';
import { getCompletion } from '@/lib/ai/client';
import { Packet, PacketStatistics } from '@/types/packet';
import { analyzePerformance, PerformanceReport } from '@/lib/performance-analyzer';

export const runtime = 'nodejs';
export const maxDuration = 60;

interface PerformanceRequest {
  packets: Packet[];
  statistics: PacketStatistics;
}

/**
 * POST /api/analyze/performance
 * Analyze network performance and identify bottlenecks
 */
export async function POST(request: NextRequest) {
  try {
    const { packets, statistics }: PerformanceRequest = await request.json();

    if (!packets || packets.length === 0) {
      return NextResponse.json(
        { error: 'No packets provided' },
        { status: 400 }
      );
    }

    // Perform performance analysis
    const report: PerformanceReport = analyzePerformance(packets, statistics);

    // Build AI prompt for interpretation
    const prompt = buildPerformancePrompt(report, packets.length);

    // Get AI insights
    const aiInsights = await getCompletion(prompt, 'performance-analysis');

    return NextResponse.json({
      success: true,
      report,
      aiInsights,
    });
  } catch (error) {
    console.error('Performance analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze performance' },
      { status: 500 }
    );
  }
}

function buildPerformancePrompt(report: PerformanceReport, packetCount: number): string {
  const { metrics, bottlenecks, score } = report;

  return `You are a network performance expert analyzing a packet capture.

PERFORMANCE METRICS:
- Total Packets: ${packetCount}
- Capture Duration: ${metrics.captureTimeSeconds.toFixed(1)} seconds
- Overall Health Score: ${score}/100

LATENCY:
- Average: ${metrics.averageLatency.toFixed(1)}ms
- P95: ${metrics.p95Latency.toFixed(1)}ms
- P99: ${metrics.p99Latency.toFixed(1)}ms
- Max: ${metrics.maxLatency.toFixed(1)}ms

TCP RELIABILITY:
- Retransmissions: ${metrics.retransmissionCount} (${metrics.retransmissionRate.toFixed(2)}%)
- Duplicate ACKs: ${metrics.duplicateAckCount} (${metrics.duplicateAckRate.toFixed(2)}%)
- Connection Resets: ${metrics.resetCount}

THROUGHPUT:
- Bandwidth: ${metrics.throughputMbps.toFixed(2)} Mbps
- Packets/second: ${metrics.packetsPerSecond.toFixed(0)}
- Total Data: ${(metrics.totalBytes / 1024 / 1024).toFixed(2)} MB

HTTP PERFORMANCE:
- Requests: ${metrics.httpRequests}
- Errors: ${metrics.httpErrors} (${metrics.httpErrorRate.toFixed(1)}%)
- Avg Response Time: ${metrics.averageResponseTime.toFixed(0)}ms
- Slow Requests (>1s): ${metrics.slowRequests}

DNS PERFORMANCE:
- Queries: ${metrics.dnsQueries}
- Failures: ${metrics.dnsFailures} (${metrics.dnsFailureRate.toFixed(1)}%)
- Avg Response Time: ${metrics.averageDnsResponseTime.toFixed(0)}ms

IDENTIFIED BOTTLENECKS:
${bottlenecks.length > 0 ? bottlenecks.map((b, i) => 
  `${i + 1}. [${b.severity.toUpperCase()}] ${b.type.toUpperCase()}: ${b.description}`
).join('\n') : 'None detected'}

TASK:
Provide a comprehensive performance analysis focusing on:
1. Root cause analysis of bottlenecks
2. Impact assessment on user experience
3. Specific, actionable recommendations
4. Priority order for fixes (quick wins vs long-term)

Format your response with clear sections:
## Performance Summary
[Brief overview of network health]

## Critical Issues
[Most urgent problems to address]

## Optimization Recommendations
[Prioritized list of specific actions]

## Monitoring Suggestions
[What to monitor going forward]

Be specific, technical, and actionable. Focus on what the user can actually do to improve performance.`;
}
