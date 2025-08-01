import { NextRequest, NextResponse } from 'next/server';

// Simple admin endpoint to trigger token distribution
export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json();

    // Simple admin verification
    if (adminKey !== 'admin123') { // In production, use a secure admin key
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the token distribution API
    const distributionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8000'}/api/tokens/distribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: process.env.ADMIN_SECRET_KEY || 'admin123'
      })
    });

    const distributionData = await distributionResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Token distribution triggered successfully',
      distribution_result: distributionData
    });

  } catch (error) {
    console.error('Error triggering token distribution:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
