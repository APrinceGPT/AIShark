'use client';

import React, { ReactNode, useMemo } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Zap, 
  ClipboardList, 
  Wrench, 
  CheckCircle, 
  Shield,
  Info,
  Tag
} from 'lucide-react';

interface FormattedAIResponseProps {
  content: string;
  className?: string;
  onPacketClick?: (packetId: number) => void;
}

// Section configuration with icons and colors
const SECTION_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  'evidence': { 
    icon: <ClipboardList className="w-4 h-4" />, 
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20'
  },
  'likely cause': { 
    icon: <Search className="w-4 h-4" />, 
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  },
  'root cause': { 
    icon: <Search className="w-4 h-4" />, 
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20'
  },
  'remediation': { 
    icon: <Wrench className="w-4 h-4" />, 
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20'
  },
  'impact': { 
    icon: <Zap className="w-4 h-4" />, 
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20'
  },
  'verification': { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20'
  },
  'prevention': { 
    icon: <Shield className="w-4 h-4" />, 
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20'
  },
  'recommendation': { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/20'
  },
};

// Severity badge component
function SeverityBadge({ severity }: { severity: string }) {
  const upper = severity.toUpperCase();
  
  if (upper === 'HIGH' || upper === 'CRITICAL') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
        {upper}
      </span>
    );
  }
  
  if (upper === 'MEDIUM' || upper === 'MODERATE') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
        {upper}
      </span>
    );
  }
  
  if (upper === 'LOW' || upper === 'INFO') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
        {upper}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
      {severity}
    </span>
  );
}

// Type badge component
function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
      <Tag className="w-3 h-3" />
      {type}
    </span>
  );
}

