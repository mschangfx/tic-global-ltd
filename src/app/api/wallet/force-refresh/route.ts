import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-config';

// Force refresh wallet balance API - clears all caches and fetches fresh data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userEmail } = body;

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required' },
        { status: 400 }
      );
    }

    console.log('🔄 Force refreshing wallet balance for:', userEmail);

    // Call the wallet balance API with cache-busting parameters
    const timestamp = Date.now();
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/wallet/balance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      body: JSON.stringify({ 
        userEmail,
        timestamp,
        forceRefresh: true
      })
    });

    if (!response.ok) {
      throw new Error(`Wallet balance API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data.wallet) {
      throw new Error('No wallet data returned from balance API');
    }

    console.log('✅ Force refresh successful for:', userEmail, 'TIC Balance:', data.wallet.tic_balance);

    return NextResponse.json({
      success: true,
      message: 'Wallet balance force refreshed successfully',
      wallet: data.wallet,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error: any) {
    console.error('❌ Force refresh error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to force refresh wallet balance' 
      },
      { status: 500 }
    );
  }
}

// GET - Test endpoint to verify force refresh functionality
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email is required as query parameter' },
        { status: 400 }
      );
    }

    // Just call the POST method internally
    const postResponse = await POST(new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail })
    }));

    return postResponse;

  } catch (error: any) {
    console.error('❌ GET force refresh error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to test force refresh' 
      },
      { status: 500 }
    );
  }
}
