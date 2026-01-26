'use client';

import React, { useState } from 'react';
import { Packet, PacketStatistics } from '@/types/packet';
import { Brain, TrendingUp, AlertCircle, CheckCircle, Clock, Target } from 'lucide-react';
import { toast } from './ToastContainer';
import FormattedAIResponse from './FormattedAIResponse';

interface PredictedIssue {
  type: 'traffic' | 'anomaly' | 'performance' | 'security';
  description: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
  matchedPatternId?: string;
}

interface SimilarPattern {
  patternId: string;
  patternName: string;
  similarity: number;
  lastSeen: string;
}

interface PredictionResult {
  predictedIssues: PredictedIssue[];
  similarPatterns: SimilarPattern[];
  recommendations: string[];
  overallRiskScore: number;
}

interface PredictiveInsightsProps {
  packets: Packet[];
  statistics: PacketStatistics | null;
  onClose: () => void;
  onPacketClick?: (packetId: number) => void;
}

/**
 * PredictiveInsights Component
 * Displays ML-based network predictions and pattern analysis
 */
export default function PredictiveInsights({ 
  packets, 
  statistics, 
  onClose,
  onPacketClick 
}: PredictiveInsightsProps) {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [learnedPatternsCount, setLearnedPatternsCount] = useState(0);

  const runPrediction = async () => {
    if (packets.length === 0) {
      toast.error('No packets to analyze');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/analyze/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packets, statistics })
      });

      const data = await response.json();

      if (data.success) {
        setPrediction(data.prediction);
        setAiInsights(data.aiInsights);
        setLearnedPatternsCount(data.learnedPatternsCount);
        toast.success('Predictive analysis complete');
      } else {
        toast.error(data.error || 'Prediction failed');
      }
    } catch (err) {
      const errorMsg = 'Network error: ' + (err instanceof Error ? err.message : 'Unknown');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-900';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-900';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-900';
      default: return 'bg-gray-100 border-gray-300 text-gray-900';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high': return <AlertCircle className="w-5 h-5" />;
      case 'medium': return <Clock className="w-5 h-5" />;
      case 'low': return <CheckCircle className="w-5 h-5" />;
      default: return <Target className="w-5 h-5" />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 75) return 'text-red-600';
    if (score >= 50) return 'text-orange-600';
    if (score >= 25) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Predictive Network Analysis</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">ML-based pattern recognition and issue prediction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!prediction && !loading && (
            <div className="text-center py-12">
              <Brain className="w-20 h-20 mx-auto mb-4 text-purple-400 dark:text-purple-500" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Predict Future Network Issues
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
                Analyze your current capture against historical patterns to identify potential problems 
                before they impact your network. Our ML engine learns from past captures to provide 
                proactive insights.
              </p>
              <button
                onClick={runPrediction}
                disabled={packets.length === 0}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                <TrendingUp className="w-5 h-5" />
                Run Predictive Analysis
              </button>
              {packets.length === 0 && (
                <p className="text-sm text-red-500 mt-3">No packets loaded. Upload a capture first.</p>
              )}
            </div>
          )}

          {loading && (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Analyzing patterns and predicting issues...</p>
            </div>
          )}

          {prediction && (
            <div className="space-y-6">
              {/* Risk Score Overview */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Overall Risk Assessment</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Based on {learnedPatternsCount} learned patterns
                    </p>
                  </div>
                  <div className="text-center">
                    <div className={`text-5xl font-bold ${getRiskScoreColor(prediction.overallRiskScore)}`}>
                      {prediction.overallRiskScore}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Risk Score</p>
                  </div>
                </div>
              </div>

              {/* Predicted Issues */}
              {prediction.predictedIssues.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Predicted Issues ({prediction.predictedIssues.length})
                  </h3>
                  <div className="space-y-3">
                    {prediction.predictedIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-4 ${getSeverityColor(issue.severity)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(issue.severity)}
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold">{issue.description}</h4>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium px-2 py-1 bg-white dark:bg-gray-700 rounded">
                                  {issue.type.toUpperCase()}
                                </span>
                                <span className="text-xs font-medium px-2 py-1 bg-white dark:bg-gray-700 rounded">
                                  {issue.confidence}% confidence
                                </span>
                              </div>
                            </div>
                            <div className="text-sm space-y-1">
                              <p className="font-medium">Evidence:</p>
                              <ul className="list-disc list-inside ml-2">
                                {issue.evidence.map((ev, i) => (
                                  <li key={i}>{ev}</li>
                                ))}
                              </ul>
                            </div>
                            {issue.matchedPatternId && (
                              <p className="text-xs mt-2 opacity-75">
                                Matched historical pattern: {issue.matchedPatternId.substring(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Similar Patterns */}
              {prediction.similarPatterns.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Similar Historical Patterns ({prediction.similarPatterns.length})
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {prediction.similarPatterns.map((pattern, idx) => (
                      <div key={idx} className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-200">{pattern.patternName}</h4>
                          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            {pattern.similarity}% match
                          </span>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {prediction.recommendations.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Proactive Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {prediction.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-green-800 dark:text-green-300">
                        <span className="font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Insights */}
              {aiInsights && (
                <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-200 mb-3 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    AI Predictive Insights
                  </h3>
                  <div className="text-purple-800 dark:text-purple-300 text-sm prose prose-sm dark:prose-invert">
                    <FormattedAIResponse content={aiInsights} onPacketClick={onPacketClick} />
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
