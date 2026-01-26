import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

interface Capture {
  name: string;
  packets: Packet[];
  statistics: PacketStatistics;
  analysis: AnalysisResult;
  timestamp: number;
}

interface CompareProps {
  captures: Capture[];
}

export default function CompareCaptures({ captures }: CompareProps) {
  const [selectedBefore, setSelectedBefore] = useState<number>(0);
  const [selectedAfter, setSelectedAfter] = useState<number>(captures.length > 1 ? 1 : 0);
  const [comparison, setComparison] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (selectedBefore === selectedAfter) {
      setError('Please select two different captures to compare');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/analyze/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          before: captures[selectedBefore],
          after: captures[selectedAfter],
        }),
      });

      const data = await response.json();

      if (data.success) {
        setComparison(data.comparison);
      } else {
        setError(data.error || 'Failed to compare captures');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (captures.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Captures to Compare</h3>
        <p className="text-gray-600 dark:text-gray-400">Upload multiple PCAP files to enable comparison</p>
      </div>
    );
  }

  if (captures.length === 1) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center">
        <svg className="w-16 h-16 mx-auto text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Another Capture</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">You need at least 2 captures to compare</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">Currently loaded: <strong className="text-gray-900 dark:text-white">{captures[0].name}</strong></p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capture Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          Compare Captures
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Before Capture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Before (Baseline)
            </label>
            <select
              value={selectedBefore}
              onChange={(e) => setSelectedBefore(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {captures.map((capture, idx) => (
                <option key={idx} value={idx}>
                  {capture.name} ({capture.packets.length} packets)
                </option>
              ))}
            </select>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {new Date(captures[selectedBefore].timestamp).toLocaleString()}
            </div>
          </div>

          {/* After Capture */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              After (Current)
            </label>
            <select
              value={selectedAfter}
              onChange={(e) => setSelectedAfter(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {captures.map((capture, idx) => (
                <option key={idx} value={idx}>
                  {capture.name} ({capture.packets.length} packets)
                </option>
              ))}
            </select>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {new Date(captures[selectedAfter].timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={loading || selectedBefore === selectedAfter}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Compare with AI
            </>
          )}
        </button>

        {selectedBefore === selectedAfter && (
          <p className="mt-2 text-sm text-amber-600 text-center">
            ⚠️ Please select two different captures
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Comparison Results */}
      {comparison && (
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">AI Comparison Results</h3>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 prose prose-sm dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {comparison}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Compared: <strong className="text-gray-900 dark:text-white">{captures[selectedBefore].name}</strong> vs <strong className="text-gray-900 dark:text-white">{captures[selectedAfter].name}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats Comparison */}
      {!loading && !comparison && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Packets</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {captures[selectedBefore].packets.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Before</div>
            </div>

            <div className="flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>

            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Packets</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {captures[selectedAfter].packets.length}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">After</div>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
            Click "Compare with AI" to get detailed insights
          </div>
        </div>
      )}
    </div>
  );
}
