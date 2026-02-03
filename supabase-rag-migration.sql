-- ================================================================
-- AIShark RAG (Retrieval-Augmented Generation) Schema
-- Enables semantic search over packet data using pgvector
-- ================================================================

-- Enable pgvector extension (run this first in Supabase SQL Editor)
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================
-- PACKET EMBEDDINGS TABLE
-- Stores vector embeddings for semantic search over packets
-- ================================================================

CREATE TABLE IF NOT EXISTS packet_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES packet_sessions(id) ON DELETE CASCADE,
  
  -- Packet identification
  packet_number INTEGER NOT NULL,          -- Original packet number (0-indexed)
  packet_group_start INTEGER NOT NULL,     -- Start of packet group (for batched embeddings)
  packet_group_end INTEGER NOT NULL,       -- End of packet group
  
  -- Packet metadata (denormalized for fast retrieval)
  protocols TEXT[] NOT NULL,               -- e.g., ['TCP', 'HTTP', 'TLS']
  source_ip TEXT,
  destination_ip TEXT,
  source_port INTEGER,
  destination_port INTEGER,
  timestamp_ms BIGINT,
  
  -- Content summary (what was embedded)
  content_summary TEXT NOT NULL,           -- Human-readable summary of packets
  
  -- Vector embedding (1536 dimensions for text-embedding-3-small)
  embedding vector(1536) NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_session_packet_group UNIQUE (session_id, packet_group_start, packet_group_end)
);

-- ================================================================
-- INDEXES FOR FAST RETRIEVAL
-- ================================================================

-- HNSW index for fast similarity search (better for high-dimensional vectors)
-- Using cosine distance for normalized embeddings
CREATE INDEX IF NOT EXISTS idx_packet_embeddings_vector 
  ON packet_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Session-based filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_packet_embeddings_session 
  ON packet_embeddings(session_id);

-- Protocol-based filtering
CREATE INDEX IF NOT EXISTS idx_packet_embeddings_protocols 
  ON packet_embeddings USING GIN(protocols);

-- IP-based filtering
CREATE INDEX IF NOT EXISTS idx_packet_embeddings_source_ip 
  ON packet_embeddings(source_ip);

CREATE INDEX IF NOT EXISTS idx_packet_embeddings_dest_ip 
  ON packet_embeddings(destination_ip);

-- Port-based filtering
CREATE INDEX IF NOT EXISTS idx_packet_embeddings_ports 
  ON packet_embeddings(source_port, destination_port);

-- Timestamp ordering
CREATE INDEX IF NOT EXISTS idx_packet_embeddings_timestamp 
  ON packet_embeddings(session_id, timestamp_ms);

-- ================================================================
-- EMBEDDING STATUS TRACKING
-- Tracks which sessions have been indexed
-- ================================================================

CREATE TABLE IF NOT EXISTS embedding_status (
  session_id UUID PRIMARY KEY REFERENCES packet_sessions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'indexing', 'complete', 'failed', 'partial')),
  total_packets INTEGER NOT NULL DEFAULT 0,
  indexed_packets INTEGER NOT NULL DEFAULT 0,
  embedding_groups INTEGER NOT NULL DEFAULT 0,   -- Number of embedding records
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- FUNCTIONS FOR RAG QUERIES
-- ================================================================

-- Function to find similar packets using vector similarity
CREATE OR REPLACE FUNCTION match_packets(
  query_embedding vector(1536),
  match_session_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  packet_number INTEGER,
  packet_group_start INTEGER,
  packet_group_end INTEGER,
  protocols TEXT[],
  source_ip TEXT,
  destination_ip TEXT,
  content_summary TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.packet_number,
    pe.packet_group_start,
    pe.packet_group_end,
    pe.protocols,
    pe.source_ip,
    pe.destination_ip,
    pe.content_summary,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM packet_embeddings pe
  WHERE pe.session_id = match_session_id
    AND 1 - (pe.embedding <=> query_embedding) > match_threshold
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to find similar packets with protocol filter
CREATE OR REPLACE FUNCTION match_packets_by_protocol(
  query_embedding vector(1536),
  match_session_id UUID,
  protocol_filter TEXT,
  match_threshold FLOAT DEFAULT 0.6,
  match_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  packet_number INTEGER,
  packet_group_start INTEGER,
  packet_group_end INTEGER,
  protocols TEXT[],
  source_ip TEXT,
  destination_ip TEXT,
  content_summary TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pe.id,
    pe.packet_number,
    pe.packet_group_start,
    pe.packet_group_end,
    pe.protocols,
    pe.source_ip,
    pe.destination_ip,
    pe.content_summary,
    1 - (pe.embedding <=> query_embedding) AS similarity
  FROM packet_embeddings pe
  WHERE pe.session_id = match_session_id
    AND protocol_filter = ANY(pe.protocols)
    AND 1 - (pe.embedding <=> query_embedding) > match_threshold
  ORDER BY pe.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE packet_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_status ENABLE ROW LEVEL SECURITY;

-- Allow read access for sessions the user owns or public sessions
CREATE POLICY "Users can view embeddings for their sessions"
  ON packet_embeddings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM packet_sessions ps 
      WHERE ps.id = packet_embeddings.session_id 
      AND (ps.user_id = auth.uid() OR ps.user_id IS NULL)
    )
  );

-- Allow insert for owned sessions
CREATE POLICY "System can insert embeddings"
  ON packet_embeddings FOR INSERT
  WITH CHECK (true);  -- API handles authorization

-- Status table policies
CREATE POLICY "Users can view status for their sessions"
  ON embedding_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM packet_sessions ps 
      WHERE ps.id = embedding_status.session_id 
      AND (ps.user_id = auth.uid() OR ps.user_id IS NULL)
    )
  );

CREATE POLICY "System can manage embedding status"
  ON embedding_status FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================================
-- HELPER VIEWS
-- ================================================================

-- View for session embedding statistics
-- Using SECURITY INVOKER to enforce RLS of the querying user
CREATE OR REPLACE VIEW session_embedding_stats 
WITH (security_invoker = true) AS
SELECT 
  es.session_id,
  es.status,
  es.total_packets,
  es.indexed_packets,
  es.embedding_groups,
  CASE 
    WHEN es.total_packets > 0 
    THEN ROUND((es.indexed_packets::DECIMAL / es.total_packets) * 100, 2)
    ELSE 0 
  END AS coverage_percent,
  es.started_at,
  es.completed_at,
  CASE 
    WHEN es.completed_at IS NOT NULL AND es.started_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (es.completed_at - es.started_at))
    ELSE NULL
  END AS indexing_duration_seconds
FROM embedding_status es;

-- ================================================================
-- COMMENTS
-- ================================================================

COMMENT ON TABLE packet_embeddings IS 
  'Stores vector embeddings for packet groups to enable semantic search (RAG)';

COMMENT ON COLUMN packet_embeddings.embedding IS 
  'OpenAI text-embedding-3-small vector (1536 dimensions)';

COMMENT ON COLUMN packet_embeddings.packet_group_start IS 
  'Packets are embedded in groups (e.g., 5-10 packets per embedding) for efficiency';

COMMENT ON FUNCTION match_packets IS 
  'Semantic search over packet embeddings using cosine similarity';
