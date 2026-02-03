'use client';

import React, { ReactNode, useMemo, useState } from 'react';
import { 
  AlertTriangle, 
  Search, 
  Zap, 
  ClipboardList, 
  Wrench, 
  CheckCircle, 
  Shield,
  Info,
  Tag,
  Copy,
  Check
} from 'lucide-react';

interface FormattedAIResponseProps {
  content: string;
  className?: string;
  onPacketClick?: (packetId: number) => void;
}

// Section configuration with icons and gradient colors
const SECTION_CONFIG: Record<string, { icon: React.ReactNode; gradient: string; borderColor: string }> = {
  'evidence': { 
    icon: <ClipboardList className="w-4 h-4" />, 
    gradient: 'from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10',
    borderColor: 'border-blue-500/30 dark:border-blue-400/30'
  },
  'likely cause': { 
    icon: <Search className="w-4 h-4" />, 
    gradient: 'from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10',
    borderColor: 'border-purple-500/30 dark:border-purple-400/30'
  },
  'root cause': { 
    icon: <Search className="w-4 h-4" />, 
    gradient: 'from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10',
    borderColor: 'border-purple-500/30 dark:border-purple-400/30'
  },
  'remediation': { 
    icon: <Wrench className="w-4 h-4" />, 
    gradient: 'from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10',
    borderColor: 'border-green-500/30 dark:border-green-400/30'
  },
  'impact': { 
    icon: <Zap className="w-4 h-4" />, 
    gradient: 'from-red-500/10 to-red-600/5 dark:from-red-500/20 dark:to-red-600/10',
    borderColor: 'border-red-500/30 dark:border-red-400/30'
  },
  'verification': { 
    icon: <CheckCircle className="w-4 h-4" />, 
    gradient: 'from-teal-500/10 to-teal-600/5 dark:from-teal-500/20 dark:to-teal-600/10',
    borderColor: 'border-teal-500/30 dark:border-teal-400/30'
  },
  'prevention': { 
    icon: <Shield className="w-4 h-4" />, 
    gradient: 'from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-600/10',
    borderColor: 'border-orange-500/30 dark:border-orange-400/30'
  },
  'recommendation': { 
    icon: <CheckCircle className="w-4 h-4" />, 
    gradient: 'from-teal-500/10 to-teal-600/5 dark:from-teal-500/20 dark:to-teal-600/10',
    borderColor: 'border-teal-500/30 dark:border-teal-400/30'
  },
};

// Severity badge component with modern styling
function SeverityBadge({ severity }: { severity: string }) {
  const upper = severity.toUpperCase();
  
  if (upper === 'HIGH' || upper === 'CRITICAL') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-linear-to-r from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-800/30 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-700/50 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>
        {upper}
      </span>
    );
  }
  
  if (upper === 'MEDIUM' || upper === 'MODERATE') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-linear-to-r from-yellow-100 to-amber-50 dark:from-yellow-900/40 dark:to-amber-800/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200/50 dark:border-yellow-700/50 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5"></span>
        {upper}
      </span>
    );
  }
  
  if (upper === 'LOW' || upper === 'INFO') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-linear-to-r from-green-100 to-emerald-50 dark:from-green-900/40 dark:to-emerald-800/30 text-green-700 dark:text-green-300 border border-green-200/50 dark:border-green-700/50 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
        {upper}
      </span>
    );
  }
  
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm">
      {severity}
    </span>
  );
}

// Type badge component with modern styling
function TypeBadge({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-linear-to-r from-indigo-100 to-blue-50 dark:from-indigo-900/40 dark:to-blue-800/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-700/50 shadow-sm">
      <Tag className="w-3 h-3" />
      {type}
    </span>
  );
}

