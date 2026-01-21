'use client';

import React, { useState } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { Download, Send, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { toast } from './ToastContainer';

interface IntegrationSettingsProps {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
  onClose: () => void;
}

/**
 * IntegrationSettings Component
 * Configure and manage external monitoring tool integrations
 */
export default function IntegrationSettings({
  packets,
  statistics,
  analysis,
  onClose
}: IntegrationSettingsProps) {
  const [selectedIntegration, setSelectedIntegration] = useState<'prometheus' | 'webhook' | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEventType, setWebhookEventType] = useState('network.analysis.complete');
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  /**
   * Export metrics in Prometheus format
   */
  const exportPrometheus = async () => {
    if (packets.length === 0) {
      toast.error('No packets to export');
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/integrations/prometheus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packets, statistics })
      });

      if (response.ok) {
        const metricsText = await response.text();
        
        // Create download
        const blob = new Blob([metricsText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `network-metrics-${Date.now()}.prom`;
        a.click();
        URL.revokeObjectURL(url);

        setTestResult({
          success: true,
          message: 'Prometheus metrics exported successfully'
        });
        toast.success('Prometheus metrics downloaded');
      } else {
        const data = await response.json();
        setTestResult({
          success: false,
          message: data.error || 'Export failed'
        });
        toast.error(data.error || 'Export failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Export failed';
      setTestResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Send data to webhook
   */
  const sendWebhook = async () => {
    if (!webhookUrl.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }

    if (packets.length === 0) {
      toast.error('No packets to send');
      return;
    }

    setLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/integrations/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl,
          packets,
          statistics,
          analysis,
          eventType: webhookEventType
        })
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `Webhook delivered successfully (HTTP ${data.statusCode})`
        });
        toast.success('Webhook sent successfully');
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Webhook failed'
        });
        toast.error(data.error || 'Webhook failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Webhook failed';
      setTestResult({ success: false, message: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Monitoring Integrations</h2>
              <p className="text-sm text-gray-600">Export data to external monitoring systems</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedIntegration && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Prometheus Card */}
              <button
                onClick={() => setSelectedIntegration('prometheus')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Download className="w-8 h-8 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Prometheus</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  Export network metrics in Prometheus exposition format for time-series monitoring and alerting.
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Packet count metrics</li>
                  <li>• Protocol distribution</li>
                  <li>• Traffic volume statistics</li>
                  <li>• Error and retransmission rates</li>
                </ul>
              </button>

              {/* Webhook Card */}
              <button
                onClick={() => setSelectedIntegration('webhook')}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Send className="w-8 h-8 text-green-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Webhook</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  Send JSON-formatted analysis data to custom webhook endpoints for real-time alerts and integrations.
                </p>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Capture summary</li>
                  <li>• Security alerts</li>
                  <li>• Anomaly notifications</li>
                  <li>• Custom event types</li>
                </ul>
              </button>
            </div>
          )}

          {/* Prometheus Export */}
          {selectedIntegration === 'prometheus' && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedIntegration(null)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mb-4"
              >
                ← Back to integrations
              </button>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-2 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Prometheus Metrics Export
                </h3>
                <p className="text-orange-800 text-sm mb-4">
                  Download metrics in Prometheus format. You can use these metrics with your Prometheus server
                  or any compatible monitoring system.
                </p>

                <div className="bg-white rounded p-3 mb-4 font-mono text-xs text-gray-700">
                  <div># Sample metrics included:</div>
                  <div>network_packets_total {'{}'}{packets.length}</div>
                  <div>network_traffic_bytes_total {'{}'}{packets.reduce((sum, p) => sum + p.length, 0)}</div>
                  <div>network_packets_by_protocol{'{protocol="TCP"}'} ...</div>
                </div>

                <button
                  onClick={exportPrometheus}
                  disabled={loading || packets.length === 0}
                  className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Export Prometheus Metrics
                    </>
                  )}
                </button>
              </div>

              {testResult && (
                <div className={`border rounded-lg p-4 ${
                  testResult.success 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={testResult.success ? 'text-green-900' : 'text-red-900'}>
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Webhook Configuration */}
          {selectedIntegration === 'webhook' && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedIntegration(null)}
                className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1 mb-4"
              >
                ← Back to integrations
              </button>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Webhook Configuration
                </h3>
                <p className="text-green-800 text-sm mb-4">
                  Send network analysis data to your webhook endpoint. Payload will be sent as JSON with capture
                  information, alerts, and statistics.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Webhook URL *
                    </label>
                    <input
                      type="url"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://your-endpoint.com/webhook"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Type
                    </label>
                    <select
                      value={webhookEventType}
                      onChange={(e) => setWebhookEventType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="network.analysis.complete">network.analysis.complete</option>
                      <option value="network.security.alert">network.security.alert</option>
                      <option value="network.anomaly.detected">network.anomaly.detected</option>
                      <option value="network.capture.uploaded">network.capture.uploaded</option>
                    </select>
                  </div>

                  <button
                    onClick={sendWebhook}
                    disabled={loading || packets.length === 0 || !webhookUrl.trim()}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Send Webhook
                      </>
                    )}
                  </button>
                </div>
              </div>

              {testResult && (
                <div className={`border rounded-lg p-4 ${
                  testResult.success 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}>
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={testResult.success ? 'text-green-900' : 'text-red-900'}>
                      {testResult.message}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!selectedIntegration && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600 text-center">
              {packets.length > 0 
                ? `Ready to export ${packets.length} packets` 
                : 'Upload a capture file to enable integrations'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
