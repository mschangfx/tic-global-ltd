import { createClient } from '@/lib/supabase/client';

export interface ReferralRelationship {
  id: string;
  referrer_email: string;
  referred_email: string;
  referral_code: string;
  level_depth: number;
  created_at: string;
  is_active: boolean;
}

export interface UserPlan {
  id: string;
  user_email: string;
  plan_type: 'starter' | 'vip';
  plan_count: number;
  plan_value: number;
  monthly_earnings: number;
  daily_earnings: number;
  purchase_date: string;
  is_active: boolean;
}

export interface ReferralCommission {
  id: string;
  earner_email: string;
  referral_email: string;
  commission_level: number;
  commission_rate: number;
  base_earnings: number;
  commission_amount: number;
  plan_type: string;
  calculation_date: string;
  created_at: string;
}

export interface UserRanking {
  id: string;
  user_email: string;
  total_referrals: number;
  direct_referrals: number;
  total_commission_earned: number;
  monthly_commission: number;
  daily_commission: number;
  max_level_reached: number;
  ranking_score: number;
  rank_position: number;
  last_updated: string;
}

export interface CommissionStructure {
  level: number;
  rate_percentage: number;
  plan_requirement: 'starter' | 'vip';
  daily_bonus: number;
  is_accessible: boolean;
}

class ReferralService {
  private static instance: ReferralService;
  private supabase = createClient();

  static getInstance(): ReferralService {
    if (!ReferralService.instance) {
      ReferralService.instance = new ReferralService();
    }
    return ReferralService.instance;
  }

  // Get commission structure based on user's plan
  async getCommissionStructure(userEmail: string): Promise<CommissionStructure[]> {
    try {
      // Get user's plan type
      const { data: userPlan } = await this.supabase
        .from('user_plans')
        .select('plan_type')
        .eq('user_email', userEmail)
        .eq('is_active', true)
        .single();

      const userPlanType = userPlan?.plan_type || 'starter';
      const maxLevels = userPlanType === 'vip' ? 15 : 1;

      // Get commission rates
      const { data: rates } = await this.supabase
        .from('commission_rates')
        .select('*')
        .eq('is_active', true)
        .order('level');

      const baseEarnings = 0.44; // $0.44 daily per $138 VIP plan

      return (rates || []).map(rate => ({
        level: rate.level,
        rate_percentage: rate.rate_percentage,
        plan_requirement: rate.plan_requirement,
        daily_bonus: baseEarnings * (rate.rate_percentage / 100),
        is_accessible: rate.level <= maxLevels && 
                      (userPlanType === 'vip' || rate.plan_requirement === 'starter')
      }));
    } catch (error) {
      console.error('Error getting commission structure:', error);
      return [];
    }
  }

  // Add a new referral relationship
  async addReferral(referrerEmail: string, referredEmail: string, referralCode: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .rpc('add_referral_relationship', {
          referrer_email_param: referrerEmail,
          referred_email_param: referredEmail,
          referral_code_param: referralCode
        });

      if (error) {
        console.error('Error adding referral:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addReferral:', error);
      return false;
    }
  }

