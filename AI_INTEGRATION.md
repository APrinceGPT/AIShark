# AI Integration Guide

## Overview

AIShark now features AI-powered packet analysis using Claude 4 Sonnet via Trend Micro's AI endpoint. This integration provides intelligent insights, anomaly detection, and conversational analysis of network captures.

## Features

### 🤖 AI Insights
- **Intelligent Summary**: Natural language overview of your packet capture
- **Anomaly Detection**: Identifies unusual patterns with severity levels and remediation steps
- **One-click Analysis**: Automated detection of network issues

### 💬 Ask AI
- **Conversational Interface**: Ask questions about your capture in natural language
- **Context-aware Responses**: AI references specific packets and patterns
- **Quick Questions**: Pre-built queries for common troubleshooting scenarios

### 📊 Analysis Types

1. **Summary Analysis**
   - Executive overview of network activity
   - Key findings (good and bad)
   - Immediate concerns
   - Recommended next steps

2. **Anomaly Detection**
   - Security threats
   - Performance issues
   - Protocol violations
   - Unusual patterns

3. **Natural Language Queries**
   - "Why is this connection slow?"
   - "Are there any security concerns?"
   - "What's causing the packet loss?"
   - "Explain this TLS error"

4. **Root Cause Analysis**
   - Deep dive troubleshooting
   - Evidence-based reasoning
   - Remediation recommendations

5. **Packet Explanation**
   - Detailed protocol analysis
   - Field-by-field breakdown
   - Context in conversation flow

## Setup

### Environment Variables

Create a `.env` file with your AI credentials:

```bash
# Trend Micro AI Endpoint
OPENAI_BASE_URL=https://api.rdsec.trendmicro.com/prod/aiendpoint/v1/
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=claude-4-sonnet
```

**Note**: Never commit the `.env` file to version control. Use `.env.example` as a template.

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

### Vercel Deployment

Add environment variables in Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add:
   - `OPENAI_BASE_URL`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
3. Redeploy the application

## Architecture

### API Routes

Located in `app/api/analyze/`:

```
/api/analyze/
├── summary          - Generate capture summary
├── anomaly          - Detect anomalies
├── query            - Answer natural language questions
├── troubleshoot     - Root cause analysis
└── explain-packet   - Explain specific packet
```

### Service Layer

Located in `lib/ai/`:

```
lib/ai/
├── client.ts           - OpenAI client wrapper
├── context-builder.ts  - Prepares packet data for AI
└── prompts.ts          - Structured prompt templates
```

### Components

Located in `components/`:

```
components/
├── AIInsights.tsx      - Summary and anomaly detection UI
└── ChatInterface.tsx   - Conversational query interface
```

## Usage Examples

### 1. Generate Summary

```typescript
const response = await fetch('/api/analyze/summary', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ packets, statistics, analysis }),
});

const data = await response.json();
console.log(data.summary);
```

### 2. Ask Question

```typescript
const response = await fetch('/api/analyze/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'Why is this connection slow?',
    packets,
    statistics,
    analysis,
  }),
});

const data = await response.json();
console.log(data.answer);
```

### 3. Explain Packet

```typescript
const response = await fetch('/api/analyze/explain-packet', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ packet }),
});

const data = await response.json();
console.log(data.explanation);
```

## Optimization

### Context Size Limits

To optimize API costs and response times:

1. **Sample Packets**: Send representative samples (20 packets) instead of all packets
2. **Error Focus**: Prioritize error packets (10 max) for analysis
3. **Query-specific Context**: Different analysis types get optimized data subsets

### Caching Strategy

Consider implementing:

```typescript
// Cache analysis results by capture hash
const cacheKey = hashCaptureData(packets);
const cached = await redis.get(cacheKey);
if (cached) return cached;

// Generate analysis
const result = await analyzeCapture(packets);
await redis.set(cacheKey, result, 3600); // Cache 1 hour
```

### Rate Limiting

Implement per-user rate limiting:

```typescript
// 20 requests per 15 minutes per user
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});
```

## Prompt Engineering

### Customizing Prompts

Edit `lib/ai/prompts.ts` to customize AI behavior:

```typescript
export const SUMMARY_PROMPT: PromptTemplate = {
  system: `You are a network analysis expert...`,
  user: (context) => `Analyze this capture...`,
};
```

### Best Practices

1. **Be Specific**: Include exact requirements in system prompts
2. **Provide Context**: Send relevant packet samples, not entire captures
3. **Structured Output**: Request specific formats (numbered lists, severity levels)
4. **Evidence-based**: Ask AI to cite packet numbers and specific data

## Security Considerations

1. **API Key Protection**: Never expose API keys in client-side code
2. **Input Validation**: Sanitize user inputs before sending to AI
3. **Rate Limiting**: Prevent abuse with request limits
4. **Data Privacy**: Packet data never leaves your infrastructure (client → your server → AI endpoint)

## Troubleshooting

### Common Issues

**1. "Failed to generate summary"**
- Check environment variables are set correctly
- Verify API key is valid
- Check network connectivity to AI endpoint

**2. "No packets provided"**
- Ensure PCAP file is uploaded and parsed successfully
- Check browser console for parsing errors

**3. Slow responses**
- Large captures (> 10,000 packets) take longer
- Context builder samples packets to optimize speed
- Consider reducing sample size in `context-builder.ts`

### Debug Mode

Enable debug logging in browser console:

```javascript
localStorage.setItem('DEBUG_AI', 'true');
```

## Future Enhancements

### Phase 2 (Planned)

- [ ] Streaming responses for real-time feedback
- [ ] Comparative analysis (before/after captures)
- [ ] Security-focused analysis mode
- [ ] Automated report generation
- [ ] Learning from user feedback

### Phase 3 (Planned)

- [ ] Multi-file analysis
- [ ] Historical trend analysis
- [ ] Custom AI models for specific use cases
- [ ] Collaborative analysis (team features)

## Performance Metrics

Current benchmarks:

- Summary generation: ~3-5 seconds
- Anomaly detection: ~4-6 seconds
- Query response: ~2-4 seconds
- Packet explanation: ~2-3 seconds

Optimization target:

- Summary: < 2 seconds
- Queries: < 1 second

## Contributing

To add new AI features:

1. Create prompt template in `lib/ai/prompts.ts`
2. Create API route in `app/api/analyze/`
3. Add UI component in `components/`
4. Integrate into main page `app/page.tsx`

## License

Same as main project (MIT License)
