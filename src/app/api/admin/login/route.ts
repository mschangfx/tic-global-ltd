import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const ADMIN_CREDENTIALS = [
  {
    email: 'admin@ticgloballtd.com',
    password: 'admin1223!'
  },
  {
    email: 'mschangfx@gmail.com',
    password: 'admin1223!'
  }
];

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key-here'
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate admin credentials
    const validAdmin = ADMIN_CREDENTIALS.find(admin =>
      admin.email === email && admin.password === password
    );

    if (!validAdmin) {
      return NextResponse.json(
        { error: 'Invalid admin credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await new SignJWT({
      email: validAdmin.email,
      isAdmin: true,
      iat: Math.floor(Date.now() / 1000)
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      message: 'Admin login successful',
      admin: {
        email: validAdmin.email,
        isAdmin: true
      }
    });

    // Set secure HTTP-only cookie
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Logout - clear the admin token
    const response = NextResponse.json({
      success: true,
      message: 'Admin logout successful'
    });

    response.cookies.delete('admin-token');
    
    return response;

  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
