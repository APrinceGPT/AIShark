import { useState } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { Bot, AlertTriangle } from 'lucide-react';

interface AIInsightsProps {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
}

export default function AIInsights({ packets, statistics, analysis }: AIInsightsProps) {
  const [summary, setSummary] = useState<string>('');
  const [anomalies, setAnomalies] = useState<string>('');
  const [loading, setLoading] = useState<'summary' | 'anomaly' | null>(null);
  const [error, setError] = useState<string>('');

  const generateSummary = async () => {
    if (packets.length === 0) {
      setError('No packets to analyze');
      return;
    }

    setLoading('summary');
    setError('');

    try {
      const response = await fetch('/api/analyze/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packets, statistics, analysis }),
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
      } else {
        setError(data.error || 'Failed to generate summary');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(null);
    }
  };

  const detectAnomalies = async () => {
    if (packets.length === 0) {
      setError('No packets to analyze');
      return;
    }

    setLoading('anomaly');
    setError('');

    try {
      const response = await fetch('/api/analyze/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packets, statistics, analysis }),
      });

      const data = await response.json();

      if (data.success) {
        setAnomalies(data.analysis);
      } else {
        setError(data.error || 'Failed to detect anomalies');
      }
    } catch (err) {
      setError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600" />
          AI Insights
        </h2>
        <div className="flex gap-2">
          <button
            onClick={generateSummary}
            disabled={loading !== null || packets.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading === 'summary' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Generate Summary
          </button>
          <button
            onClick={detectAnomalies}
            disabled={loading !== null || packets.length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading === 'anomaly' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            Detect Anomalies
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {summary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">≡ƒôï Capture Summary</h3>
          <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
            {summary}
          </div>
        </div>
      )}

      {anomalies && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 mb-2">ΓÜá∩╕Å Anomaly Detection</h3>
          <div className="prose prose-sm text-gray-700 whitespace-pre-wrap">
            {anomalies}
          </div>
        </div>
      )}

      {!summary && !anomalies && !error && packets.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-2">≡ƒÜÇ Get AI-powered insights about your capture</p>
          <p className="text-sm">Click the buttons above to analyze your packet data</p>
        </div>
      )}

      {packets.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>Upload a packet capture to enable AI analysis</p>
        </div>
      )}
    </div>
  );
}
