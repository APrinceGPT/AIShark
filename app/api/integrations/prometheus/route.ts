import { NextRequest, NextResponse } from 'next/server';
import { Packet, PacketStatistics } from '@/types/packet';

export const maxDuration = 30;

/**
 * POST /api/integrations/prometheus
 * Exports network metrics in Prometheus format
 */
export async function POST(request: NextRequest) {
  try {
    const { packets, statistics } = await request.json();

    if (!packets || !Array.isArray(packets)) {
      return NextResponse.json(
        { success: false, error: 'Invalid packet data' },
        { status: 400 }
      );
    }

    const metrics = generatePrometheusMetrics(
      packets as Packet[],
      statistics as PacketStatistics
    );

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Prometheus export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed'
      },
      { status: 500 }
    );
  }
}

/**
 * Generate Prometheus exposition format metrics
 */
function generatePrometheusMetrics(
  packets: Packet[],
  statistics: PacketStatistics | null
): string {
  const timestamp = Date.now();
  let metrics: string[] = [];

  // Packet count metrics
  metrics.push('# HELP network_packets_total Total number of captured packets');
  metrics.push('# TYPE network_packets_total counter');
  metrics.push(`network_packets_total ${packets.length} ${timestamp}`);

  // Protocol distribution
  const protocolCounts: Record<string, number> = {};
  packets.forEach(p => {
    protocolCounts[p.protocol] = (protocolCounts[p.protocol] || 0) + 1;
  });

  metrics.push('# HELP network_packets_by_protocol Packet count by protocol');
  metrics.push('# TYPE network_packets_by_protocol gauge');
  Object.entries(protocolCounts).forEach(([protocol, count]) => {
    metrics.push(`network_packets_by_protocol{protocol="${protocol}"} ${count} ${timestamp}`);
  });

  // Traffic volume
  const totalBytes = packets.reduce((sum, p) => sum + p.length, 0);
  metrics.push('# HELP network_traffic_bytes_total Total network traffic in bytes');
  metrics.push('# TYPE network_traffic_bytes_total counter');
  metrics.push(`network_traffic_bytes_total ${totalBytes} ${timestamp}`);

  // Average packet size
  const avgSize = packets.length > 0 ? totalBytes / packets.length : 0;
  metrics.push('# HELP network_packet_size_bytes_avg Average packet size in bytes');
  metrics.push('# TYPE network_packet_size_bytes_avg gauge');
  metrics.push(`network_packet_size_bytes_avg ${avgSize.toFixed(2)} ${timestamp}`);

  // Error metrics
  let errors = 0;
  let retransmissions = 0;
  packets.forEach(p => {
    const info = p.info.toLowerCase();
    if (info.includes('error') || info.includes('malformed')) {
      errors++;
    }
    if (info.includes('retransmission') || info.includes('dup ack')) {
      retransmissions++;
    }
  });

  metrics.push('# HELP network_errors_total Total number of packet errors');
  metrics.push('# TYPE network_errors_total counter');
  metrics.push(`network_errors_total ${errors} ${timestamp}`);

  metrics.push('# HELP network_retransmissions_total Total number of TCP retransmissions');
  metrics.push('# TYPE network_retransmissions_total counter');
  metrics.push(`network_retransmissions_total ${retransmissions} ${timestamp}`);

  // Top talkers
  if (statistics?.topTalkers) {
    metrics.push('# HELP network_top_talker_bytes Bytes transferred by top talkers');
    metrics.push('# TYPE network_top_talker_bytes gauge');
    statistics.topTalkers.slice(0, 5).forEach((talker, idx) => {
      const address = `${talker.source}:${talker.destination}`;
      metrics.push(`network_top_talker_bytes{address="${address}",rank="${idx + 1}"} ${talker.bytes} ${timestamp}`);
    });
  }

  return metrics.join('\n') + '\n';
}
