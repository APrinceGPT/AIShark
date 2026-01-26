'use client';

import { useState } from 'react';
import { X, Share2, Copy, Check, Calendar, Eye } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { toast } from './ToastContainer';

interface ShareSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  sessionName: string;
}

export default function ShareSessionDialog({
  isOpen,
  onClose,
  sessionId,
  sessionName,
}: ShareSessionDialogProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [expiresInDays, setExpiresInDays] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { user, session } = useAuth();

  if (!isOpen) return null;

  const handleCreateShare = async () => {
    if (!user || !session) {
      toast.error('You must be signed in to share sessions');
      return;
    }

    setLoading(true);

    try {
      const token = session.access_token;
      if (!token) {
        toast.error('Authentication failed');
        return;
      }

      const response = await fetch('/api/share/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          expiresInDays: expiresInDays > 0 ? expiresInDays : null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShareUrl(data.shareUrl);
        setExpiresAt(data.expiresAt);
        toast.success('Share link created successfully!');
      } else {
        toast.error(data.error || 'Failed to create share link');
      }
    } catch (error) {
      console.error('Share creation error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleRevokeShare = async () => {
    if (!user || !session || !confirm('Are you sure you want to revoke this share link?')) {
      return;
    }

    setLoading(true);

    try {
      const token = session.access_token;
      if (!token) {
        toast.error('Authentication failed');
        return;
      }

      const response = await fetch('/api/share/revoke', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setShareUrl(null);
        setExpiresAt(null);
        toast.success('Share link revoked successfully!');
      } else {
        toast.error(data.error || 'Failed to revoke share link');
      }
    } catch (error) {
      console.error('Share revocation error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-6 h-6" />
            Share Analysis
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Session: <span className="font-semibold text-gray-900 dark:text-white">{sessionName}</span>
            </p>
          </div>

          {!shareUrl ? (
            <>
              {/* Expiration Settings */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Link Expiration
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    days (0 = never expires)
                  </span>
                </div>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> Recipients will have <strong>read-only</strong> access to:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 ml-4 list-disc space-y-1">
                  <li>Packet statistics and analysis</li>
                  <li>AI-generated insights</li>
                  <li>Packet annotations</li>
                </ul>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-3">
                  <strong>No sign-in required</strong> for recipients.
                </p>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <Share2 className="w-5 h-5" />
                {loading ? 'Creating Share Link...' : 'Create Share Link'}
              </button>
            </>
          ) : (
            <>
              {/* Share URL Display */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Share Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Expiration Info */}
              {expiresAt && (
                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Expires: {new Date(expiresAt).toLocaleString()}
                  </p>
                </div>
              )}

              {!expiresAt && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4">
                  <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    This link never expires
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleRevokeShare}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Revoking...' : 'Revoke Link'}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
