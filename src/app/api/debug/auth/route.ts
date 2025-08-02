import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    // Check NextAuth session
    const nextAuthSession = await getServerSession(authOptions);
    
    // Check Supabase auth
    const supabase = createClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    return NextResponse.json({
      success: true,
      nextAuth: {
        session: nextAuthSession,
        userEmail: nextAuthSession?.user?.email || null
      },
      supabase: {
        user: supabaseUser,
        userEmail: supabaseUser?.email || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
