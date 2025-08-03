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

    // First, let's see what's currently in the database for this user
    const { data: currentData, error: fetchError } = await supabase
      .from('user_referral_codes')
      .select('*')
      .eq('user_email', userEmail)
      .single();

    if (fetchError) {
      console.error('Error fetching current data:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch current referral data',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!currentData) {
      return NextResponse.json({
        success: false,
        error: 'No referral data found for user'
      }, { status: 404 });
    }

    // Check if the current link has the old domain
    const currentLink = currentData.referral_link;
    if (!currentLink || !currentLink.includes('ticglobal.com')) {
      return NextResponse.json({
        success: true,
        message: 'Referral link already has correct domain',
        current_link: currentLink
      });
    }

    // Update the link to use the correct domain
    const newLink = currentLink.replace('ticglobal.com', 'ticgloballtd.com');

    const { data: updatedData, error: updateError } = await supabase
      .from('user_referral_codes')
      .update({
        referral_link: newLink,
        updated_at: new Date().toISOString()
      })
      .eq('user_email', userEmail)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating referral link:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update referral link',
        details: updateError.message
      }, { status: 500 });
    }

    // Also check and update user_profiles table if it exists
    const { data: profileData, error: profileFetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', userEmail)
      .single();

    let profileUpdated = false;
    if (profileData && profileData.referral_link && profileData.referral_link.includes('ticglobal.com')) {
      const newProfileLink = profileData.referral_link.replace('ticglobal.com', 'ticgloballtd.com');
      
      const { error: profileUpdateError } = await supabase
        .from('user_profiles')
        .update({
          referral_link: newProfileLink,
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);

      if (!profileUpdateError) {
        profileUpdated = true;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Referral link updated successfully',
      user_email: userEmail,
      old_link: currentLink,
      new_link: newLink,
      profile_updated: profileUpdated,
      updated_data: updatedData
    });

  } catch (error) {
    console.error('Error fixing referral link:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
