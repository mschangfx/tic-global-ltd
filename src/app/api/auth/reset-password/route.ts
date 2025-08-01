import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Import the same in-memory storage
declare global {
  var resetTokens: Map<string, { email: string; userId: string; expiry: Date }> | undefined;
}

// Initialize global storage if it doesn't exist
if (!global.resetTokens) {
  global.resetTokens = new Map();
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Reset token and new password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check in-memory storage first
    const tokenData = global.resetTokens?.get(token);
    let user: { id: string; email: string } | null = null;

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

      // Get user data
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email')
        .eq('id', tokenData.userId)
        .single();

      if (userError || !userData) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 400 }
        );
      }

      user = userData;
    } else {
      // Fallback: Try to find user with this reset token in database
      try {
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('id, email, reset_token_expiry')
          .eq('reset_token', token)
          .single();

        if (userError || !userData) {
          return NextResponse.json(
            { error: 'Invalid reset token' },
            { status: 400 }
          );
        }

        // Check if token has expired
        const now = new Date();
        const expiry = new Date(userData.reset_token_expiry);

        if (now > expiry) {
          // Clean up expired token
          await supabaseAdmin
            .from('users')
            .update({
              reset_token: null,
              reset_token_expiry: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userData.id);

          return NextResponse.json(
            { error: 'Reset token has expired' },
            { status: 400 }
          );
        }

        user = userData;
      } catch (dbError) {
        console.error('Database token validation failed:', dbError);
        return NextResponse.json(
          { error: 'Invalid reset token' },
          { status: 400 }
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Update password in Supabase Auth (this is the correct way)
    try {
      // First, get the Supabase Auth user ID
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();

      if (listError) {
        console.error('Error listing auth users:', listError);
        return NextResponse.json(
          { error: 'Failed to find user in authentication system' },
          { status: 500 }
        );
      }

      const authUser = authUsers.users.find(u => u.email === user.email);

      if (!authUser) {
        console.error('User not found in Supabase Auth:', user.email);
        return NextResponse.json(
          { error: 'User not found in authentication system' },
          { status: 400 }
        );
      }

      // Update password in Supabase Auth
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: password }
      );

      if (updateError) {
        console.error('Error updating password in Supabase Auth:', updateError);
        return NextResponse.json(
          { error: 'Failed to update password' },
          { status: 500 }
        );
      }

      console.log(`Password updated in Supabase Auth for user: ${user.email}`);

    } catch (authError) {
      console.error('Supabase Auth password update failed:', authError);
      return NextResponse.json(
        { error: 'Failed to update password in authentication system' },
        { status: 500 }
      );
    }

    // Also clean up custom users table if it exists
    try {
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          reset_token: null,
          reset_token_expiry: null,
          updated_at: new Date().toISOString(),
        })
        .eq('email', user.email);

      if (updateError) {
        console.log('Note: Could not update custom users table (this is okay):', updateError.message);
      }
    } catch (dbError) {
      console.log('Note: Custom users table update failed (this is okay):', dbError);
    }

    // Clean up the token from memory
    if (tokenData) {
      global.resetTokens?.delete(token);
    }

    // Log the password reset for security
    console.log(`Password reset successful for user: ${user.email} at ${new Date().toISOString()}`);

    return NextResponse.json(
      { message: 'Password has been reset successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
