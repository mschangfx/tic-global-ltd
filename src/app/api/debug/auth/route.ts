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
    
    // Test wallet balance API if user is authenticated
    let walletTest = null;
    const userEmail = nextAuthSession?.user?.email || supabaseUser?.email;

    if (userEmail) {
      try {
        const walletResponse = await fetch(`${request.nextUrl.origin}/api/wallet/balance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userEmail })
        });

        const walletData = await walletResponse.json();
        walletTest = {
          status: walletResponse.status,
          ok: walletResponse.ok,
          data: walletData
        };
      } catch (walletError) {
        walletTest = {
          error: walletError instanceof Error ? walletError.message : 'Unknown wallet error'
        };
      }
    }

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
      walletTest,
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
