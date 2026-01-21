import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { sessionId, expiresInDays } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get user from authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Verify the session belongs to the user
    const { data: session, error: sessionError } = await supabase
      .from('analysis_sessions')
      .select('id, user_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to share this session' },
        { status: 403 }
      );
    }

    // Check if share already exists
    const { data: existingShare } = await supabase
      .from('shared_reports')
      .select('share_token')
      .eq('session_id', sessionId)
      .single();

    if (existingShare) {
      return NextResponse.json({
        success: true,
        shareToken: existingShare.share_token,
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${existingShare.share_token}`,
      });
    }

    // Generate unique share token
    const shareToken = nanoid(16);

    // Calculate expiration date if specified
    let expiresAt = null;
    if (expiresInDays && expiresInDays > 0) {
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + expiresInDays);
      expiresAt = expireDate.toISOString();
    }

    // Create share record
    const { data: shareData, error: shareError } = await supabase
      .from('shared_reports')
      .insert({
        session_id: sessionId,
        share_token: shareToken,
        expires_at: expiresAt,
        view_count: 0,
      })
      .select()
      .single();

    if (shareError) {
      console.error('Error creating share:', shareError);
      return NextResponse.json(
        { error: 'Failed to create share' },
        { status: 500 }
      );
    }

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/share/${shareToken}`;

    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl,
      expiresAt: shareData.expires_at,
    });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
