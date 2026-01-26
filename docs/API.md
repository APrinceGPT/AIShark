# AIShark API Documentation

## Overview

AIShark provides a RESTful API for packet analysis, AI-powered insights, and session management. All API endpoints are located under `/api/`.

## Base URL

```
Production: https://aishark.example.com/api
Development: http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via Supabase Auth. Include the session token in requests:

```typescript
const response = await fetch('/api/analyze/summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ packets, statistics }),
});
```

---

## Analysis Endpoints

### POST /api/analyze/summary

Generate an AI-powered summary of packet capture analysis.

**Request Body:**
```typescript
{
  packets: Packet[];          // Array of parsed packets
  statistics: PacketStatistics; // Capture statistics
}
```

**Response:**
```typescript
{
  summary: string;            // Natural language summary
  cached: boolean;            // Whether response was from cache
}
```

**Example:**
```bash
curl -X POST /api/analyze/summary \
  -H "Content-Type: application/json" \
  -d '{"packets": [...], "statistics": {...}}'
```

---

### POST /api/analyze/query

Ask natural language questions about the packet capture.

**Request Body:**
```typescript
{
  question: string;           // User's question
  packets: Packet[];          // Packet data for context
  statistics: PacketStatistics;
}
```

**Response:**
```typescript
{
  answer: string;             // AI-generated answer
}
```

**Example Questions:**
- "What HTTP requests were made?"
- "Are there any signs of a DDoS attack?"
- "Which hosts transferred the most data?"

---

### POST /api/analyze/anomaly

Detect anomalies and security issues in packet capture.

**Request Body:**
```typescript
{
  packets: Packet[];
  statistics: PacketStatistics;
  analysis: AnalysisResult;
}
```

**Response:**
```typescript
{
  anomalies: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    type: string;
    description: string;
    affectedPackets: number[];
    recommendation: string;
  }[];
}
```

---

### POST /api/analyze/performance

Analyze network performance metrics.

**Request Body:**
```typescript
{
  packets: Packet[];
  statistics: PacketStatistics;
}
```

**Response:**
```typescript
{
  metrics: {
    latency: {
      average: number;
      max: number;
      p95: number;
    };
    throughput: {
      bytesPerSecond: number;
      packetsPerSecond: number;
    };
    issues: string[];
  };
}
```

---

### POST /api/analyze/explain-packet

Get detailed explanation of a specific packet.

**Request Body:**
```typescript
{
  packet: Packet;             // Packet to explain
  context?: Packet[];         // Surrounding packets for context
}
```

**Response:**
```typescript
{
  explanation: string;        // Human-readable explanation
  layers: {
    layer: string;
    description: string;
  }[];
}
```

---

### POST /api/analyze/troubleshoot

Get troubleshooting recommendations for network issues.

**Request Body:**
```typescript
{
  packets: Packet[];
  statistics: PacketStatistics;
  analysis: AnalysisResult;
  issue?: string;             // Specific issue to troubleshoot
}
```

**Response:**
```typescript
{
  diagnosis: string;
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    details: string;
  }[];
}
```

---

### POST /api/analyze/predict

Get predictive insights about potential future issues.

**Request Body:**
```typescript
{
  packets: Packet[];
  statistics: PacketStatistics;
  historicalData?: any;
}
```

**Response:**
```typescript
{
  predictions: {
    type: string;
    likelihood: number;       // 0-1 probability
    timeframe: string;
    preventiveAction: string;
  }[];
}
```

---

### POST /api/analyze/semantic-search

Search packets using natural language.

**Request Body:**
```typescript
{
  query: string;              // Natural language search query
  packets: Packet[];
}
```

**Response:**
```typescript
{
  results: {
    packetId: number;
    relevanceScore: number;
    matchReason: string;
  }[];
}
```

---

### POST /api/analyze/compare

Compare two packet captures.

**Request Body:**
```typescript
{
  capture1: {
    packets: Packet[];
    statistics: PacketStatistics;
  };
  capture2: {
    packets: Packet[];
    statistics: PacketStatistics;
  };
}
```

**Response:**
```typescript
{
  comparison: {
    similarities: string[];
    differences: string[];
    recommendations: string[];
  };
}
```

---

### POST /api/analyze/packet-context

Get contextual information about a packet in the stream.

**Request Body:**
```typescript
{
  packet: Packet;
  packets: Packet[];          // Full packet list for context
}
```

**Response:**
```typescript
{
  context: {
    streamPosition: string;
    relatedPackets: number[];
    conversationSummary: string;
  };
}
```

---

### POST /api/analyze/suggest-annotation

Get AI-suggested annotations for packets.

**Request Body:**
```typescript
{
  packet: Packet;
  existingAnnotations?: string[];
}
```

**Response:**
```typescript
{
  suggestions: {
    text: string;
    confidence: number;
    category: string;
  }[];
}
```

---

## Session Sharing Endpoints

### POST /api/share/create

Create a shareable link for an analysis session.

**Request Body:**
```typescript
{
  sessionId: string;
  expiresIn?: number;         // Hours until expiration (default: 168 = 1 week)
  permissions?: {
    canDownload: boolean;
    canAnnotate: boolean;
  };
}
```

**Response:**
```typescript
{
  token: string;              // Share token
  url: string;                // Full shareable URL
  expiresAt: string;          // ISO timestamp
}
```

---

### GET /api/share/[token]

Retrieve a shared session.

**Parameters:**
- `token` - Share token from URL

**Response:**
```typescript
{
  session: AnalysisSession;
  statistics: PacketStatistics;
  packets: Packet[];          // Limited packet sample
  insights: AIInsight[];
  permissions: {
    canDownload: boolean;
    canAnnotate: boolean;
  };
}
```

---

### DELETE /api/share/revoke

Revoke a share link.

**Request Body:**
```typescript
{
  token: string;
}
```

**Response:**
```typescript
{
  success: boolean;
}
```

---

## Integration Endpoints

### POST /api/integrations/webhook

Send analysis results to external webhook.

**Request Body:**
```typescript
{
  webhookUrl: string;
  event: 'analysis_complete' | 'anomaly_detected' | 'session_saved';
  payload: any;
}
```

**Response:**
```typescript
{
  delivered: boolean;
  statusCode: number;
}
```

---

### GET /api/integrations/prometheus

Export metrics in Prometheus format.

**Response:**
```
# HELP aishark_packets_total Total packets analyzed
# TYPE aishark_packets_total counter
aishark_packets_total 12345

