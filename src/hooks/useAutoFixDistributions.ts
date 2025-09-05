'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface AutoFixStatus {
  success: boolean;
  date: string;
  active_subscriptions: number;
  todays_distributions: number;
  unique_active_users: number;
  unique_users_with_todays_distribution: number;
  users_missing_todays_distribution: number;
  needs_auto_fix: boolean;
  recommendation: string;
}

interface AutoFixResult {
  success: boolean;
  message: string;
  date: string;
  distributions_created: number;
  users_needing_distribution: number;
}

export const useAutoFixDistributions = () => {
  const { data: session } = useSession();
  const [isChecking, setIsChecking] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [status, setStatus] = useState<AutoFixStatus | null>(null);
  const [fixResult, setFixResult] = useState<AutoFixResult | null>(null);

  const checkAutoFixStatus = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      console.log('🔍 Checking if auto-fix is needed...');
      
      const response = await fetch('/api/auto-fix/daily-distributions', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Auto-fix status:', data);
      
      setStatus(data);
      setLastChecked(new Date().toISOString());
      
      // If auto-fix is needed, run it automatically
      if (data.success && data.needs_auto_fix && data.users_missing_todays_distribution > 0) {
        console.log(`🔧 Auto-fix needed for ${data.users_missing_todays_distribution} users`);
        await runAutoFix();
      }
      
    } catch (error) {
      console.error('❌ Error checking auto-fix status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const runAutoFix = async () => {
    if (isFixing) return;
    
    setIsFixing(true);
    try {
      console.log('🚀 Running auto-fix for daily distributions...');
      
      const response = await fetch('/api/auto-fix/daily-distributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Auto-fix result:', data);
      
      setFixResult(data);
      
      // Refresh status after fix
      setTimeout(() => {
        checkAutoFixStatus();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Error running auto-fix:', error);
    } finally {
      setIsFixing(false);
    }
  };

  // Auto-check on mount and when user session changes
  useEffect(() => {
    if (session?.user?.email) {
      const today = new Date().toISOString().split('T')[0];
      
      // Only check once per day per session
      if (!lastChecked || !lastChecked.startsWith(today)) {
        console.log('🔄 Auto-fix: Checking distributions for today...');
        checkAutoFixStatus();
      }
    }
  }, [session?.user?.email]);

  // Auto-check every 30 minutes to catch new users
  useEffect(() => {
    if (!session?.user?.email) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-fix: Periodic check...');
      checkAutoFixStatus();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [session?.user?.email]);

  return {
    isChecking,
    isFixing,
    status,
    fixResult,
    lastChecked,
    checkAutoFixStatus,
    runAutoFix
  };
};
