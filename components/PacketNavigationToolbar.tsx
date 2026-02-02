'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Minimize2,
  Maximize2,
  Hash,
} from 'lucide-react';

interface PacketNavigationToolbarProps {
  totalPackets: number;
  currentPage: number;
  pageSize: number;
  errorCount: number;
  currentErrorIndex: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onJumpToPacket: (packetNumber: number) => void;
  onJumpToTop: () => void;
  onJumpToBottom: () => void;
  onNextError: () => void;
  onPrevError: () => void;
}

const PAGE_SIZE_OPTIONS = [100, 500, 1000, 10000] as const;

export default function PacketNavigationToolbar({
  totalPackets,
  currentPage,
  pageSize,
  errorCount,
  currentErrorIndex,
  onPageChange,
  onPageSizeChange,
  onJumpToPacket,
  onJumpToTop,
  onJumpToBottom,
  onNextError,
  onPrevError,
}: PacketNavigationToolbarProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [goToPacketValue, setGoToPacketValue] = useState('');
  const goToInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(totalPackets / pageSize);

  const handleGoToPacket = () => {
    const packetNumber = parseInt(goToPacketValue, 10);
    if (!isNaN(packetNumber) && packetNumber >= 1 && packetNumber <= totalPackets) {
      onJumpToPacket(packetNumber);
      setGoToPacketValue('');
    }
  };

  const handleGoToKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPacket();
    }
  };

  // Reset go to packet value when total packets change
  useEffect(() => {
    setGoToPacketValue('');
  }, [totalPackets]);

  if (totalPackets === 0) return null;

  // Minimized state - show only expand button
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Expand navigation toolbar"
          aria-label="Expand navigation toolbar"
        >
          <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {totalPackets.toLocaleString()} packets
          </span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-medium">
              <AlertCircle className="w-3 h-3" />
              {errorCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
      {/* Header with minimize button */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Navigation
        </span>
        <button
          onClick={() => setIsMinimized(true)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
          title="Minimize toolbar"
          aria-label="Minimize toolbar"
        >
          <Minimize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Navigation Row */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
        {/* Jump to Top */}
        <button
          onClick={onJumpToTop}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Jump to top (Home)"
          aria-label="Jump to first packet"
        >
          <ChevronUp className="w-4 h-4" />
          <span className="hidden sm:inline">Top</span>
        </button>

        {/* Jump to Bottom */}
        <button
          onClick={onJumpToBottom}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Jump to bottom (End)"
          aria-label="Jump to last packet"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="hidden sm:inline">Bottom</span>
        </button>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous page (Page Up)"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Indicator */}
        <span className="px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
          Page {currentPage} / {totalPages}
        </span>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next page (Page Down)"
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Page Size & Go To Row */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
        {/* Page Size Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="page-size-select" className="text-xs text-gray-500 dark:text-gray-400">
            Show:
          </label>
          <select
            id="page-size-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(parseInt(e.target.value, 10))}
            className="px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size.toLocaleString()}
              </option>
            ))}
          </select>
        </div>

        <div className="w-px h-6 bg-gray-200 dark:bg-gray-600" />

        {/* Go to Packet */}
        <div className="flex items-center gap-1">
          <label htmlFor="go-to-packet" className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Hash className="w-3 h-3" />
          </label>
          <input
            ref={goToInputRef}
            id="go-to-packet"
            type="number"
            min={1}
            max={totalPackets}
            value={goToPacketValue}
            onChange={(e) => setGoToPacketValue(e.target.value)}
            onKeyDown={handleGoToKeyDown}
            placeholder={`1-${totalPackets}`}
            className="w-20 px-2 py-1 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            onClick={handleGoToPacket}
            disabled={!goToPacketValue}
            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Go
          </button>
        </div>
      </div>

      {/* Error Navigation Row */}
      <div className="flex items-center justify-between px-3 py-2">
        <button
          onClick={onPrevError}
          disabled={errorCount === 0}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous error (P)"
          aria-label="Go to previous error"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Prev Error</span>
        </button>

        {/* Error Count Badge */}
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
            errorCount > 0
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
          }`}
        >
          <AlertCircle className="w-3 h-3" />
          {errorCount > 0 ? (
            <span>
              {currentErrorIndex > 0 ? `${currentErrorIndex}/` : ''}
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          ) : (
            <span>No errors</span>
          )}
        </div>

        <button
          onClick={onNextError}
          disabled={errorCount === 0}
          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next error (N)"
          aria-label="Go to next error"
        >
          <span className="hidden sm:inline">Next Error</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Footer with packet count */}
      <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-600">
        {totalPackets.toLocaleString()} packets total
      </div>
    </div>
  );
}
