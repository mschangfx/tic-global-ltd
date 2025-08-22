'use client';

import React, { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { WalletService } from '@/lib/WalletService';

type WalletBalance = {
  total: number;
  tic: number;
  gic: number;
  staking: number;
  partner_wallet: number;
  lastUpdated: Date; // Make required to match WalletService type
};

type WalletContextType = {
  wallet: WalletBalance | null;
  refresh: () => Promise<void>;
  isLoading: boolean;
};

const WalletContext = createContext<WalletContextType>({
  wallet: null,
  refresh: async () => {},
  isLoading: true,
});

export const useWallet = () => useContext(WalletContext);

// Shallow compare to avoid re-renders when nothing changed
function shallowEqual(a?: WalletBalance | null, b?: WalletBalance | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.total === b.total &&
    a.tic === b.tic &&
    a.gic === b.gic &&
    a.staking === b.staking &&
    a.partner_wallet === b.partner_wallet
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // ✅ ALL HOOKS FIRST - NEVER RETURN BEFORE THIS POINT
  const { data: session, status } = useSession();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const aliveRef = useRef(true);
  const walletService = WalletService.getInstance();

  // Fetch once + poll every 30s, only when authenticated
  useEffect(() => {
    aliveRef.current = true;
    
    if (status !== 'authenticated' || !session?.user?.email) {
      setIsLoading(false);
      return;
    }

    let interval: NodeJS.Timeout;

    const fetchOnce = async (force = false) => {
      try {
        setIsLoading(true);
        const data = await walletService.getBalanceCached(force);
        if (aliveRef.current && !shallowEqual(wallet, data)) {
          setWallet(data);
        }
      } catch (error) {
        console.error('WalletProvider fetch error:', error);
      } finally {
        if (aliveRef.current) {
          setIsLoading(false);
        }
      }
    };

    fetchOnce(false);
    interval = setInterval(() => fetchOnce(false), 30000); // Poll every 30 seconds

    return () => {
      aliveRef.current = false;
      clearInterval(interval);
    };
  }, [status, session?.user?.email]); // DO NOT depend on `wallet` here to avoid infinite loops

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await walletService.getBalanceCached(true); // Force refresh
      if (!shallowEqual(wallet, data)) {
        setWallet(data);
      }
    } catch (error) {
      console.error('WalletProvider refresh error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [wallet, walletService]);

  const value = useMemo(() => ({
    wallet,
    refresh,
    isLoading,
  }), [wallet, refresh, isLoading]);

  // ✅ RENDER LOGIC AFTER ALL HOOKS - CONDITIONAL RENDERING ONLY
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
