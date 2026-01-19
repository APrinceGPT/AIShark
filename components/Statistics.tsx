'use client';

import { PacketStatistics } from '@/types/packet';
import { formatBytes } from '@/lib/utils';

interface StatisticsProps {
  stats: PacketStatistics | null;
}

export default function Statistics({ stats }: StatisticsProps) {
  if (!stats) return null;

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Capture Statistics</h2>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Total Packets</div>
          <div className="text-2xl font-bold text-blue-900">{stats.totalPackets.toLocaleString()}</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Total Data</div>
          <div className="text-2xl font-bold text-green-900">{formatBytes(stats.bandwidth.total)}</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium">Avg Rate</div>
          <div className="text-2xl font-bold text-purple-900">
            {formatBytes(stats.bandwidth.perSecond)}/s
          </div>
        </div>
        
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">Errors</div>
          <div className="text-2xl font-bold text-red-900">
            {stats.errors.retransmissions + stats.errors.duplicateAcks + stats.errors.resets}
          </div>
        </div>
      </div>

      {/* Protocol Distribution */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Protocol Distribution</h3>
        <div className="space-y-2">
          {Object.entries(stats.protocolDistribution)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([protocol, count]) => {
              const percentage = (count / stats.totalPackets) * 100;
              return (
                <div key={protocol} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium text-gray-700">{protocol}</div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div
                      className="bg-blue-500 h-6 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                      {count} ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Top Talkers */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Top Conversations</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Packets</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bytes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.topTalkers.slice(0, 10).map((talker, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-mono text-gray-900">{talker.source}</td>
                  <td className="px-4 py-2 text-sm font-mono text-gray-900">{talker.destination}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900">{talker.packets}</td>
                  <td className="px-4 py-2 text-sm text-right text-gray-900">{formatBytes(talker.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error Summary */}
      {(stats.errors.retransmissions > 0 || stats.errors.duplicateAcks > 0 || stats.errors.resets > 0) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Error Summary</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            {stats.errors.retransmissions > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-700">TCP Retransmissions:</span>
                <span className="font-semibold text-red-900">{stats.errors.retransmissions}</span>
              </div>
            )}
            {stats.errors.duplicateAcks > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-700">Duplicate ACKs:</span>
                <span className="font-semibold text-red-900">{stats.errors.duplicateAcks}</span>
              </div>
            )}
            {stats.errors.resets > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-red-700">Connection Resets:</span>
                <span className="font-semibold text-red-900">{stats.errors.resets}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
