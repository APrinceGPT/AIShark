/**
 * AI Prompt Templates
 * Structured prompts for different analysis types
 */

import { AIContext } from './context-builder';

export interface PromptTemplate {
  system: string;
  user: (context: any) => string;
}

/**
 * Summary Analysis Prompt
 * Generates executive summary of packet capture
 */
export const SUMMARY_PROMPT: PromptTemplate = {
  system: `You are a network analysis expert helping technical support engineers analyze packet captures. 
Your responses should be:
- Concise and actionable
- Technical but understandable
- Focused on key findings
- Highlighting both good and bad signals`,

  user: (context: Partial<AIContext>) => `Analyze this packet capture data and provide:

1. **Overview**: Brief description of network activity
2. **Key Findings**: Notable patterns (good and bad)
3. **Concerns**: Any immediate issues requiring attention
4. **Next Steps**: Recommended actions if issues found

Capture Data:
- Total Packets: ${context.summary?.totalPackets}
- Duration: ${context.summary?.duration?.toFixed(2)}s
- Protocols: ${JSON.stringify(context.summary?.protocols, null, 2)}
- Top Endpoints: ${context.summary?.topEndpoints?.join(', ')}
- Bandwidth: ${((context.summary?.bandwidth.total || 0) / 1024 / 1024).toFixed(2)} MB

Issues Detected:
- Retransmissions: ${context.issues?.retransmissions}
- Total Errors: ${context.issues?.totalErrors}
- Failed Handshakes: ${context.issues?.failedHandshakes}
- Latency Issues: ${context.issues?.latencyIssues}

Keep the analysis concise (max 300 words).`
};

/**
 * Anomaly Detection Prompt
 * Identifies and explains unusual patterns
 */
export const ANOMALY_PROMPT: PromptTemplate = {
  system: `You are a network security and performance expert specializing in anomaly detection.
Your role is to:
- Identify unusual or suspicious patterns
- Explain potential root causes
- Assess severity (Critical/High/Medium/Low)
- Provide remediation steps`,

  user: (context: Partial<AIContext>) => `Analyze this capture for anomalies and security concerns:

Capture Summary:
${JSON.stringify(context.summary, null, 2)}

Known Issues:
${JSON.stringify(context.issues, null, 2)}

Error Packets:
${JSON.stringify(context.errorPackets?.slice(0, 5), null, 2)}

For each anomaly found, provide:
1. **Type**: What kind of anomaly
2. **Severity**: Critical/High/Medium/Low
3. **Evidence**: Specific packets or patterns
4. **Likely Cause**: Why this is happening
5. **Remediation**: Steps to fix

If no significant anomalies found, state that clearly.`
};

/**
 * Conversational Query Prompt
 * Answers natural language questions about capture
 */
export const QUERY_PROMPT: PromptTemplate = {
  system: `You are a helpful network analysis assistant answering questions about packet captures.
Guidelines:
- Answer based on available data only
- Cite specific packet numbers when possible
- If data is insufficient, explain what's needed
- Be conversational but accurate`,

  user: (context: { question: string; captureContext: Partial<AIContext> }) => `User Question: "${context.question}"

Available Packet Data:
${JSON.stringify(context.captureContext, null, 2)}

Answer the question based on the packet data. If you need more information, explain what additional data would help. Reference specific packets when relevant.`
};

/**
 * Root Cause Analysis Prompt
 * Deep dive troubleshooting with structured remediation
 */