// Parse and enhance content
function parseContent(content: string, onPacketClick?: (packetId: number) => void): ReactNode[] {
  const lines = content.split('\n');
  const elements: ReactNode[] = [];
  let currentSection: string | null = null;
  let sectionContent: ReactNode[] = [];
  let listItems: string[] = [];
  let inList = false;
  let numberedItemContent: ReactNode[] = [];
  let currentNumberedItem: string | null = null;
  
  const flushList = (key: string) => {
    if (listItems.length > 0) {
      const sectionKey = currentSection?.toLowerCase() || '';
      const isRemediation = sectionKey.includes('remediation') || sectionKey.includes('recommendation');
      
      elements.push(
        <ul key={key} className="space-y-2 my-3 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
              <span className={`mt-1.5 flex-shrink-0 ${isRemediation ? 'text-green-500 dark:text-green-400' : 'text-purple-500 dark:text-purple-400'}`}>
                {isRemediation ? '◆' : '▸'}
              </span>
              <span className="leading-relaxed">{processInlineContent(item, onPacketClick)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };
  
  const flushSection = (key: string) => {
    if (currentSection && sectionContent.length > 0) {
      const sectionKey = currentSection.toLowerCase();
      const config = Object.entries(SECTION_CONFIG).find(([k]) => sectionKey.includes(k))?.[1];
      
      elements.push(
        <div key={key} className={`my-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden`}>
          <div className={`flex items-center gap-2 px-3 py-2 ${config?.bgColor || 'bg-gray-50 dark:bg-gray-800'}`}>
            <span className={config?.color || 'text-gray-600 dark:text-gray-400'}>
              {config?.icon || <Info className="w-4 h-4" />}
            </span>
            <span className={`text-sm font-semibold uppercase tracking-wide ${config?.color || 'text-gray-700 dark:text-gray-300'}`}>
              {currentSection}
            </span>
          </div>
          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800">
            {sectionContent}
          </div>
        </div>
      );
      sectionContent = [];
      currentSection = null;
    }
  };
  
  const flushNumberedItem = (key: string) => {
    if (currentNumberedItem && numberedItemContent.length > 0) {
      elements.push(
        <div key={key} className="my-4 border-l-4 border-purple-500 dark:border-purple-400 bg-gray-50 dark:bg-gray-800 rounded-r-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-750">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              {currentNumberedItem}
            </h4>
          </div>
          <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800">
            {numberedItemContent}
          </div>
        </div>
      );
      numberedItemContent = [];
      currentNumberedItem = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Skip empty lines but handle spacing
    if (!trimmedLine) {
      if (inList) flushList(`list-${i}`);
      continue;
    }
    
    // Detect numbered items (e.g., "1. Issue Name" or "2. Another Issue")
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch && !trimmedLine.match(/^\d+\.\s+(Type|Severity|Evidence|Remediation|Likely|Impact)/i)) {
      if (inList) flushList(`list-before-num-${i}`);
      flushSection(`section-before-num-${i}`);
      flushNumberedItem(`num-item-${i}`);
      currentNumberedItem = trimmedLine;
      continue;
    }
    
    // Detect section headers (Evidence:, Remediation:, Likely Cause:, etc.)
    const sectionMatch = trimmedLine.match(/^(Evidence|Likely Cause|Root Cause|Remediation|Impact|Verification|Prevention|Recommendations?):?\s*$/i);
    if (sectionMatch) {
      if (inList) flushList(`list-before-section-${i}`);
      flushSection(`section-${i}`);
      currentSection = sectionMatch[1];
      continue;
    }
    
    // Detect Type: line
    const typeMatch = trimmedLine.match(/^Type:\s*(.+)$/i);
    if (typeMatch) {
      if (inList) flushList(`list-${i}`);
      const content = (
        <div key={`type-${i}`} className="flex items-center gap-2 my-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Type:</span>
          <TypeBadge type={typeMatch[1]} />
        </div>
      );
      if (currentNumberedItem) {
        numberedItemContent.push(content);
      } else {
        elements.push(content);
      }
      continue;
    }
    
    // Detect Severity: line
    const severityMatch = trimmedLine.match(/^Severity:\s*(.+)$/i);
    if (severityMatch) {
      if (inList) flushList(`list-${i}`);
      const content = (
        <div key={`severity-${i}`} className="flex items-center gap-2 my-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Severity:</span>
          <SeverityBadge severity={severityMatch[1]} />
        </div>
      );
      if (currentNumberedItem) {
        numberedItemContent.push(content);
      } else {
        elements.push(content);
      }
      continue;
    }
    
    // Detect list items (bullet points)
    const bulletMatch = trimmedLine.match(/^[-•*]\s+(.+)$/);
    if (bulletMatch) {
      inList = true;
      listItems.push(bulletMatch[1]);
      continue;
    }
    
    // Regular paragraph or content
    if (inList) flushList(`list-${i}`);
    
    // Check for headers (## or ###)
    const h2Match = trimmedLine.match(/^##\s+(.+)$/);
    if (h2Match) {
      flushSection(`section-h2-${i}`);
      flushNumberedItem(`num-before-h2-${i}`);
      elements.push(
        <h2 key={`h2-${i}`} className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
          {h2Match[1]}
        </h2>
      );
      continue;
    }
    
    const h3Match = trimmedLine.match(/^###\s+(.+)$/);
    if (h3Match) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-4 mb-2">
          {h3Match[1]}
        </h3>
      );
      continue;
    }
    
    // Special styled content for specific patterns
    const anomalyHeader = trimmedLine.match(/^🔍?\s*ANOMALIES?\s+DETECTED/i);
    if (anomalyHeader) {
      elements.push(
        <div key={`anomaly-header-${i}`} className="flex items-center gap-2 my-4 py-2 border-b-2 border-yellow-400 dark:border-yellow-500">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <span className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide">
            Anomalies Detected
          </span>
        </div>
      );
      continue;
    }
    
    // Regular paragraph
    const paragraphContent = (
      <p key={`p-${i}`} className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
        {processInlineContent(trimmedLine, onPacketClick)}
      </p>
    );
    
    if (currentSection) {
      sectionContent.push(paragraphContent);
    } else if (currentNumberedItem) {
      numberedItemContent.push(paragraphContent);
    } else {
      elements.push(paragraphContent);
    }
  }
  
  // Flush remaining content
  if (inList) flushList('list-final');
  flushSection('section-final');
  flushNumberedItem('num-item-final');
  
  return elements;
}

// Process inline content for special formatting
function processInlineContent(text: string, onPacketClick?: (packetId: number) => void): ReactNode {
  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;
  
  // Process packet references
  const packetRegex = /(\bpacket\s*#?(\d+))/gi;
  let lastIndex = 0;
  let match;
  
  while ((match = packetRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(processInlineSeverity(text.substring(lastIndex, match.index), key++));
    }
    
    if (onPacketClick) {
      const packetId = parseInt(match[2]);
      parts.push(
        <button
          key={`packet-${key++}`}
          onClick={() => onPacketClick(packetId)}
          className="text-purple-600 dark:text-purple-400 hover:underline font-medium"
          title={`Jump to packet #${packetId}`}
        >
          {match[0]}
        </button>
      );
    } else {
      parts.push(
        <span key={`packet-text-${key++}`} className="font-medium text-purple-600 dark:text-purple-400">
          {match[0]}
        </span>
      );
    }
    lastIndex = packetRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(processInlineSeverity(text.substring(lastIndex), key++));
  }
  
  return parts.length > 0 ? parts : processInlineSeverity(text, 0);
}

// Process inline severity keywords
function processInlineSeverity(text: string, baseKey: number): ReactNode {
  // Match severity keywords and highlight them
  const severityRegex = /\b(HIGH|CRITICAL|MEDIUM|MODERATE|LOW|INFO)\b/gi;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = baseKey;
  
  while ((match = severityRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>
      );
    }
    
    const severity = match[0].toUpperCase();
    let colorClass = 'text-gray-600 dark:text-gray-400';
    
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      colorClass = 'text-red-600 dark:text-red-400 font-semibold';
    } else if (severity === 'MEDIUM' || severity === 'MODERATE') {
      colorClass = 'text-yellow-600 dark:text-yellow-400 font-semibold';
    } else if (severity === 'LOW' || severity === 'INFO') {
      colorClass = 'text-green-600 dark:text-green-400 font-semibold';
    }
    
    parts.push(
      <span key={`severity-inline-${key++}`} className={colorClass}>
        {match[0]}
      </span>
    );
    lastIndex = severityRegex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    parts.push(<span key={`text-end-${key++}`}>{text.substring(lastIndex)}</span>);
  }
  
  return parts.length > 0 ? parts : text;
}

export default function FormattedAIResponse({ 
  content, 
  className = '',
  onPacketClick 
}: FormattedAIResponseProps) {
  if (!content) return null;

  // Parse content with enhanced formatting
  const parsedContent = useMemo(() => {
    return parseContent(content, onPacketClick);
  }, [content, onPacketClick]);

  return (
    <div className={`formatted-ai-response space-y-1 ${className}`}>
      {parsedContent}
    </div>
  );
}
