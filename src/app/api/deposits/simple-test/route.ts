import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Simple deposit test API called');
    
    const body = await request.json();
    console.log('📊 Request body:', body);
    
    // Just return success without doing anything complex
    return NextResponse.json({
      success: true,
      message: 'Simple test API working',
      receivedData: body,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Simple test API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Simple test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Simple deposit test API is working',
    timestamp: new Date().toISOString()
  });
}
