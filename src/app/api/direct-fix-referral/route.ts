import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user email from session
    const session = await getServerSession(authOptions as any);
    const userEmail = (session as any)?.user?.email;

    if (!userEmail) {
      return NextResponse.json(
        { message: 'User not authenticated' },
        { status: 401 }
      );
    }

    const supabase = createClient();

    // Try multiple approaches to fix the referral link
    const results = {
      user_referral_codes: null as any,
      user_profiles: null as any,
      errors: [] as string[]
    };

    // Approach 1: Update user_referral_codes table
    try {
      const { data: existingCode, error: fetchError } = await supabase
        .from('user_referral_codes')
        .select('*')
        .eq('user_email', userEmail)
        .single();

      if (existingCode) {
        // Update existing record
        const { data: updatedCode, error: updateError } = await supabase
          .from('user_referral_codes')
          .update({
            referral_link: 'https://ticgloballtd.com/join?ref=TICAEQRB2',
            updated_at: new Date().toISOString()
          })
          .eq('user_email', userEmail)
          .select()
          .single();

        if (updateError) {
          results.errors.push(`Update user_referral_codes error: ${updateError.message}`);
        } else {
          results.user_referral_codes = { action: 'updated', data: updatedCode };
        }
      } else if (fetchError && fetchError.code === 'PGRST116') {
        // Create new record
        const { data: newCode, error: insertError } = await supabase
          .from('user_referral_codes')
          .insert({
            user_email: userEmail,
            referral_code: 'TICAEQRB2',
            referral_link: 'https://ticgloballtd.com/join?ref=TICAEQRB2',
            total_referrals: 0,
            total_earnings: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          results.errors.push(`Insert user_referral_codes error: ${insertError.message}`);
        } else {
          results.user_referral_codes = { action: 'created', data: newCode };
        }
      } else {
        results.errors.push(`Fetch user_referral_codes error: ${fetchError?.message}`);
      }
    } catch (error) {
      results.errors.push(`user_referral_codes exception: ${error instanceof Error ? (error as Error).message : 'Unknown error'}`);
    }

    // Approach 2: Update user_profiles table
    try {
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', userEmail)
        .single();

      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: profileUpdateError } = await supabase
          .from('user_profiles')
          .update({
            referral_code: 'TICAEQRB2',
            referral_link: 'https://ticgloballtd.com/join?ref=TICAEQRB2',
            updated_at: new Date().toISOString()
          })
          .eq('email', userEmail)
          .select()
          .single();

        if (profileUpdateError) {
          results.errors.push(`Update user_profiles error: ${profileUpdateError.message}`);
        } else {
          results.user_profiles = { action: 'updated', data: updatedProfile };
        }
      } else if (profileFetchError && profileFetchError.code === 'PGRST116') {
        // Create new profile
        const { data: newProfile, error: profileInsertError } = await supabase
          .from('user_profiles')
          .insert({
            email: userEmail,
            referral_code: 'TICAEQRB2',
            referral_link: 'https://ticgloballtd.com/join?ref=TICAEQRB2',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (profileInsertError) {
          results.errors.push(`Insert user_profiles error: ${profileInsertError.message}`);
        } else {
          results.user_profiles = { action: 'created', data: newProfile };
        }
      } else {
        results.errors.push(`Fetch user_profiles error: ${profileFetchError?.message}`);
      }
    } catch (error) {
      results.errors.push(`user_profiles exception: ${error instanceof Error ? (error as Error).message : 'Unknown error'}`);
    }

    // Determine success
    const hasSuccess = results.user_referral_codes || results.user_profiles;
    const hasErrors = results.errors.length > 0;

    return NextResponse.json({
      success: hasSuccess,
      message: hasSuccess ? 'Referral link updated successfully' : 'Failed to update referral link',
      user_email: userEmail,
      results: results,
      new_link: 'https://ticgloballtd.com/join?ref=TICAEQRB2'
    });

  } catch (error) {
    console.error('Error in direct fix referral:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? (error as Error).message : 'Unknown error'
    }, { status: 500 });
  }
}
