import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing admin authentication...');
    
    const authResult = await requireAdmin(request);
    
    if (authResult.error) {
      console.log('Admin auth failed:', authResult.error);
      return NextResponse.json(
        { 
          error: authResult.error,
          authenticated: false,
          timestamp: new Date().toISOString()
        },
        { status: authResult.status || 401 }
      );
    }

    console.log('Admin auth successful:', authResult.admin?.email);
    
    return NextResponse.json({
      success: true,
      authenticated: true,
      admin: authResult.admin,
      timestamp: new Date().toISOString(),
      message: 'Admin authentication working correctly'
    });

  } catch (error) {
    console.error('Error in admin auth test:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during auth test',
        authenticated: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
