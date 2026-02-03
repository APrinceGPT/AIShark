/**
 * Project Knowledge Base for SharkAI Help Mode
 * Contains user-facing documentation about AIShark features and usage
 * 
 * NOTE: Do NOT include any sensitive information here:
 * - No API keys or environment variables
 * - No internal implementation details
 * - No security-sensitive architecture info
 */

export const PROJECT_KNOWLEDGE = {
  overview: `AIShark is an AI-powered network packet analyzer that helps you understand and troubleshoot network traffic. 
It uses Claude AI to provide intelligent insights about your Wireshark capture files (.pcap and .pcapng).`,

  features: {
    upload: {
      title: "Upload PCAP Files",
      description: "Drag and drop or click to upload Wireshark capture files. Supports both .pcap and .pcapng formats. Large files are automatically chunked for efficient processing.",
      tips: [
        "Files up to 50MB are supported",
        "Large files are automatically split into chunks",
        "You can also download sample files to test the features"
      ]
    },
    aiInsights: {
      title: "AI-Powered Analysis",
      description: "Get intelligent insights about your network traffic using AI analysis.",
      capabilities: [
        "Generate Summary: Creates an executive overview of your capture with key findings",
        "Detect Anomalies: Identifies security concerns, performance issues, and unusual patterns",
        "Deep Troubleshoot: Provides comprehensive root cause analysis with remediation steps"
      ]
    },
    filtering: {
      title: "Packet Filtering",
      description: "Filter packets to focus on specific traffic patterns.",
      tips: [
        "Use the search bar to filter by IP, protocol, or keywords",
        "Quick filter buttons for common protocols (HTTP, DNS, TCP, etc.)",
        "Advanced filter bar for complex queries",
        "Save filter presets for reuse"
      ]
    },
    performance: {
      title: "Performance Analysis",
      description: "Analyze network performance metrics and identify bottlenecks.",
      metrics: [
        "Latency analysis (average, P95, P99)",
        "TCP retransmission rates",
        "Throughput and bandwidth",
        "HTTP/DNS response times"
      ]
    },
    predictions: {
      title: "Predictive Insights",
      description: "ML-based predictions that learn from historical patterns to predict potential issues before they occur."
    },
    chat: {
      title: "SharkAI Chat",
      description: "Ask natural language questions about your packet capture. Example questions:",
      examples: [
        "Why is this connection slow?",
        "Are there any security concerns?",
        "What's causing the packet loss?",
        "Explain the TLS handshake errors",
        "What protocols are in this capture?",
        "Show me the top talkers"
      ]
    },
    sessions: {
      title: "Save & Share Sessions",
      description: "Save your analysis sessions for later and share with team members.",
      tips: [
        "Sign in to save analysis sessions",
        "Share sessions via unique links",
        "Access your analysis history anytime"
      ]
    },
    export: {
      title: "Export Options",
      description: "Export your analysis in various formats.",
      formats: [
        "PDF reports with full analysis",
        "CSV export for packet data",
        "JSON export for programmatic access"
      ]
    },
    darkMode: {
      title: "Dark/Light Mode",
      description: "Toggle between dark and light themes using the sun/moon button in the header."
    },
    keyboard: {
      title: "Keyboard Shortcuts",
      shortcuts: [
        "Ctrl/Cmd + K: Open search",
        "Ctrl/Cmd + /: Show keyboard shortcuts",
        "Escape: Close modals",
        "Arrow keys: Navigate packet list"
      ]
    }
  },

  faq: [
    {
      question: "What file formats are supported?",
      answer: "AIShark supports .pcap and .pcapng files, which are the standard formats exported by Wireshark and other packet capture tools."
    },
    {
      question: "How do I get a PCAP file?",
      answer: "You can capture network traffic using Wireshark, tcpdump, or similar tools. Alternatively, download one of our sample PCAP files to test AIShark."
    },
    {
      question: "Is my data secure?",
      answer: "Your packet data is processed securely. When you upload large files, they're stored temporarily in encrypted cloud storage and automatically deleted after your session."
    },
    {
      question: "Why do I need to sign in?",
      answer: "Signing in is optional but enables additional features like saving sessions, accessing history, and sharing analysis with team members."
    },
    {
      question: "What does the AI analyze?",
      answer: "The AI analyzes packet metadata, protocols, timing, errors, and patterns. It does NOT analyze encrypted payload content - it focuses on observable network behavior."
    },
    {
      question: "How accurate is the AI analysis?",
      answer: "The AI provides intelligent suggestions based on network analysis best practices. Always verify critical findings and use the analysis as a starting point for investigation."
    }
  ],

  quickStart: [
    "1. Upload a PCAP file (or download a sample)",
    "2. View the Statistics panel for an overview",
    "3. Click 'Generate Summary' for AI analysis",
    "4. Use 'Detect Anomalies' to find issues",
    "5. Ask questions in the SharkAI chat",
    "6. Export your analysis as PDF"
  ]
};

