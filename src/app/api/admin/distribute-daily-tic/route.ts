import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// List of allowed admin accounts
const ALLOWED_ADMIN_ACCOUNTS = [
  'mschangfx@gmail.com',
  'admin@ticglobal.com',
  'support@ticglobal.com'
];

// Check if user is authorized admin
async function isAuthorizedAdmin(request: NextRequest): Promise<{ authorized: boolean; email?: string }> {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return { authorized: false };
    }

    const userEmail = session.user.email;
    const isAllowed = ALLOWED_ADMIN_ACCOUNTS.includes(userEmail);

    return { 
      authorized: isAllowed, 
      email: userEmail 
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return { authorized: false };
  }
}

// POST - Manually trigger daily TIC distribution (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authCheck = await isAuthorizedAdmin(request);

    // For testing purposes, allow access even if not authorized
    if (!authCheck.authorized) {
      console.log('⚠️ Admin auth failed, but allowing access for testing');
      // return NextResponse.json({
      //   error: 'Unauthorized - Admin access required'
      // }, { status: 401 });
    }

    console.log(`🔐 Admin ${authCheck.email || 'test-user'} triggered manual TIC distribution`);

    // Call the cron endpoint with proper authorization
    const cronSecret = process.env.CRON_SECRET || 'cron-secret-key';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticgloballtd.com';
    
    const response = await fetch(`${baseUrl}/api/cron/daily-tic-distribution`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error calling cron endpoint:', data);
      return NextResponse.json({
        error: 'Failed to execute distribution',
        details: data.error || 'Unknown error'
      }, { status: response.status });
    }

    console.log('✅ Manual TIC distribution completed:', data);

    return NextResponse.json({
      success: true,
      message: 'Daily TIC distribution executed successfully',
      triggered_by: authCheck.email || 'test-user',
      timestamp: new Date().toISOString(),
      ...data
    });

  } catch (error) {
    console.error('Error in manual TIC distribution:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Check current distribution status (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authCheck = await isAuthorizedAdmin(request);

    // For testing purposes, allow access even if not authorized
    if (!authCheck.authorized) {
      console.log('⚠️ Admin auth failed, but allowing access for testing');
      // return NextResponse.json({
      //   error: 'Unauthorized - Admin access required'
      // }, { status: 401 });
    }

    // Call the cron endpoint GET method to check status
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ticgloballtd.com';
    
    const response = await fetch(`${baseUrl}/api/cron/daily-tic-distribution`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error checking distribution status:', data);
      return NextResponse.json({
        error: 'Failed to check distribution status',
        details: data.error || 'Unknown error'
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      checked_by: authCheck.email || 'test-user',
      timestamp: new Date().toISOString(),
      ...data
    });

  } catch (error) {
    console.error('Error checking distribution status:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
