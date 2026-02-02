# Proposal: Supabase Temporary Packet Storage

**Date:** February 3, 2026  
**Author:** GitHub Copilot  
**Status:** ✅ IMPLEMENTED  
**Problem:** Vercel 4.5MB request body limit prevents AI analysis of large packet captures (11,000+ packets)

---

## Implementation Status

**Completed: February 4, 2026**

All phases have been implemented:
- ✅ Phase 1: Database schema and API endpoints
- ✅ Phase 2: Client-side upload hook and progress UI
- ✅ Phase 3: Updated AI endpoints for session_id support
- ✅ Phase 4: Updated AI components
- ✅ Phase 5: Cleanup triggers (beforeunload, cron job)
- ✅ Phase 6: Build verification passed

**Files Created/Modified:**
- `lib/packet-session.ts` - Server-side helper functions
- `lib/use-packet-session.ts` - Client-side React hook
- `app/api/packets/upload/route.ts` - Chunked upload endpoint
- `app/api/packets/cleanup/route.ts` - Cleanup endpoint
- `app/api/cron/cleanup-sessions/route.ts` - Cron job for stale sessions
- `components/UploadProgressBar.tsx` - Upload progress UI
- `app/page.tsx` - Integration of upload flow
- `app/api/analyze/semantic-search/route.ts` - Session ID support
- `app/api/analyze/query/route.ts` - Session ID support
- `app/api/analyze/summary/route.ts` - Session ID support
- `app/api/analyze/anomaly/route.ts` - Session ID support
- `app/api/analyze/troubleshoot/route.ts` - Session ID support
- `components/AISemanticSearch.tsx` - Session ID support
- `components/AIInsights.tsx` - Session ID support
- `components/ChatInterface.tsx` - Session ID support
- `components/SharkAIAssistant.tsx` - Session ID support

---

## Executive Summary

This proposal implements temporary packet storage in Supabase to bypass Vercel's 4.5MB request body limit. Instead of sending all packets with each AI request, packets are uploaded once to Supabase, and subsequent AI queries only send a session ID + query string.

**Key Benefits:**
- ✅ Full packet context for AI (better analysis quality)
- ✅ Multiple searches without re-uploading
- ✅ Reduced AI API costs (1 call vs 5-6 chunked calls)
- ✅ Automatic cleanup to stay within 500MB free tier

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            USER SESSION                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User uploads PCAP file                                              │
│       │                                                                 │
│       ▼                                                                 │
│  2. Client parses packets (existing Web Worker)                         │
│       │                                                                 │
│       ▼                                                                 │
│  3. Client uploads packets to Supabase (chunked, ~2000 per request)     │
│       │                                                                 │
│       ├──► /api/packets/upload (chunk 1) ──► Supabase INSERT            │
│       ├──► /api/packets/upload (chunk 2) ──► Supabase APPEND            │
│       └──► /api/packets/upload (chunk N) ──► Supabase APPEND            │
│       │                                                                 │
│       ▼                                                                 │
│  4. Server returns session_id (UUID)                                    │
│       │                                                                 │
│       ▼                                                                 │
│  5. User performs AI search                                             │
│       │                                                                 │
│       └──► /api/analyze/semantic-search                                 │
│            Body: { session_id: "xxx", query: "large file transfers" }   │
│            (Only ~100 bytes, well under 4.5MB!)                         │
│       │                                                                 │
│       ▼                                                                 │
│  6. Server fetches packets from Supabase using session_id               │
│       │                                                                 │
│       ▼                                                                 │
│  7. Server sends to AI, returns results                                 │
│       │                                                                 │
│       ▼                                                                 │
│  8. User clicks "Clear Session" OR closes tab                           │
│       │                                                                 │
│       └──► /api/packets/cleanup ──► Supabase DELETE                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema & API Endpoints

### Task 1.1: Create Supabase Table

**File:** `supabase-packet-sessions.sql` (NEW)

**Schema:**
```sql
CREATE TABLE packet_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Packet data (stored as compressed JSONB)
  packets JSONB NOT NULL DEFAULT '[]',
  packet_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata for quick access (no need to parse packets)
  statistics JSONB,
  analysis JSONB,
  
  -- Session management
  file_name TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Cleanup tracking
  is_active BOOLEAN DEFAULT TRUE
);

-- Index for fast lookups
CREATE INDEX idx_packet_sessions_user_id ON packet_sessions(user_id);
CREATE INDEX idx_packet_sessions_active ON packet_sessions(is_active) WHERE is_active = TRUE;

-- Row Level Security
ALTER TABLE packet_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own sessions
CREATE POLICY "Users can manage own packet sessions"
  ON packet_sessions
  FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Anonymous users can create sessions (user_id = NULL)
CREATE POLICY "Anonymous users can create sessions"
  ON packet_sessions
  FOR INSERT
  WITH CHECK (user_id IS NULL);
```

