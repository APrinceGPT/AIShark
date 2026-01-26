'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { Packet } from '@/types/packet';

interface TimelineVisualizationProps {
  packets: Packet[];
  onTimeRangeSelect?: (startTime: number, endTime: number) => void;
  selectedPacketId?: number;
  onPacketClick?: (packet: Packet) => void;
}

interface TimelineEntry {
  time: number;
  count: number;
  errors: number;
  protocols: Record<string, number>;
  packetIds: number[];
}

export default function TimelineVisualization({
  packets,
  onTimeRangeSelect,
  selectedPacketId,
  onPacketClick,
}: TimelineVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBucket, setHoveredBucket] = useState<TimelineEntry | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Aggregate packets into time buckets
  const timelineData = useMemo(() => {
    if (packets.length === 0) return [];

    const minTime = packets[0].timestamp;
    const maxTime = packets[packets.length - 1].timestamp;
    const duration = maxTime - minTime;
    
    // Determine bucket size based on duration
    let bucketSize: number;
    if (duration < 1000) bucketSize = 10; // 10ms buckets for < 1s
    else if (duration < 10000) bucketSize = 100; // 100ms buckets for < 10s
    else if (duration < 60000) bucketSize = 1000; // 1s buckets for < 1min
    else if (duration < 600000) bucketSize = 5000; // 5s buckets for < 10min
    else bucketSize = 30000; // 30s buckets for longer captures

    const buckets = new Map<number, TimelineEntry>();

    packets.forEach((packet) => {
      const bucketTime = Math.floor((packet.timestamp - minTime) / bucketSize) * bucketSize + minTime;
      
      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          time: bucketTime,
          count: 0,
          errors: 0,
          protocols: {},
          packetIds: [],
        });
      }

      const bucket = buckets.get(bucketTime)!;
      bucket.count++;
      bucket.packetIds.push(packet.id);
      
      if (packet.flags?.hasError) {
        bucket.errors++;
      }

      bucket.protocols[packet.protocol] = (bucket.protocols[packet.protocol] || 0) + 1;
    });

    return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
  }, [packets]);

  const maxCount = useMemo(() => {
    return Math.max(...timelineData.map((d) => d.count), 1);
  }, [timelineData]);

  const handleMouseMove = (e: React.MouseEvent, bucket: TimelineEntry) => {
    setHoveredBucket(bucket);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredBucket(null);
  };

  const handleMouseDown = (e: React.MouseEvent, bucket: TimelineEntry) => {
    setIsSelecting(true);
    setSelection({ start: bucket.time, end: bucket.time });
  };

  const handleMouseUp = () => {
    if (isSelecting && selection && onTimeRangeSelect) {
      const startTime = Math.min(selection.start, selection.end);
      const endTime = Math.max(selection.start, selection.end);
      onTimeRangeSelect(startTime, endTime);
    }
    setIsSelecting(false);
  };

  const handleBucketClick = (bucket: TimelineEntry) => {
    if (onPacketClick && bucket.packetIds.length > 0) {
      const firstPacket = packets.find((p) => p.id === bucket.packetIds[0]);
      if (firstPacket) {
        onPacketClick(firstPacket);
      }
    }
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  const getProtocolColor = (protocol: string): string => {
    const colors: Record<string, string> = {
      HTTP: '#22c55e',
      HTTPS: '#16a34a',
      DNS: '#3b82f6',
      TCP: '#8b5cf6',
      UDP: '#ec4899',
      TLS: '#14b8a6',
    };
    return colors[protocol] || '#6b7280';
  };

  if (packets.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-lg">
        No packets to display
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline Header */}
      <div className="flex justify-between items-center mb-2 text-xs text-gray-500 dark:text-gray-400">
        <span>{formatTime(packets[0]?.timestamp || 0)}</span>
        <span className="font-medium">Timeline ({timelineData.length} buckets)</span>
        <span>{formatTime(packets[packets.length - 1]?.timestamp || 0)}</span>
      </div>

      {/* Timeline Visualization */}
      <div
        ref={containerRef}
        className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden flex items-end gap-px p-2"
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseLeave();
          if (isSelecting) handleMouseUp();
        }}
      >
        {timelineData.map((bucket, index) => {
          const height = (bucket.count / maxCount) * 100;
          const hasErrors = bucket.errors > 0;
          const isSelected = bucket.packetIds.includes(selectedPacketId || -1);

          return (
            <div
              key={bucket.time}
              className={`
                flex-1 min-w-[4px] max-w-[20px] rounded-t cursor-pointer
                transition-all duration-150 hover:opacity-80
                ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
              `}
              style={{
                height: `${Math.max(height, 2)}%`,
                backgroundColor: hasErrors ? '#ef4444' : '#3b82f6',
              }}
              onMouseMove={(e) => handleMouseMove(e, bucket)}
              onMouseLeave={handleMouseLeave}
              onMouseDown={(e) => handleMouseDown(e, bucket)}
              onClick={() => handleBucketClick(bucket)}
              title={`${bucket.count} packets`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">Normal</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span className="text-gray-600 dark:text-gray-400">Has Errors</span>
        </div>
        <div className="flex items-center gap-1 ml-auto text-gray-500 dark:text-gray-400">
          Click to select • Drag to filter range
        </div>
      </div>

      {/* Tooltip */}
      {hoveredBucket && (
        <div
          className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-sm pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 10,
            transform: 'translateY(-100%)',
          }}
        >
          <div className="font-medium text-gray-900 dark:text-white mb-1">
            {formatTime(hoveredBucket.time)}
          </div>
          <div className="text-gray-600 dark:text-gray-300">
            <span className="font-semibold">{hoveredBucket.count}</span> packets
            {hoveredBucket.errors > 0 && (
              <span className="text-red-500 ml-2">({hoveredBucket.errors} errors)</span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {Object.entries(hoveredBucket.protocols)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([protocol, count]) => (
                <span
                  key={protocol}
                  className="px-1.5 py-0.5 rounded text-xs text-white"
                  style={{ backgroundColor: getProtocolColor(protocol) }}
                >
                  {protocol}: {count}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
