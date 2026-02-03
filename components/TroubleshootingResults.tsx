'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  AlertTriangle, 
  FileText, 
  Wrench, 
  CheckSquare, 
  Shield,
  Copy,
  Check,
  Download,
  Expand,
  Minimize2
} from 'lucide-react';
import FormattedAIResponse from './FormattedAIResponse';

interface TroubleshootingResultsProps {
  analysis: string;
  onClose: () => void;
}

interface ParsedSection {
  id: string;
  title: string;
  content: string;
  icon: React.ReactNode;
  accentColor: string;
  accentColorDark: string;
}

/**
 * Section configuration with icons and colors
 */
const SECTION_CONFIG: Record<string, { icon: React.ReactNode; accentColor: string; accentColorDark: string }> = {
  'root-cause': {
    icon: <Search className="w-5 h-5" />,
    accentColor: 'text-purple-600',
    accentColorDark: 'text-purple-400',
  },
  'impact-assessment': {
    icon: <AlertTriangle className="w-5 h-5" />,
    accentColor: 'text-red-600',
    accentColorDark: 'text-red-400',
  },
  'evidence': {
    icon: <FileText className="w-5 h-5" />,
    accentColor: 'text-blue-600',
    accentColorDark: 'text-blue-400',
  },
  'remediation': {
    icon: <Wrench className="w-5 h-5" />,
    accentColor: 'text-green-600',
    accentColorDark: 'text-green-400',
  },
  'verification': {
    icon: <CheckSquare className="w-5 h-5" />,
    accentColor: 'text-teal-600',
    accentColorDark: 'text-teal-400',
  },
  'prevention': {
    icon: <Shield className="w-5 h-5" />,
    accentColor: 'text-orange-600',
    accentColorDark: 'text-orange-400',
  },
};

/**
 * Get section config by matching title patterns
 */
function getSectionConfig(title: string): { icon: React.ReactNode; accentColor: string; accentColorDark: string } {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes('root') || lowerTitle.includes('cause')) {
    return SECTION_CONFIG['root-cause'];
  }
  if (lowerTitle.includes('impact') || lowerTitle.includes('assessment')) {
    return SECTION_CONFIG['impact-assessment'];
  }
  if (lowerTitle.includes('evidence') || lowerTitle.includes('analysis') || lowerTitle.includes('technical')) {
    return SECTION_CONFIG['evidence'];
  }
  if (lowerTitle.includes('remediation') || lowerTitle.includes('steps') || lowerTitle.includes('fix')) {
    return SECTION_CONFIG['remediation'];
  }
  if (lowerTitle.includes('verification') || lowerTitle.includes('checklist') || lowerTitle.includes('verify')) {
    return SECTION_CONFIG['verification'];
  }
  if (lowerTitle.includes('prevention') || lowerTitle.includes('monitoring') || lowerTitle.includes('prevent')) {
    return SECTION_CONFIG['prevention'];
  }
  
  // Default config
  return SECTION_CONFIG['evidence'];
}

/**
 * Parse the AI response into structured sections
 */
function parseAnalysisSections(analysis: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = analysis.split('\n');
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Match ## headers
    const headerMatch = line.match(/^##\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section
      if (currentTitle) {
        const config = getSectionConfig(currentTitle);
        sections.push({
          id: currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title: currentTitle,
          content: currentContent.join('\n').trim(),
          ...config,
        });
      }
      
      currentTitle = headerMatch[1].trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentTitle) {
    const config = getSectionConfig(currentTitle);
    sections.push({
      id: currentTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: currentTitle,
      content: currentContent.join('\n').trim(),
      ...config,
    });
  }

  return sections;
}

/**
 * Generate preview text from content
 */
function generatePreview(content: string, maxLength = 120): string {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';
  
  let preview = lines[0].replace(/^[-*•\d.]+\s*/, '').trim();
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength - 3) + '...';
  }
  return preview;
}

/**
 * Extract issue summary from analysis
 */
function extractIssueSummary(analysis: string): { title: string; severity: string; confidence: string } {
  // Try to find issue/problem statement
  const issueMatch = analysis.match(/(?:issue|problem|detected):\s*(.+?)(?:\n|$)/i);
  const severityMatch = analysis.match(/severity:\s*(high|medium|low|critical)/i);
  const confidenceMatch = analysis.match(/confidence:\s*(\d+%?)/i);

  return {
    title: issueMatch?.[1]?.trim() || 'Network Issue Analysis',
    severity: severityMatch?.[1]?.toLowerCase() || 'medium',
    confidence: confidenceMatch?.[1] || '85%',
  };
}

/**
 * TroubleshootingResults Component
 * 
 * Displays deep troubleshooting analysis with expandable cards.
 * Features:
 * - Root Cause expanded by default
 * - Other sections collapsed with preview
 * - Copy button per section
 * - Expand All / Collapse All
 * - Export PDF (all sections)
 * - Responsive design
 * - Dark/light mode support
 */
export default function TroubleshootingResults({ analysis, onClose }: TroubleshootingResultsProps) {
  // Parse sections
  const sections = useMemo(() => parseAnalysisSections(analysis), [analysis]);
  const issueSummary = useMemo(() => extractIssueSummary(analysis), [analysis]);

  // Track which sections are open - Root Cause open by default
  const [openSections, setOpenSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    // Find root cause section and open it
    const rootCause = sections.find(s => 
      s.title.toLowerCase().includes('root') || s.title.toLowerCase().includes('cause')
    );
    if (rootCause) {
      initial.add(rootCause.id);
    } else if (sections.length > 0) {
      initial.add(sections[0].id);
    }
    return initial;
  });

  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Toggle section
  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Expand all
  const expandAll = useCallback(() => {
    setOpenSections(new Set(sections.map(s => s.id)));
  }, [sections]);

  // Collapse all
  const collapseAll = useCallback(() => {
    setOpenSections(new Set());
  }, []);

  // Copy section content
  const copySection = useCallback(async (sectionId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedSection(sectionId);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  // Export as PDF (markdown download for now)
  const exportPDF = useCallback(() => {
    const blob = new Blob([analysis], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `troubleshooting-report-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [analysis]);

  // Severity color
  const severityColor = useMemo(() => {
    switch (issueSummary.severity) {
      case 'critical':
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  }, [issueSummary.severity]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🔧 Deep Troubleshooting Results
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issue Summary */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {issueSummary.title}
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Severity:</span>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${severityColor}`} />
                <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                  {issueSummary.severity}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {issueSummary.confidence}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {sections.map((section) => {
            const isOpen = openSections.has(section.id);
            const preview = generatePreview(section.content);
            const isCopied = copiedSection === section.id;

            return (
              <div
                key={section.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800"
              >
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`flex-shrink-0 ${section.accentColor} dark:${section.accentColorDark}`}>
                      {section.icon}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white truncate">
                      {section.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Preview (when collapsed) */}
                {!isOpen && preview && (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-750/50 border-t border-gray-100 dark:border-gray-700">
                    {preview}
                  </div>
                )}

                {/* Content (when expanded) */}
                {isOpen && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    {/* Copy button */}
                    <div className="px-4 py-2 flex justify-end bg-gray-50/50 dark:bg-gray-750/50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copySection(section.id, section.content);
                        }}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Section content */}
                    <div className="p-4 prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
                      <FormattedAIResponse content={section.content} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-750">
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <Expand className="w-4 h-4" />
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              Collapse All
            </button>
          </div>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
}