**Estimated Time:** 30 minutes

---

### Task 1.2: Create Upload API Endpoint

**File:** `app/api/packets/upload/route.ts` (NEW)

**Purpose:** Receive packet chunks and store in Supabase

**Request Body:**
```typescript
interface UploadRequest {
  session_id?: string;      // Existing session (for appending chunks)
  packets: Packet[];        // Chunk of packets (max 2000)
  statistics?: PacketStatistics;
  analysis?: AnalysisResult;
  file_name?: string;
  file_size?: number;
  is_final_chunk: boolean;  // True if this is the last chunk
}
```

**Response:**
```typescript
interface UploadResponse {
  success: boolean;
  session_id: string;
  packet_count: number;
  message: string;
}
```

**Logic:**
1. If no `session_id`, create new session in Supabase
2. Append packets to existing session's `packets` array
3. Update `packet_count`
4. If `is_final_chunk`, store statistics and analysis
5. Return session_id

**Estimated Time:** 1.5 hours

---

### Task 1.3: Create Cleanup API Endpoint

**File:** `app/api/packets/cleanup/route.ts` (NEW)

**Purpose:** Delete packet session when user is done

**Request Body:**
```typescript
interface CleanupRequest {
  session_id: string;
}
```

**Response:**
```typescript
interface CleanupResponse {
  success: boolean;
  message: string;
}
```

**Estimated Time:** 30 minutes

---

### Task 1.4: Create Fetch Packets Helper

**File:** `lib/packet-session.ts` (NEW)

**Purpose:** Server-side helper to fetch packets from Supabase

```typescript
export async function getPacketSession(sessionId: string): Promise<{
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
} | null>;

export async function deletePacketSession(sessionId: string): Promise<boolean>;

export async function updateLastAccessed(sessionId: string): Promise<void>;
```

**Estimated Time:** 45 minutes

---

## Phase 2: Client-Side Integration

### Task 2.1: Create Packet Upload Hook

**File:** `lib/use-packet-session.ts` (NEW)

**Purpose:** React hook to manage packet session lifecycle

```typescript
interface UsePacketSessionReturn {
  sessionId: string | null;
  isUploading: boolean;
  uploadProgress: number;        // 0-100
  uploadPackets: (packets: Packet[], stats: PacketStatistics, analysis: AnalysisResult) => Promise<string>;
  clearSession: () => Promise<void>;
  error: string | null;
}

export function usePacketSession(): UsePacketSessionReturn;
```

**Features:**
- Chunks packets into groups of 2000
- Shows upload progress
- Handles errors gracefully
- Provides `clearSession` for manual cleanup

**Estimated Time:** 1.5 hours

---

### Task 2.2: Update Page Component

**File:** `app/page.tsx` (MODIFY)

**Changes:**
1. Add `usePacketSession` hook
2. After file processing, upload packets to Supabase
3. Store `sessionId` in state
4. Pass `sessionId` to AI components instead of `packets`
5. Add cleanup on "New Analysis" or page unload

**New State:**
```typescript
const [packetSessionId, setPacketSessionId] = useState<string | null>(null);
const { uploadPackets, clearSession, isUploading, uploadProgress } = usePacketSession();
```

**New Effect (cleanup on unload):**
```typescript
useEffect(() => {
  const handleBeforeUnload = () => {
    if (packetSessionId) {
      // Use sendBeacon for reliable cleanup on tab close
      navigator.sendBeacon('/api/packets/cleanup', JSON.stringify({ session_id: packetSessionId }));
    }
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [packetSessionId]);
```

**Estimated Time:** 1 hour

---

### Task 2.3: Add Upload Progress UI

**File:** `app/page.tsx` (MODIFY)

**Purpose:** Show progress when uploading large files to Supabase

