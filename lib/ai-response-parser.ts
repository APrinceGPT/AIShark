/**
 * AI Response Parser Utilities
 * 
 * Functions for parsing AI-generated responses to extract:
 * - Severity counts (critical, warning, info)
 * - Key findings
 * - Structured sections
 */

import { SeverityCounts } from '@/components/SummaryDashboardCard';

export interface ParsedAIResponse {
  severityCounts: SeverityCounts;
  keyFinding: string | null;
  sections: ParsedSection[];
}

export interface ParsedSection {
  id: string;
  title: string;
  content: string;
  severity?: 'critical' | 'warning' | 'info' | 'neutral';
  itemCount?: number;
  preview?: string;
}

/**
 * Severity detection patterns
 */
const CRITICAL_PATTERNS = [
  /critical/gi,
  /severe/gi,
  /🔴/g,
  /\bhigh\s+risk/gi,
  /\bhigh\s+severity/gi,
  /security\s+(threat|vulnerability|issue)/gi,
  /data\s+(breach|exfiltration|leak)/gi,
  /malicious/gi,
  /attack/gi,
];

const WARNING_PATTERNS = [
  /warning/gi,
  /caution/gi,
  /🟡/g,
  /\bmedium\s+risk/gi,
  /\bmoderate/gi,
  /suspicious/gi,
  /anomal(y|ies|ous)/gi,
  /unusual/gi,
  /potential\s+issue/gi,
];

const INFO_PATTERNS = [
  /\binfo\b/gi,
  /information/gi,
  /🟢/g,
  /note/gi,
  /observation/gi,
  /\blow\s+risk/gi,
  /normal/gi,
];

/**
 * Count pattern matches in text
 */
function countPatternMatches(text: string, patterns: RegExp[]): number {
  let count = 0;
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Extract severity counts from AI response text
 */
export function extractSeverityCounts(text: string): SeverityCounts {
  // Try to find explicit counts first (e.g., "3 critical issues")
  const criticalMatch = text.match(/(\d+)\s*(critical|severe)/gi);
  const warningMatch = text.match(/(\d+)\s*(warning|caution|anomal)/gi);
  const infoMatch = text.match(/(\d+)\s*(info|observation|note)/gi);

  // Extract numbers from matches or count pattern occurrences
  let critical = 0;
  let warning = 0;
  let info = 0;

  if (criticalMatch) {
    const numMatch = criticalMatch[0].match(/\d+/);
    critical = numMatch ? parseInt(numMatch[0], 10) : 0;
  } else {
    critical = Math.min(countPatternMatches(text, CRITICAL_PATTERNS), 10);
  }

  if (warningMatch) {
    const numMatch = warningMatch[0].match(/\d+/);
    warning = numMatch ? parseInt(numMatch[0], 10) : 0;
  } else {
    warning = Math.min(countPatternMatches(text, WARNING_PATTERNS), 10);
  }

  if (infoMatch) {
    const numMatch = infoMatch[0].match(/\d+/);
    info = numMatch ? parseInt(numMatch[0], 10) : 0;
  } else {
    info = Math.min(countPatternMatches(text, INFO_PATTERNS), 10);
  }

  return { critical, warning, info };
}

/**
 * Extract key finding (first significant finding) from AI response
 */
export function extractKeyFinding(text: string): string | null {
  // Look for explicit key finding markers
  const keyFindingMatch = text.match(/key\s+finding[s]?:\s*(.+?)(?:\n|$)/i);
  if (keyFindingMatch) {
    return keyFindingMatch[1].trim();
  }

  // Look for summary sentences with severity keywords
  const sentences = text.split(/[.!]\s+/);
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    if (
      (lower.includes('detected') || lower.includes('found') || lower.includes('identified')) &&
      (lower.includes('critical') || lower.includes('anomal') || lower.includes('suspicious') || lower.includes('security'))
    ) {
      const trimmed = sentence.trim();
      // Limit length and clean up
      if (trimmed.length > 20 && trimmed.length < 200) {
        return trimmed.replace(/^[-*•]\s*/, '');
      }
    }
  }

  // Fallback: first bullet point or sentence with significant finding
  const bulletMatch = text.match(/[-*•]\s*(.+?)(?:\n|$)/);
  if (bulletMatch && bulletMatch[1].length > 20 && bulletMatch[1].length < 200) {
    return bulletMatch[1].trim();
  }

  return null;
}

/**
 * Parse AI response into structured sections
 */
export function parseAIResponseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = text.split('\n');
  let currentSection: ParsedSection | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check for markdown headers (## or ###)
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
    
    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        currentSection.preview = generatePreview(currentSection.content);
        currentSection.itemCount = countItems(currentSection.content);
        sections.push(currentSection);
      }

      // Start new section
      const title = headerMatch[1].trim();
      currentSection = {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title,
        content: '',
        severity: detectSectionSeverity(title),
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = currentContent.join('\n').trim();
    currentSection.preview = generatePreview(currentSection.content);
    currentSection.itemCount = countItems(currentSection.content);
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Detect section severity from title
 */
function detectSectionSeverity(title: string): 'critical' | 'warning' | 'info' | 'neutral' {
  const lower = title.toLowerCase();
  
  if (lower.includes('critical') || lower.includes('security') || lower.includes('threat')) {
    return 'critical';
  }
  if (lower.includes('warning') || lower.includes('anomal') || lower.includes('issue')) {
    return 'warning';
  }
  if (lower.includes('recommend') || lower.includes('info') || lower.includes('observation')) {
    return 'info';
  }
  
  return 'neutral';
}

/**
 * Generate a short preview from content
 */
function generatePreview(content: string, maxLength = 100): string {
  // Get first non-empty line or first sentence
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';

  let preview = lines[0].replace(/^[-*•]\s*/, '').trim();
  
  if (preview.length > maxLength) {
    preview = preview.substring(0, maxLength - 3) + '...';
  }
  
  return preview;
}

/**
 * Count list items in content
 */
function countItems(content: string): number {
  const listItems = content.match(/^[-*•\d]+[.)]\s/gm);
  return listItems ? listItems.length : 0;
}

/**
 * Full parse of AI response
 */
export function parseAIResponse(text: string): ParsedAIResponse {
  return {
    severityCounts: extractSeverityCounts(text),
    keyFinding: extractKeyFinding(text),
    sections: parseAIResponseSections(text),
  };
}
