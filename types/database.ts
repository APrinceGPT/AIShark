/**
 * Supabase Database Type Definitions
 * Matches schema defined in supabase-schema.sql
 */

export interface Database {
  public: {
    Tables: {
      analysis_sessions: {
        Row: AnalysisSession;
        Insert: Omit<AnalysisSession, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AnalysisSession, 'id' | 'created_at'>>;
      };
      ai_insights: {
        Row: AIInsight;
        Insert: Omit<AIInsight, 'id' | 'created_at'>;
        Update: Partial<Omit<AIInsight, 'id' | 'created_at'>>;
      };
      packet_annotations: {
        Row: PacketAnnotation;
        Insert: Omit<PacketAnnotation, 'id' | 'created_at'>;
        Update: Partial<Omit<PacketAnnotation, 'id' | 'created_at'>>;
      };
      shared_reports: {
        Row: SharedReport;
        Insert: Omit<SharedReport, 'id' | 'created_at' | 'view_count'>;
        Update: Partial<Omit<SharedReport, 'id' | 'created_at'>>;
      };
      session_statistics: {
        Row: SessionStatistics;
        Insert: Omit<SessionStatistics, 'id' | 'created_at'>;
        Update: Partial<Omit<SessionStatistics, 'id' | 'created_at'>>;
      };
      learned_patterns: {
        Row: LearnedPattern;
        Insert: Omit<LearnedPattern, 'id' | 'created_at' | 'updated_at' | 'occurrence_count' | 'confidence_score' | 'first_seen'>;
        Update: Partial<Omit<LearnedPattern, 'id' | 'created_at' | 'first_seen'>>;
      };
    };
  };
}

export interface AnalysisSession {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  file_size: number;
  packet_count: number;
  created_at: string;
  updated_at: string;
}

export interface AIInsight {
  id: string;
  session_id: string;
  insight_type: 'summary' | 'anomaly' | 'chat';
  question: string | null;
  response: string;
  created_at: string;
}

export interface PacketAnnotation {
  id: string;
  session_id: string;
  packet_number: number;
  annotation: string | null;
  severity: 'info' | 'warning' | 'critical';
  created_at: string;
}

export interface SharedReport {
  id: string;
  session_id: string;
  share_token: string;
  expires_at: string | null;
  view_count: number;
  created_at: string;
}

export interface SessionStatistics {
  id: string;
  session_id: string;
  protocol_distribution: Record<string, number>;
  top_talkers: Array<{ address: string; packets: number; bytes: number }>;
  timeline_data: Array<{ timestamp: number; packets: number }>;
  anomaly_data: any;
  pattern_signature?: Record<string, any>;
  created_at: string;
}

export interface LearnedPattern {
  id: string;
  user_id: string;
  pattern_name: string;
  pattern_type: 'traffic' | 'anomaly' | 'performance' | 'security';
  pattern_signature: Record<string, any>;
  occurrence_count: number;
  confidence_score: number;
  metadata: Record<string, any>;
  first_seen: string;
  last_seen: string;
  created_at: string;
  updated_at: string;
}

// Helper types for frontend use
export interface SessionWithDetails extends AnalysisSession {
  statistics?: SessionStatistics;
  insights?: AIInsight[];
  annotations?: PacketAnnotation[];
  shared?: SharedReport;
}
