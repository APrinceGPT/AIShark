/**
 * Predictive Network Analysis Engine
 * Extracts patterns from network captures and predicts future issues based on historical data
 */

import { Packet, PacketStatistics } from '@/types/packet';
import { LearnedPattern } from '@/types/database';

/**
 * Pattern signature extracted from network capture
 */
export interface PatternSignature {
  // Protocol characteristics
  protocolDistribution: Record<string, number>;
  dominantProtocol: string;
  
  // Traffic characteristics
  avgPacketSize: number;
  trafficVolume: number;
  packetRate: number;
  
  // Timing patterns
  timeDistribution: {
    peak_hour: number;
    traffic_variance: number;
  };
  
  // Communication patterns
  uniqueIPs: number;
  topTalkersDominance: number; // % of traffic from top 3 IPs
  
  // Behavioral fingerprint
  retransmissionRate: number;
  errorRate: number;
  fragmentationRate: number;
}

/**
 * Prediction result with confidence and recommendations
 */
export interface PredictionResult {
  predictedIssues: Array<{
    type: 'traffic' | 'anomaly' | 'performance' | 'security';
    description: string;
    confidence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence: string[];
    matchedPatternId?: string;
  }>;
  similarPatterns: Array<{
    patternId: string;
    patternName: string;
    similarity: number;
    lastSeen: string;
  }>;
  recommendations: string[];
  overallRiskScore: number; // 0-100
}

/**
 * Extract pattern signature from packet capture
 */
