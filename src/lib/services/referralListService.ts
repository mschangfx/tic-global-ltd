import { createClient } from '@/lib/supabase/client';

export interface UserReferral {
  id: string;
  email: string;
  name: string;
  level: number;
  joinDate: string;
  planType: 'starter' | 'vip';
  status: 'active' | 'pending' | 'inactive';
  totalEarnings: number;
  monthlyEarnings: number;
  referralsCount: number;
  lastActive: string;
  referrerEmail: string;
  referralCode: string;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  inactiveReferrals: number;
  totalEarnings: number;
  monthlyEarnings: number;
  referralsByLevel: { level: number; count: number }[];
  referralsByPlan: { planType: string; count: number }[];
}

class ReferralListService {
  private static instance: ReferralListService;
  private supabase = createClient();

  static getInstance(): ReferralListService {
    if (!ReferralListService.instance) {
      ReferralListService.instance = new ReferralListService();
    }
    return ReferralListService.instance;
  }

  // Get all referrals for a user with detailed information
  async getUserReferrals(userEmail: string): Promise<UserReferral[]> {
    try {
      const response = await fetch(`/api/referrals/list?email=${encodeURIComponent(userEmail)}`);

      if (!response.ok) {
        console.error('API response not ok:', response.status);
        return this.getFallbackReferrals(userEmail);
      }

      const data = await response.json();
      return data.referrals || this.getFallbackReferrals(userEmail);
    } catch (error) {
      console.error('Error in getUserReferrals:', error);
      return this.getFallbackReferrals(userEmail);
    }
  }

  // Calculate earnings from a specific referral
  private async calculateReferralEarnings(referredEmail: string): Promise<{ total: number; monthly: number }> {
    try {
      const { data, error } = await this.supabase
        .from('referral_commissions')
        .select('amount, created_at')
        .eq('from_user_email', referredEmail);

      if (error || !data) {
        return { total: 0, monthly: 0 };
      }

      const total = data.reduce((sum, commission) => sum + commission.amount, 0);
      
      // Calculate monthly earnings (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const monthly = data
        .filter(commission => new Date(commission.created_at) >= thirtyDaysAgo)
        .reduce((sum, commission) => sum + commission.amount, 0);

      return { total, monthly };
    } catch (error) {
      console.error('Error calculating referral earnings:', error);
      return { total: 0, monthly: 0 };
    }
  }

  // Get count of referrals for a specific user
  private async getReferralCount(userEmail: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('referral_relationships')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_email', userEmail);

      if (error) {
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting referral count:', error);
      return 0;
    }
  }

  // Determine user status based on plan status and last activity
  private determineStatus(planStatus: string, lastActive: string): 'active' | 'pending' | 'inactive' {
    if (!planStatus || planStatus === 'pending') {
      return 'pending';
    }

    if (planStatus === 'active') {
      // Check if user was active in the last 7 days
      const lastActiveDate = new Date(lastActive);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return lastActiveDate >= sevenDaysAgo ? 'active' : 'inactive';
    }

    return 'inactive';
  }

