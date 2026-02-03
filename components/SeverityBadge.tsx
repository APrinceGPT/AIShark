'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, Package } from 'lucide-react';

export type SeverityLevel = 'critical' | 'warning' | 'info' | 'neutral';

export interface SeverityBadgeProps {
  /** Severity level determines color scheme */
  level: SeverityLevel;
  /** Count or value to display */
  count: number;
  /** Label text (e.g., "Critical", "Warnings") */
  label: string;
  /** Optional custom icon override */
  icon?: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the icon */
  showIcon?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Click handler (optional) */
  onClick?: () => void;
}

/**
 * Color schemes for each severity level
 * Light mode and dark mode variants
 */
const severityColors: Record<SeverityLevel, {
  bg: string;
  bgDark: string;
  text: string;
  textDark: string;
  border: string;
  borderDark: string;
}> = {
  critical: {
    bg: 'bg-red-100',
    bgDark: 'dark:bg-red-900/30',
    text: 'text-red-700',
    textDark: 'dark:text-red-400',
    border: 'border-red-200',
    borderDark: 'dark:border-red-800',
  },
  warning: {
    bg: 'bg-yellow-100',
    bgDark: 'dark:bg-yellow-900/30',
    text: 'text-yellow-700',
    textDark: 'dark:text-yellow-400',
    border: 'border-yellow-200',
    borderDark: 'dark:border-yellow-800',
  },
  info: {
    bg: 'bg-blue-100',
    bgDark: 'dark:bg-blue-900/30',
    text: 'text-blue-700',
    textDark: 'dark:text-blue-400',
    border: 'border-blue-200',
    borderDark: 'dark:border-blue-800',
  },
  neutral: {
    bg: 'bg-gray-100',
    bgDark: 'dark:bg-gray-700',
    text: 'text-gray-700',
    textDark: 'dark:text-gray-300',
    border: 'border-gray-200',
    borderDark: 'dark:border-gray-600',
  },
};

/**
 * Default icons for each severity level
 */
const severityIcons: Record<SeverityLevel, React.ReactNode> = {
  critical: <AlertCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Info className="w-4 h-4" />,
  neutral: <Package className="w-4 h-4" />,
};

/**
 * Size classes for different variants
 */
const sizeClasses = {
  sm: {
    container: 'px-2 py-1',
    count: 'text-lg font-bold',
    label: 'text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-3 py-2',
    count: 'text-2xl font-bold',
    label: 'text-xs',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-4 py-3',
    count: 'text-3xl font-bold',
    label: 'text-sm',
    icon: 'w-5 h-5',
  },
};

/**
 * SeverityBadge Component
 * 
 * Displays a count with severity-based coloring
 * Used in the Summary Dashboard Card to show critical/warning/info counts
 */
export default function SeverityBadge({
  level,
  count,
  label,
  icon,
  size = 'md',
  showIcon = true,
  className = '',
  onClick,
}: SeverityBadgeProps) {
  const colors = severityColors[level];
  const sizes = sizeClasses[size];
  const defaultIcon = severityIcons[level];
  const displayIcon = icon || defaultIcon;

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        ${sizes.container}
        ${colors.bg} ${colors.bgDark}
        ${colors.border} ${colors.borderDark}
        border rounded-lg
        flex flex-col items-center justify-center
        min-w-[70px]
        transition-all duration-200
        ${onClick ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500' : ''}
        ${className}
      `}
      {...(onClick ? { type: 'button' as const } : {})}
    >
      {/* Icon + Count Row */}
      <div className="flex items-center gap-1">
        {showIcon && (
          <span className={`${colors.text} ${colors.textDark}`}>
            {displayIcon}
          </span>
        )}
        <span className={`${sizes.count} ${colors.text} ${colors.textDark}`}>
          {count.toLocaleString()}
        </span>
      </div>
      
      {/* Label */}
      <span className={`${sizes.label} ${colors.text} ${colors.textDark} opacity-80`}>
        {label}
      </span>
    </Component>
  );
}

/**
 * SeverityBadgeGroup Component
 * 
 * Displays a row of severity badges
 * Responsive: 4 columns on desktop, 2x2 on tablet, stacked on mobile
 */
export interface SeverityBadgeGroupProps {
  badges: Array<{
    level: SeverityLevel;
    count: number;
    label: string;
    icon?: React.ReactNode;
  }>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SeverityBadgeGroup({ 
  badges, 
  size = 'md',
  className = '' 
}: SeverityBadgeGroupProps) {
  return (
    <div 
      className={`
        grid gap-2
        grid-cols-2 sm:grid-cols-4
        ${className}
      `}
    >
      {badges.map((badge, index) => (
        <SeverityBadge
          key={`${badge.level}-${index}`}
          level={badge.level}
          count={badge.count}
          label={badge.label}
          icon={badge.icon}
          size={size}
        />
      ))}
    </div>
  );
}
