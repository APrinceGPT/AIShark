/**
 * Performance Analyzer
 * Identifies bottlenecks, latency issues, and network performance problems
 */

import { Packet, PacketStatistics } from '@/types/packet';

export interface PerformanceMetrics {
  // Latency metrics
  averageLatency: number; // milliseconds
  p50Latency: number; // median
  p95Latency: number; // 95th percentile
  p99Latency: number; // 99th percentile
  maxLatency: number;
  
  // TCP metrics
  retransmissionRate: number; // percentage
  retransmissionCount: number;
  duplicateAckRate: number; // percentage
  duplicateAckCount: number;
  resetCount: number;
  
  // Throughput metrics
  totalBytes: number;
  throughputBps: number; // bits per second
  throughputMbps: number; // megabits per second
  packetsPerSecond: number;
  
  // Connection metrics
  totalConnections: number;
  failedConnections: number;
  successRate: number; // percentage
  averageConnectionTime: number; // milliseconds
  
  // HTTP metrics
  httpRequests: number;
  httpErrors: number; // 4xx, 5xx
  httpErrorRate: number; // percentage
  averageResponseTime: number; // milliseconds
  slowRequests: number; // > 1 second
  
  // DNS metrics
  dnsQueries: number;
  dnsFailures: number;
  dnsFailureRate: number; // percentage
  averageDnsResponseTime: number; // milliseconds
  
  // Bandwidth utilization
  captureTimeSeconds: number;
  averageBandwidthUtilization: number; // percentage (assuming 1Gbps link)
  peakBandwidthBps: number;
}

export interface Bottleneck {
  type: 'latency' | 'retransmission' | 'connection' | 'bandwidth' | 'http' | 'dns';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  affected: string[]; // IPs, ports, protocols
  recommendation: string;
  packets: number[]; // packet IDs
}

export interface PerformanceReport {
  metrics: PerformanceMetrics;
  bottlenecks: Bottleneck[];
  score: number; // 0-100, overall network health score
  scoreBreakdown: {
    latency: number;
    reliability: number;
    throughput: number;
    errors: number;
  };
}

/**
 * Calculate Round Trip Time (RTT) from TCP handshake
 */
function calculateRTT(packets: Packet[]): number[] {
  const rtts: number[] = [];
  const connections = new Map<string, { synTime?: number; synAckTime?: number }>();

  for (const packet of packets) {
    if (!packet.layers.tcp || !packet.layers.ip) continue;

    const tcp = packet.layers.tcp;
    const ip = packet.layers.ip;
    const key = `${ip.source}:${tcp.sourcePort}-${ip.destination}:${tcp.destinationPort}`;
    const reverseKey = `${ip.destination}:${tcp.destinationPort}-${ip.source}:${tcp.sourcePort}`;

    if (tcp.flags.syn && !tcp.flags.ack) {
      connections.set(key, { synTime: packet.timestamp });
    } else if (tcp.flags.syn && tcp.flags.ack) {
      const conn = connections.get(reverseKey);
      if (conn?.synTime) {
        const rtt = packet.timestamp - conn.synTime;
        rtts.push(rtt);
      }
    }
  }

  return rtts;
}

/**
 * Calculate HTTP response times
 */
function calculateHttpResponseTimes(packets: Packet[]): number[] {
  const responseTimes: number[] = [];
  const requests = new Map<string, number>();

  for (const packet of packets) {
    if (!packet.layers.http) continue;

    const http = packet.layers.http;
    const key = `${packet.source}:${packet.destination}`;

    if (http.isRequest) {
      requests.set(key, packet.timestamp);
    } else if (!http.isRequest) {
      const reverseKey = `${packet.destination}:${packet.source}`;
      const requestTime = requests.get(reverseKey);
      if (requestTime) {
        const responseTime = packet.timestamp - requestTime;
        responseTimes.push(responseTime);
        requests.delete(reverseKey);
      }
    }
  }

  return responseTimes;
}

/**
 * Calculate DNS response times
 */
