'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Calendar, Eye, Clock, AlertCircle, CheckCircle, Info, Download } from 'lucide-react';
import Statistics from '@/components/Statistics';
import { PacketStatistics } from '@/types/packet';
import { generatePDF, downloadPDF } from '@/lib/pdf-export';
import FormattedAIResponse from '@/components/FormattedAIResponse';

interface ShareData {
  share: {
    id: string;
    token: string;
    expiresAt: string | null;
    viewCount: number;
    createdAt: string;
  };
  session: {
    id: string;
    name: string;
    file_name: string;
    file_size: number;
    packet_count: number;
    created_at: string;
  };
  statistics: any;
  insights: Array<{
    id: string;
    insight_type: 'summary' | 'anomaly' | 'chat';
    question: string | null;
    response: string;
    created_at: string;
  }>;
  annotations: Array<{
    id: string;
    packet_number: number;
    annotation: string | null;
    severity: 'info' | 'warning' | 'critical';
    created_at: string;
  }>;
}

export default function ShareViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchShareData = async () => {
      try {
        const response = await fetch(`/api/share/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Failed to load shared analysis');
          setLoading(false);
          return;
        }

        setShareData(data);
      } catch (err) {
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading shared analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Share</h1>
          <p className="text-gray-600 mb-6">
            {error || 'This share link may have expired or been revoked.'}
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Go to AIShark
          </a>
        </div>
      </div>
    );
  }

  const { share, session, statistics, insights, annotations } = shareData;

  const handleExportPDF = async () => {
    if (!shareData || exportingPDF) return;

    setExportingPDF(true);
    try {
      const shareUrl = `${window.location.origin}/share/${token}`;
      
      // Convert insights to match expected format
      const formattedInsights = insights.map(insight => ({
        id: insight.id,
        session_id: session.id,
        insight_type: insight.insight_type,
        question: insight.question,
        response: insight.response,
        created_at: insight.created_at,
      }));

      const pdfBlob = await generatePDF({
        session: {
          id: session.id,
          user_id: '',
          name: session.name,
          file_name: session.file_name,
          file_size: session.file_size,
          packet_count: session.packet_count,
          created_at: session.created_at,
          updated_at: session.created_at,
        },
        statistics,
        insights: formattedInsights,
        shareToken: token,
        shareUrl,
      });

      const filename = `${session.name.replace(/[^a-zA-Z0-9]/g, '_')}_Analysis_Report.pdf`;
      downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setExportingPDF(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Convert statistics to match PacketStatistics type
  const convertedStats: PacketStatistics | null = statistics ? {
    totalPackets: session.packet_count,
    protocolDistribution: statistics.protocol_distribution || {},
    topTalkers: (statistics.top_talkers || []).map((t: any) => ({
      source: t.address || '',
      destination: '',
      packets: t.packets || 0,
      bytes: t.bytes || 0,
    })),
    errors: {
      retransmissions: 0,
      duplicateAcks: 0,
      resets: 0,
    },
    bandwidth: {
      total: session.file_size,
      perSecond: 0,
    },
  } : null;

  return (
    <div className="min-h-screen bg-linear-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-8 h-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">AIShark</h1>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                  SHARED ANALYSIS
                </span>
              </div>
              <p className="text-gray-600">Read-only view of shared packet analysis</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                disabled={exportingPDF}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${
                  exportingPDF
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Download className="w-5 h-5" />
                {exportingPDF ? 'Generating PDF...' : 'Export PDF'}
              </button>
              <a
                href="/"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Try AIShark
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Session Info Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{session.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">File Name</p>
                <p className="font-medium text-gray-900">{session.file_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(session.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">File Size</p>
                <p className="font-medium text-gray-900">{formatFileSize(session.file_size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Packets</p>
                <p className="font-medium text-gray-900">{session.packet_count.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Share Info Card */}
        <div className="bg-linear-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 mb-2">Share Information</p>
              <div className="flex flex-wrap gap-4 text-xs text-blue-700">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {share.viewCount} view{share.viewCount !== 1 ? 's' : ''}
                </span>
                {share.expiresAt ? (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires: {formatDate(share.expiresAt)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Never expires
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {convertedStats && (
          <div className="mb-6">
            <Statistics stats={convertedStats} />
          </div>
        )}

        {/* AI Insights */}
        {insights.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Insights
            </h3>
            <div className="space-y-4">
              {insights.map((insight, idx) => (
                <div key={insight.id} className="border-l-4 border-purple-500 pl-4">
                  {insight.question && (
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Q: {insight.question}
                    </p>
                  )}
                  <div className="text-sm text-gray-600">
                    <FormattedAIResponse content={insight.response} />
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{formatDate(insight.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Packet Annotations */}
        {annotations.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Packet Annotations</h3>
            <div className="space-y-3">
              {annotations.map((annotation) => (
                <div
                  key={annotation.id}
                  className={`border-l-4 pl-4 ${
                    annotation.severity === 'critical'
                      ? 'border-red-500'
                      : annotation.severity === 'warning'
                      ? 'border-yellow-500'
                      : 'border-blue-500'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      Packet #{annotation.packet_number}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-semibold rounded ${
                        annotation.severity === 'critical'
                          ? 'bg-red-100 text-red-700'
                          : annotation.severity === 'warning'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {annotation.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{annotation.annotation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="bg-linear-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Want to analyze your own packet captures?</h3>
          <p className="mb-6 text-blue-100">
            Upload PCAP files and get AI-powered insights in seconds
          </p>
          <a
            href="/"
            className="inline-block px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-bold"
          >
            Get Started with AIShark
          </a>
        </div>
      </div>
    </div>
  );
}
