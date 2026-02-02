'use client';

import { useState } from 'react';
import { AnalysisResult } from '@/types/packet';
import { formatTimestamp } from '@/lib/utils';
import FormattedAIResponse from './FormattedAIResponse';

interface AnalysisReportProps {
  analysis: AnalysisResult | null;
  onPacketClick: (packetId: number) => void;
}

export default function AnalysisReport({ analysis, onPacketClick }: AnalysisReportProps) {
  const [activeTab, setActiveTab] = useState<'insights' | 'latency' | 'errors'>('insights');

  if (!analysis) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Analysis Report</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'insights'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Insights ({analysis.insights.length})
          </button>
          <button
            onClick={() => setActiveTab('latency')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'latency'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Latency Issues ({analysis.latencyIssues.length})
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'errors'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Errors ({analysis.errors.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3">
        {activeTab === 'insights' && (
          <div>
            {analysis.insights.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-medium">No issues detected</p>
                <p className="text-sm mt-1">The capture looks healthy!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysis.insights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                      <FormattedAIResponse content={insight} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'latency' && (
          <div>
            {analysis.latencyIssues.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No latency issues detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.latencyIssues.map((issue, index) => (
                  <div
                    key={index}
                    onClick={() => onPacketClick(issue.packetId)}
                    className="p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {issue.source} → {issue.destination}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {formatTimestamp(issue.timestamp)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {issue.latency.toFixed(0)}ms
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">Packet #{issue.packetId + 1}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'errors' && (
          <div>
            {analysis.errors.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No errors detected</p>
              </div>
            ) : (
              <div className="space-y-2">
                {analysis.errors.map((error, index) => (
                  <div
                    key={index}
                    onClick={() => onPacketClick(error.packetId)}
                    className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-red-700 dark:text-red-400">
                          {error.type.toUpperCase()}
                        </div>
                        <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {error.description}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {formatTimestamp(error.timestamp)}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Packet #{error.packetId + 1}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
