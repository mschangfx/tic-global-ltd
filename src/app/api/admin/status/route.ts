import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-here'
);

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('admin-token')?.value;
    
    if (!token) {
      return NextResponse.json({
        success: false,
        isAdmin: false,
        message: 'No admin token found'
      });
    }

    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      if (payload.email === 'admin@ticgloballtd.com' && payload.isAdmin) {
        return NextResponse.json({
          success: true,
          isAdmin: true,
          admin: {
            email: payload.email,
            isAdmin: true
          },
          message: 'Admin authenticated'
        });
      }
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
    }
    
    return NextResponse.json({
      success: false,
      isAdmin: false,
      message: 'Invalid admin token'
    });

  } catch (error) {
    console.error('Admin status check error:', error);
    return NextResponse.json({
      success: false,
      isAdmin: false,
      message: 'Error checking admin status'
    });
  }
}
