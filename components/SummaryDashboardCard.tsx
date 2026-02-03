'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, Globe, HardDrive } from 'lucide-react';
import { PacketStatistics } from '@/types/packet';
import SeverityBadge, { SeverityBadgeGroup, SeverityLevel } from './SeverityBadge';

export interface SeverityCounts {
  critical: number;
  warning: number;
  info: number;
}

export interface SummaryDashboardCardProps {
  /** Total packet count */
  packetCount: number;
  /** Severity counts extracted from AI response */
  severityCounts: SeverityCounts;
  /** Top protocols with percentages */
  topProtocols?: Array<{ name: string; percentage: number }>;
  /** Capture duration string (e.g., "2h 15m") */
  duration?: string;
  /** Number of unique IP addresses */
  uniqueIPs?: number;
  /** Average packet size in bytes */
  avgPacketSize?: number;
  /** Key finding highlight (single line) */
  keyFinding?: string;
  /** Statistics object for additional data */
  statistics?: PacketStatistics | null;
  /** Whether to show expanded details by default */
  defaultExpanded?: boolean;
  /** Callback when expand state changes */
  onExpandChange?: (expanded: boolean) => void;
  /** Children to render when expanded (detailed sections) */
  children?: React.ReactNode;
}

/**
 * Format duration from seconds to human readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * SummaryDashboardCard Component
 * 
 * Compact overview card showing key metrics at a glance:
 * - Severity badges (Critical, Warning, Info, Total Packets)
 * - Top protocols
 * - Quick stats (duration, unique IPs, avg size)
 * - Key finding highlight
 * - Expandable to show detailed sections
 */
export default function SummaryDashboardCard({
  packetCount,
  severityCounts,
  topProtocols,
  duration,
  uniqueIPs,
  avgPacketSize,
  keyFinding,
  statistics,
  defaultExpanded = false,
  onExpandChange,
  children,
}: SummaryDashboardCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Calculate derived values from statistics if not provided
  const derivedDuration = useMemo(() => {
    if (duration) return duration;
    // Statistics doesn't have duration - return undefined
    return undefined;
  }, [duration]);

  const derivedUniqueIPs = useMemo(() => {
    if (uniqueIPs !== undefined) return uniqueIPs;
    if (statistics?.topTalkers) {
      const uniqueIPs = new Set<string>();
      for (const talker of statistics.topTalkers) {
        uniqueIPs.add(talker.source);
        uniqueIPs.add(talker.destination);
      }
      return uniqueIPs.size;
    }
    return undefined;
  }, [uniqueIPs, statistics?.topTalkers]);

  const derivedAvgSize = useMemo(() => {
    if (avgPacketSize !== undefined) return avgPacketSize;
    if (statistics?.bandwidth?.total && statistics?.totalPackets) {
      return Math.round(statistics.bandwidth.total / statistics.totalPackets);
    }
    return undefined;
  }, [avgPacketSize, statistics?.bandwidth, statistics?.totalPackets]);

  const derivedTopProtocols = useMemo(() => {
    if (topProtocols && topProtocols.length > 0) return topProtocols;
    if (statistics?.protocolDistribution) {
      const entries = Object.entries(statistics.protocolDistribution);
      const total = entries.reduce((sum, [, count]) => sum + count, 0);
      return entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([name, count]) => ({
          name,
          percentage: Math.round((count / total) * 100),
        }));
    }
    return [];
  }, [topProtocols, statistics?.protocolDistribution]);

  const handleToggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    onExpandChange?.(newState);
  };

  const badgeData: Array<{ level: SeverityLevel; count: number; label: string }> = [
    { level: 'critical', count: severityCounts.critical, label: 'Critical' },
    { level: 'warning', count: severityCounts.warning, label: 'Warnings' },
    { level: 'info', count: severityCounts.info, label: 'Info' },
    { level: 'neutral', count: packetCount, label: 'Packets' },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          📊 Analysis Summary
        </h3>
        {children && (
          <button
            onClick={handleToggle}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
          >
            {isExpanded ? (
              <>
                Collapse <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                View Details <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Compact Dashboard */}
      <div className="p-4 space-y-4">
        {/* Severity Badges Row */}
        <SeverityBadgeGroup badges={badgeData} size="md" />

        {/* Protocol Distribution */}
        {derivedTopProtocols.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Top Protocols:</span>
            {derivedTopProtocols.map((proto, idx) => (
              <span
                key={proto.name}
                className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                {proto.name} ({proto.percentage}%)
                {idx < derivedTopProtocols.length - 1 && <span className="sr-only">, </span>}
              </span>
            ))}
          </div>
        )}

        {/* Quick Stats Row */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
          {derivedDuration && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>Duration: <strong className="text-gray-900 dark:text-white">{derivedDuration}</strong></span>
            </div>
          )}
          {derivedUniqueIPs !== undefined && (
            <div className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>Unique IPs: <strong className="text-gray-900 dark:text-white">{derivedUniqueIPs}</strong></span>
            </div>
          )}
          {derivedAvgSize !== undefined && (
            <div className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" />
              <span>Avg Size: <strong className="text-gray-900 dark:text-white">{formatBytes(derivedAvgSize)}</strong></span>
            </div>
          )}
        </div>

        {/* Key Finding Alert */}
        {keyFinding && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Key Finding:</strong> {keyFinding}
            </p>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && children && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 bg-gray-50 dark:bg-gray-850">
          {children}
        </div>
      )}
    </div>
  );
}
