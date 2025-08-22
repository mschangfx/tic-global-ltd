import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      countryOfBirth,
      gender,
      address
    } = await request.json();

    if (!email || !firstName || !lastName || !dateOfBirth || !countryOfBirth || !gender || !address) {
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Get Supabase admin client to bypass RLS
    const supabase = supabaseAdmin;

    // Update user profile information
    const updateData: any = {
      profile_completed: true,
      profile_completed_at: new Date().toISOString(),
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      country_of_birth: countryOfBirth,
      country: countryOfBirth, // Store in both fields for compatibility
      gender: gender,
      address: address,
      updated_at: new Date().toISOString()
    };

    // Add phone number if provided
    if (phoneNumber && phoneNumber.trim()) {
      updateData.phone_number = phoneNumber.trim();
    }

    console.log('Profile completion API - Email:', email);
    console.log('Profile completion API - Update data:', updateData);

    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', email)
      .select();

    console.log('Profile completion API - Update result:', updateResult);
    console.log('Profile completion API - Update error:', updateError);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete profile' },
        { status: 500 }
      );
    }

    console.log(`✅ Profile completed for user: ${email}`);

    return NextResponse.json(
      { 
        message: 'Profile completed successfully',
        completed: true
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error completing profile:', error);
    return NextResponse.json(
      { error: 'Failed to complete profile' },
      { status: 500 }
    );
  }
}
