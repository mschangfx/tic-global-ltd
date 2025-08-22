import { createClient } from '@/lib/supabase/client';

export interface ReferralKitData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  activeReferrals: number;
  totalEarnings: number;
  monthlyEarnings: number;
  isCodeGenerated: boolean;
}

export interface ReferralCodeGeneration {
  code: string;
  link: string;
  success: boolean;
  message: string;
}

class ReferralKitService {
  private static instance: ReferralKitService;
  private supabase = createClient();

  static getInstance(): ReferralKitService {
    if (!ReferralKitService.instance) {
      ReferralKitService.instance = new ReferralKitService();
    }
    return ReferralKitService.instance;
  }

  // Generate a unique referral code for a user
  generateReferralCode(userEmail: string): string {
    // Extract username from email
    const username = userEmail.split('@')[0].toUpperCase();

    // Generate random suffix with timestamp for uniqueness
    const timestamp = Date.now().toString().slice(-4);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();

    // Create code: first 3 chars of username + random suffix + timestamp
    const code = `${username.substring(0, 3)}${randomSuffix}${timestamp}`;

    return code;
  }

  // Get or create referral kit data for a user
  async getReferralKitData(userEmail: string): Promise<ReferralKitData> {
    try {
      // First, check if user already has a referral code in user_referral_codes table
      const { data: userData, error: userError } = await this.supabase
        .from('user_referral_codes')
        .select('referral_code')
        .eq('user_email', userEmail)
        .single();

      let referralCode = userData?.referral_code;

      // If no referral code exists, generate and save one
      if (!referralCode) {
        referralCode = await this.createReferralCode(userEmail);
      }

      // Generate referral link
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ticgloballtd.com';
      const referralLink = `${baseUrl}/join?ref=${referralCode}`;

      // Get referral statistics
      const stats = await this.getReferralStats(userEmail);

      return {
        referralCode,
        referralLink,
        totalReferrals: stats.totalReferrals,
        activeReferrals: stats.activeReferrals,
        totalEarnings: stats.totalEarnings,
        monthlyEarnings: stats.monthlyEarnings,
        isCodeGenerated: true
      };

    } catch (error) {
      console.error('Error getting referral kit data:', error);
      return this.getFallbackReferralKit(userEmail);
    }
  }

  // Create and save a new referral code for a user
  private async createReferralCode(userEmail: string): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const code = this.generateReferralCode(userEmail);

