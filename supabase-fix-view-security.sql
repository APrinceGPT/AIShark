-- ================================================================
-- FIX: session_embedding_stats View Security
-- Run this in Supabase SQL Editor to fix the SECURITY DEFINER issue
-- ================================================================

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS session_embedding_stats;

-- Recreate with security_invoker = true
-- This ensures RLS policies of the querying user are enforced
CREATE VIEW session_embedding_stats 
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

-- Add comment explaining the security model
COMMENT ON VIEW session_embedding_stats IS 
  'Aggregated embedding statistics per session. Uses SECURITY INVOKER to enforce caller RLS policies.';
