import { NextRequest, NextResponse } from 'next/server';

// REDIRECT TO NEW COMPREHENSIVE FIX
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Redirecting to comprehensive emergency fix...');
    
    // Call the new comprehensive fix API
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ticgloballtd.com';
    const response = await fetch(`${baseUrl}/api/emergency-fix-all-distributions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Redirected to comprehensive emergency fix',
      redirect_result: data
    });
    
  } catch (error) {
    console.error('❌ Redirect failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Redirect to comprehensive fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET - Redirect to status check
export async function GET(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'https://ticgloballtd.com';
    const response = await fetch(`${baseUrl}/api/emergency-fix-all-distributions`);
    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      message: 'Status check via comprehensive fix API',
      status_result: data
    });
    
  } catch (error) {
    console.error('❌ Status check redirect failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Status check redirect failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
