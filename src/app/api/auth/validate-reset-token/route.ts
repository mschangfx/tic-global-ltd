import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Import the same in-memory storage (this should be shared or use Redis in production)
declare global {
  var resetTokens: Map<string, { email: string; userId: string; expiry: Date }> | undefined;
}

// Initialize global storage if it doesn't exist
if (!global.resetTokens) {
  global.resetTokens = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }

    // Check in-memory storage first
    const tokenData = global.resetTokens?.get(token);

    if (tokenData) {
      // Check if token has expired
      const now = new Date();

      if (now > tokenData.expiry) {
        // Clean up expired token
        global.resetTokens?.delete(token);
        return NextResponse.json(
          { error: 'Reset token has expired' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Token is valid', email: tokenData.email },
        { status: 200 }
      );
    }

    // Fallback: Try to find user with this reset token in database
    try {
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, reset_token_expiry')
        .eq('reset_token', token)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: 'Invalid reset token' },
          { status: 400 }
        );
      }

      // Check if token has expired
      const now = new Date();
      const expiry = new Date(user.reset_token_expiry);

      if (now > expiry) {
        // Clean up expired token
        await supabaseAdmin
          .from('users')
          .update({
            reset_token: null,
            reset_token_expiry: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        return NextResponse.json(
          { error: 'Reset token has expired' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { message: 'Token is valid', email: user.email },
        { status: 200 }
      );
    } catch (dbError) {
      console.error('Database token validation failed:', dbError);
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Token validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