  // Get user's referral tree
  async getUserReferralTree(userEmail: string, maxDepth: number = 15): Promise<ReferralRelationship[]> {
    try {
      const { data, error } = await this.supabase
        .from('referral_relationships')
        .select('*')
        .eq('referrer_email', userEmail)
        .eq('is_active', true)
        .lte('level_depth', maxDepth)
        .order('level_depth', { ascending: true });

      if (error) {
        console.error('Error getting referral tree:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserReferralTree:', error);
      return [];
    }
  }

  // Get user's commissions
  async getUserCommissions(userEmail: string, dateRange?: { from: string; to: string }): Promise<ReferralCommission[]> {
    try {
      let query = this.supabase
        .from('referral_commissions')
        .select('*')
        .eq('earner_email', userEmail)
        .order('created_at', { ascending: false });

      if (dateRange) {
        query = query
          .gte('calculation_date', dateRange.from)
          .lte('calculation_date', dateRange.to);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error getting user commissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserCommissions:', error);
      return [];
    }
  }

  // Get user ranking
  async getUserRanking(userEmail: string): Promise<UserRanking | null> {
    try {
      const { data, error } = await this.supabase
        .from('user_rankings')
        .select('*')
        .eq('user_email', userEmail)
        .single();

      if (error) {
        console.error('Error getting user ranking:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserRanking:', error);
      return null;
    }
  }

  // Get top rankings (leaderboard)
  async getTopRankings(limit: number = 50): Promise<UserRanking[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_rankings')
        .select('*')
        .order('rank_position', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error getting top rankings:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTopRankings:', error);
      return [];
    }
  }

  // Add or update user plan
  async updateUserPlan(
    userEmail: string, 
    planType: 'starter' | 'vip', 
    planCount: number = 1,
    planValue: number = 138
  ): Promise<boolean> {
    try {
      const monthlyEarnings = planValue * 0.10; // 10% monthly
      const dailyEarnings = monthlyEarnings / 30; // Daily earnings

      const { error } = await this.supabase
        .from('user_plans')
        .upsert({
          user_email: userEmail,
          plan_type: planType,
          plan_count: planCount,
          plan_value: planValue,
          monthly_earnings: monthlyEarnings,
          daily_earnings: dailyEarnings,
          is_active: true
        }, {
          onConflict: 'user_email'
        });

      if (error) {
        console.error('Error updating user plan:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateUserPlan:', error);
      return false;
    }
  }

  // Calculate daily commissions (admin function)
  async calculateDailyCommissions(): Promise<number> {
    try {
      const { data, error } = await this.supabase
        .rpc('calculate_daily_commissions');

      if (error) {
        console.error('Error calculating daily commissions:', error);
        return 0;
      }

      return data || 0;
    } catch (error) {
      console.error('Error in calculateDailyCommissions:', error);
      return 0;
    }
  }

  // Get commission summary for user
  async getCommissionSummary(userEmail: string): Promise<{
    today: number;
    thisMonth: number;
    total: number;
    byLevel: { level: number; amount: number; count: number }[];
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      // Get today's commissions
      const { data: todayData } = await this.supabase
        .from('referral_commissions')
        .select('commission_amount')
        .eq('earner_email', userEmail)
        .eq('calculation_date', today);

      // Get this month's commissions
      const { data: monthData } = await this.supabase
        .from('referral_commissions')
        .select('commission_amount')
        .eq('earner_email', userEmail)
        .gte('calculation_date', monthStart);

      // Get total commissions
      const { data: totalData } = await this.supabase
        .from('referral_commissions')
        .select('commission_amount')
        .eq('earner_email', userEmail);

      // Get commissions by level
      const { data: levelData } = await this.supabase
        .from('referral_commissions')
        .select('commission_level, commission_amount')
        .eq('earner_email', userEmail);

      const todayTotal = todayData?.reduce((sum, item) => sum + item.commission_amount, 0) || 0;
      const monthTotal = monthData?.reduce((sum, item) => sum + item.commission_amount, 0) || 0;
      const allTimeTotal = totalData?.reduce((sum, item) => sum + item.commission_amount, 0) || 0;

      // Group by level
      const byLevel = levelData?.reduce((acc, item) => {
        const existing = acc.find(x => x.level === item.commission_level);
        if (existing) {
          existing.amount += item.commission_amount;
          existing.count += 1;
        } else {
          acc.push({
            level: item.commission_level,
            amount: item.commission_amount,
            count: 1
          });
        }
        return acc;
      }, [] as { level: number; amount: number; count: number }[]) || [];

      return {
        today: todayTotal,
        thisMonth: monthTotal,
        total: allTimeTotal,
        byLevel: byLevel.sort((a, b) => a.level - b.level)
      };
    } catch (error) {
      console.error('Error getting commission summary:', error);
      return {
        today: 0,
        thisMonth: 0,
        total: 0,
        byLevel: []
      };
    }
  }

  // Generate unique referral code
  generateReferralCode(userEmail: string): string {
    const emailPrefix = userEmail.split('@')[0].toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${emailPrefix.substring(0, 4)}${randomSuffix}`;
  }

  // Get referral statistics
  async getReferralStats(userEmail: string): Promise<{
    directReferrals: number;
    totalReferrals: number;
    activeReferrals: number;
    referralsByLevel: { level: number; count: number }[];
  }> {
    try {
      const { data: allReferrals } = await this.supabase
        .from('referral_relationships')
        .select('level_depth, is_active')
        .eq('referrer_email', userEmail);

      const directReferrals = allReferrals?.filter(r => r.level_depth === 1).length || 0;
      const totalReferrals = allReferrals?.length || 0;
      const activeReferrals = allReferrals?.filter(r => r.is_active).length || 0;

      const referralsByLevel = allReferrals?.reduce((acc, item) => {
        const existing = acc.find(x => x.level === item.level_depth);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ level: item.level_depth, count: 1 });
        }
        return acc;
      }, [] as { level: number; count: number }[]) || [];

      return {
        directReferrals,
        totalReferrals,
        activeReferrals,
        referralsByLevel: referralsByLevel.sort((a, b) => a.level - b.level)
      };
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return {
        directReferrals: 0,
        totalReferrals: 0,
        activeReferrals: 0,
        referralsByLevel: []
      };
    }
  }
}

export default ReferralService;
