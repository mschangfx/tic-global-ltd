import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get email from query parameter or session
    const { searchParams } = new URL(request.url);
    let email = searchParams.get('email');

    // If no email in query, try to get from session
    if (!email) {
      const session = await getServerSession(authOptions);
      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: 'Not authenticated' },
          { status: 401 }
        );
      }
      email = session.user.email;
    }

    // Get Supabase admin client to bypass RLS
    const supabase = supabaseAdmin;

    // Get user verification status and profile data, including latest identity document info
    const { data: user, error } = await supabase
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
      .maybeSingle();

    // Also get the latest identity document status for more detailed info
    let latestDocument = null;
    if (user?.identity_document_uploaded) {
      const { data: docData } = await supabase
        .from('identity_documents')
        .select('verification_status, rejection_reason, verified_at, upload_date')
        .eq('email', email)
        .order('upload_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      latestDocument = docData;
    }

    console.log('Verification status API - Email:', email);
    console.log('Verification status API - User data:', user);
    console.log('Verification status API - Error:', error);

    if (error) {
      console.error('Error fetching user verification status:', error);
      return NextResponse.json(
        { success: false, error: 'Database error' },
        { status: 500 }
      );
    }

    // If user doesn't exist in users table, return default values
    if (!user) {
      console.log('Verification status API - No user found, returning defaults');
      return NextResponse.json(
        {
          success: true,
          user: {
            email: email,
            email_verified: false,
            phone_verified: false,
            profile_completed: false,
            identity_verification_status: null,
            identity_verification_submitted: false,
            identity_document_uploaded: false,
            first_name: null,
            last_name: null,
            phone_number: null,
            country_of_residence: null
          }
        },
        { status: 200 }
      );
    }

    // Map verification status properly
    let mappedStatus = user.identity_verification_status;
    if (latestDocument) {
      // Use document status if available (more up-to-date)
      if (latestDocument.verification_status === 'approved') {
        mappedStatus = 'approved';
      } else if (latestDocument.verification_status === 'rejected') {
        mappedStatus = 'rejected';
      } else if (latestDocument.verification_status === 'pending') {
        mappedStatus = 'pending';
      }
    } else if (user.identity_verification_status === 'verified') {
      // Map legacy 'verified' status to 'approved'
      mappedStatus = 'approved';
    }

    // Return user data in expected format
    const response = {
      success: true,
      user: {
        email: user.email,
        email_verified: user.email_verified || false,
        phone_verified: user.phone_verified || false,
        profile_completed: user.profile_completed || false,
        identity_verification_status: mappedStatus,
        identity_verification_submitted: user.identity_verification_submitted || false,
        identity_document_uploaded: user.identity_document_uploaded || false,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        country_of_residence: user.country_of_residence || user.country_of_birth,
        // Include document-specific info for better UX
        identity_document_rejection_reason: latestDocument?.rejection_reason || null,
        identity_document_verified_at: latestDocument?.verified_at || null,
        identity_document_upload_date: latestDocument?.upload_date || null
      }
    };

    console.log('Verification status API - Response:', response);

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error getting verification status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get verification status' },
      { status: 500 }
    );
  }
}
