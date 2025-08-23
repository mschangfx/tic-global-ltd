import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { referralCodeGenerator } from '@/lib/services/referralCodeGenerator';

export async function POST(request: NextRequest) {
  try {
    const { email, password, country, referralId } = await request.json();

    // Validation
    if (!email || !password || !country || !referralId) {
      return NextResponse.json(
        { error: 'Email, password, country, and referral ID are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Validate password requirements
    if (password.length < 8 || password.length > 15) {
      return NextResponse.json(
        { error: 'Password must be between 8-15 characters' },
        { status: 400 }
      );
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return NextResponse.json(
        { error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character' },
        { status: 400 }
      );
    }

    // Try to create user directly - Supabase will handle duplicate email errors
    // This approach is more efficient and avoids the getUserByEmail issue



    // Validate referral ID exists (optional - you can implement referral validation here)
    // For now, we'll just store it as provided

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for simplicity
      user_metadata: {
        country,
        referralId
      }
    });

    if (authError) {
      console.error('Supabase Auth creation error:', authError);

      // Handle duplicate email error specifically
      if (authError.message?.includes('already registered') ||
          authError.message?.includes('email already exists') ||
          authError.message?.includes('User already registered')) {
        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: authError.message || 'Failed to create account' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Account creation failed' },
        { status: 500 }
      );
    }

    // Create user in custom users table (password is handled by Supabase Auth)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert([
        {
          id: authData.user.id, // Use the same ID from Supabase Auth
          email,
          provider: 'email',
          country,
          referral_id: referralId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      ])
      .select()
      .single();

    if (userError) {
      console.error('Error creating user in custom table:', userError);

      // Handle duplicate email in custom table
      if (userError.code === '23505' || userError.message?.includes('duplicate key')) {
        // Clean up the auth user since custom table creation failed
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

        return NextResponse.json(
          { error: 'An account with this email already exists' },
          { status: 400 }
        );
      }

      // If custom table creation fails, clean up the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);

      return NextResponse.json(
        { error: 'Failed to complete account creation' },
        { status: 500 }
      );
    }

    // Create default dashboard configuration for the user
    try {
      const defaultDashboardConfig = {
        user_id: authData.user.id,
        version: 1,
        layout_type: 'grid',
        widgets: [
          {
            id: 'welcome',
            type: 'welcome',
            position: { x: 0, y: 0, w: 12, h: 4 },
            config: {}
          },
          {
            id: 'wallet',
            type: 'wallet',
            position: { x: 0, y: 4, w: 6, h: 6 },
            config: {}
          },
          {
            id: 'plans',
            type: 'plans',
            position: { x: 6, y: 4, w: 6, h: 6 },
            config: {}
          }
        ]
      };

      const { error: dashboardError } = await supabaseAdmin
        .from('user_dashboards')
        .insert(defaultDashboardConfig);

      if (dashboardError) {
        console.error('Error creating dashboard config:', dashboardError);
        // Don't fail the registration for dashboard creation error
      }
    } catch (dashboardError) {
      console.error('Dashboard creation error:', dashboardError);
      // Don't fail the registration for dashboard creation error
    }

    // Generate referral code for the new user using centralized service
    try {
      console.log('🎯 Creating referral setup for new user:', email);

      const referralResult = await referralCodeGenerator.createUserReferralSetup(email);

      if (referralResult.success) {
        console.log('✅ Referral setup completed:', referralResult.code);
      } else {
        console.error('❌ Referral setup failed:', referralResult.message);
        // Don't fail registration for referral code generation error
      }
    } catch (referralCodeGenError) {
      console.error('❌ Error generating referral code:', referralCodeGenError);
      // Don't fail registration for referral code generation error
    }

    // Process referral relationship if referralId is provided
    if (referralId) {
      try {
        console.log('🔗 Processing referral relationship for:', email, 'with code:', referralId);

        const referralResponse = await fetch(`${process.env.NEXTAUTH_URL || 'https://ticgloballtd.com'}/api/referrals/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referralCode: referralId,
            newUserEmail: email
          })
        });

        const referralResult = await referralResponse.json();

        if (referralResult.success) {
          console.log('✅ Referral relationship created successfully');
        } else {
          console.warn('⚠️ Referral processing failed:', referralResult.message);
        }
      } catch (referralError) {
        console.error('❌ Error processing referral:', referralError);
        // Don't fail the registration for referral processing error
      }
    }

    return NextResponse.json(
      {
        message: 'Account created successfully',
        userId: authData.user.id
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
