'use client';

import { UploadProgress } from '@/lib/use-packet-session';
import { Cloud, Check, AlertCircle, Loader2 } from 'lucide-react';

interface UploadProgressBarProps {
  progress: UploadProgress;
  packetCount: number;
}

export default function UploadProgressBar({ progress, packetCount }: UploadProgressBarProps) {
  // Don't show if idle or packet count is low
  if (progress.status === 'idle' || packetCount < 500) {
    return null;
  }

  const getStatusIcon = () => {
    switch (progress.status) {
      case 'uploading':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'complete':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Cloud className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (progress.status) {
      case 'uploading':
        return `Uploading for AI... ${progress.percentage}%`;
      case 'complete':
        return 'Ready for AI analysis';
      case 'error':
        return progress.error || 'Upload failed';
      default:
        return 'Preparing upload...';
    }
  };

  const getStatusColor = () => {
    switch (progress.status) {
      case 'uploading':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      case 'complete':
        return 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  return (
    <div className={`border-b px-4 py-2 ${getStatusColor()}`}>
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        {getStatusIcon()}
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {getStatusText()}
            </span>
            {progress.status === 'uploading' && (
              <span className="text-gray-500 dark:text-gray-400">
                {progress.uploadedPackets.toLocaleString()} / {progress.totalPackets.toLocaleString()} packets
              </span>
            )}
          </div>
          {progress.status === 'uploading' && (
            <div className="mt-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