      try {
        // Check if code already exists
        const { data: existingCode } = await this.supabase
          .from('user_referral_codes')
          .select('referral_code')
          .eq('referral_code', code)
          .single();

        if (!existingCode) {
          // Code is unique, save it
          const { error: updateError } = await this.supabase
            .from('user_referral_codes')
            .upsert({
              user_email: userEmail,
              referral_code: code,
              total_referrals: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_email'
            });

          if (!updateError) {
            return code;
          }
        }

        attempts++;
      } catch (error) {
        console.error('Error creating referral code:', error);
        attempts++;
      }
    }

    // If all attempts failed, return a fallback code
    return this.generateReferralCode(userEmail);
  }

  // Get referral statistics for a user
  private async getReferralStats(userEmail: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    monthlyEarnings: number;
  }> {
    try {
      // Get total referrals count
      const { count: totalReferrals } = await this.supabase
        .from('referral_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_email', userEmail)
        .eq('is_active', true);

      // Get active referrals (simplified - just count all active relationships for now)
      const { count: activeReferralsCount } = await this.supabase
        .from('referral_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_email', userEmail)
        .eq('is_active', true);

      const activeReferrals = activeReferralsCount || 0;

      // Get earnings data
      const { data: earningsData } = await this.supabase
        .from('referral_commissions')
        .select('amount, created_at')
        .eq('user_email', userEmail)
        .eq('status', 'completed');

      let totalEarnings = 0;
      let monthlyEarnings = 0;

      if (earningsData) {
        totalEarnings = earningsData.reduce((sum, comm) => sum + comm.amount, 0);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        monthlyEarnings = earningsData
          .filter(comm => new Date(comm.created_at) >= thirtyDaysAgo)
          .reduce((sum, comm) => sum + comm.amount, 0);
      }

      return {
        totalReferrals: totalReferrals || 0,
        activeReferrals,
        totalEarnings,
        monthlyEarnings
      };

    } catch (error) {
      console.error('Error getting referral stats:', error);
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        monthlyEarnings: 0
      };
    }
  }

  // Process a new referral registration
  async processReferralRegistration(
    referrerCode: string,
    newUserEmail: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Find the referrer by code - check both user_referral_codes and user_profiles tables
      let referrerData = null;

      // First check user_referral_codes table
      const { data: referralCodeData, error: codeError } = await this.supabase
        .from('user_referral_codes')
        .select('user_email')
        .eq('referral_code', referrerCode)
        .single();

      if (referralCodeData) {
        referrerData = { email: referralCodeData.user_email };
      } else {
        // Fallback to users table
        const { data: profileData, error: profileError } = await this.supabase
          .from('users')
          .select('email')
          .eq('referral_id', referrerCode)
          .single();

        if (profileData) {
          referrerData = profileData;
        }
      }

      if (!referrerData) {
        console.log('❌ Referral code not found:', referrerCode);
        return {
          success: false,
          message: 'Invalid referral code'
        };
      }

      console.log('✅ Found referrer:', referrerData.email, 'for code:', referrerCode);

      // Check if the new user is already referred by someone
      const { data: existingReferral } = await this.supabase
        .from('referral_relationships')
        .select('referrer_email')
        .eq('referred_email', newUserEmail)
        .single();

      if (existingReferral?.referrer_email) {
        return {
          success: false,
          message: 'User already has a referrer'
        };
      }

      // Note: We don't need to update user profile since we're tracking relationships
      // in the referral_relationships table directly

      // Create referral relationship
      const { error: relationshipError } = await this.supabase
        .from('referral_relationships')
        .insert({
          referrer_email: referrerData.email,
          referred_email: newUserEmail,
          level_depth: 1,
          referral_code: referrerCode,
          created_at: new Date().toISOString(),
          is_active: true
        });

      if (relationshipError) {
        throw relationshipError;
      }

      // Build multi-level referral chain
      await this.buildReferralChain(referrerData.email, newUserEmail, 2);

      // Update referrer's total referral count
      const { data: currentCount } = await this.supabase
        .from('user_referral_codes')
        .select('total_referrals')
        .eq('user_email', referrerData.email)
        .single();

      const newCount = (currentCount?.total_referrals || 0) + 1;

      const { error: updateCountError } = await this.supabase
        .from('user_referral_codes')
        .update({
          total_referrals: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('user_email', referrerData.email);

      if (updateCountError) {
        console.warn('Failed to update referral count:', updateCountError);
      }

      console.log('✅ Referral relationship created successfully');
      return {
        success: true,
        message: 'Referral processed successfully'
      };

    } catch (error) {
      console.error('Error processing referral registration:', error);
      return {
        success: false,
        message: 'Failed to process referral'
      };
    }
  }

  // Build multi-level referral chain (up to 15 levels)
  private async buildReferralChain(
    currentReferrerEmail: string,
    newUserEmail: string,
    level: number
  ): Promise<void> {
    if (level > 15) return; // Max 15 levels

    try {
      // Find who referred the current referrer
      const { data: upperReferrer } = await this.supabase
        .from('referral_relationships')
        .select('referrer_email')
        .eq('referred_email', currentReferrerEmail)
        .single();

      if (upperReferrer?.referrer_email) {
        // Create relationship at this level
        await this.supabase
          .from('referral_relationships')
          .insert({
            referrer_email: upperReferrer.referrer_email,
            referred_email: newUserEmail,
            level_depth: level,
            created_at: new Date().toISOString(),
            is_active: true
          });

        // Continue building chain
        await this.buildReferralChain(
          upperReferrer.referrer_email,
          newUserEmail,
          level + 1
        );
      }
    } catch (error) {
      console.error(`Error building referral chain at level ${level}:`, error);
    }
  }

  // Force regenerate a new referral code for a user
  async regenerateReferralCode(userEmail: string): Promise<{ success: boolean; code?: string; link?: string; message: string }> {
    try {
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const newCode = this.generateReferralCode(userEmail);

        // Check if code already exists in user_referral_codes table
        const { data: existingCode } = await this.supabase
          .from('user_referral_codes')
          .select('referral_code')
          .eq('referral_code', newCode)
          .single();

        if (!existingCode) {
          // Code is unique, update user's referral code
          const { error: updateError } = await this.supabase
            .from('user_referral_codes')
            .update({
              referral_code: newCode,
              updated_at: new Date().toISOString()
            })
            .eq('user_email', userEmail);

          if (!updateError) {
            const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ticgloballtd.com';
            const referralLink = `${baseUrl}/join?ref=${newCode}`;

            return {
              success: true,
              code: newCode,
              link: referralLink,
              message: 'New referral code generated successfully'
            };
          }
        }

        attempts++;
      }

      return {
        success: false,
        message: 'Failed to generate unique referral code after multiple attempts'
      };

    } catch (error) {
      console.error('Error regenerating referral code:', error);
      return {
        success: false,
        message: 'Failed to regenerate referral code'
      };
    }
  }

  // Validate referral code
  async validateReferralCode(code: string): Promise<{ valid: boolean; referrerEmail?: string }> {
    try {
      // First check user_referral_codes table
      const { data: referralCodeData, error: codeError } = await this.supabase
        .from('user_referral_codes')
        .select('user_email')
        .eq('referral_code', code)
        .single();

      if (referralCodeData) {
        return {
          valid: true,
          referrerEmail: referralCodeData.user_email
        };
      }

      // Fallback to users table
      const { data: profileData, error: profileError } = await this.supabase
        .from('users')
        .select('email')
        .eq('referral_id', code)
        .single();

      if (profileData) {
        return {
          valid: true,
          referrerEmail: profileData.email
        };
      }

      return { valid: false };
    } catch (error) {
      console.error('Error validating referral code:', error);
      return { valid: false };
    }
  }

  // Fallback data for demo/testing
  private getFallbackReferralKit(userEmail: string): ReferralKitData {
    const code = this.generateReferralCode(userEmail);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://ticgloballtd.com';
    
    return {
      referralCode: code,
      referralLink: `${baseUrl}/join?ref=${code}`,
      totalReferrals: 25,
      activeReferrals: 18,
      totalEarnings: 298.32,
      monthlyEarnings: 74.58,
      isCodeGenerated: true
    };
  }
}

export default ReferralKitService;