/**
 * Detect if a question is about the project/help vs packet analysis
 */
export function isHelpQuestion(question: string): boolean {
  const helpKeywords = [
    'how to use', 'how do i use', 'how does this work', 'how does aishark work',
    'help', 'guide', 'tutorial', 'getting started', 'what can you do',
    'what features', 'what is aishark', 'what is this', 'explain the app',
    'how to upload', 'how to filter', 'how to export', 'how to save',
    'what formats', 'supported formats', 'file types', 'keyboard shortcuts',
    'dark mode', 'light mode', 'theme', 'sign in', 'login', 'account',
    'your capabilities', 'what can i ask', 'what questions',
    'project', 'about this app', 'about aishark', 'documentation',
    'faq', 'frequently asked', 'tips', 'best practices'
  ];

  const lowerQuestion = question.toLowerCase();
  return helpKeywords.some(keyword => lowerQuestion.includes(keyword));
}

/**
 * Build help context for AI response
 */
export function buildHelpContext(): string {
  return `
# AIShark User Guide

## Overview
${PROJECT_KNOWLEDGE.overview}

## Features

### ${PROJECT_KNOWLEDGE.features.upload.title}
${PROJECT_KNOWLEDGE.features.upload.description}
Tips: ${PROJECT_KNOWLEDGE.features.upload.tips.join(', ')}

### ${PROJECT_KNOWLEDGE.features.aiInsights.title}
${PROJECT_KNOWLEDGE.features.aiInsights.description}
Capabilities:
${PROJECT_KNOWLEDGE.features.aiInsights.capabilities.map(c => `- ${c}`).join('\n')}

### ${PROJECT_KNOWLEDGE.features.filtering.title}
${PROJECT_KNOWLEDGE.features.filtering.description}
${PROJECT_KNOWLEDGE.features.filtering.tips.map(t => `- ${t}`).join('\n')}

### ${PROJECT_KNOWLEDGE.features.chat.title}
${PROJECT_KNOWLEDGE.features.chat.description}
${PROJECT_KNOWLEDGE.features.chat.examples.map(e => `- "${e}"`).join('\n')}

### ${PROJECT_KNOWLEDGE.features.performance.title}
${PROJECT_KNOWLEDGE.features.performance.description}

### ${PROJECT_KNOWLEDGE.features.predictions.title}
${PROJECT_KNOWLEDGE.features.predictions.description}

### ${PROJECT_KNOWLEDGE.features.sessions.title}
${PROJECT_KNOWLEDGE.features.sessions.description}

### ${PROJECT_KNOWLEDGE.features.export.title}
${PROJECT_KNOWLEDGE.features.export.description}
Formats: ${PROJECT_KNOWLEDGE.features.export.formats.join(', ')}

### ${PROJECT_KNOWLEDGE.features.keyboard.title}
${PROJECT_KNOWLEDGE.features.keyboard.shortcuts.map(s => `- ${s}`).join('\n')}

## Quick Start
${PROJECT_KNOWLEDGE.quickStart.join('\n')}

## FAQ
${PROJECT_KNOWLEDGE.faq.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}
`;
}