function calculateDnsResponseTimes(packets: Packet[]): number[] {
  const responseTimes: number[] = [];
  const queries = new Map<number, number>();

  for (const packet of packets) {
    if (!packet.layers.dns) continue;

    const dns = packet.layers.dns;

    if (dns.isQuery) {
      queries.set(dns.transactionId, packet.timestamp);
    } else {
      const queryTime = queries.get(dns.transactionId);
      if (queryTime) {
        const responseTime = packet.timestamp - queryTime;
        responseTimes.push(responseTime);
        queries.delete(dns.transactionId);
      }
    }
  }

  return responseTimes;
}

/**
 * Calculate percentile value
 */
function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Analyze network performance
 */
export function analyzePerformance(packets: Packet[], statistics: PacketStatistics): PerformanceReport {
  // Calculate timing metrics
  const rtts = calculateRTT(packets);
  const httpResponseTimes = calculateHttpResponseTimes(packets);
  const dnsResponseTimes = calculateDnsResponseTimes(packets);

  // Calculate capture time
  const firstPacket = packets[0]?.timestamp || 0;
  const lastPacket = packets[packets.length - 1]?.timestamp || 0;
  const captureTimeSeconds = Math.max((lastPacket - firstPacket) / 1000, 1);

  // Count errors
  const retransmissionCount = packets.filter(p => p.flags?.isRetransmission).length;
  const duplicateAckCount = packets.filter(p => p.flags?.isDuplicateAck).length;
  const resetCount = packets.filter(p => p.layers.tcp?.flags.rst).length;

  // Count HTTP errors
  const httpPackets = packets.filter(p => p.layers.http);
  const httpRequests = httpPackets.filter(p => p.layers.http?.isRequest).length;
  const httpErrors = httpPackets.filter(p => {
    const code = p.layers.http?.statusCode;
    return code && code >= 400;
  }).length;

  // Count DNS failures
  const dnsPackets = packets.filter(p => p.layers.dns);
  const dnsQueries = dnsPackets.filter(p => p.layers.dns?.isQuery).length;
  const dnsFailures = dnsPackets.filter(p => {
    return !p.layers.dns?.isQuery && p.layers.dns?.answers.length === 0;
  }).length;

  // Calculate throughput
  const totalBytes = statistics.bandwidth.total;
  const throughputBps = (totalBytes * 8) / captureTimeSeconds;
  const throughputMbps = throughputBps / 1_000_000;
  const packetsPerSecond = packets.length / captureTimeSeconds;

  // Build metrics
  const metrics: PerformanceMetrics = {
    averageLatency: rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : 0,
    p50Latency: percentile(rtts, 50),
    p95Latency: percentile(rtts, 95),
    p99Latency: percentile(rtts, 99),
    maxLatency: rtts.length > 0 ? Math.max(...rtts) : 0,
    
    retransmissionRate: packets.length > 0 ? (retransmissionCount / packets.length) * 100 : 0,
    retransmissionCount,
    duplicateAckRate: packets.length > 0 ? (duplicateAckCount / packets.length) * 100 : 0,
    duplicateAckCount,
    resetCount,
    
    totalBytes,
    throughputBps,
    throughputMbps,
    packetsPerSecond,
    
    totalConnections: 0, // Would need connection tracking
    failedConnections: resetCount,
    successRate: 0,
    averageConnectionTime: rtts.length > 0 ? rtts.reduce((a, b) => a + b, 0) / rtts.length : 0,
    
    httpRequests,
    httpErrors,
    httpErrorRate: httpRequests > 0 ? (httpErrors / httpRequests) * 100 : 0,
    averageResponseTime: httpResponseTimes.length > 0 
      ? httpResponseTimes.reduce((a, b) => a + b, 0) / httpResponseTimes.length 
      : 0,
    slowRequests: httpResponseTimes.filter(t => t > 1000).length,
    
    dnsQueries,
    dnsFailures,
    dnsFailureRate: dnsQueries > 0 ? (dnsFailures / dnsQueries) * 100 : 0,
    averageDnsResponseTime: dnsResponseTimes.length > 0 
      ? dnsResponseTimes.reduce((a, b) => a + b, 0) / dnsResponseTimes.length 
      : 0,
    
    captureTimeSeconds,
    averageBandwidthUtilization: (throughputBps / 1_000_000_000) * 100, // Assuming 1Gbps
    peakBandwidthBps: throughputBps, // Simplified
  };

  // Identify bottlenecks
  const bottlenecks: Bottleneck[] = [];

  // High latency
  if (metrics.p95Latency > 200) {
    bottlenecks.push({
      type: 'latency',
      severity: metrics.p95Latency > 500 ? 'critical' : 'warning',
      description: `High network latency detected (P95: ${metrics.p95Latency.toFixed(0)}ms)`,
      affected: [],
      recommendation: 'Check network path, routing, and physical connections. Consider using CDN or edge servers.',
      packets: [],
    });
  }

  // High retransmission rate
  if (metrics.retransmissionRate > 1) {
    bottlenecks.push({
      type: 'retransmission',
      severity: metrics.retransmissionRate > 5 ? 'critical' : 'warning',
      description: `High TCP retransmission rate (${metrics.retransmissionRate.toFixed(2)}%)`,
      affected: [],
      recommendation: 'Indicates packet loss. Check for network congestion, faulty hardware, or misconfigured QoS.',
      packets: packets.filter(p => p.flags?.isRetransmission).map(p => p.id),
    });
  }

  // Connection failures
  if (metrics.resetCount > 10) {
    bottlenecks.push({
      type: 'connection',
      severity: metrics.resetCount > 50 ? 'critical' : 'warning',
      description: `High number of connection resets (${metrics.resetCount})`,
      affected: [],
      recommendation: 'Check firewall rules, application timeouts, and server capacity.',
      packets: packets.filter(p => p.layers.tcp?.flags.rst).map(p => p.id),
    });
  }

  // HTTP errors
  if (metrics.httpErrorRate > 10) {
    bottlenecks.push({
      type: 'http',
      severity: metrics.httpErrorRate > 25 ? 'critical' : 'warning',
      description: `High HTTP error rate (${metrics.httpErrorRate.toFixed(1)}%)`,
      affected: [],
      recommendation: 'Review application logs, check server resources, and validate API endpoints.',
      packets: httpPackets.filter(p => {
        const code = p.layers.http?.statusCode;
        return code && code >= 400;
      }).map(p => p.id),
    });
  }

  // DNS failures
  if (metrics.dnsFailureRate > 5) {
    bottlenecks.push({
      type: 'dns',
      severity: metrics.dnsFailureRate > 20 ? 'critical' : 'warning',
      description: `High DNS failure rate (${metrics.dnsFailureRate.toFixed(1)}%)`,
      affected: [],
      recommendation: 'Check DNS server availability, configuration, and consider using multiple DNS servers.',
      packets: dnsPackets.filter(p => !p.layers.dns?.isQuery && p.layers.dns?.answers.length === 0).map(p => p.id),
    });
  }

  // Slow HTTP requests
  if (metrics.slowRequests > httpRequests * 0.1) {
    bottlenecks.push({
      type: 'http',
      severity: 'warning',
      description: `Many slow HTTP requests (${metrics.slowRequests} > 1 second)`,
      affected: [],
      recommendation: 'Optimize backend processing, add caching, or scale infrastructure.',
      packets: [],
    });
  }

  // Calculate performance scores
  const latencyScore = Math.max(0, 100 - (metrics.p95Latency / 10)); // 0ms = 100, 1000ms = 0
  const reliabilityScore = Math.max(0, 100 - (metrics.retransmissionRate * 10) - (metrics.resetCount / 2));
  const throughputScore = Math.min(100, (metrics.throughputMbps / 100) * 100); // Normalized to 100Mbps
  const errorScore = Math.max(0, 100 - (metrics.httpErrorRate * 2) - (metrics.dnsFailureRate * 2));

  const overallScore = (latencyScore + reliabilityScore + throughputScore + errorScore) / 4;

  return {
    metrics,
    bottlenecks: bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    score: Math.round(overallScore),
    scoreBreakdown: {
      latency: Math.round(latencyScore),
      reliability: Math.round(reliabilityScore),
      throughput: Math.round(throughputScore),
      errors: Math.round(errorScore),
    },
  };
}
