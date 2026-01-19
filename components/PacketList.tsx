'use client';

import { useState, useEffect, useRef } from 'react';
import { Packet } from '@/types/packet';

interface PacketListProps {
  packets: Packet[];
  onPacketSelect: (packet: Packet) => void;
  selectedPacketId?: number;
}

export default function PacketList({ packets, onPacketSelect, selectedPacketId }: PacketListProps) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });
  const containerRef = useRef<HTMLDivElement>(null);
  const ROW_HEIGHT = 40;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const scrollTop = container.scrollTop;
      const start = Math.floor(scrollTop / ROW_HEIGHT);
      const end = Math.min(start + Math.ceil(container.clientHeight / ROW_HEIGHT) + 10, packets.length);
      
      setVisibleRange({ start, end });
    };

    container.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial calculation

    return () => container.removeEventListener('scroll', handleScroll);
  }, [packets.length]);

  const getProtocolColor = (protocol: string): string => {
    const colors: Record<string, string> = {
      HTTP: 'text-green-600 bg-green-50',
      HTTPS: 'text-green-700 bg-green-100',
      DNS: 'text-blue-600 bg-blue-50',
      TCP: 'text-purple-600 bg-purple-50',
      UDP: 'text-pink-600 bg-pink-50',
      TLS: 'text-teal-600 bg-teal-50',
    };
    return colors[protocol] || 'text-gray-600 bg-gray-50';
  };

  const visiblePackets = packets.slice(visibleRange.start, visibleRange.end);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex border-b border-gray-200 bg-gray-50 font-medium text-sm text-gray-700">
        <div className="w-16 px-3 py-2 border-r">No.</div>
        <div className="w-40 px-3 py-2 border-r">Time</div>
        <div className="w-32 px-3 py-2 border-r">Source</div>
        <div className="w-32 px-3 py-2 border-r">Destination</div>
        <div className="w-24 px-3 py-2 border-r">Protocol</div>
        <div className="w-20 px-3 py-2 border-r">Length</div>
        <div className="flex-1 px-3 py-2">Info</div>
      </div>

      {/* Virtual Scrolling Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative"
        style={{ height: 'calc(100vh - 300px)' }}
      >
        <div style={{ height: `${packets.length * ROW_HEIGHT}px`, position: 'relative' }}>
          <div style={{ transform: `translateY(${visibleRange.start * ROW_HEIGHT}px)` }}>
            {visiblePackets.map((packet, index) => {
              const actualIndex = visibleRange.start + index;
              const isSelected = packet.id === selectedPacketId;
              const hasError = packet.flags?.hasError || packet.flags?.isRetransmission;

              return (
                <div
                  key={packet.id}
                  onClick={() => onPacketSelect(packet)}
                  className={`
                    flex text-sm border-b cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-100 border-blue-300' : 'hover:bg-gray-50'}
                    ${hasError ? 'bg-red-50 border-l-4 border-l-red-500' : ''}
                  `}
                  title={hasError ? 'This packet has errors or warnings' : ''}
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <div className="w-16 px-3 py-2 border-r flex items-center text-gray-600">
                    {packet.id + 1}
                  </div>
                  <div className="w-40 px-3 py-2 border-r flex items-center text-xs text-gray-600">
                    {packet.timeString.substring(11)}
                  </div>
                  <div className="w-32 px-3 py-2 border-r flex items-center text-xs font-mono truncate">
                    {packet.source}
                  </div>
                  <div className="w-32 px-3 py-2 border-r flex items-center text-xs font-mono truncate">
                    {packet.destination}
                  </div>
                  <div className="w-24 px-3 py-2 border-r flex items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProtocolColor(packet.protocol)}`}>
                      {packet.protocol}
                    </span>
                  </div>
                  <div className="w-20 px-3 py-2 border-r flex items-center text-gray-600">
                    {packet.length}
                  </div>
                  <div className="flex-1 px-3 py-2 flex items-center truncate text-gray-700">
                    {packet.flags?.isRetransmission && (
                      <span className="text-red-600 font-bold mr-2">[Retrans]</span>
                    )}
                    {packet.info}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 text-sm text-gray-600 bg-gray-50">
        Displaying {visibleRange.start + 1}-{Math.min(visibleRange.end, packets.length)} of {packets.length} packets
      </div>
    </div>
  );
}
