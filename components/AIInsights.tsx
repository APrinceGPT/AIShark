'use client';

import { useState, useMemo } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { Bot, AlertTriangle, Sparkles, FileSearch, Wrench } from 'lucide-react';
import { aiCache } from '@/lib/ai-cache';
import { toast } from './ToastContainer';
import FormattedAIResponse from './FormattedAIResponse';
import TroubleshootingResults from './TroubleshootingResults';
import SummaryDashboardCard, { SeverityCounts } from './SummaryDashboardCard';
import ExpandableSection from './ExpandableSection';
import { extractSeverityCounts, extractKeyFinding } from '@/lib/ai-response-parser';

interface AIInsightsProps {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
  onPacketClick?: (packetId: number) => void;
  sessionId?: string | null;
}

/**
 * AIInsights Component - Refactored with Compact Display
 * 
 * Features:
 * - Summary Dashboard Card with severity badges
 * - Expandable sections for detailed results
 * - Dark/light mode support
 * - Responsive layout
 */
export default function AIInsights({ packets, statistics, analysis, onPacketClick, sessionId }: AIInsightsProps) {
  const [summary, setSummary] = useState<string>('');
  const [anomalies, setAnomalies] = useState<string>('');
  const [troubleshootAnalysis, setTroubleshootAnalysis] = useState<string>('');
  const [loading, setLoading] = useState<'summary' | 'anomaly' | 'troubleshoot' | null>(null);
  const [error, setError] = useState<string>('');
  const [showTroubleshootingResults, setShowTroubleshootingResults] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract severity counts from AI responses
  const severityCounts = useMemo((): SeverityCounts => {
    const combinedText = `${summary} ${anomalies}`;
    if (!combinedText.trim()) {
      return { critical: 0, warning: 0, info: 0 };
    }
    return extractSeverityCounts(combinedText);
  }, [summary, anomalies]);

  // Extract key finding from responses
  const keyFinding = useMemo((): string | null => {
    const combinedText = `${anomalies} ${summary}`;
    if (!combinedText.trim()) return null;
    return extractKeyFinding(combinedText);
  }, [summary, anomalies]);

  // Check if we have any results to show
  const hasResults = summary || anomalies;

  const generateSummary = async () => {
    if (packets.length === 0) {
      setError('No packets to analyze');
      return;
    }

    setLoading('summary');
    setError('');

    try {
      const cacheKey = { packets: packets.length, statistics, analysis };
      const cached = aiCache.get('/api/analyze/summary', cacheKey);
      
      if (cached) {
        setSummary(cached.summary);
        toast.success('Loaded from cache');
        setLoading(null);
        return;
      }

      const requestBody = sessionId
        ? { sessionId, statistics, analysis }
        : { packets, statistics, analysis };

      const response = await fetch('/api/analyze/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
      const cacheKey = { packets: packets.length, statistics, analysis };
      const cached = aiCache.get('/api/analyze/anomaly', cacheKey);
      
      if (cached) {
        setAnomalies(cached.analysis);
        toast.success('Loaded from cache');
        setLoading(null);
        return;
      }

      const requestBody = sessionId
        ? { sessionId, statistics, analysis }
        : { packets, statistics, analysis };

      const response = await fetch('/api/analyze/anomaly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
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
      const cacheKey = { packets: packets.length, statistics, analysis };
      const cached = aiCache.get('/api/analyze/troubleshoot', cacheKey);
      
      if (cached) {
        setTroubleshootAnalysis(cached.analysis);
        setShowTroubleshootingResults(true);
        toast.success('Loaded from cache');
        setLoading(null);
        return;
      }

      const problem = anomalies || 
        'Analyze this network capture for potential issues, performance problems, or misconfigurations.';

      const requestBody = sessionId
        ? { sessionId, statistics, analysis, problem }
        : { packets, statistics, analysis, problem };

      const response = await fetch('/api/analyze/troubleshoot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        setTroubleshootAnalysis(data.analysis);
        setShowTroubleshootingResults(true);
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
      {/* Header with action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          AI Insights
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={generateSummary}
            disabled={loading !== null || packets.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {loading === 'summary' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Sparkles className="w-4 h-4" />
            Generate Summary
          </button>
          <button
            onClick={detectAnomalies}
            disabled={loading !== null || packets.length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {loading === 'anomaly' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <AlertTriangle className="w-4 h-4" />
            Detect Anomalies
          </button>
          <button
            onClick={deepTroubleshoot}
            disabled={loading !== null || packets.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {loading === 'troubleshoot' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Wrench className="w-4 h-4" />
            Deep Troubleshoot
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Results Display - Compact Summary Card */}
      {hasResults && (
        <SummaryDashboardCard
          packetCount={packets.length}
          severityCounts={severityCounts}
          statistics={statistics}
          keyFinding={keyFinding || undefined}
          defaultExpanded={isExpanded}
          onExpandChange={setIsExpanded}
        >
          {/* Expandable Detail Sections */}
          <div className="space-y-3">
            {summary && (
              <ExpandableSection
                icon={<Sparkles className="w-5 h-5" />}
                title="Capture Summary"
                accentColor="text-blue-600"
                accentColorDark="text-blue-400"
                defaultOpen={true}
                showCopyButton={true}
                copyContent={summary}
              >
                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                  <FormattedAIResponse content={summary} onPacketClick={onPacketClick} />
                </div>
              </ExpandableSection>
            )}

            {anomalies && (
              <ExpandableSection
                icon={<AlertTriangle className="w-5 h-5" />}
                title="Anomaly Detection"
                badge={severityCounts.critical + severityCounts.warning}
                accentColor="text-orange-600"
                accentColorDark="text-orange-400"
                defaultOpen={severityCounts.critical > 0}
                showCopyButton={true}
                copyContent={anomalies}
              >
                <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                  <FormattedAIResponse content={anomalies} onPacketClick={onPacketClick} />
                </div>
              </ExpandableSection>
            )}
          </div>
        </SummaryDashboardCard>
      )}

      {/* Empty State */}
      {!hasResults && !error && packets.length > 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <FileSearch className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
          <p className="mb-2">Get AI-powered insights about your capture</p>
          <p className="text-sm">Click the buttons above to analyze your packet data</p>
        </div>
      )}

      {/* No packets state */}
      {packets.length === 0 && (
        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
          <p>Upload a packet capture to enable AI analysis</p>
        </div>
      )}

      {/* Troubleshooting Results Modal */}
      {showTroubleshootingResults && troubleshootAnalysis && (
        <TroubleshootingResults
          analysis={troubleshootAnalysis}
          onClose={() => setShowTroubleshootingResults(false)}
        />
      )}
    </div>
  );
}
