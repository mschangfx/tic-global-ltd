import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    console.log('📝 Profile completion request body:', requestBody);

    const {
      email,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      countryOfBirth,
      gender,
      address
    } = requestBody;

    console.log('📝 Extracted fields:', {
      email,
      firstName,
      lastName,
      phoneNumber,
      dateOfBirth,
      countryOfBirth,
      gender,
      address
    });

    if (!email || !firstName || !lastName || !dateOfBirth || !countryOfBirth || !gender || !address) {
      console.log('❌ Missing required fields validation failed');
      return NextResponse.json(
        { error: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Get Supabase admin client to bypass RLS
    const supabase = supabaseAdmin;

    if (!supabase) {
      console.error('❌ Supabase admin client not initialized');
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      );
    }

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

    // First check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    console.log('Profile completion API - Existing user check:', existingUser);
    console.log('Profile completion API - Check error:', checkError);

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user existence:', checkError);
      return NextResponse.json(
        { error: 'Database error while checking user' },
        { status: 500 }
      );
    }

    let updateResult;
    let updateError;

    if (!existingUser) {
      // User doesn't exist, create new user record
      console.log('Creating new user record for:', email);
      const createData = {
        email: email,
        ...updateData,
        created_at: new Date().toISOString()
      };

      const result = await supabase
        .from('users')
        .insert(createData)
        .select();

      updateResult = result.data;
      updateError = result.error;
    } else {
      // User exists, update existing record
      console.log('Updating existing user record for:', email);
      const result = await supabase
        .from('users')
        .update(updateData)
        .eq('email', email)
        .select();

      updateResult = result.data;
      updateError = result.error;
    }

    console.log('Profile completion API - Update result:', updateResult);
    console.log('Profile completion API - Update error:', updateError);

    if (updateError) {
      console.error('Error updating user profile:', updateError);
      return NextResponse.json(
        { error: `Failed to complete profile: ${updateError.message}` },
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
