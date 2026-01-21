'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus, X } from 'lucide-react';
import { AnalysisSession } from '@/types/database';
import { loadSession, LoadSessionData } from '@/lib/session-manager';
import { toast } from './ToastContainer';

interface SessionComparisonProps {
  session1Id: string;
  session2Id: string;
  onClose: () => void;
}

interface ComparisonData {
  session1: LoadSessionData | null;
  session2: LoadSessionData | null;
}

export function SessionComparison({ session1Id, session2Id, onClose }: SessionComparisonProps) {
  const [data, setData] = useState<ComparisonData>({ session1: null, session2: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComparisonData();
  }, [session1Id, session2Id]);

  const loadComparisonData = async () => {
    setLoading(true);
    try {
      const [s1, s2] = await Promise.all([
        loadSession(session1Id),
        loadSession(session2Id),
      ]);

      if (!s1 || !s2) {
        toast.error('Failed to load one or both sessions');
        return;
      }

      setData({ session1: s1, session2: s2 });
    } catch (error) {
      toast.error('Failed to load comparison data');
      console.error('Comparison load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const calculateDiff = (val1: number, val2: number): { diff: number; percentage: number; direction: 'up' | 'down' | 'same' } => {
    const diff = val2 - val1;
    const percentage = val1 === 0 ? (val2 > 0 ? 100 : 0) : (diff / val1) * 100;
    const direction = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
    return { diff, percentage, direction };
  };

  const DiffIndicator = ({ direction, percentage }: { direction: 'up' | 'down' | 'same'; percentage: number }) => {
    if (direction === 'same') {
      return (
        <div className="flex items-center gap-1 text-gray-500">
          <Minus className="w-4 h-4" />
          <span className="text-sm font-medium">No change</span>
        </div>
      );
    }

    const isIncrease = direction === 'up';
    return (
      <div className={`flex items-center gap-1 ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
        {isIncrease ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span className="text-sm font-medium">
          {isIncrease ? '+' : ''}{percentage.toFixed(1)}%
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading comparison...</p>
        </div>
      </div>
    );
  }

  if (!data.session1 || !data.session2) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <p className="text-red-600 mb-4">Failed to load session data</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const { session1, session2 } = data;
  
  // Calculate differences
  const packetDiff = calculateDiff(session1.session.packet_count, session2.session.packet_count);
  const sizeDiff = calculateDiff(session1.session.file_size, session2.session.file_size);

  // Protocol comparison
  const allProtocols = Array.from(
    new Set([
      ...Object.keys(session1.statistics.protocolDistribution),
      ...Object.keys(session2.statistics.protocolDistribution),
    ])
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Session Comparison</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Session Names */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-1">{session1.session.name}</h3>
              <p className="text-sm text-blue-700">{session1.session.file_name}</p>
              <p className="text-xs text-blue-600 mt-1">
                {new Date(session1.session.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <h3 className="font-semibold text-green-900 mb-1">{session2.session.name}</h3>
              <p className="text-sm text-green-700">{session2.session.file_name}</p>
              <p className="text-xs text-green-600 mt-1">
                {new Date(session2.session.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Basic Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Statistics</h3>
            <div className="space-y-4">
              {/* Packet Count */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Packet Count</span>
                  <DiffIndicator direction={packetDiff.direction} percentage={packetDiff.percentage} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-100 rounded">
                    <p className="text-2xl font-bold text-blue-900">
                      {session1.session.packet_count.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-100 rounded">
                    <p className="text-2xl font-bold text-green-900">
                      {session2.session.packet_count.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* File Size */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">File Size</span>
                  <DiffIndicator direction={sizeDiff.direction} percentage={sizeDiff.percentage} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-100 rounded">
                    <p className="text-2xl font-bold text-blue-900">
                      {formatFileSize(session1.session.file_size)}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-100 rounded">
                    <p className="text-2xl font-bold text-green-900">
                      {formatFileSize(session2.session.file_size)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Protocol Distribution */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Protocol Distribution</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-3">
                {allProtocols.map((protocol) => {
                  const count1 = session1.statistics.protocolDistribution[protocol] || 0;
                  const count2 = session2.statistics.protocolDistribution[protocol] || 0;
                  const diff = calculateDiff(count1, count2);
                  
                  return (
                    <div key={protocol} className="border-b border-gray-200 last:border-0 pb-3 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-800">{protocol}</span>
                        <DiffIndicator direction={diff.direction} percentage={diff.percentage} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between px-3 py-2 bg-blue-100 rounded">
                          <span className="text-sm text-blue-700">Count:</span>
                          <span className="font-semibold text-blue-900">{count1.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between px-3 py-2 bg-green-100 rounded">
                          <span className="text-sm text-green-700">Count:</span>
                          <span className="font-semibold text-green-900">{count2.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Errors Comparison */}
          {(session1.statistics.errors.retransmissions > 0 || session2.statistics.errors.retransmissions > 0) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Issues</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">TCP Retransmissions</span>
                  <DiffIndicator 
                    direction={calculateDiff(
                      session1.statistics.errors.retransmissions,
                      session2.statistics.errors.retransmissions
                    ).direction}
                    percentage={calculateDiff(
                      session1.statistics.errors.retransmissions,
                      session2.statistics.errors.retransmissions
                    ).percentage}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-100 rounded">
                    <p className="text-2xl font-bold text-blue-900">
                      {session1.statistics.errors.retransmissions}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-green-100 rounded">
                    <p className="text-2xl font-bold text-green-900">
                      {session2.statistics.errors.retransmissions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
