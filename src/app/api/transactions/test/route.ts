import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { error: 'userEmail parameter is required' },
        { status: 400 }
      );
    }

    // Test the transaction history API
    const apiUrl = new URL('/api/transactions/history', request.url);
    apiUrl.searchParams.set('userEmail', userEmail);
    apiUrl.searchParams.set('type', 'all');
    apiUrl.searchParams.set('limit', '10');

    console.log('Testing transaction history API:', apiUrl.toString());

    const response = await fetch(apiUrl.toString());
    const data = await response.json();

    return NextResponse.json({
      success: true,
      test: 'Transaction History API Test',
      apiUrl: apiUrl.toString(),
      responseStatus: response.status,
      responseOk: response.ok,
      data: data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error testing transaction API:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
