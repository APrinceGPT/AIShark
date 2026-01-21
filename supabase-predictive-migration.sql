-- Migration: Add Predictive Network Analysis Tables
-- This extends the schema to support pattern learning and prediction

-- Create learned_patterns table to store historical network behavior patterns
CREATE TABLE IF NOT EXISTS public.learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_name TEXT NOT NULL,
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('traffic', 'anomaly', 'performance', 'security')),
  pattern_signature JSONB NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  confidence_score DECIMAL(5,2) DEFAULT 0.0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  metadata JSONB DEFAULT '{}',
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add pattern_signature column to session_statistics for similarity matching
ALTER TABLE public.session_statistics 
ADD COLUMN IF NOT EXISTS pattern_signature JSONB DEFAULT '{}';

-- Create index for faster pattern matching
CREATE INDEX IF NOT EXISTS idx_learned_patterns_user_type 
ON public.learned_patterns(user_id, pattern_type);

CREATE INDEX IF NOT EXISTS idx_learned_patterns_signature 
ON public.learned_patterns USING GIN (pattern_signature);

CREATE INDEX IF NOT EXISTS idx_session_statistics_signature 
ON public.session_statistics USING GIN (pattern_signature);

-- Enable Row Level Security
ALTER TABLE public.learned_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own patterns
CREATE POLICY "Users can view own learned patterns" 
ON public.learned_patterns FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learned patterns" 
ON public.learned_patterns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learned patterns" 
ON public.learned_patterns FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own learned patterns" 
ON public.learned_patterns FOR DELETE 
USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_learned_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_learned_patterns_timestamp
BEFORE UPDATE ON public.learned_patterns
FOR EACH ROW
EXECUTE FUNCTION update_learned_patterns_updated_at();
