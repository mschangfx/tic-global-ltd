import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get all referral codes with the old domain
    const { data: referralCodes, error: fetchError } = await supabase
      .from('user_referral_codes')
      .select('*')
      .like('referral_link', '%ticglobal.com%');

    if (fetchError) {
      console.error('Error fetching referral codes:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch referral codes',
        details: fetchError.message
      }, { status: 500 });
    }

    if (!referralCodes || referralCodes.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No referral codes found with old domain',
        updated: 0
      });
    }

    console.log(`Found ${referralCodes.length} referral codes to update`);

    // Update each referral code
    const updates = [];
    for (const code of referralCodes) {
      const newLink = code.referral_link.replace('ticglobal.com', 'ticgloballtd.com');
      
      const { error: updateError } = await supabase
        .from('user_referral_codes')
        .update({
          referral_link: newLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', code.id);

      if (updateError) {
        console.error(`Error updating referral code ${code.id}:`, updateError);
        updates.push({
          id: code.id,
          user_email: code.user_email,
          success: false,
          error: updateError.message
        });
      } else {
        console.log(`Updated referral code for ${code.user_email}: ${code.referral_link} -> ${newLink}`);
        updates.push({
          id: code.id,
          user_email: code.user_email,
          success: true,
          old_link: code.referral_link,
          new_link: newLink
        });
      }
    }

    // Also update user_profiles table if it has referral_link column
    const { data: profiles, error: profilesFetchError } = await supabase
      .from('user_profiles')
      .select('*')
      .like('referral_link', '%ticglobal.com%');

    let profileUpdates = [];
    if (profiles && profiles.length > 0) {
      console.log(`Found ${profiles.length} user profiles to update`);
      
      for (const profile of profiles) {
        const newLink = profile.referral_link.replace('ticglobal.com', 'ticgloballtd.com');
        
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            referral_link: newLink,
            updated_at: new Date().toISOString()
          })
          .eq('id', profile.id);

        if (updateError) {
          console.error(`Error updating profile ${profile.id}:`, updateError);
          profileUpdates.push({
            id: profile.id,
            email: profile.email,
            success: false,
            error: updateError.message
          });
        } else {
          console.log(`Updated profile for ${profile.email}: ${profile.referral_link} -> ${newLink}`);
          profileUpdates.push({
            id: profile.id,
            email: profile.email,
            success: true,
            old_link: profile.referral_link,
            new_link: newLink
          });
        }
      }
    }

    const successfulUpdates = updates.filter(u => u.success).length;
    const successfulProfileUpdates = profileUpdates.filter(u => u.success).length;

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${successfulUpdates} referral codes and ${successfulProfileUpdates} user profiles`,
      referral_codes_updated: successfulUpdates,
      profiles_updated: successfulProfileUpdates,
      total_found: referralCodes.length,
      updates: updates,
      profile_updates: profileUpdates
    });

  } catch (error) {
    console.error('Error fixing referral domains:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
