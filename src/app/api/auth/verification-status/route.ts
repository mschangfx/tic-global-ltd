import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = createClient();

    // Get user verification status and profile data
    const { data: user, error } = await supabase
      .from('users')
      .select('email_verified, phone_verified, profile_completed, identity_verification_status, identity_document_uploaded, phone_number, first_name, last_name, name, country_of_birth')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user verification status:', error);
      return NextResponse.json(
        { message: 'Database error' },
        { status: 500 }
      );
    }

    // If user doesn't exist in users table, return default values for Google OAuth users
    if (!user) {
      return NextResponse.json(
        {
          emailVerified: true, // Google OAuth users have verified emails
          phoneVerified: true, // Phone verification removed - always true
          profileCompleted: false,
          identityVerified: false,
          identityDocumentUploaded: false,
          phoneNumber: null,
          firstName: null,
          lastName: null,
          name: null,
          countryOfBirth: null
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        emailVerified: user.email_verified || false,
        phoneVerified: true, // Phone verification removed - always true
        profileCompleted: user.profile_completed || false,
        identityVerified: user.identity_verification_status === 'approved',
        identityDocumentUploaded: user.identity_document_uploaded || false,
        phoneNumber: user.phone_number || null,
        firstName: user.first_name || null,
        lastName: user.last_name || null,
        name: user.name || null,
        countryOfBirth: user.country_of_birth || null
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error getting verification status:', error);
    return NextResponse.json(
      { message: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