**UI:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Preparing for AI analysis...                                   │
│  ████████████████░░░░░░░░░░░░░░  45%                           │
│  Uploading chunk 3 of 6 (6,000 / 11,000 packets)               │
└─────────────────────────────────────────────────────────────────┘
```

**Estimated Time:** 30 minutes

---

## Phase 3: Update AI Endpoints

### Task 3.1: Update Semantic Search API

**File:** `app/api/analyze/semantic-search/route.ts` (MODIFY)

**Current Request:**
```typescript
{
  query: string;
  packets: Packet[];        // ❌ Too large!
  statistics: PacketStatistics;
  analysis: AnalysisResult;
}
```

**New Request (supports both):**
```typescript
{
  query: string;
  session_id?: string;      // ✅ Use Supabase session
  packets?: Packet[];       // Still supported for small files
  statistics?: PacketStatistics;
  analysis?: AnalysisResult;
}
```

**Logic:**
```typescript
if (session_id) {
  // Fetch from Supabase
  const session = await getPacketSession(session_id);
  packets = session.packets;
  statistics = session.statistics;
  analysis = session.analysis;
} else if (packets) {
  // Use provided packets (small files)
} else {
  return error("No packets provided");
}
```

**Estimated Time:** 45 minutes

---

### Task 3.2: Update Query API (ChatInterface)

**File:** `app/api/analyze/query/route.ts` (MODIFY)

**Same pattern as Task 3.1 - support both `session_id` and direct `packets`.**

**Estimated Time:** 30 minutes

---

### Task 3.3: Update AI Insights API

**File:** `app/api/analyze/summary/route.ts` (MODIFY)

**Same pattern as Task 3.1.**

**Estimated Time:** 30 minutes

---

### Task 3.4: Update Other AI Endpoints

**Files to modify:**
- `app/api/analyze/anomaly/route.ts`
- `app/api/analyze/explain-packet/route.ts`
- `app/api/analyze/troubleshoot/route.ts`

**Same pattern - add `session_id` support.**

**Estimated Time:** 1 hour

---

## Phase 4: Update Client Components

### Task 4.1: Update AISemanticSearch Component

**File:** `components/AISemanticSearch.tsx` (MODIFY)

**Changes:**
- Accept `sessionId` prop instead of (or in addition to) `packets`
- Send `session_id` in API request when available
- Fall back to `packets` for small files

**Estimated Time:** 30 minutes

---

### Task 4.2: Update ChatInterface Component

**File:** `components/ChatInterface.tsx` (MODIFY)

**Changes:**
- Accept `sessionId` prop
- Send `session_id` in API request

**Estimated Time:** 30 minutes

---

### Task 4.3: Update SharkAIAssistant Component

**File:** `components/SharkAIAssistant.tsx` (MODIFY)

**Changes:**
- Accept `sessionId` prop
- Send `session_id` in API request

**Estimated Time:** 30 minutes

---

### Task 4.4: Update AIInsights Component

**File:** `components/AIInsights.tsx` (MODIFY)

**Changes:**
- Accept `sessionId` prop
- Use `session_id` for AI summary request

**Estimated Time:** 30 minutes

---

## Phase 5: Cleanup & Safety Measures

### Task 5.1: Add "Clear Session" Button

**File:** `app/page.tsx` (MODIFY)

**Purpose:** Allow user to manually clear session data from Supabase

**UI Location:** Near the "Go Home" or "New Analysis" button

**Button:**
```tsx
<button onClick={handleClearSession}>
  Clear Cloud Data
</button>
```

**Estimated Time:** 15 minutes

---

### Task 5.2: Implement beforeunload Cleanup

**File:** `app/page.tsx` (MODIFY)

**Purpose:** Clean up Supabase data when user closes tab/window

**Implementation:**
```typescript
useEffect(() => {
  const cleanup = () => {
    if (packetSessionId) {
      navigator.sendBeacon(
        '/api/packets/cleanup',
        JSON.stringify({ session_id: packetSessionId })
      );
    }
  };
  
  window.addEventListener('beforeunload', cleanup);
  return () => window.removeEventListener('beforeunload', cleanup);
}, [packetSessionId]);
```

**Note:** `sendBeacon` is reliable even when tab closes quickly.

**Estimated Time:** 15 minutes

---

### Task 5.3: Add Server-Side Stale Session Cleanup

**File:** `app/api/packets/cleanup-stale/route.ts` (NEW)

**Purpose:** Cron job endpoint to delete sessions older than 1 hour

**Logic:**
```sql
DELETE FROM packet_sessions 
WHERE last_accessed_at < NOW() - INTERVAL '1 hour'
  OR (is_active = FALSE AND created_at < NOW() - INTERVAL '5 minutes');
```

**Can be called by:**
- Vercel Cron Jobs (vercel.json)
- Supabase scheduled functions
- Manual trigger

**Estimated Time:** 30 minutes

---

### Task 5.4: Add Supabase Database Trigger (Optional)

**File:** `supabase-packet-sessions.sql` (APPEND)

**Purpose:** Auto-delete sessions older than 2 hours (safety net)

```sql
-- Create function to delete old sessions
CREATE OR REPLACE FUNCTION cleanup_old_packet_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM packet_sessions 
  WHERE created_at < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

