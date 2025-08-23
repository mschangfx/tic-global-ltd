import { supabaseAdmin } from '@/lib/supabase/admin';

export interface ReferralCodeResult {
  success: boolean;
  code?: string;
  link?: string;
  message: string;
}

export class ReferralCodeGenerator {
  private static instance: ReferralCodeGenerator;
  private readonly maxAttempts = 10;
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://ticgloballtd.com';
  }

  public static getInstance(): ReferralCodeGenerator {
    if (!ReferralCodeGenerator.instance) {
      ReferralCodeGenerator.instance = new ReferralCodeGenerator();
    }
    return ReferralCodeGenerator.instance;
  }

  /**
   * Generate a unique referral code for a user
   */
  private generateCode(userEmail: string): string {
    const username = userEmail.split('@')[0].toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Create code: first 3 chars of username + random suffix + timestamp
    return `${username.substring(0, 3)}${randomSuffix}${timestamp}`;
  }

  /**
   * Check if a referral code already exists in the database
   */
  private async codeExists(code: string): Promise<boolean> {
    try {
      // Check in user_referral_codes table
      const { data: referralCodeData } = await supabaseAdmin
        .from('user_referral_codes')
        .select('referral_code')
        .eq('referral_code', code)
        .single();

      if (referralCodeData) return true;

      // Check in users table as well
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('referral_code')
        .eq('referral_code', code)
        .single();

      return !!userData;
    } catch (error) {
      // If error is "no rows returned", code doesn't exist
      return false;
    }
  }

  /**
   * Generate a unique referral code with collision detection
   */
  public async generateUniqueCode(userEmail: string): Promise<string> {
    let attempts = 0;

    while (attempts < this.maxAttempts) {
      const code = this.generateCode(userEmail);
      const exists = await this.codeExists(code);

      if (!exists) {
        return code;
      }

      attempts++;
      console.log(`🔄 Referral code collision detected (${code}), retrying... (${attempts}/${this.maxAttempts})`);
    }

    throw new Error(`Failed to generate unique referral code after ${this.maxAttempts} attempts`);
  }

  /**
   * Create complete referral setup for a user
   */
  public async createUserReferralSetup(userEmail: string): Promise<ReferralCodeResult> {
    try {
      console.log('🎯 Creating referral setup for:', userEmail);

      // Check if user already has a referral code
      const { data: existingCode } = await supabaseAdmin
        .from('user_referral_codes')
        .select('referral_code, referral_link')
        .eq('user_email', userEmail)
        .single();

      if (existingCode) {
        console.log('✅ User already has referral code:', existingCode.referral_code);
        return {
          success: true,
          code: existingCode.referral_code,
          link: existingCode.referral_link,
          message: 'Referral code already exists'
        };
      }

      // Generate unique referral code
      const referralCode = await this.generateUniqueCode(userEmail);
      const referralLink = `${this.baseUrl}/join?ref=${referralCode}`;

      console.log('🔗 Generated referral code:', referralCode);

      // Update user record with referral code
      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update({
          referral_code: referralCode,
          updated_at: new Date().toISOString()
        })
        .eq('email', userEmail);

      if (userUpdateError) {
        console.error('❌ Error updating user with referral code:', userUpdateError);
        throw userUpdateError;
      }

      // Create referral code entry
      const { error: referralCodeError } = await supabaseAdmin
        .from('user_referral_codes')
        .insert({
          user_email: userEmail,
          referral_code: referralCode,
          referral_link: referralLink,
          total_referrals: 0,
          total_earnings: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (referralCodeError) {
        console.error('❌ Error creating referral code entry:', referralCodeError);
        throw referralCodeError;
      }

      console.log('✅ Referral setup completed successfully for:', userEmail);

      return {
        success: true,
        code: referralCode,
        link: referralLink,
        message: 'Referral code created successfully'
      };

    } catch (error) {
      console.error('❌ Error creating referral setup:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create referral setup'
      };
    }
  }

  /**
   * Get user's referral data
   */
  public async getUserReferralData(userEmail: string): Promise<ReferralCodeResult> {
    try {
      const { data: referralData } = await supabaseAdmin
        .from('user_referral_codes')
        .select('referral_code, referral_link, total_referrals, total_earnings')
        .eq('user_email', userEmail)
        .single();

      if (!referralData) {
        return {
          success: false,
          message: 'No referral data found for user'
        };
      }

      return {
        success: true,
        code: referralData.referral_code,
        link: referralData.referral_link,
        message: 'Referral data retrieved successfully'
      };

    } catch (error) {
      console.error('❌ Error getting user referral data:', error);
      return {
        success: false,
        message: 'Failed to retrieve referral data'
      };
    }
  }

  /**
   * Ensure user has referral code (create if missing)
   */
  public async ensureUserHasReferralCode(userEmail: string): Promise<ReferralCodeResult> {
    const existingData = await this.getUserReferralData(userEmail);
    
    if (existingData.success) {
      return existingData;
    }

    // Create new referral setup if none exists
    return await this.createUserReferralSetup(userEmail);
  }
}

// Export singleton instance
export const referralCodeGenerator = ReferralCodeGenerator.getInstance();
