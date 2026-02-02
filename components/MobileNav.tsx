'use client';

import { useState } from 'react';
import { Menu, X, Save, History, LogIn, Zap, Upload, Keyboard } from 'lucide-react';

interface MobileNavProps {
  user: any;
  hasPackets: boolean;
  enableAIAssistant: boolean;
  isFromDatabase: boolean;
  onSaveSession: () => void;
  onShowHistory: () => void;
  onShowAuth: () => void;
  onShowShortcuts: () => void;
  onToggleAI: () => void;
  onNewUpload: () => void;
}

export default function MobileNav({
  user,
  hasPackets,
  enableAIAssistant,
  isFromDatabase,
  onSaveSession,
  onShowHistory,
  onShowAuth,
  onShowShortcuts,
  onToggleAI,
  onNewUpload,
}: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <>
      {/* Hamburger Menu Button (mobile only) */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Navigation */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-2xl
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:hidden
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-white font-bold text-lg">AIShark</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {/* User Section */}
            {user ? (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Signed in as</p>
                <p className="font-medium text-gray-900 dark:text-white truncate">{user.email}</p>
              </div>
            ) : (
              <button
                onClick={() => handleAction(onShowAuth)}
                className="w-full flex items-center gap-3 p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <LogIn className="w-5 h-5" />
                <span className="font-medium">Sign In</span>
              </button>
            )}

            {/* Actions when packets are loaded */}
            {hasPackets && (
              <>
                <div className="pt-2 pb-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider px-3 mb-2">
                    Actions
                  </p>
                </div>

                <button
                  onClick={() => handleAction(onNewUpload)}
                  className="w-full flex items-center gap-3 p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span>Upload New File</span>
                </button>

                {user && !isFromDatabase && (
                  <button
                    onClick={() => handleAction(onSaveSession)}
                    className="w-full flex items-center gap-3 p-3 text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    <span className="font-medium">Save Session</span>
                  </button>
                )}

                {user && (
                  <button
                    onClick={() => handleAction(onShowHistory)}
                    className="w-full flex items-center gap-3 p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <History className="w-5 h-5" />
                    <span>View History</span>
                  </button>
                )}

                <button
                  onClick={() => handleAction(onShowShortcuts)}
                  className="w-full flex items-center gap-3 p-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Keyboard className="w-5 h-5" />
                  <span>Keyboard Shortcuts</span>
                </button>

                <div className="pt-2 pb-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider px-3 mb-2">
                    AI Features
                  </p>
                </div>

                <button
                  onClick={() => handleAction(onToggleAI)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    enableAIAssistant
                      ? 'text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900 hover:bg-yellow-100 dark:hover:bg-yellow-800'
                      : 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <Zap className="w-5 h-5" />
                  <span>AI Packet Assistant</span>
                  <span
                    className={`ml-auto text-xs font-semibold px-2 py-1 rounded ${
                      enableAIAssistant ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {enableAIAssistant ? 'ON' : 'OFF'}
                  </span>
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            AIShark v1.0 • Phase 5
          </p>
        </div>
      </div>
    </>
  );
}
