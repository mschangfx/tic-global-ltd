import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, country } = await request.json();

    if (!email || !fullName || !country) {
      return NextResponse.json(
        { message: 'Email, full name, and country are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Update user with identity verification information
    const updateData: any = {
      identity_verification_submitted: true,
      identity_verification_submitted_at: new Date().toISOString(),
      identity_full_name: fullName,
      identity_country: country,
      identity_verification_status: 'pending' // pending, approved, rejected
    };

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('email', email);

    if (updateError) {
      console.error('Error updating user identity verification:', updateError);
      return NextResponse.json(
        { message: 'Failed to submit identity verification' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Identity verification submitted successfully',
        status: 'pending'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in identity verification submission:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