# HELP aishark_errors_total Total errors detected
# TYPE aishark_errors_total counter
aishark_errors_total 42
```

---

## Type Definitions

### Packet

```typescript
interface Packet {
  id: number;
  timestamp: number;
  timeString: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  raw: Uint8Array;
  layers: PacketLayers;
  flags?: PacketFlags;
}
```

### PacketStatistics

```typescript
interface PacketStatistics {
  totalPackets: number;
  protocolDistribution: Record<string, number>;
  topTalkers: {
    source: string;
    destination: string;
    packets: number;
    bytes: number;
  }[];
  errors: {
    retransmissions: number;
    duplicateAcks: number;
    resets: number;
  };
  bandwidth: {
    total: number;
    perSecond: number;
  };
}
```

### AnalysisResult

```typescript
interface AnalysisResult {
  insights: string[];
  errors: {
    packetId: number;
    type: string;
    description: string;
  }[];
  latencyIssues: {
    source: string;
    destination: string;
    averageLatency: number;
    maxLatency: number;
  }[];
  streams: TCPStream[];
  threats: ThreatIndicator[];
}
```

---

## Error Handling

All endpoints return consistent error responses:

```typescript
{
  error: string;              // Error message
  code: string;               // Error code
  details?: any;              // Additional details
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `RATE_LIMITED` | 429 | Too many requests |
| `AI_ERROR` | 500 | AI service error |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Analysis endpoints | 60/minute |
| Share endpoints | 30/minute |
| Webhook endpoints | 10/minute |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

---

## Caching

AI responses are cached to reduce API costs. Cache behavior:

- Summary endpoints: 1 hour TTL
- Query endpoints: Not cached (unique queries)
- Anomaly detection: 30 minutes TTL

Include `Cache-Control: no-cache` to bypass cache.

---

## WebSocket API (Future)

Real-time streaming endpoints (planned):

```
ws://localhost:3000/api/stream
```

See [Real-Time Streaming Architecture](./REALTIME_STREAMING_ARCHITECTURE.md) for details.

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { AISharkClient } from '@aishark/sdk';

const client = new AISharkClient({
  apiKey: process.env.AISHARK_API_KEY,
});

const summary = await client.analyze.summary(packets, statistics);
console.log(summary.summary);
```

### Python

```python
import aishark

client = aishark.Client(api_key=os.environ["AISHARK_API_KEY"])
summary = client.analyze.summary(packets, statistics)
print(summary["summary"])
```

---

## Changelog

### v1.0.0
- Initial API release
- All analysis endpoints
- Session sharing
- Integration endpoints