export const TROUBLESHOOT_PROMPT: PromptTemplate = {
  system: `You are diagnosing network issues for technical support engineers.
Provide comprehensive root cause analysis with actionable, step-by-step remediation.
Format your response in clear sections with specific, executable steps.`,

  user: (context: { problem: string; captureContext: AIContext }) => `Problem Description: ${context.problem}

Full Packet Capture Analysis:
${JSON.stringify(context.captureContext, null, 2)}

Provide a comprehensive root cause analysis in this exact format:

## Root Cause
[Clear identification of the primary problem cause]

## Evidence
[Cite specific packet numbers, timestamps, and observable data that led to this conclusion]

## Technical Analysis
[Step-by-step logical reasoning of how you identified the root cause]

## Impact Assessment
- **Severity**: [Critical/High/Medium/Low]
- **Affected Systems**: [List IPs, services, or components]
- **User Impact**: [How users experience this problem]
- **Business Impact**: [Potential downtime, data loss, etc.]

## Remediation Steps

### Immediate Actions (Quick Wins - Complete in <30 minutes)
1. [Specific command or configuration change]
   - **Command**: \`actual command here\`
   - **Expected Result**: [What should happen]
   - **Verification**: [How to confirm it worked]

2. [Next immediate action]
   [Continue as needed...]

### Short-term Fixes (Complete in <1 day)
1. [Detailed action with clear steps]
2. [Continue as needed...]

### Long-term Improvements (Strategic fixes)
1. [Preventive measures]
2. [Architecture changes]
3. [Monitoring improvements]

## Verification Checklist
- [ ] [Specific test to confirm fix #1]
- [ ] [Specific test to confirm fix #2]
- [ ] [Metric to monitor: target value]
- [ ] [Final validation step]

## Monitoring Recommendations
- **Key Metrics**: [What to watch]
- **Alert Thresholds**: [When to trigger alerts]
- **Check Frequency**: [How often to review]

## Prevention
[How to prevent this issue from recurring]

Be specific, technical, and actionable. Include actual commands, configurations, and thresholds where applicable.`
};

/**
 * Packet Explanation Prompt
 * Explains a specific packet in detail
 */
export const EXPLAIN_PACKET_PROMPT: PromptTemplate = {
  system: `You are a network protocol expert explaining packet details to engineers.
Focus on:
- What this packet represents
- Why it matters in the conversation
- Any notable flags or fields
- Potential issues`,

  user: (context: { packet: any }) => `Explain this packet in detail:

${JSON.stringify(context.packet, null, 2)}

Provide:
1. **Purpose**: What is this packet doing?
2. **Protocol Details**: Key fields and their meanings
3. **Context**: Where it fits in the conversation
4. **Notable Aspects**: Anything unusual or important
5. **Related Packets**: What to look for next

Keep it educational but concise.`
};

/**
 * Comparative Analysis Prompt
 * Compares before/after captures
 */
export const COMPARE_PROMPT: PromptTemplate = {
  system: `You are analyzing changes between two network captures (before/after).
Focus on:
- What changed (better or worse)
- Impact of changes
- Unexpected differences`,

  user: (context: { before: Partial<AIContext>; after: Partial<AIContext> }) => `Compare these two captures:

BEFORE:
${JSON.stringify(context.before, null, 2)}

AFTER:
${JSON.stringify(context.after, null, 2)}

Analysis should cover:
1. **Key Changes**: What's different?
2. **Performance Impact**: Better or worse?
3. **New Issues**: Problems that appeared
4. **Resolved Issues**: Problems that disappeared
5. **Recommendations**: Further actions needed

Focus on meaningful differences, not minor variations.`
};

/**
 * Security Analysis Prompt
 * Focused on security threats
 */
export const SECURITY_PROMPT: PromptTemplate = {
  system: `You are a cybersecurity analyst examining network traffic for threats.
Look for:
- Suspicious connection patterns
- Potential data exfiltration
- Malware indicators
- Attack signatures`,

  user: (context: AIContext) => `Perform security analysis on this capture:

${JSON.stringify(context, null, 2)}

Security Assessment:
1. **Threat Level**: None/Low/Medium/High/Critical
2. **Findings**: Suspicious patterns or indicators
3. **Attack Vectors**: Potential or active threats
4. **Compromised Systems**: IPs showing bad behavior
5. **Recommendations**: Immediate security actions

If traffic appears normal, explain why it's benign.`
};
