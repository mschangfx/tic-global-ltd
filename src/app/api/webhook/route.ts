import { NextRequest, NextResponse } from 'next/server';

// Simple webhook endpoint that should work
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    method: 'GET'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Webhook received:', body);
    
    // Simple response for now
    return NextResponse.json({ 
      ok: true,
      received: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ 
      error: 'Internal error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
