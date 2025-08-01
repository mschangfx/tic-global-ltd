import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Achievement definitions
const ACHIEVEMENTS = {
  first_referral: {
    name: 'First Referral',
    description: 'Successfully referred your first user',
    reward: 50
  },
  bronze_rank: {
    name: 'Bronze Achiever',
    description: 'Reached Bronze rank with 5 active players',
    reward: 100
  },
  silver_rank: {
    name: 'Silver Leader',
    description: 'Reached Silver rank with team building success',
    reward: 250
  },
  gold_rank: {
    name: 'Gold Champion',
    description: 'Reached Gold rank with strong team performance',
    reward: 500
  },
  platinum_rank: {
    name: 'Platinum Elite',
    description: 'Reached Platinum rank with exceptional leadership',
    reward: 1000
  },
  diamond_rank: {
    name: 'Diamond Master',
    description: 'Reached the highest Diamond rank',
    reward: 2500
  },
  team_builder: {
    name: 'Team Builder',
    description: 'Built your first complete team group',
    reward: 200
  },
  volume_milestone_10k: {
    name: 'Volume Milestone - $10K',
    description: 'Generated $10,000 in team volume',
    reward: 300
  },
  volume_milestone_50k: {
    name: 'Volume Milestone - $50K',
    description: 'Generated $50,000 in team volume',
    reward: 750
  },
  volume_milestone_100k: {
    name: 'Volume Milestone - $100K',
    description: 'Generated $100,000 in team volume',
    reward: 1500
  }
};

export async function POST(request: NextRequest) {
  try {
    const { userEmail, achievementType, activePlayers, teamVolume, groupsFormed } = await request.json();

    if (!userEmail || !achievementType) {
      return NextResponse.json(
        { message: 'User email and achievement type are required' },
        { status: 400 }
      );
    }

    const achievement = ACHIEVEMENTS[achievementType as keyof typeof ACHIEVEMENTS];
    if (!achievement) {
      return NextResponse.json(
        { message: 'Invalid achievement type' },
        { status: 400 }
      );
    }

    // Check if user already has this achievement
    const { data: existingAchievement, error: checkError } = await supabaseAdmin
      .from('rank_achievements')
      .select('id')
      .eq('user_email', userEmail)
      .eq('achievement_type', achievementType)
      .single();

    if (existingAchievement) {
      return NextResponse.json({
        message: 'Achievement already awarded',
        alreadyAwarded: true
      });
    }

    // Award the achievement
    const { data: newAchievement, error: insertError } = await supabaseAdmin
      .from('rank_achievements')
      .insert([{
        user_email: userEmail,
        achievement_type: achievementType,
        achievement_name: achievement.name,
        achievement_description: achievement.description,
        reward_amount: achievement.reward
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error awarding achievement:', insertError);
      return NextResponse.json(
        { message: 'Failed to award achievement' },
        { status: 500 }
      );
    }

    // TODO: Add the reward to user's wallet/earnings
    // This would integrate with your wallet system

    return NextResponse.json({
      message: 'Achievement awarded successfully',
      achievement: newAchievement,
      reward: achievement.reward
    });

  } catch (error) {
    console.error('Error in award achievement API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail) {
      return NextResponse.json(
        { message: 'User email is required' },
        { status: 400 }
      );
    }

    // Get all achievements for the user
    const { data: achievements, error } = await supabaseAdmin
      .from('rank_achievements')
      .select('*')
      .eq('user_email', userEmail)
      .order('achieved_at', { ascending: false });

    if (error) {
      console.error('Error fetching achievements:', error);
      return NextResponse.json(
        { message: 'Failed to fetch achievements' },
        { status: 500 }
      );
    }

    // Calculate total rewards earned
    const totalRewards = achievements?.reduce((sum, achievement) => sum + (achievement.reward_amount || 0), 0) || 0;

    return NextResponse.json({
      achievements: achievements || [],
      totalRewards,
      achievementCount: achievements?.length || 0
    });

  } catch (error) {
    console.error('Error in get achievements API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to check and award achievements based on user progress
async function checkAndAwardAchievements(userEmail: string, activePlayers: number, teamVolume: number, groupsFormed: number) {
  const achievementsToCheck = [];

  // Check referral achievements
  if (activePlayers >= 1) {
    achievementsToCheck.push('first_referral');
  }

  // Check rank achievements
  if (activePlayers >= 5 && teamVolume >= 13800) {
    achievementsToCheck.push('bronze_rank');
  }
  if (activePlayers >= 5 && teamVolume >= 41400) {
    achievementsToCheck.push('silver_rank');
  }
  if (activePlayers >= 6 && teamVolume >= 69000) {
    achievementsToCheck.push('gold_rank');
  }
  if (activePlayers >= 8 && teamVolume >= 110400) {
    achievementsToCheck.push('platinum_rank');
  }
  if (activePlayers >= 12 && teamVolume >= 165600) {
    achievementsToCheck.push('diamond_rank');
  }

  // Check team building achievements
  if (groupsFormed >= 1) {
    achievementsToCheck.push('team_builder');
  }

  // Check volume milestones
  if (teamVolume >= 10000) {
    achievementsToCheck.push('volume_milestone_10k');
  }
  if (teamVolume >= 50000) {
    achievementsToCheck.push('volume_milestone_50k');
  }
  if (teamVolume >= 100000) {
    achievementsToCheck.push('volume_milestone_100k');
  }

  // Award each achievement
  const awardedAchievements = [];
  for (const achievementType of achievementsToCheck) {
    try {
      const response = await fetch('/api/ranking/award-achievement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          achievementType,
          activePlayers,
          teamVolume,
          groupsFormed
        })
      });

      const result = await response.json();
      if (response.ok && !result.alreadyAwarded) {
        awardedAchievements.push(result.achievement);
      }
    } catch (error) {
      console.error(`Error awarding achievement ${achievementType}:`, error);
    }
  }

  return awardedAchievements;
}
