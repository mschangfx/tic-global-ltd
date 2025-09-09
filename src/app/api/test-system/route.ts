import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    
    // Test basic system functionality
    const systemInfo = {
      timestamp,
      status: 'System is running',
      environment: process.env.NODE_ENV || 'unknown',
      url: request.url,
      headers: {
        origin: request.headers.get('origin'),
        referer: request.headers.get('referer'),
        userAgent: request.headers.get('user-agent')?.substring(0, 100),
      },
      routes: {
        adminLogin: '/api/admin/login',
        adminWithdrawals: '/api/admin/withdrawals',
        adminDeposits: '/api/admin/deposits',
        testAuth: '/api/admin/test-auth'
      },
      pages: {
        adminAccess: '/admin-access',
        adminDashboard: '/admin',
        withdrawalManagement: '/admin/withdrawals',
        depositManagement: '/admin/deposits'
      }
    };

    return NextResponse.json({
      success: true,
      message: 'TIC Global Admin System - All systems operational',
      data: systemInfo
    });

  } catch (error) {
    console.error('System test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'System test failed',
        message: error instanceof Error ? (error as Error).message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
