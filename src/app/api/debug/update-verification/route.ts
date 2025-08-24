import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, emailVerified, profileCompleted, identitySubmitted } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🔧 Debug: Updating verification status for:', email);
    console.log('🔧 Debug: Updates:', { emailVerified, profileCompleted, identitySubmitted });

    // Update user verification status
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (emailVerified !== undefined) {
      updateData.email_verified = emailVerified;
      if (emailVerified) {
        updateData.email_verified_at = new Date().toISOString();
      }
    }

    if (profileCompleted !== undefined) {
      updateData.profile_completed = profileCompleted;
      if (profileCompleted) {
        updateData.profile_completed_at = new Date().toISOString();
      }
    }

    if (identitySubmitted !== undefined) {
      updateData.identity_verification_submitted = identitySubmitted;
      updateData.identity_document_uploaded = identitySubmitted;
      if (identitySubmitted) {
        updateData.identity_verification_submitted_at = new Date().toISOString();
        updateData.identity_verification_status = 'pending';
      }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('email', email)
      .select();

    if (error) {
      console.error('🔧 Debug: Error updating verification status:', error);
      return NextResponse.json(
        { error: 'Failed to update verification status', details: error.message },
        { status: 500 }
      );
    }

    console.log('🔧 Debug: Successfully updated verification status:', data);

    return NextResponse.json({
      success: true,
      message: 'Verification status updated successfully',
      data: data
    });

  } catch (error) {
    console.error('🔧 Debug: API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
