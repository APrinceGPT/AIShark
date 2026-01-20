-- ================================================================
-- AIShark Database Schema
-- Supabase PostgreSQL Setup
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- TABLES
-- ================================================================

-- Analysis Sessions
CREATE TABLE IF NOT EXISTS analysis_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  packet_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON analysis_sessions(user_id);
CREATE INDEX idx_sessions_created_at ON analysis_sessions(created_at DESC);

-- Saved AI Insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('summary', 'anomaly', 'chat')),
  question TEXT,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_insights_session_id ON ai_insights(session_id);
CREATE INDEX idx_insights_type ON ai_insights(insight_type);

-- Packet Annotations
CREATE TABLE IF NOT EXISTS packet_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  packet_number INTEGER NOT NULL,
  annotation TEXT,
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_annotations_session_id ON packet_annotations(session_id);
CREATE INDEX idx_annotations_packet_number ON packet_annotations(packet_number);

-- Shared Reports
CREATE TABLE IF NOT EXISTS shared_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shared_token ON shared_reports(share_token);
CREATE INDEX idx_shared_expires ON shared_reports(expires_at);

-- Analysis Statistics (JSONB for flexible storage)
CREATE TABLE IF NOT EXISTS session_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
  protocol_distribution JSONB,
  top_talkers JSONB,
  timeline_data JSONB,
  anomaly_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_statistics_session_id ON session_statistics(session_id);

-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

-- Enable RLS on all tables
ALTER TABLE analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_statistics ENABLE ROW LEVEL SECURITY;

-- Analysis Sessions Policies
CREATE POLICY "Users can view their own sessions"
  ON analysis_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON analysis_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
  ON analysis_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
  ON analysis_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- AI Insights Policies (cascade from sessions)
CREATE POLICY "Users can view insights from their sessions"
  ON ai_insights FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = ai_insights.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert insights to their sessions"
  ON ai_insights FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = ai_insights.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Packet Annotations Policies
CREATE POLICY "Users can view annotations from their sessions"
  ON packet_annotations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = packet_annotations.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert annotations to their sessions"
  ON packet_annotations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = packet_annotations.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their annotations"
  ON packet_annotations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = packet_annotations.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their annotations"
  ON packet_annotations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = packet_annotations.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Shared Reports Policies (public read if not expired)
CREATE POLICY "Anyone can view active shared reports"
  ON shared_reports FOR SELECT
  USING (expires_at IS NULL OR expires_at > NOW());

CREATE POLICY "Users can create shared reports for their sessions"
  ON shared_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = shared_reports.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their shared reports"
  ON shared_reports FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = shared_reports.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- Session Statistics Policies
CREATE POLICY "Users can view statistics from their sessions"
  ON session_statistics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = session_statistics.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert statistics to their sessions"
  ON session_statistics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM analysis_sessions 
      WHERE analysis_sessions.id = session_statistics.session_id 
      AND analysis_sessions.user_id = auth.uid()
    )
  );

-- ================================================================
-- STORAGE BUCKET (for PCAP files)
-- ================================================================
-- Run this in Supabase Storage section:
-- 1. Create bucket named "pcap-files"
-- 2. Set it to PRIVATE
-- 3. Max file size: 100MB
-- 4. Allowed MIME types: application/vnd.tcpdump.pcap, application/octet-stream

-- Storage policies (to be created in Supabase UI)
-- SELECT: Users can download their own files
-- INSERT: Users can upload to their own folders (user_id/*)
-- UPDATE: Users can update their own files
-- DELETE: Users can delete their own files

-- ================================================================
-- FUNCTIONS & TRIGGERS
-- ================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analysis_sessions_updated_at
  BEFORE UPDATE ON analysis_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Increment view count for shared reports
CREATE OR REPLACE FUNCTION increment_share_view_count(report_token TEXT)
RETURNS void AS $$
BEGIN
  UPDATE shared_reports
  SET view_count = view_count + 1
  WHERE share_token = report_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

-- Full text search on session names
CREATE INDEX idx_sessions_name_search ON analysis_sessions USING gin(to_tsvector('english', name));

-- ================================================================
-- INITIAL VERIFICATION QUERY
-- ================================================================
-- Run this to verify setup:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
