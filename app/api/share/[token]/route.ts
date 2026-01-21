import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    // Initialize Supabase client with service role for accessing user data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { token } = await context.params;

    console.log('Fetching share token:', token);

    if (!token) {
      return NextResponse.json(
        { error: 'Share token is required' },
        { status: 400 }
      );
    }

    // Fetch share details with session information
    const { data: shareData, error: shareError } = await supabase
      .from('shared_reports')
      .select(`
        id,
        session_id,
        share_token,
        expires_at,
        view_count,
        created_at
      `)
      .eq('share_token', token)
      .single();

    console.log('Share data:', shareData, 'Error:', shareError);

    if (shareError || !shareData) {
      return NextResponse.json(
        { error: 'Share not found or expired' },
        { status: 404 }
      );
    }

    // Check if share has expired
    if (shareData.expires_at) {
      const expiryDate = new Date(shareData.expires_at);
      const now = new Date();
      if (expiryDate < now) {
        return NextResponse.json(
          { error: 'This share link has expired' },
          { status: 410 }
        );
      }
    }

    // Increment view count
    await supabase
      .from('shared_reports')
      .update({ view_count: shareData.view_count + 1 })
      .eq('id', shareData.id);

    // Fetch session details
    const { data: sessionData, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('id, name, file_name, file_size, packet_count, created_at')
      .eq('id', shareData.session_id)
      .single();

    if (sessionError || !sessionData) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Fetch session statistics
    const { data: statsData } = await supabase
      .from('session_statistics')
      .select('*')
      .eq('session_id', shareData.session_id)
      .single();

    // Fetch AI insights
    const { data: insightsData } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('session_id', shareData.session_id)
      .order('created_at', { ascending: true });

    // Fetch packet annotations
    const { data: annotationsData } = await supabase
      .from('packet_annotations')
      .select('*')
      .eq('session_id', shareData.session_id)
      .order('packet_number', { ascending: true });

    return NextResponse.json({
      success: true,
      share: {
        id: shareData.id,
        token: shareData.share_token,
        expiresAt: shareData.expires_at,
        viewCount: shareData.view_count + 1, // Include the current view
        createdAt: shareData.created_at,
      },
      session: sessionData,
      statistics: statsData || null,
      insights: insightsData || [],
      annotations: annotationsData || [],
    });

  } catch (error) {
    console.error('Share fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
