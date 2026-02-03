'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Copy, Check } from 'lucide-react';

export interface ExpandableSectionProps {
  /** Icon to display in the header (React node, e.g., emoji or Lucide icon) */
  icon?: React.ReactNode;
  /** Section title */
  title: string;
  /** Optional badge (count or text) shown next to title */
  badge?: string | number;
  /** Preview text shown when collapsed (optional) */
  preview?: string;
  /** Whether section starts expanded */
  defaultOpen?: boolean;
  /** Accent color class for the icon (e.g., 'text-purple-600') */
  accentColor?: string;
  /** Dark mode accent color class */
  accentColorDark?: string;
  /** Whether to show copy button for this section */
  showCopyButton?: boolean;
  /** Content to copy when copy button is clicked (defaults to children text content) */
  copyContent?: string;
  /** Controlled open state (optional) */
  isOpen?: boolean;
  /** Callback when open state changes */
  onToggle?: (isOpen: boolean) => void;
  /** Children content to render when expanded */
  children: React.ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * ExpandableSection Component
 * 
 * A reusable accordion-style component with:
 * - Smooth expand/collapse animations
 * - Dark/light mode support
 * - Optional copy button per section
 * - Preview text when collapsed
 * - Accessible keyboard navigation
 */
export default function ExpandableSection({
  icon,
  title,
  badge,
  preview,
  defaultOpen = false,
  accentColor = 'text-gray-600',
  accentColorDark = 'text-gray-400',
  showCopyButton = false,
  copyContent,
  isOpen: controlledIsOpen,
  onToggle,
  children,
  className = '',
}: ExpandableSectionProps) {
  // Use controlled state if provided, otherwise use internal state
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  
  const [copied, setCopied] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);
  const contentRef = useRef<HTMLDivElement>(null);

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(contentRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const handleToggle = useCallback(() => {
    const newState = !isOpen;
    if (onToggle) {
      onToggle(newState);
    } else {
      setInternalIsOpen(newState);
    }
  }, [isOpen, onToggle]);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const textToCopy = copyContent || contentRef.current?.textContent || '';
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [copyContent]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  }, [handleToggle]);

  return (
    <div 
      className={`
        border rounded-lg overflow-hidden
        border-gray-200 dark:border-gray-700
        bg-white dark:bg-gray-800
        transition-colors duration-200
        ${className}
      `}
    >
      {/* Header - Clickable */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-controls={`expandable-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`
          w-full px-4 py-3 flex items-center justify-between gap-3
          bg-gray-50 dark:bg-gray-750
          hover:bg-gray-100 dark:hover:bg-gray-700
          transition-colors duration-150
          cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset
        `}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          {icon && (
            <span className={`flex-shrink-0 ${accentColor} dark:${accentColorDark}`}>
              {icon}
            </span>
          )}
          
          {/* Title + Badge */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-gray-900 dark:text-white truncate">
              {title}
            </span>
            {badge !== undefined && (
              <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                {badge}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Copy Button */}
          {showCopyButton && isOpen && (
            <button
              type="button"
              onClick={handleCopy}
              className={`
                p-1.5 rounded-md
                text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-600
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-blue-500
              `}
              title="Copy section content"
              aria-label="Copy section content"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          )}
          
          {/* Chevron */}
          <ChevronDown
            className={`
              w-5 h-5 text-gray-500 dark:text-gray-400
              transition-transform duration-200 ease-in-out
              ${isOpen ? 'rotate-180' : 'rotate-0'}
            `}
          />
        </div>
      </button>

      {/* Preview Text (only when collapsed) */}
      {!isOpen && preview && (
        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-750/50 border-t border-gray-100 dark:border-gray-700">
          {preview}
        </div>
      )}

      {/* Expandable Content */}
      <div
        id={`expandable-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{
          maxHeight: isOpen ? (contentHeight ? `${contentHeight}px` : 'none') : '0px',
          opacity: isOpen ? 1 : 0,
        }}
        aria-hidden={!isOpen}
      >
        <div ref={contentRef} className="p-4 border-t border-gray-200 dark:border-gray-700">
          {children}
        </div>
      </div>
    </div>
  );
}