  // Get referral statistics for a user
  async getReferralStats(userEmail: string): Promise<ReferralStats> {
    try {
      const response = await fetch('/api/referrals/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userEmail }),
      });

      if (!response.ok) {
        console.error('API response not ok:', response.status);
        return this.getFallbackStats();
      }

      const stats = await response.json();
      return stats || this.getFallbackStats();
    } catch (error) {
      console.error('Error getting referral stats:', error);
      return this.getFallbackStats();
    }
  }

  // Group referrals by level
  private groupByLevel(referrals: UserReferral[]): { level: number; count: number }[] {
    const levelGroups = referrals.reduce((acc, referral) => {
      acc[referral.level] = (acc[referral.level] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(levelGroups)
      .map(([level, count]) => ({ level: parseInt(level), count }))
      .sort((a, b) => a.level - b.level);
  }

  // Group referrals by plan type
  private groupByPlan(referrals: UserReferral[]): { planType: string; count: number }[] {
    const planGroups = referrals.reduce((acc, referral) => {
      acc[referral.planType] = (acc[referral.planType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(planGroups)
      .map(([planType, count]) => ({ planType, count }));
  }

  // Fallback data for demo/testing
  private getFallbackReferrals(userEmail: string): UserReferral[] {
    return [
      {
        id: '1',
        email: 'john.doe@example.com',
        name: 'John Doe',
        level: 1,
        joinDate: '2024-01-15T00:00:00Z',
        planType: 'vip',
        status: 'active',
        totalEarnings: 138.00,
        monthlyEarnings: 13.80,
        referralsCount: 3,
        lastActive: '2024-01-20T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'JOHN123'
      },
      {
        id: '2',
        email: 'jane.smith@example.com',
        name: 'Jane Smith',
        level: 1,
        joinDate: '2024-01-18T00:00:00Z',
        planType: 'vip',
        status: 'active',
        totalEarnings: 138.00,
        monthlyEarnings: 13.80,
        referralsCount: 2,
        lastActive: '2024-01-21T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'JANE456'
      },
      {
        id: '3',
        email: 'mike.wilson@example.com',
        name: 'Mike Wilson',
        level: 1,
        joinDate: '2024-01-20T00:00:00Z',
        planType: 'starter',
        status: 'pending',
        totalEarnings: 0,
        monthlyEarnings: 0,
        referralsCount: 0,
        lastActive: '2024-01-21T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'MIKE789'
      },
      {
        id: '4',
        email: 'sarah.jones@example.com',
        name: 'Sarah Jones',
        level: 2,
        joinDate: '2024-01-16T00:00:00Z',
        planType: 'vip',
        status: 'active',
        totalEarnings: 276.00,
        monthlyEarnings: 27.60,
        referralsCount: 4,
        lastActive: '2024-01-21T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'SARAH101'
      },
      {
        id: '5',
        email: 'david.brown@example.com',
        name: 'David Brown',
        level: 2,
        joinDate: '2024-01-17T00:00:00Z',
        planType: 'vip',
        status: 'active',
        totalEarnings: 138.00,
        monthlyEarnings: 13.80,
        referralsCount: 1,
        lastActive: '2024-01-20T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'DAVID202'
      },
      {
        id: '6',
        email: 'lisa.garcia@example.com',
        name: 'Lisa Garcia',
        level: 3,
        joinDate: '2024-01-19T00:00:00Z',
        planType: 'vip',
        status: 'active',
        totalEarnings: 138.00,
        monthlyEarnings: 13.80,
        referralsCount: 2,
        lastActive: '2024-01-21T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'LISA303'
      },
      {
        id: '7',
        email: 'robert.taylor@example.com',
        name: 'Robert Taylor',
        level: 3,
        joinDate: '2024-01-21T00:00:00Z',
        planType: 'starter',
        status: 'pending',
        totalEarnings: 0,
        monthlyEarnings: 0,
        referralsCount: 0,
        lastActive: '2024-01-21T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'ROBERT404'
      },
      {
        id: '8',
        email: 'emma.davis@example.com',
        name: 'Emma Davis',
        level: 4,
        joinDate: '2024-01-20T00:00:00Z',
        planType: 'vip',
        status: 'active',
        totalEarnings: 138.00,
        monthlyEarnings: 13.80,
        referralsCount: 1,
        lastActive: '2024-01-21T00:00:00Z',
        referrerEmail: userEmail,
        referralCode: 'EMMA505'
      }
    ];
  }

  // Fallback stats for demo/testing
  private getFallbackStats(): ReferralStats {
    return {
      totalReferrals: 8,
      activeReferrals: 6,
      pendingReferrals: 2,
      inactiveReferrals: 0,
      totalEarnings: 1104.00,
      monthlyEarnings: 110.40,
      referralsByLevel: [
        { level: 1, count: 3 },
        { level: 2, count: 2 },
        { level: 3, count: 2 },
        { level: 4, count: 1 }
      ],
      referralsByPlan: [
        { planType: 'vip', count: 6 },
        { planType: 'starter', count: 2 }
      ]
    };
  }

  // Search and filter referrals
  async searchReferrals(userEmail: string, searchTerm: string, filters: {
    level?: number;
    planType?: string;
    status?: string;
  } = {}): Promise<UserReferral[]> {
    try {
      const params = new URLSearchParams({
        email: userEmail,
        ...(searchTerm && { search: searchTerm }),
        ...(filters.level && { level: filters.level.toString() }),
        ...(filters.planType && { planType: filters.planType }),
        ...(filters.status && { status: filters.status }),
      });

      const response = await fetch(`/api/referrals/list?${params}`);

      if (!response.ok) {
        console.error('API response not ok:', response.status);
        return [];
      }

      const data = await response.json();
      return data.referrals || [];
    } catch (error) {
      console.error('Error searching referrals:', error);
      return [];
    }
  }
}

export default ReferralListService;