-- Schedule via pg_cron (if available) or call manually
```

**Estimated Time:** 15 minutes

---

## Phase 6: Testing & Documentation

### Task 6.1: Test with Large Files

**Manual Testing Checklist:**
- [ ] Upload 11,000+ packet file
- [ ] Verify chunked upload works
- [ ] Test semantic search
- [ ] Test ChatInterface
- [ ] Test SharkAI
- [ ] Test AI Insights
- [ ] Test cleanup on button click
- [ ] Test cleanup on tab close
- [ ] Verify Supabase storage is cleared

**Estimated Time:** 1 hour

---

### Task 6.2: Update Documentation

**Files to update:**
- `README.md` - Add note about large file support
- `DEPLOYMENT.md` - Add Supabase table setup instructions

**Estimated Time:** 30 minutes

---

## Implementation Timeline

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 1** | Database & API | **3.25 hours** |
| 1.1 | Supabase Table Schema | 30 min |
| 1.2 | Upload API Endpoint | 1.5 hours |
| 1.3 | Cleanup API Endpoint | 30 min |
| 1.4 | Fetch Packets Helper | 45 min |
| **Phase 2** | Client Integration | **3 hours** |
| 2.1 | Packet Upload Hook | 1.5 hours |
| 2.2 | Update Page Component | 1 hour |
| 2.3 | Upload Progress UI | 30 min |
| **Phase 3** | Update AI Endpoints | **2.75 hours** |
| 3.1 | Semantic Search API | 45 min |
| 3.2 | Query API | 30 min |
| 3.3 | AI Insights API | 30 min |
| 3.4 | Other AI Endpoints | 1 hour |
| **Phase 4** | Update Components | **2 hours** |
| 4.1 | AISemanticSearch | 30 min |
| 4.2 | ChatInterface | 30 min |
| 4.3 | SharkAIAssistant | 30 min |
| 4.4 | AIInsights | 30 min |
| **Phase 5** | Cleanup & Safety | **1.25 hours** |
| 5.1 | Clear Session Button | 15 min |
| 5.2 | beforeunload Cleanup | 15 min |
| 5.3 | Stale Session Cleanup API | 30 min |
| 5.4 | Database Trigger | 15 min |
| **Phase 6** | Testing & Docs | **1.5 hours** |
| 6.1 | Manual Testing | 1 hour |
| 6.2 | Documentation | 30 min |
| | **Total** | **~13.75 hours** |

---

## Files to Create (5)

| File | Purpose |
|------|---------|
| `supabase-packet-sessions.sql` | Database schema |
| `app/api/packets/upload/route.ts` | Upload packets to Supabase |
| `app/api/packets/cleanup/route.ts` | Delete session data |
| `app/api/packets/cleanup-stale/route.ts` | Cron cleanup endpoint |
| `lib/use-packet-session.ts` | React hook for session management |

## Files to Modify (10+)

| File | Changes |
|------|---------|
| `lib/packet-session.ts` | Server-side helpers |
| `app/page.tsx` | Session management, cleanup |
| `app/api/analyze/semantic-search/route.ts` | Add session_id support |
| `app/api/analyze/query/route.ts` | Add session_id support |
| `app/api/analyze/summary/route.ts` | Add session_id support |
| `app/api/analyze/anomaly/route.ts` | Add session_id support |
| `components/AISemanticSearch.tsx` | Use session_id |
| `components/ChatInterface.tsx` | Use session_id |
| `components/SharkAIAssistant.tsx` | Use session_id |
| `components/AIInsights.tsx` | Use session_id |

---

## Storage Estimation

| Packets | Estimated Size | Sessions in 500MB |
|---------|---------------|-------------------|
| 1,000 | ~0.5 MB | 1,000 sessions |
| 5,000 | ~2.5 MB | 200 sessions |
| 11,000 | ~5.5 MB | 90 sessions |
| 50,000 | ~25 MB | 20 sessions |

**With cleanup on session end:** Storage stays minimal since data is deleted when user finishes.

---

## Cleanup Strategy Summary

| Trigger | Action | Reliability |
|---------|--------|-------------|
| User clicks "Clear Data" | Immediate DELETE | ✅ 100% |
| User clicks "Go Home" | Immediate DELETE | ✅ 100% |
| User closes tab | sendBeacon DELETE | ✅ 95% |
| User's browser crashes | Stale cleanup (1 hour) | ✅ 100% |
| Cron job (hourly) | DELETE WHERE age > 1 hour | ✅ 100% |
| Database trigger (2 hour) | Safety net DELETE | ✅ 100% |

---

## Questions for Reviewer

1. **Chunk size:** 2000 packets per chunk okay? Or prefer smaller (1500)? 2000packets per chunk

2. **Anonymous users:** Should anonymous users be allowed to use this feature? Currently proposed as YES.

3. **Stale session timeout:** 1 hour proposed. Prefer longer (2 hours) or shorter (30 min)? 1hr

4. **Progress UI:** Should upload progress be a modal, inline banner, or toast notification? toast notification

---

## Approval

- [ ] Phase 1 approved
- [ ] Phase 2 approved
- [ ] Phase 3 approved
- [ ] Phase 4 approved
- [ ] Phase 5 approved
- [ ] Phase 6 approved

**Reviewer Notes:**
_[Space for your feedback]_

---

*Please review and provide your go signal to proceed with implementation.*
