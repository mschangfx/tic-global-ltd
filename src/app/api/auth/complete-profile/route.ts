import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      firstName,
      lastName,
      dateOfBirth,
      countryOfBirth,
      gender,
      address
    } = await request.json();

    if (!email || !firstName || !lastName || !dateOfBirth || !countryOfBirth || !gender || !address) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Get Supabase client
    const supabase = createClient();

    // Update user profile information
    const updateData: any = {
      profile_completed: true,
      profile_completed_at: new Date().toISOString(),
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      country_of_birth: countryOfBirth,
      gender: gender,
      address: address
    };

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', email);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { message: 'Failed to complete profile' },
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
      { message: 'Failed to complete profile' },
      { status: 500 }
    );
  }
}
