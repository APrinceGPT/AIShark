import { useState } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { Bot, AlertTriangle, Sparkles, FileSearch, Wrench } from 'lucide-react';
import { aiCache } from '@/lib/ai-cache';
import { toast } from './ToastContainer';
import FormattedAIResponse from './FormattedAIResponse';
import RemediationGuide from './RemediationGuide';

interface AIInsightsProps {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
  onPacketClick?: (packetId: number) => void;
}

export default function AIInsights({ packets, statistics, analysis, onPacketClick }: AIInsightsProps) {
  const [summary, setSummary] = useState<string>('');
  const [anomalies, setAnomalies] = useState<string>('');
  const [troubleshootAnalysis, setTroubleshootAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<'summary' | 'anomaly' | 'troubleshoot' | null>(null);
  const [error, setError] = useState<string>('');
  const [showRemediationGuide, setShowRemediationGuide] = useState(false);

  const generateSummary = async () => {
    if (packets.length === 0) {
      setError('No packets to analyze');
      return;
    }

    setLoading('summary');
    setError('');

    try {
      // Check cache first
      const cacheKey = { packets: packets.length, statistics, analysis };
      const cached = aiCache.get('/api/analyze/summary', cacheKey);
      
      if (cached) {
        setSummary(cached.summary);
        toast.success('Loaded from cache');
        setLoading(null);
        return;
      }

      const response = await fetch('/api/analyze/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packets, statistics, analysis }),
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.summary);
        aiCache.set('/api/analyze/summary', cacheKey, data);
        toast.success('Summary generated successfully');
      } else {
        setError(data.error || 'Failed to generate summary');
        toast.error(data.error || 'Failed to generate summary');
      }
    } catch (err) {
      const errorMsg = 'Network error: ' + (err instanceof Error ? err.message : 'Unknown error');
      setError(errorMsg);
      toast.error(errorMsg);
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
      // Check cache first
      const cacheKey = { packets: packets.length, statistics, analysis };
      const cached = aiCache.get('/api/analyze/anomaly', cacheKey);
      
      if (cached) {
        setAnomalies(cached.analysis);
        toast.success('Loaded from cache');
        setLoading(null);
        return;
      }

      const response = await fetch('/api/analyze/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packets, statistics, analysis }),
      });

      const data = await response.json();

      if (data.success) {
        setAnomalies(data.analysis);
        aiCache.set('/api/analyze/anomaly', cacheKey, data);
        toast.success('Anomalies detected successfully');
      } else {
        setError(data.error || 'Failed to detect anomalies');
        toast.error(data.error || 'Failed to detect anomalies');
      }
    } catch (err) {
      const errorMsg = 'Network error: ' + (err instanceof Error ? err.message : 'Unknown error');
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(null);
    }
  };

  const deepTroubleshoot = async () => {
    if (packets.length === 0) {
      setError('No packets to analyze');
      return;
    }

    setLoading('troubleshoot');
    setError('');

    try {
      // Check cache first
      const cacheKey = { packets: packets.length, statistics, analysis };
      const cached = aiCache.get('/api/analyze/troubleshoot', cacheKey);
      
      if (cached) {
        setTroubleshootAnalysis(cached.analysis);
        setShowRemediationGuide(true);
        toast.success('Loaded from cache');
        setLoading(null);
        return;
      }

      // Default problem description if no anomalies found yet
      const problem = anomalies || 
        'Analyze this network capture for potential issues, performance problems, or misconfigurations.';

      const response = await fetch('/api/analyze/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          packets, 
          statistics, 
          analysis,
          problem 
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTroubleshootAnalysis(data.analysis);
        setShowRemediationGuide(true);
        aiCache.set('/api/analyze/troubleshoot', cacheKey, data);
        toast.success('Deep troubleshooting complete');
      } else {
        setError(data.error || 'Failed to generate troubleshooting guide');
        toast.error(data.error || 'Failed to generate troubleshooting guide');
      }
    } catch (err) {
      const errorMsg = 'Network error: ' + (err instanceof Error ? err.message : 'Unknown error');
      setError(errorMsg);
      toast.error(errorMsg);
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
          <button
            onClick={deepTroubleshoot}
            disabled={loading !== null || packets.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading === 'troubleshoot' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Wrench className="w-4 h-4" />
            Deep Troubleshoot
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
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Capture Summary
          </h3>
          <div className="prose prose-sm text-gray-700">
            {onPacketClick ? (
              <FormattedAIResponse text={summary} onPacketClick={onPacketClick} />
            ) : (
              <div className="whitespace-pre-wrap">{summary}</div>
            )}
          </div>
        </div>
      )}

      {anomalies && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Anomaly Detection
          </h3>
          <div className="prose prose-sm text-gray-700">
            {onPacketClick ? (
              <FormattedAIResponse text={anomalies} onPacketClick={onPacketClick} />
            ) : (
              <div className="whitespace-pre-wrap">{anomalies}</div>
            )}
          </div>
        </div>
      )}

      {!summary && !anomalies && !error && packets.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileSearch className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="mb-2">Get AI-powered insights about your capture</p>
          <p className="text-sm">Click the buttons above to analyze your packet data</p>
        </div>
      )}

      {packets.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>Upload a packet capture to enable AI analysis</p>
        </div>
      )}

      {/* Remediation Guide Modal */}
      {showRemediationGuide && troubleshootAnalysis && (
        <RemediationGuide
          analysis={troubleshootAnalysis}
          onClose={() => setShowRemediationGuide(false)}
        />
      )}
    </div>
  );
}
