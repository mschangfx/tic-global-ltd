import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Auth Test: Starting authentication check...');
    
    // Get current user from session
    const session = await getServerSession(authOptions);
    
    console.log('🔍 Auth Test: Session exists:', !!session);
    console.log('🔍 Auth Test: Session user exists:', !!session?.user);
    console.log('🔍 Auth Test: Session user email:', session?.user?.email || 'No email');
    
    return NextResponse.json({
      success: true,
      authenticated: !!session?.user?.email,
      session: {
        exists: !!session,
        hasUser: !!session?.user,
        email: session?.user?.email || null,
        name: session?.user?.name || null,
        image: session?.user?.image || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Auth Test: Error checking authentication:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check authentication',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
