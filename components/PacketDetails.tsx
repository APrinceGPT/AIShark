'use client';

import { Packet } from '@/types/packet';
import { bytesToString } from '@/lib/utils';

interface PacketDetailsProps {
  packet: Packet | null;
  onClose: () => void;
}

export default function PacketDetails({ packet, onClose }: PacketDetailsProps) {
  if (!packet) return null;

  const renderLayer = (title: string, data: Record<string, any>) => (
    <div className="mb-4">
      <h3 className="font-semibold text-lg mb-2 text-gray-800">{title}</h3>
      <div className="bg-gray-50 rounded p-3 space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="flex text-sm">
            <span className="font-medium text-gray-600 w-40">{key}:</span>
            <span className="text-gray-800 flex-1 font-mono text-xs">
              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            Packet #{packet.id + 1} Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick Summary Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-600">Protocol:</span>
                <span className="ml-2 font-bold text-blue-700">{packet.protocol}</span>
              </div>
              <div>
                <span className="text-gray-600">Length:</span>
                <span className="ml-2 font-bold text-blue-700">{packet.length} bytes</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Time:</span>
                <span className="ml-2 font-mono text-xs text-blue-700">{packet.timeString}</span>
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
              <h3 className="font-semibold text-lg mb-2 text-gray-800">HTTP</h3>
              <div className="bg-gray-50 rounded p-3 space-y-2">
                {packet.layers.http.isRequest ? (
                  <>
                    <div className="text-sm">
                      <span className="font-medium text-gray-600">Request:</span>
                      <span className="ml-2 font-mono text-blue-600">
                        {packet.layers.http.method} {packet.layers.http.uri}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-sm">
                    <span className="font-medium text-gray-600">Response:</span>
                    <span className="ml-2 font-mono text-green-600">
                      {packet.layers.http.statusCode} {packet.layers.http.statusText}
                    </span>
                  </div>
                )}
                
                <div className="mt-2">
                  <div className="font-medium text-sm text-gray-600 mb-1">Headers:</div>
                  <div className="bg-white rounded p-2 max-h-40 overflow-y-auto">
                    {Object.entries(packet.layers.http.headers).map(([key, value]) => (
                      <div key={key} className="text-xs font-mono">
                        <span className="text-blue-600">{key}:</span> {value}
                      </div>
                    ))}
                  </div>
                </div>

                {packet.layers.http.body && (
                  <div className="mt-2">
                    <div className="font-medium text-sm text-gray-600 mb-1">Body:</div>
                    <pre className="bg-white rounded p-2 text-xs overflow-x-auto max-h-40">
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
              <h3 className="font-semibold text-lg mb-2 text-gray-800">DNS</h3>
              <div className="bg-gray-50 rounded p-3 space-y-2">
                <div className="text-sm">
                  <span className="font-medium text-gray-600">Type:</span>
                  <span className="ml-2">{packet.layers.dns.isQuery ? 'Query' : 'Response'}</span>
                </div>
                
                {packet.layers.dns.queries.length > 0 && (
                  <div>
                    <div className="font-medium text-sm text-gray-600 mb-1">Queries:</div>
                    {packet.layers.dns.queries.map((q, i) => (
                      <div key={i} className="text-xs font-mono ml-4">
                        {q.name} ({q.type})
                      </div>
                    ))}
                  </div>
                )}
                
                {packet.layers.dns.answers.length > 0 && (
                  <div>
                    <div className="font-medium text-sm text-gray-600 mb-1">Answers:</div>
                    {packet.layers.dns.answers.map((a, i) => (
                      <div key={i} className="text-xs font-mono ml-4">
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

          {/* Raw Data */}
          <div className="mb-4">
            <h3 className="font-semibold text-lg mb-2 text-gray-800">Raw Data</h3>
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
