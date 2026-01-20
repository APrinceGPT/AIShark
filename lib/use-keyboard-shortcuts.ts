/**
 * Keyboard Shortcuts Hook
 * Provides global keyboard shortcut handling
 */

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcutCallbacks {
  onSearch?: () => void;
  onSave?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
  onNextError?: () => void;
  onPrevError?: () => void;
  onAIAssistant?: () => void;
}

/**
 * Hook for handling keyboard shortcuts
 */
export function useKeyboardShortcuts(callbacks: KeyboardShortcutCallbacks) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || 
                     target.tagName === 'TEXTAREA' || 
                     target.isContentEditable;

      // Ctrl/Cmd + F: Focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'f' && !isInput) {
        event.preventDefault();
        callbacks.onSearch?.();
        return;
      }

      // Ctrl/Cmd + S: Save session
      if ((event.ctrlKey || event.metaKey) && event.key === 's' && !isInput) {
        event.preventDefault();
        callbacks.onSave?.();
        return;
      }

      // Ctrl/Cmd + /: Show help
      if ((event.ctrlKey || event.metaKey) && event.key === '/' && !isInput) {
        event.preventDefault();
        callbacks.onHelp?.();
        return;
      }

      // Esc: Close modals/overlays
      if (event.key === 'Escape') {
        callbacks.onEscape?.();
        return;
      }

      // N: Next error packet (only when not in input)
      if (event.key === 'n' && !isInput && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        callbacks.onNextError?.();
        return;
      }

      // P: Previous error packet (only when not in input)
      if (event.key === 'p' && !isInput && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        callbacks.onPrevError?.();
        return;
      }

      // A: Open AI assistant (only when not in input)
      if (event.key === 'a' && !isInput && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        callbacks.onAIAssistant?.();
        return;
      }
    },
    [callbacks]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Get platform-specific modifier key label
 */
export function getModifierKey(): string {
  if (typeof navigator !== 'undefined') {
    return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';
  }
  return 'Ctrl';
}

/**
 * Keyboard shortcuts help data
 */
export const KEYBOARD_SHORTCUTS = [
  { keys: [`${getModifierKey()}+F`], description: 'Focus search' },
  { keys: [`${getModifierKey()}+S`], description: 'Save session' },
  { keys: [`${getModifierKey()}+/`], description: 'Show keyboard shortcuts' },
  { keys: ['Esc'], description: 'Close modals' },
  { keys: ['N'], description: 'Next error packet' },
  { keys: ['P'], description: 'Previous error packet' },
  { keys: ['A'], description: 'Open AI assistant' },
];
