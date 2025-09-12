import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Fixing verification status for:', email);

    // Get current user data
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      console.error('Error fetching user:', fetchError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('🔍 Current user data:', user);

    // Check if profile should be completed based on existing data
    const hasProfileData = user.first_name && user.last_name && user.date_of_birth && user.country_of_birth && user.gender && user.address;
    
    console.log('🔍 Has profile data:', hasProfileData);
    console.log('🔍 Current profile_completed:', user.profile_completed);

    // Force update profile_completed if user has all required data
    if (hasProfileData && !user.profile_completed) {
      console.log('🔧 Updating profile_completed to true');
      
      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('users')
        .update({
          profile_completed: true,
          profile_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        );
      }

      console.log('✅ Updated user data:', updateData);
    }

    // Get fresh verification status
    const { data: freshUser, error: freshError } = await supabaseAdmin
      .from('users')
      .select(`
        email,
        first_name,
        last_name,
        phone_number,
        country_of_birth,
        country_of_residence,
        email_verified,
        phone_verified,
        profile_completed,
        identity_verification_status,
        identity_verification_submitted,
        identity_document_uploaded
      `)
      .eq('email', email)
      .single();

    if (freshError) {
      console.error('Error fetching fresh user data:', freshError);
      return NextResponse.json(
        { error: 'Failed to fetch updated data' },
        { status: 500 }
      );
    }

    console.log('✅ Fresh user data:', freshUser);

    return NextResponse.json({
      success: true,
      message: 'Verification status fixed',
      user: freshUser,
      changes: {
        hadProfileData: hasProfileData,
        wasProfileCompleted: user.profile_completed,
        nowProfileCompleted: freshUser.profile_completed
      }
    });

  } catch (error) {
    console.error('Error fixing verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
