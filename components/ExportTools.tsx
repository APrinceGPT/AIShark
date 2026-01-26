'use client';

import { useState } from 'react';
import { Packet } from '@/types/packet';
import { exportPackets, downloadFile, generateShareableLink } from '@/lib/export';

interface ExportToolsProps {
  packets: Packet[];
  selectedPacketIds?: number[];
}

export default function ExportTools({ packets, selectedPacketIds = [] }: ExportToolsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [format, setFormat] = useState<'json' | 'csv' | 'txt'>('json');
  const [exportType, setExportType] = useState<'all' | 'selected'>('all');

  const handleExport = () => {
    const packetsToExport = exportType === 'selected' && selectedPacketIds.length > 0
      ? packets.filter(p => selectedPacketIds.includes(p.id))
      : packets;

    const content = exportPackets(packetsToExport, {
      format,
      includeFilters: true,
      packets: selectedPacketIds,
    });

    const mimeTypes = {
      json: 'application/json',
      csv: 'text/csv',
      txt: 'text/plain',
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `capture_${timestamp}.${format}`;

    downloadFile(content, filename, mimeTypes[format]);
    setIsOpen(false);
  };

  const handleShare = () => {
    const link = generateShareableLink(selectedPacketIds);
    navigator.clipboard.writeText(link);
    alert('Shareable link copied to clipboard!');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Export
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4">
            <h3 className="font-semibold text-lg mb-4 text-gray-800 dark:text-gray-100">Export Options</h3>

            {/* Export Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Export Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="all"
                    checked={exportType === 'all'}
                    onChange={(e) => setExportType(e.target.value as 'all')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">All Packets ({packets.length})</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="selected"
                    checked={exportType === 'selected'}
                    onChange={(e) => setExportType(e.target.value as 'selected')}
                    className="mr-2"
                    disabled={selectedPacketIds.length === 0}
                  />
                  <span className={`text-sm ${selectedPacketIds.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    Selected Packets ({selectedPacketIds.length})
                  </span>
                </label>
              </div>
            </div>

            {/* Format Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Format
              </label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as 'json' | 'csv' | 'txt')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="txt">Text Report</option>
              </select>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Download Export
              </button>

              {selectedPacketIds.length > 0 && (
                <button
                  onClick={handleShare}
                  className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Copy Shareable Link
                </button>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
              Export data includes all packet details and analysis results.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