export function extractPatternSignature(
  packets: Packet[],
  statistics: PacketStatistics
): PatternSignature {
  if (packets.length === 0) {
    throw new Error('Cannot extract pattern from empty packet list');
  }

  // Protocol distribution
  const protocolCounts: Record<string, number> = {};
  packets.forEach(p => {
    protocolCounts[p.protocol] = (protocolCounts[p.protocol] || 0) + 1;
  });
  const totalPackets = packets.length;
  const protocolDistribution: Record<string, number> = {};
  Object.entries(protocolCounts).forEach(([proto, count]) => {
    protocolDistribution[proto] = Number((count / totalPackets * 100).toFixed(2));
  });
  const dominantProtocol = Object.entries(protocolCounts)
    .sort((a, b) => b[1] - a[1])[0][0];

  // Traffic characteristics
  const totalBytes = packets.reduce((sum, p) => sum + p.length, 0);
  const avgPacketSize = Math.round(totalBytes / totalPackets);
  const trafficVolume = totalBytes;

  // Timing analysis
  const timestamps = packets.map(p => p.timestamp);
  const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);
  const packetRate = timeSpan > 0 ? Number((totalPackets / timeSpan).toFixed(2)) : 0;

  // Calculate time distribution
  const hourCounts: Record<number, number> = {};
  packets.forEach(p => {
    const date = new Date(p.timestamp * 1000);
    const hour = date.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  
  // Traffic variance (standard deviation of packet sizes)
  const avgSize = totalBytes / totalPackets;
  const variance = packets.reduce((sum, p) => 
    sum + Math.pow(p.length - avgSize, 2), 0) / totalPackets;
  const trafficVariance = Number(Math.sqrt(variance).toFixed(2));

  // Communication patterns
  const uniqueIPs = new Set<string>();
  packets.forEach(p => {
    uniqueIPs.add(p.source);
    uniqueIPs.add(p.destination);
  });

  // Top talkers dominance
  const topTalkersBytes = (statistics.topTalkers || [])
    .slice(0, 3)
    .reduce((sum, talker) => sum + talker.bytes, 0);
  const topTalkersDominance = Number((topTalkersBytes / totalBytes * 100).toFixed(2));

  // Error and retransmission analysis
  let retransmissions = 0;
  let errors = 0;
  let fragments = 0;

  packets.forEach(p => {
    const info = p.info.toLowerCase();
    if (info.includes('retransmission') || info.includes('dup ack')) {
      retransmissions++;
    }
    if (info.includes('error') || info.includes('malformed') || info.includes('bad')) {
      errors++;
    }
    if (info.includes('fragment') || info.includes('fragmented')) {
      fragments++;
    }
  });

  const retransmissionRate = Number((retransmissions / totalPackets * 100).toFixed(2));
  const errorRate = Number((errors / totalPackets * 100).toFixed(2));
  const fragmentationRate = Number((fragments / totalPackets * 100).toFixed(2));

  return {
    protocolDistribution,
    dominantProtocol,
    avgPacketSize,
    trafficVolume,
    packetRate,
    timeDistribution: {
      peak_hour: Number(peakHour),
      traffic_variance: trafficVariance
    },
    uniqueIPs: uniqueIPs.size,
    topTalkersDominance,
    retransmissionRate,
    errorRate,
    fragmentationRate
  };
}

/**
 * Calculate similarity score between two pattern signatures (0-100)
 */
export function calculateSimilarity(
  signature1: PatternSignature,
  signature2: PatternSignature
): number {
  let totalScore = 0;
  let weights = 0;

  // Protocol distribution similarity (weight: 20)
  const protocols = new Set([
    ...Object.keys(signature1.protocolDistribution),
    ...Object.keys(signature2.protocolDistribution)
  ]);
  let protocolScore = 0;
  protocols.forEach(proto => {
    const diff = Math.abs(
      (signature1.protocolDistribution[proto] || 0) - 
      (signature2.protocolDistribution[proto] || 0)
    );
    protocolScore += (100 - diff) / protocols.size;
  });
  totalScore += protocolScore * 0.2;
  weights += 0.2;

  // Traffic characteristics similarity (weight: 15)
  const sizeRatio = Math.min(signature1.avgPacketSize, signature2.avgPacketSize) / 
                    Math.max(signature1.avgPacketSize, signature2.avgPacketSize);
  totalScore += sizeRatio * 100 * 0.15;
  weights += 0.15;

  // Packet rate similarity (weight: 10)
  const rateRatio = Math.min(signature1.packetRate, signature2.packetRate) / 
                    Math.max(signature1.packetRate || 1, signature2.packetRate || 1);
  totalScore += rateRatio * 100 * 0.1;
  weights += 0.1;

  // Communication pattern similarity (weight: 15)
  const ipRatio = Math.min(signature1.uniqueIPs, signature2.uniqueIPs) / 
                  Math.max(signature1.uniqueIPs, signature2.uniqueIPs);
  const dominanceRatio = Math.min(signature1.topTalkersDominance, signature2.topTalkersDominance) / 
                         Math.max(signature1.topTalkersDominance || 1, signature2.topTalkersDominance || 1);
  totalScore += (ipRatio * 50 + dominanceRatio * 50) * 0.15;
  weights += 0.15;

  // Error patterns similarity (weight: 25)
  const retransRatio = 100 - Math.abs(signature1.retransmissionRate - signature2.retransmissionRate);
  const errorRatio = 100 - Math.abs(signature1.errorRate - signature2.errorRate);
  const fragRatio = 100 - Math.abs(signature1.fragmentationRate - signature2.fragmentationRate);
  totalScore += ((retransRatio + errorRatio + fragRatio) / 3) * 0.25;
  weights += 0.25;

  // Timing pattern similarity (weight: 15)
  const varianceRatio = Math.min(
    signature1.timeDistribution.traffic_variance,
    signature2.timeDistribution.traffic_variance
  ) / Math.max(
    signature1.timeDistribution.traffic_variance || 1,
    signature2.timeDistribution.traffic_variance || 1
  );
  totalScore += varianceRatio * 100 * 0.15;
  weights += 0.15;

  return Number((totalScore / weights).toFixed(2));
}

/**
 * Predict potential issues based on pattern matching
 */
export function predictIssues(
  currentSignature: PatternSignature,
  learnedPatterns: LearnedPattern[]
): PredictionResult {
  const predictedIssues: PredictionResult['predictedIssues'] = [];
  const similarPatterns: PredictionResult['similarPatterns'] = [];
  const recommendations: string[] = [];

  // Find similar patterns
  learnedPatterns.forEach(pattern => {
    const similarity = calculateSimilarity(
      currentSignature,
      pattern.pattern_signature as PatternSignature
    );

    if (similarity >= 70) {
      similarPatterns.push({
        patternId: pattern.id,
        patternName: pattern.pattern_name,
        similarity,
        lastSeen: pattern.last_seen
      });

      // Predict issues based on historical patterns
      if (pattern.pattern_type === 'anomaly' && similarity >= 80) {
        predictedIssues.push({
          type: 'anomaly',
          description: `Similar anomaly pattern detected: ${pattern.pattern_name}`,
          confidence: pattern.confidence_score,
          severity: pattern.confidence_score >= 80 ? 'high' : 'medium',
          evidence: [
            `Pattern similarity: ${similarity}%`,
            `Historical occurrence: ${pattern.occurrence_count} times`,
            `Last seen: ${new Date(pattern.last_seen).toLocaleDateString()}`
          ],
          matchedPatternId: pattern.id
        });
      }
    }
  });

  // Analyze current signature for immediate issues
  if (currentSignature.retransmissionRate > 5) {
    predictedIssues.push({
      type: 'performance',
      description: 'High retransmission rate detected',
      confidence: Math.min(currentSignature.retransmissionRate * 10, 100),
      severity: currentSignature.retransmissionRate > 10 ? 'critical' : 'high',
      evidence: [
        `Retransmission rate: ${currentSignature.retransmissionRate}%`,
        'Possible network congestion or packet loss'
      ]
    });
    recommendations.push('Check network bandwidth and router configuration');
    recommendations.push('Monitor packet loss rates using ping tests');
  }

  if (currentSignature.errorRate > 2) {
    predictedIssues.push({
      type: 'security',
      description: 'Elevated error rate in packets',
      confidence: Math.min(currentSignature.errorRate * 15, 100),
      severity: currentSignature.errorRate > 5 ? 'high' : 'medium',
      evidence: [
        `Error rate: ${currentSignature.errorRate}%`,
        'Malformed or corrupted packets detected'
      ]
    });
    recommendations.push('Investigate for potential security attacks or hardware issues');
  }

  if (currentSignature.topTalkersDominance > 80) {
    predictedIssues.push({
      type: 'traffic',
      description: 'Traffic dominated by few sources',
      confidence: 75,
      severity: 'medium',
      evidence: [
        `Top 3 talkers account for ${currentSignature.topTalkersDominance}% of traffic`,
        'Potential bandwidth monopolization'
      ]
    });
    recommendations.push('Review QoS policies to ensure fair bandwidth distribution');
  }

  if (currentSignature.fragmentationRate > 10) {
    predictedIssues.push({
      type: 'performance',
      description: 'High packet fragmentation detected',
      confidence: 70,
      severity: 'medium',
      evidence: [
        `Fragmentation rate: ${currentSignature.fragmentationRate}%`,
        'MTU size mismatch likely'
      ]
    });
    recommendations.push('Adjust MTU settings to reduce fragmentation');
  }

  // Calculate overall risk score
  const riskScore = predictedIssues.reduce((score, issue) => {
    const severityWeight = {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      critical: 1.0
    };
    return score + (issue.confidence * severityWeight[issue.severity]);
  }, 0) / (predictedIssues.length || 1);

  // Sort by confidence
  predictedIssues.sort((a, b) => b.confidence - a.confidence);
  similarPatterns.sort((a, b) => b.similarity - a.similarity);

  return {
    predictedIssues,
    similarPatterns: similarPatterns.slice(0, 5), // Top 5
    recommendations,
    overallRiskScore: Number(Math.min(riskScore, 100).toFixed(2))
  };
}
