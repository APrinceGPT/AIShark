'use client';

import { useState, useEffect, useRef, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Packet } from '@/types/packet';
import { useBreakpoint } from '@/lib/use-media-query';
import { Clock, ArrowRight, AlertCircle } from 'lucide-react';
import PacketNavigationToolbar from './PacketNavigationToolbar';

interface PacketListProps {
  packets: Packet[];
  onPacketSelect: (packet: Packet) => void;
  selectedPacketId?: number;
  onNextError?: () => void;
  onPrevError?: () => void;
  currentErrorIndex?: number;
}

export interface PacketListHandle {
  scrollToPacket: (packetNumber: number) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
}

const DEFAULT_PAGE_SIZE = 1000;

const PacketList = forwardRef<PacketListHandle, PacketListProps>(function PacketList(
  { packets, onPacketSelect, selectedPacketId, onNextError, onPrevError, currentErrorIndex = 0 },
  ref
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 100 });
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isMobile } = useBreakpoint();
  const ROW_HEIGHT = isMobile ? 120 : 40;
  const OVERSCAN = 5;

  // Calculate error count
  const errorCount = useMemo(() => {
    return packets.filter(p => p.flags?.hasError || p.flags?.isRetransmission).length;
  }, [packets]);

  // Calculate current page based on scroll position
  const currentPage = useMemo(() => {
    return Math.floor(visibleRange.start / pageSize) + 1;
  }, [visibleRange.start, pageSize]);

  const totalPages = useMemo(() => {
    return Math.ceil(packets.length / pageSize);
  }, [packets.length, pageSize]);

  // Scroll to specific packet number (1-indexed)
  const scrollToPacket = useCallback((packetNumber: number) => {
    const container = containerRef.current;
    if (!container || packetNumber < 1 || packetNumber > packets.length) return;
    
    const packetIndex = packetNumber - 1;
    const scrollPosition = packetIndex * ROW_HEIGHT;
    container.scrollTo({ top: scrollPosition, behavior: 'smooth' });
  }, [packets.length, ROW_HEIGHT]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const maxScroll = packets.length * ROW_HEIGHT - container.clientHeight;
    container.scrollTo({ top: maxScroll, behavior: 'smooth' });
  }, [packets.length, ROW_HEIGHT]);

  // Scroll to page
  const scrollToPage = useCallback((page: number) => {
    if (page < 1 || page > totalPages) return;
    const packetIndex = (page - 1) * pageSize;
    scrollToPacket(packetIndex + 1);
  }, [totalPages, pageSize, scrollToPacket]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToPacket,
    scrollToTop,
    scrollToBottom,
  }), [scrollToPacket, scrollToTop, scrollToBottom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = container.scrollTop;
          const visibleRows = Math.ceil(container.clientHeight / ROW_HEIGHT);
          const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
          const end = Math.min(start + visibleRows + OVERSCAN * 2, packets.length);
          
          setVisibleRange({ start, end });
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => container.removeEventListener('scroll', handleScroll);
  }, [packets.length, ROW_HEIGHT]);

  const getProtocolColor = (protocol: string): string => {
    const colors: Record<string, string> = {
      HTTP: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
      HTTPS: 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/40',
      DNS: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
      TCP: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',
      UDP: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-900/30',
      TLS: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30',
    };
    return colors[protocol] || 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700';
  };

  const visiblePackets = packets.slice(visibleRange.start, visibleRange.end);

  // Mobile Card View Component
  const MobilePacketCard = ({ packet, isSelected, hasError }: { packet: Packet; isSelected: boolean; hasError: boolean }) => (
    <div
      onClick={() => onPacketSelect(packet)}
      className={`
        p-3 border-b dark:border-gray-700 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700' : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'}
        ${hasError ? 'border-l-4 border-l-red-500' : ''}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">#{packet.id + 1}</span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProtocolColor(packet.protocol)}`}>
            {packet.protocol}
          </span>
          {hasError && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>{packet.timeString.substring(11)}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-1 text-sm">
        <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-30">{packet.source}</span>
        <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="font-mono text-gray-700 dark:text-gray-300 truncate max-w-30">{packet.destination}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">{packet.length}B</span>
      </div>
      
      <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
        {packet.flags?.isRetransmission && (
          <span className="text-red-600 dark:text-red-400 font-bold mr-1">[Retrans]</span>
        )}
        {packet.info}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800">
      {/* Header - Desktop/Tablet Only */}
      {!isMobile && (
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 font-medium text-sm text-gray-700 dark:text-gray-300">
          <div className="w-16 px-3 py-2 border-r dark:border-gray-600">No.</div>
          <div className="w-40 px-3 py-2 border-r dark:border-gray-600">Time</div>
          <div className="w-32 px-3 py-2 border-r dark:border-gray-600">Source</div>
          <div className="w-32 px-3 py-2 border-r dark:border-gray-600">Destination</div>
          <div className="w-24 px-3 py-2 border-r dark:border-gray-600">Protocol</div>
          <div className="w-20 px-3 py-2 border-r dark:border-gray-600">Length</div>
          <div className="flex-1 px-3 py-2">Info</div>
        </div>
      )}

      {/* Virtual Scrolling Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto relative"
        style={{ height: 'calc(100vh - 300px)' }}
      >
        <div style={{ height: `${packets.length * ROW_HEIGHT}px`, position: 'relative' }}>
          <div style={{ transform: `translateY(${visibleRange.start * ROW_HEIGHT}px)` }}>
            {visiblePackets.map((packet) => {
              const isSelected = packet.id === selectedPacketId;
              const hasError = packet.flags?.hasError || packet.flags?.isRetransmission;

              // Mobile Card View
              if (isMobile) {
                return (
                  <MobilePacketCard
                    key={packet.id}
                    packet={packet}
                    isSelected={isSelected}
                    hasError={hasError || false}
                  />
                );
              }

              // Desktop Table Row
              return (
                <div
                  key={packet.id}
                  onClick={() => onPacketSelect(packet)}
                  className={`
                    flex text-sm border-b dark:border-gray-700 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}
                    ${hasError ? 'bg-red-50 dark:bg-red-900/30 border-l-4 border-l-red-500' : ''}
                  `}
                  title={hasError ? 'This packet has errors or warnings' : ''}
                  style={{ height: `${ROW_HEIGHT}px` }}
                >
                  <div className="w-16 px-3 py-2 border-r dark:border-gray-700 flex items-center text-gray-600 dark:text-gray-400">
                    {packet.id + 1}
                  </div>
                  <div className="w-40 px-3 py-2 border-r dark:border-gray-700 flex items-center text-xs text-gray-600 dark:text-gray-400">
                    {packet.timeString.substring(11)}
                  </div>
                  <div className="w-32 px-3 py-2 border-r dark:border-gray-700 flex items-center text-xs font-mono text-gray-800 dark:text-gray-200 truncate">
                    {packet.source}
                  </div>
                  <div className="w-32 px-3 py-2 border-r dark:border-gray-700 flex items-center text-xs font-mono text-gray-800 dark:text-gray-200 truncate">
                    {packet.destination}
                  </div>
                  <div className="w-24 px-3 py-2 border-r dark:border-gray-700 flex items-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getProtocolColor(packet.protocol)}`}>
                      {packet.protocol}
                    </span>
                  </div>
                  <div className="w-20 px-3 py-2 border-r dark:border-gray-700 flex items-center text-gray-600 dark:text-gray-400">
                    {packet.length}
                  </div>
                  <div className="flex-1 px-3 py-2 flex items-center truncate text-gray-700 dark:text-gray-300">
                    {packet.flags?.isRetransmission && (
                      <span className="text-red-600 dark:text-red-400 font-bold mr-2">[Retrans]</span>
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
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700">
        <span className="hidden sm:inline">Displaying </span>
        {visibleRange.start + 1}-{Math.min(visibleRange.end, packets.length)} of {packets.length}
        <span className="hidden sm:inline"> packets</span>
      </div>

      {/* Navigation Toolbar */}
      <PacketNavigationToolbar
        totalPackets={packets.length}
        currentPage={currentPage}
        pageSize={pageSize}
        errorCount={errorCount}
        currentErrorIndex={currentErrorIndex}
        onPageChange={scrollToPage}
        onPageSizeChange={setPageSize}
        onJumpToPacket={scrollToPacket}
        onJumpToTop={scrollToTop}
        onJumpToBottom={scrollToBottom}
        onNextError={onNextError ?? (() => {})}
        onPrevError={onPrevError ?? (() => {})}
      />
    </div>
  );
});

export default PacketList;
