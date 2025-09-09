import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';
import { isAdminEmail } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      success: true,
      debug: {
        hasSession: !!session,
        userEmail: session?.user?.email || null,
        userName: session?.user?.name || null,
        isAdmin: session?.user?.email ? isAdminEmail(session.user.email) : false,
        adminEmails: [
          'admin@ticgloballtd.com',
          'mschangfx@gmail.com'
        ]
      }
    });
  } catch (error) {
    console.error('Debug admin auth error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? (error as Error).message : 'Unknown error',
      debug: {
        hasSession: false,
        userEmail: null,
        userName: null,
        isAdmin: false
      }
    });
  }
}