// Code block with copy button
function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-3 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 shadow-sm">
      {/* Language label */}
      {language && (
        <div className="absolute top-0 left-0 px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-br-lg border-r border-b border-gray-200/50 dark:border-gray-700/50">
          {language}
        </div>
      )}
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 rounded-lg bg-gray-100/80 dark:bg-gray-700/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-200 border border-gray-200/50 dark:border-gray-600/50"
        title="Copy code"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
      <pre className="p-4 pt-8 bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
        <code className="text-sm text-gray-800 dark:text-gray-200 font-mono">{code}</code>
      </pre>
    </div>
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
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLang = '';
  
  const flushList = (key: string) => {
    if (listItems.length > 0) {
      const sectionKey = currentSection?.toLowerCase() || '';
      const isRemediation = sectionKey.includes('remediation') || sectionKey.includes('recommendation');
      
      elements.push(
        <ul key={key} className="space-y-2.5 my-3 ml-1">
          {listItems.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-gray-700 dark:text-gray-300">
              <span className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${isRemediation ? 'bg-green-500 dark:bg-green-400' : 'bg-purple-500 dark:bg-purple-400'}`} />
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
        <div key={key} className={`my-4 rounded-xl border ${config?.borderColor || 'border-gray-200/50 dark:border-gray-700/50'} overflow-hidden backdrop-blur-sm shadow-sm transition-all duration-300 hover:shadow-md`}>
          <div className={`flex items-center gap-2.5 px-4 py-2.5 bg-linear-to-r ${config?.gradient || 'from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-750'}`}>
            <span className="text-gray-600 dark:text-gray-400">
              {config?.icon || <Info className="w-4 h-4" />}
            </span>
            <span className="text-sm font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
              {currentSection}
            </span>
          </div>
          <div className="px-4 py-3 bg-white/50 dark:bg-gray-800/50">
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
        <div key={key} className="my-4 rounded-xl border-l-4 border-purple-500 dark:border-purple-400 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-linear-to-r from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              {currentNumberedItem}
            </h4>
          </div>
          <div className="px-4 py-3">
            {numberedItemContent}
          </div>
        </div>
      );
      numberedItemContent = [];
      currentNumberedItem = null;
    }
  };

  const flushCodeBlock = (key: string) => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <CodeBlock key={key} code={codeBlockContent.join('\n')} language={codeBlockLang} />
      );
      codeBlockContent = [];
      codeBlockLang = '';
    }
    inCodeBlock = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(`code-${i}`);
      } else {
        inCodeBlock = true;
        codeBlockLang = trimmedLine.slice(3).trim() || 'code';
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }
    
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
      const typeContent = (
        <div key={`type-${i}`} className="flex items-center gap-2.5 my-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Type:</span>
          <TypeBadge type={typeMatch[1]} />
        </div>
      );
      if (currentNumberedItem) {
        numberedItemContent.push(typeContent);
      } else {
        elements.push(typeContent);
      }
      continue;
    }
    
    // Detect Severity: line
    const severityMatch = trimmedLine.match(/^Severity:\s*(.+)$/i);
    if (severityMatch) {
      if (inList) flushList(`list-${i}`);
      const severityContent = (
        <div key={`severity-${i}`} className="flex items-center gap-2.5 my-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Severity:</span>
          <SeverityBadge severity={severityMatch[1]} />
        </div>
      );
      if (currentNumberedItem) {
        numberedItemContent.push(severityContent);
      } else {
        elements.push(severityContent);
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
        <h2 key={`h2-${i}`} className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3 flex items-center gap-2.5">
          <span className="w-1 h-5 bg-linear-to-b from-purple-500 to-blue-500 rounded-full"></span>
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
    
    // Special styled content for anomaly headers
    const anomalyHeader = trimmedLine.match(/^🔍?\s*ANOMALIES?\s+DETECTED/i);
    if (anomalyHeader) {
      elements.push(
        <div key={`anomaly-header-${i}`} className="flex items-center gap-2.5 my-4 py-2.5 px-4 bg-linear-to-r from-yellow-500/10 to-amber-500/5 dark:from-yellow-500/20 dark:to-amber-500/10 border-b-2 border-yellow-400 dark:border-yellow-500 rounded-t-xl">
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
  if (inCodeBlock) flushCodeBlock('code-final');
  if (inList) flushList('list-final');
  flushSection('section-final');
  flushNumberedItem('num-item-final');
  
  return elements;
}

// Process inline content for special formatting
function processInlineContent(text: string, onPacketClick?: (packetId: number) => void): ReactNode {
  const parts: ReactNode[] = [];
  const packetRegex = /(\bpacket\s*#?(\d+))/gi;
  let lastIndex = 0;
  let match;
  let key = 0;
  
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
          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline font-medium transition-colors duration-200"
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

// Process inline severity keywords and inline code
function processInlineSeverity(text: string, baseKey: number): ReactNode {
  const combinedRegex = /\b(HIGH|CRITICAL|MEDIUM|MODERATE|LOW|INFO)\b|`([^`]+)`/gi;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = baseKey;
  
  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>);
    }
    
    // Check if it's inline code (backticks)
    if (match[2]) {
      parts.push(
        <code key={`code-${key++}`} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-purple-600 dark:text-purple-400 rounded-md text-sm font-mono">
          {match[2]}
        </code>
      );
    } else {
      // It's a severity keyword
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
    }
    lastIndex = combinedRegex.lastIndex;
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

  const parsedContent = useMemo(() => {
    return parseContent(content, onPacketClick);
  }, [content, onPacketClick]);

  return (
    <div className={`formatted-ai-response space-y-1 animate-fade-in ${className}`}>
      {parsedContent}
    </div>
  );
}
