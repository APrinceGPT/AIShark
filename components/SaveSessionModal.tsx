'use client';

import { useState } from 'react';
import { X, Save } from 'lucide-react';
import { SaveSessionData, saveSession, saveCachedInsights } from '@/lib/session-manager';
import { useAuth } from '@/lib/auth-context';
import { toast } from './ToastContainer';
import { aiCache } from '@/lib/ai-cache';

interface SaveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Omit<SaveSessionData, 'name'>;
  onSaved?: (sessionId: string) => void;
}

export default function SaveSessionModal({ isOpen, onClose, data, onSaved }: SaveSessionModalProps) {
  const [sessionName, setSessionName] = useState(data.fileName.replace('.pcapng', '').replace('.pcap', ''));
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!sessionName.trim()) {
      toast.error('Please enter a session name');
      return;
    }

    if (!user) {
      toast.error('You must be signed in to save sessions');
      return;
    }

    setSaving(true);

    try {
      // Save session first
      const result = await saveSession(
        {
          ...data,
          name: sessionName,
        },
        user.id
      );

      if (result.success && result.sessionId) {
        // Save cached AI insights
        const cachedInsights = aiCache.getAllCachedInsights();
        if (cachedInsights.length > 0) {
          const insightResult = await saveCachedInsights(result.sessionId, cachedInsights);
          if (insightResult.success) {
            toast.success(`Session saved! ${insightResult.saved} AI insight(s) preserved.`);
          } else {
            toast.success('Session saved! (AI insights could not be saved)');
          }
        } else {
          toast.success('Session saved successfully!');
        }
        
        onSaved?.(result.sessionId);
        onClose();
      } else {
        toast.error(result.error || 'Failed to save session');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Save className="w-6 h-6" />
            Save Analysis Session
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <label htmlFor="sessionName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Session Name
            </label>
            <input
              id="sessionName"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter a descriptive name..."
              autoFocus
            />
          </div>

          {/* Session Info */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">File:</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.fileName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Size:</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {(data.fileSize / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Packets:</span>
              <span className="font-medium text-gray-900 dark:text-white">{data.packets.length.toLocaleString()}</span>
            </div>
          </div>

          {/* Note */}
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Note: Statistics and analysis results will be saved. PCAP file can be uploaded separately if needed.
          </p>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !sessionName.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
