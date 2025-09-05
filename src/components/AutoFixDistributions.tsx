'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAutoFixDistributions } from '@/hooks/useAutoFixDistributions';

const AutoFixDistributions: React.FC = () => {
  const { data: session } = useSession();
  const { isChecking, isFixing, status, fixResult } = useAutoFixDistributions();

  // Silent background operation - no UI needed
  useEffect(() => {
    if (session?.user?.email && status?.needs_auto_fix) {
      console.log('🔧 Auto-fix running in background for TIC distributions');
    }
  }, [session, status]);

  // This component renders nothing - it just runs the auto-fix in the background
  return null;
};

export default AutoFixDistributions;
