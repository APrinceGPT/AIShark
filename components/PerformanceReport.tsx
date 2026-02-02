/**
 * Performance Report Component
 * Displays network performance analysis and bottleneck detection
 */

'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Zap, Activity, Gauge, X } from 'lucide-react';
import { Packet, PacketStatistics } from '@/types/packet';
import { PerformanceReport as PerfReport } from '@/lib/performance-analyzer';
import { toast } from './ToastContainer';
import FormattedAIResponse from './FormattedAIResponse';

interface PerformanceReportProps {
  packets: Packet[];
  statistics: PacketStatistics;
  onClose: () => void;
  onPacketClick?: (packet: Packet) => void;
}

export default function PerformanceReport({ packets, statistics, onClose, onPacketClick }: PerformanceReportProps) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PerfReport | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');

  const analyzePerformance = async () => {
    if (packets.length === 0) {
      toast.error('No packets to analyze');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/analyze/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packets, statistics }),
      });

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
        setAiInsights(data.aiInsights);
        toast.success('Performance analysis complete');
      } else {
        toast.error(data.error || 'Analysis failed');
      }
    } catch (error) {
      toast.error('Failed to analyze performance');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      info: 'bg-blue-100 text-blue-800 border-blue-300',
    };
    return styles[severity as keyof typeof styles] || styles.info;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Analysis</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!report && !loading && (
            <div className="text-center py-12">
              <Gauge className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Analyze Network Performance
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Get detailed insights on latency, throughput, and bottlenecks
              </p>
              <button
                onClick={analyzePerformance}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Start Analysis
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Analyzing network performance...</p>
            </div>
          )}

          {report && (
            <div className="space-y-6">
              {/* Overall Score */}
              <div className="bg-linear-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Network Health Score</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Based on latency, reliability, throughput, and error rates</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getScoreColor(report.score)}`}>
                      {report.score}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">/ 100</div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  {Object.entries(report.scoreBreakdown).map(([key, value]) => (
                    <div key={key} className="bg-white dark:bg-gray-700 p-3 rounded border border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-1">
                        {key}
                      </div>
                      <div className={`text-2xl font-bold ${getScoreColor(value)}`}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <MetricCard
                    label="Avg Latency"
                    value={`${report.metrics.averageLatency.toFixed(0)}ms`}
                    icon={<Zap />}
                    trend={report.metrics.averageLatency < 50 ? 'good' : report.metrics.averageLatency < 200 ? 'warning' : 'bad'}
                  />
                  <MetricCard
                    label="P95 Latency"
                    value={`${report.metrics.p95Latency.toFixed(0)}ms`}
                    icon={<Zap />}
                    trend={report.metrics.p95Latency < 100 ? 'good' : report.metrics.p95Latency < 300 ? 'warning' : 'bad'}
                  />
                  <MetricCard
                    label="Throughput"
                    value={`${report.metrics.throughputMbps.toFixed(1)} Mbps`}
                    icon={<TrendingUp />}
                    trend="neutral"
                  />
                  <MetricCard
                    label="Retransmissions"
                    value={`${report.metrics.retransmissionRate.toFixed(2)}%`}
                    icon={<Activity />}
                    trend={report.metrics.retransmissionRate < 1 ? 'good' : report.metrics.retransmissionRate < 5 ? 'warning' : 'bad'}
                  />
                  <MetricCard
                    label="HTTP Errors"
                    value={`${report.metrics.httpErrorRate.toFixed(1)}%`}
                    icon={<AlertTriangle />}
                    trend={report.metrics.httpErrorRate < 5 ? 'good' : report.metrics.httpErrorRate < 15 ? 'warning' : 'bad'}
                  />
                  <MetricCard
                    label="DNS Failures"
                    value={`${report.metrics.dnsFailureRate.toFixed(1)}%`}
                    icon={<AlertTriangle />}
                    trend={report.metrics.dnsFailureRate < 2 ? 'good' : report.metrics.dnsFailureRate < 10 ? 'warning' : 'bad'}
                  />
                </div>
              </div>

              {/* Bottlenecks */}
              {report.bottlenecks.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Identified Bottlenecks ({report.bottlenecks.length})
                  </h3>
                  <div className="space-y-3">
                    {report.bottlenecks.map((bottleneck, index) => (
                      <div
                        key={index}
                        className={`p-4 border rounded-lg ${getSeverityBadge(bottleneck.severity)}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-semibold uppercase text-xs">
                              {bottleneck.severity}
                            </span>
                          </div>
                          <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded">
                            {bottleneck.type}
                          </span>
                        </div>
                        <p className="font-medium mb-2">{bottleneck.description}</p>
                        <p className="text-sm mb-2">
                          <strong>Recommendation:</strong> {bottleneck.recommendation}
                        </p>
                        {bottleneck.packets.length > 0 && (
                          <button
                            onClick={() => {
                              const firstPacket = packets.find(p => p.id === bottleneck.packets[0]);
                              if (firstPacket && onPacketClick) {
                                onPacketClick(firstPacket);
                                toast.success('Jumped to problem packet');
                              }
                            }}
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View {bottleneck.packets.length} affected packet(s) →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Insights */}
              {aiInsights && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">AI Analysis</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="prose max-w-none dark:prose-invert">
                      <FormattedAIResponse content={aiInsights} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend: 'good' | 'warning' | 'bad' | 'neutral';
}

function MetricCard({ label, value, icon, trend }: MetricCardProps) {
  const trendColors = {
    good: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400',
    warning: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-400',
    bad: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700 dark:text-red-400',
    neutral: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-700/30 dark:border-gray-600 dark:text-gray-400',
  };

  const trendIcons = {
    good: <CheckCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    bad: <TrendingDown className="w-4 h-4" />,
    neutral: <Activity className="w-4 h-4" />,
  };

  return (
    <div className={`p-4 rounded-lg border ${trendColors[trend]}`}>
      <div className="flex items-center gap-2 mb-1">
        {trendIcons[trend]}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
