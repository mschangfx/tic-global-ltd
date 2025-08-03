import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail) {
      return NextResponse.json({
        success: false,
        error: 'User email is required'
      }, { status: 400 });
    }

    const supabase = createClient();

    // Force update the specific user's referral link
    const { data: updatedData, error: updateError } = await supabase
      .from('user_referral_codes')
      .update({
        referral_link: `https://ticgloballtd.com/join?ref=TICAEQRB2`,
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

    // Also update user_profiles table if it exists
    const { error: profileUpdateError } = await supabase
      .from('user_profiles')
      .update({
        referral_link: `https://ticgloballtd.com/join?ref=TICAEQRB2`,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail);

    return NextResponse.json({
      success: true,
      message: 'Referral link force updated successfully',
      user_email: userEmail,
      new_link: `https://ticgloballtd.com/join?ref=TICAEQRB2`,
      updated_data: updatedData,
      profile_updated: !profileUpdateError
    });

  } catch (error) {
    console.error('Error force fixing referral link:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
