'use client';

import { useState, useCallback } from 'react';
import Toast, { ToastType } from './Toast';

interface ToastData {
  id: string;
  type: ToastType;
  message: string;
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Expose addToast globally
  if (typeof window !== 'undefined') {
    (window as any).__addToast = (type: ToastType, message: string) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      setToasts(prev => [...prev, { id, type, message }]);
    };
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={removeToast}
        />
      ))}
    </div>
  );
}

// Helper functions to show toasts from anywhere
export const toast = {
  success: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).__addToast) {
      (window as any).__addToast('success', message);
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).__addToast) {
      (window as any).__addToast('error', message);
    }
  },
  warning: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).__addToast) {
      (window as any).__addToast('warning', message);
    }
  },
  info: (message: string) => {
    if (typeof window !== 'undefined' && (window as any).__addToast) {
      (window as any).__addToast('info', message);
    }
  },
};
