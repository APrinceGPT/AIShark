'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 dark:bg-gray-900">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Application Error
            </h2>
            
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              A critical error occurred. We've been notified and are working to fix it.
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-left">
                <p className="text-sm font-mono text-red-600 dark:text-red-400 break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}
            
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <RefreshCcw className="w-5 h-5" />
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
