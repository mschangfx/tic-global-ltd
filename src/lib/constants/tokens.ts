/**
 * Token pricing constants for TIC Global
 * Centralized token pricing to ensure consistency across the application
 */

// Token prices in USD
export const TOKEN_PRICES = {
  TIC: 0.02,  // $0.02 per TIC token
  GIC: 63.00, // $63.00 per GIC token (buy price)
  GIC_SELL: 60.00, // $60.00 per GIC token (sell price)
} as const;

// Token allocation per plan (yearly amounts)
export const TOKEN_ALLOCATIONS = {
  'vip': 6900,      // VIP Plan: 6900 TIC tokens per year
  'starter': 500    // Starter Plan: 500 TIC tokens per year
} as const;

// Calculate daily token amount (yearly amount / 365 days)
export const getDailyTokenAmount = (planId: string): number => {
  const yearlyAmount = TOKEN_ALLOCATIONS[planId as keyof typeof TOKEN_ALLOCATIONS] || 0;
  return Math.round((yearlyAmount / 365) * 100) / 100; // Display with 2 decimal places
};

// Token conversion utilities
export const convertTicToUsd = (ticAmount: number): number => {
  return Math.round((ticAmount * TOKEN_PRICES.TIC) * 100) / 100; // Display with 2 decimal places
};

export const convertUsdToTic = (usdAmount: number): number => {
  return Math.round((usdAmount / TOKEN_PRICES.TIC) * 100) / 100; // Display with 2 decimal places
};

export const convertGicToUsd = (gicAmount: number): number => {
  return Math.round(gicAmount * TOKEN_PRICES.GIC * 100) / 100;
};

export const convertUsdToGic = (usdAmount: number): number => {
  return Math.round((usdAmount / TOKEN_PRICES.GIC) * 1000) / 1000;
};

// Format token amounts with proper precision
export const formatTokenAmount = (amount: number, decimals: number = 3): string => {
  return amount.toFixed(decimals);
};

// Format USD amounts
export const formatUsdAmount = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};
