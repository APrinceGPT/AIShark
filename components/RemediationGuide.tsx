'use client';

import React, { useState } from 'react';
import FormattedAIResponse from './FormattedAIResponse';

/**
 * Parsed remediation step structure
 */
interface RemediationStep {
  title: string;
  command?: string;
  expectedResult?: string;
  verification?: string;
  completed: boolean;
}

/**
 * Remediation section grouping
 */
interface RemediationSection {
  title: string;
  timeEstimate: string;
  steps: RemediationStep[];
}

interface RemediationGuideProps {
  analysis: string;
  onClose: () => void;
}

/**
 * RemediationGuide Component
 * Displays AI-generated troubleshooting analysis with interactive remediation checklists
 * Parses markdown-formatted output into structured, actionable steps
 */
export default function RemediationGuide({ analysis, onClose }: RemediationGuideProps) {
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  /**
   * Parse the AI response into structured sections
   */
  const parseAnalysis = () => {
    const sections: Record<string, string> = {};
    const lines = analysis.split('\n');
    let currentSection = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = currentContent.join('\n').trim();
        }
        // Start new section
        currentSection = line.replace('## ', '').trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent.join('\n').trim();
    }

    return sections;
  };

  /**
   * Parse remediation steps from markdown format
   */
  const parseRemediationSteps = (content: string): RemediationSection[] => {
    const sections: RemediationSection[] = [];
    const lines = content.split('\n');
    let currentSection: RemediationSection | null = null;
    let currentStep: RemediationStep | null = null;

    for (const line of lines) {
      // Section header (### Immediate Actions, etc.)
      if (line.startsWith('### ')) {
        if (currentSection && currentStep) {
          currentSection.steps.push(currentStep);
        }
        if (currentSection) {
          sections.push(currentSection);
        }

        const headerMatch = line.match(/### (.+?)(?: \((.+?)\))?$/);
        currentSection = {
          title: headerMatch?.[1].trim() || '',
          timeEstimate: headerMatch?.[2] || '',
          steps: []
        };
        currentStep = null;
      }
      // Numbered step
      else if (line.match(/^\d+\.\s/)) {
        if (currentSection && currentStep) {
          currentSection.steps.push(currentStep);
        }
        currentStep = {
          title: line.replace(/^\d+\.\s/, '').trim(),
          completed: false
        };
      }
      // Step details
      else if (currentStep && line.trim()) {
        if (line.includes('**Command**:')) {
          const cmdMatch = line.match(/\*\*Command\*\*:\s*`(.+?)`/);
          currentStep.command = cmdMatch?.[1] || '';
        } else if (line.includes('**Expected Result**:')) {
          currentStep.expectedResult = line.replace(/.*\*\*Expected Result\*\*:\s*/, '').trim();
        } else if (line.includes('**Verification**:')) {
          currentStep.verification = line.replace(/.*\*\*Verification\*\*:\s*/, '').trim();
        }
      }
    }

    // Push last step and section
    if (currentSection && currentStep) {
      currentSection.steps.push(currentStep);
    }
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  };

  /**
   * Parse verification checklist items
   */
  const parseChecklist = (content: string): string[] => {
    return content
      .split('\n')
      .filter(line => line.trim().startsWith('- [ ]'))
      .map(line => line.replace('- [ ]', '').trim());
  };

  /**
   * Copy command to clipboard
   */
  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  /**
   * Toggle step completion
   */
  const toggleStep = (sectionTitle: string, stepIndex: number) => {
    const key = `${sectionTitle}-${stepIndex}`;
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(key)) {
      newCompleted.delete(key);
    } else {
      newCompleted.add(key);
    }
    setCompletedSteps(newCompleted);
  };

  /**
   * Export as runbook (Markdown)
   */
  const exportRunbook = () => {
    const blob = new Blob([analysis], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remediation-runbook-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sections = parseAnalysis();
  const remediationSections = sections['Remediation Steps'] 
    ? parseRemediationSteps(sections['Remediation Steps']) 
    : [];
  const checklist = sections['Verification Checklist'] 
    ? parseChecklist(sections['Verification Checklist']) 
    : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Remediation Guide</h2>
          <div className="flex gap-2">
            <button
              onClick={exportRunbook}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Export Runbook
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Root Cause & Impact */}
          {(sections['Root Cause'] || sections['Impact Assessment']) && (
            <div className="grid md:grid-cols-2 gap-4">
              {sections['Root Cause'] && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-4">
                  <h3 className="font-bold text-red-900 dark:text-red-200 mb-2">Root Cause</h3>
                  <div className="text-red-800 dark:text-red-300">
                    <FormattedAIResponse content={sections['Root Cause']} />
                  </div>
                </div>
              )}
              {sections['Impact Assessment'] && (
                <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                  <h3 className="font-bold text-orange-900 dark:text-orange-200 mb-2">Impact Assessment</h3>
                  <div className="text-orange-800 dark:text-orange-300">
                    <FormattedAIResponse content={sections['Impact Assessment']} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Evidence */}
          {sections['Evidence'] && (
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 dark:text-blue-200 mb-2">Evidence</h3>
              <div className="text-blue-800 dark:text-blue-300">
                <FormattedAIResponse content={sections['Evidence']} />
              </div>
            </div>
          )}

          {/* Remediation Steps */}
          {remediationSections.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Remediation Steps</h3>
              {remediationSections.map((section, sectionIdx) => (
                <div key={sectionIdx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{section.title}</h4>
                    {section.timeEstimate && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">⏱️ {section.timeEstimate}</p>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    {section.steps.map((step, stepIdx) => {
                      const stepKey = `${section.title}-${stepIdx}`;
                      const isCompleted = completedSteps.has(stepKey);
                      return (
                        <div
                          key={stepIdx}
                          className={`border rounded p-3 ${
                            isCompleted ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => toggleStep(section.title, stepIdx)}
                              className="mt-1 h-5 w-5 text-green-600"
                            />
                            <div className="flex-1">
                              <p className={`font-medium ${isCompleted ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                {step.title}
                              </p>
                              {step.command && (
                                <div className="mt-2 bg-gray-900 text-gray-100 p-2 rounded flex justify-between items-center">
                                  <code className="text-sm">{step.command}</code>
                                  <button
                                    onClick={() => handleCopyCommand(step.command!)}
                                    className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                                  >
                                    {copiedCommand === step.command ? '✓ Copied' : 'Copy'}
                                  </button>
                                </div>
                              )}
                              {step.expectedResult && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                  <strong>Expected:</strong> {step.expectedResult}
                                </p>
                              )}
                              {step.verification && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  <strong>Verify:</strong> {step.verification}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Checklist */}
          {checklist.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg p-4">
              <h3 className="font-bold text-green-900 dark:text-green-200 mb-3">Verification Checklist</h3>
              <ul className="space-y-2">
                {checklist.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-700 dark:text-green-400">✓</span>
                    <span className="text-green-800 dark:text-green-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Monitoring & Prevention */}
          <div className="grid md:grid-cols-2 gap-4">
            {sections['Monitoring Recommendations'] && (
              <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <h3 className="font-bold text-purple-900 dark:text-purple-200 mb-2">Monitoring</h3>
                <div className="text-purple-800 dark:text-purple-300 text-sm">
                  <FormattedAIResponse content={sections['Monitoring Recommendations']} />
                </div>
              </div>
            )}
            {sections['Prevention'] && (
              <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg p-4">
                <h3 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2">Prevention</h3>
                <div className="text-indigo-800 dark:text-indigo-300 text-sm">
                  <FormattedAIResponse content={sections['Prevention']} />
                </div>
              </div>
            )}
          </div>

          {/* Technical Analysis (collapsible) */}
          {sections['Technical Analysis'] && (
            <details className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <summary className="font-semibold text-gray-900 dark:text-white cursor-pointer">
                Technical Analysis (Click to expand)
              </summary>
              <div className="text-gray-700 dark:text-gray-300 mt-3 text-sm">
                <FormattedAIResponse content={sections['Technical Analysis']} />
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
