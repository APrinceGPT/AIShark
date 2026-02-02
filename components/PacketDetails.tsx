'use client';

import { useState, useEffect } from 'react';
import { Packet } from '@/types/packet';
import { bytesToString } from '@/lib/utils';
import { addAnnotation, getAnnotations, updateAnnotation, deleteAnnotation } from '@/lib/annotation-manager';
import { PacketAnnotation } from '@/types/database';
import { toast } from './ToastContainer';
import { MessageSquare, Save, X, AlertCircle, Info, Sparkles } from 'lucide-react';

interface PacketDetailsProps {
  packet: Packet | null;
  onClose: () => void;
  sessionId?: string;
}

interface AISuggestion {
  annotation: string;
  severity: 'info' | 'warning' | 'critical';
  reason: string;
}

export default function PacketDetails({ packet, onClose, sessionId }: PacketDetailsProps) {
  const [annotations, setAnnotations] = useState<PacketAnnotation[]>([]);
  const [showAnnotationForm, setShowAnnotationForm] = useState(false);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationSeverity, setAnnotationSeverity] = useState<'info' | 'warning' | 'critical'>('info');
  const [editingAnnotation, setEditingAnnotation] = useState<PacketAnnotation | null>(null);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  useEffect(() => {
    if (packet && sessionId) {
      loadAnnotationsForPacket();
    }
  }, [packet?.id, sessionId]);

  const loadAnnotationsForPacket = async () => {
    if (!sessionId || !packet) return;
    
    setLoadingAnnotations(true);
    try {
      const allAnnotations = await getAnnotations(sessionId);
      const packetAnnotations = allAnnotations.filter(a => a.packet_number === packet.id);
      setAnnotations(packetAnnotations);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setLoadingAnnotations(false);
    }
  };

  const handleSaveAnnotation = async () => {
    if (!sessionId || !packet || !annotationText.trim()) return;

    try {
      if (editingAnnotation) {
        const result = await updateAnnotation(editingAnnotation.id, {
          annotation: annotationText,
          severity: annotationSeverity
        });
        if (result) {
          toast.success('Annotation updated');
          await loadAnnotationsForPacket();
        } else {
          toast.error('Failed to update annotation');
        }
      } else {
        const result = await addAnnotation(sessionId, packet.id, annotationText, annotationSeverity);
        if (result.success) {
          toast.success('Annotation added');
          await loadAnnotationsForPacket();
        } else {
          toast.error(result.error || 'Failed to add annotation');
        }
      }
      setAnnotationText('');
      setShowAnnotationForm(false);
      setEditingAnnotation(null);
    } catch (error) {
      toast.error('Error saving annotation');
    }
  };

  const handleDeleteAnnotation = async (annotationId: string) => {
    if (!confirm('Delete this annotation?')) return;

    try {
      const success = await deleteAnnotation(annotationId);
      if (success) {
        toast.success('Annotation deleted');
        await loadAnnotationsForPacket();
      } else {
        toast.error('Failed to delete annotation');
      }
    } catch (error) {
      toast.error('Error deleting annotation');
    }
  };

  const startEditAnnotation = (annotation: PacketAnnotation) => {
    setEditingAnnotation(annotation);
    setAnnotationText(annotation.annotation || '');
    setAnnotationSeverity(annotation.severity);
    setShowAnnotationForm(true);
    setAiSuggestion(null); // Clear AI suggestion when editing
  };

  const handleGetAISuggestion = async () => {
    if (!packet) return;
    
    setLoadingSuggestion(true);
    setAiSuggestion(null);
    
    try {
      const response = await fetch('/api/analyze/suggest-annotation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packet }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI suggestion');
      }

      const suggestion: AISuggestion = await response.json();
      setAiSuggestion(suggestion);
      
      // Auto-fill the form with suggestion
      setAnnotationText(suggestion.annotation);
      setAnnotationSeverity(suggestion.severity);
      setShowAnnotationForm(true);
      
      toast.success('AI suggestion ready!');
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast.error('Failed to get AI suggestion');
    } finally {
      setLoadingSuggestion(false);
    }
  };

  const handleAcceptSuggestion = () => {
    if (!aiSuggestion) return;
    setAnnotationText(aiSuggestion.annotation);
    setAnnotationSeverity(aiSuggestion.severity);
    setShowAnnotationForm(true);
  };

  const handleDismissSuggestion = () => {
    setAiSuggestion(null);
  };

  if (!packet) return null;

  const renderLayer = (title: string, data: Record<string, any>) => (
    <div className="mb-4">
      <h3 className="font-semibold text-base sm:text-lg mb-2 text-gray-800 dark:text-white">{title}</h3>
      <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 sm:p-3 space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex flex-col sm:flex-row text-sm gap-1 sm:gap-0">
            <span className="font-medium text-gray-600 dark:text-gray-400 sm:w-40">{key}:</span>
            <span className="text-gray-800 dark:text-gray-200 flex-1 font-mono text-xs break-all">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="packet-details-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b dark:border-gray-700">
          <h2 id="packet-details-title" className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            Packet #{packet.id + 1}
            <span className="hidden sm:inline"> Details</span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close packet details"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl leading-none p-2"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4">
          {/* Quick Summary Card */}
          <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-lg p-3 sm:p-4 border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Protocol:</span>
                <span className="ml-2 font-bold text-blue-700 dark:text-blue-400">{packet.protocol}</span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Length:</span>
                <span className="ml-2 font-bold text-blue-700 dark:text-blue-400">{packet.length} bytes</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-600 dark:text-gray-400">Time:</span>
                <span className="ml-2 font-mono text-xs text-blue-700 dark:text-blue-400 break-all">{packet.timeString}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          {renderLayer('Summary', {
            'Timestamp': packet.timeString,
            'Source': packet.source,
            'Destination': packet.destination,
            'Protocol': packet.protocol,
            'Length': `${packet.length} bytes`,
            'Info': packet.info,
          })}

          {/* Ethernet Layer */}
          {packet.layers.ethernet && renderLayer('Ethernet', {
            'Source MAC': packet.layers.ethernet.source,
            'Destination MAC': packet.layers.ethernet.destination,
            'Type': `0x${packet.layers.ethernet.type.toString(16)}`,
          })}

          {/* IP Layer */}
          {packet.layers.ip && renderLayer('IPv4', {
            'Version': packet.layers.ip.version,
            'Source IP': packet.layers.ip.source,
            'Destination IP': packet.layers.ip.destination,
            'Protocol': packet.layers.ip.protocol,
            'TTL': packet.layers.ip.ttl,
            'Total Length': packet.layers.ip.length,
          })}

          {/* TCP Layer */}
          {packet.layers.tcp && renderLayer('TCP', {
            'Source Port': packet.layers.tcp.sourcePort,
            'Destination Port': packet.layers.tcp.destinationPort,
            'Sequence Number': packet.layers.tcp.sequenceNumber,
            'Acknowledgment': packet.layers.tcp.acknowledgmentNumber,
            'Flags': Object.entries(packet.layers.tcp.flags)
              .filter(([_, v]) => v)
              .map(([k]) => k.toUpperCase())
              .join(', '),
            'Window Size': packet.layers.tcp.windowSize,
            'Payload Size': packet.layers.tcp.payload?.length || 0,
          })}

          {/* UDP Layer */}
          {packet.layers.udp && renderLayer('UDP', {
            'Source Port': packet.layers.udp.sourcePort,
            'Destination Port': packet.layers.udp.destinationPort,
            'Length': packet.layers.udp.length,
            'Payload Size': packet.layers.udp.payload?.length || 0,
          })}

          {/* HTTP Layer */}
          {packet.layers.http && (
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">HTTP</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 space-y-2">
                {packet.layers.http.isRequest ? (
                  <>
                    <div className="text-sm">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Request:</span>
                      <span className="ml-2 font-mono text-blue-600 dark:text-blue-400">
                        {packet.layers.http.method} {packet.layers.http.uri}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600 dark:text-gray-400">Response:</span>
                    <span className="ml-2 font-mono text-green-600 dark:text-green-400">
                      {packet.layers.http.statusCode} {packet.layers.http.statusText}
                    </span>
                  </div>
                )}
                
                <div className="mt-2">
                  <div className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Headers:</div>
                  <div className="bg-white dark:bg-gray-800 rounded p-2 max-h-40 overflow-y-auto">
                    {Object.entries(packet.layers.http.headers).map(([key, value]) => (
                      <div key={key} className="text-xs font-mono">
                        <span className="text-blue-600 dark:text-blue-400">{key}:</span> <span className="text-gray-800 dark:text-gray-200">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {packet.layers.http.body && (
                  <div className="mt-2">
                    <div className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Body:</div>
                    <pre className="bg-white dark:bg-gray-800 rounded p-2 text-xs text-gray-800 dark:text-gray-200 overflow-x-auto max-h-40">
                      {packet.layers.http.body.substring(0, 500)}
                      {packet.layers.http.body.length > 500 && '...'}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* DNS Layer */}
          {packet.layers.dns && (
            <div className="mb-4">
              <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">DNS</h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="ml-2 text-gray-800 dark:text-gray-200">{packet.layers.dns.isQuery ? 'Query' : 'Response'}</span>
                </div>
                
                {packet.layers.dns.queries.length > 0 && (
                  <div>
                    <div className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Queries:</div>
                    {packet.layers.dns.queries.map((q, i) => (
                      <div key={i} className="text-xs font-mono ml-4 text-gray-800 dark:text-gray-200">
                        {q.name} ({q.type})
                      </div>
                    ))}
                  </div>
                )}
                
                {packet.layers.dns.answers.length > 0 && (
                  <div>
                    <div className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">Answers:</div>
                    {packet.layers.dns.answers.map((a, i) => (
                      <div key={i} className="text-xs font-mono ml-4 text-gray-800 dark:text-gray-200">
                        {a.name} → {a.data} (TTL: {a.ttl})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TLS Layer */}
          {packet.layers.tls && renderLayer('TLS/SSL', {
            'Version': packet.layers.tls.version,
            'Content Type': packet.layers.tls.contentType,
            'Handshake Type': packet.layers.tls.handshakeType || 'N/A',
            'Server Name': packet.layers.tls.serverName || 'N/A',
          })}

          {/* Annotations */}
          {sessionId && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Annotations
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleGetAISuggestion}
                    disabled={loadingSuggestion}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-4 h-4" />
                    {loadingSuggestion ? 'Thinking...' : 'AI Suggest'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAnnotationForm(!showAnnotationForm);
                      setAiSuggestion(null);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Add Note
                  </button>
                </div>
              </div>

              {/* AI Suggestion Banner */}
              {aiSuggestion && !showAnnotationForm && (
                <div className="bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-3">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-sm text-purple-900 dark:text-purple-100 mb-1">AI Suggestion</div>
                      <div className="text-sm text-gray-800 dark:text-gray-200 mb-2">"{aiSuggestion.annotation}"</div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          aiSuggestion.severity === 'critical' 
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300' 
                            : aiSuggestion.severity === 'warning'
                            ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                            : 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                        }`}>
                          {aiSuggestion.severity.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{aiSuggestion.reason}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAcceptSuggestion}
                          className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                        >
                          Use This
                        </button>
                        <button
                          onClick={handleDismissSuggestion}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-xs"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Annotation Form */}
              {showAnnotationForm && (
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-3">
                  {aiSuggestion && (
                    <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded p-2 mb-3 text-xs">
                      <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 mb-1">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-medium">AI suggested this annotation</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">{aiSuggestion.reason}</div>
                    </div>
                  )}
                  <textarea
                    value={annotationText}
                    onChange={(e) => setAnnotationText(e.target.value)}
                    placeholder="Add a note about this packet..."
                    className="w-full p-2 border dark:border-gray-600 rounded-lg mb-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    rows={3}
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Severity:</label>
                    <select
                      value={annotationSeverity}
                      onChange={(e) => setAnnotationSeverity(e.target.value as 'info' | 'warning' | 'critical')}
                      className="px-2 py-1 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveAnnotation}
                      disabled={!annotationText.trim()}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm disabled:bg-gray-300 flex items-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      {editingAnnotation ? 'Update' : 'Save'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAnnotationForm(false);
                        setAnnotationText('');
                        setEditingAnnotation(null);
                      }}
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Annotations */}
              {loadingAnnotations ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading annotations...</div>
              ) : annotations.length > 0 ? (
                <div className="space-y-2">
                  {annotations.map((annotation) => {
                    const severityColors = {
                      info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
                      warning: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
                      critical: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
                    };
                    const SeverityIcon = annotation.severity === 'critical' ? AlertCircle : Info;

                    return (
                      <div
                        key={annotation.id}
                        className={`border rounded-lg p-3 ${severityColors[annotation.severity]}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2 flex-1">
                            <SeverityIcon className="w-4 h-4 mt-0.5" />
                            <div className="flex-1">
                              <div className="text-xs font-medium mb-1 uppercase">{annotation.severity}</div>
                              <div className="text-sm">{annotation.annotation}</div>
                              <div className="text-xs mt-1 opacity-75">
                                {new Date(annotation.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => startEditAnnotation(annotation)}
                              className="text-xs px-2 py-1 hover:bg-white hover:bg-opacity-50 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteAnnotation(annotation.id)}
                              className="text-xs px-2 py-1 hover:bg-white hover:bg-opacity-50 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-gray-500 dark:text-gray-400 italic">No annotations yet. Add a note to bookmark this packet.</div>
              )}
            </div>
          )}

          {/* Raw Data */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2 text-gray-800 dark:text-white">Raw Data</h3>
            <pre className="bg-gray-900 text-green-400 rounded p-3 text-xs overflow-x-auto max-h-60">
              {Array.from(packet.raw.slice(0, 256))
                .map((b, i) => {
                  if (i % 16 === 0) return `\n${i.toString(16).padStart(4, '0')}: `;
                  return b.toString(16).padStart(2, '0') + ' ';
                })
                .join('')}
              {packet.raw.length > 256 && '\n... (truncated)'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
