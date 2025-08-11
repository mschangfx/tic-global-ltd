/**
 * Currency conversion utilities for TIC Global
 * Standard conversion rate: $1 USD = 63 PHP
 */

// Standard conversion rates
export const CONVERSION_RATES = {
  USD_TO_PHP: 63,
  PHP_TO_USD: 1 / 63, // ≈ 0.01587
} as const;

/**
 * Convert USD to PHP using standard rate
 */
export function convertUsdToPhp(usdAmount: number): number {
  return Math.round(usdAmount * CONVERSION_RATES.USD_TO_PHP * 100) / 100;
}

/**
 * Convert PHP to USD using standard rate
 */
export function convertPhpToUsd(phpAmount: number): number {
  return Math.round(phpAmount * CONVERSION_RATES.PHP_TO_USD * 100) / 100;
}

/**
 * Format currency amount with proper symbol and formatting
 */
export function formatCurrency(amount: number, currency: 'USD' | 'PHP'): string {
  if (currency === 'PHP') {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
    }).format(amount);
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  }
}

/**
 * Get conversion display text for deposit methods
 */
export function getConversionDisplay(usdAmount: number): string {
  const phpAmount = convertUsdToPhp(usdAmount);
  return `$${usdAmount.toFixed(2)} USD (≈₱${phpAmount.toFixed(2)} PHP)`;
}

/**
 * Get conversion display for PHP methods
 */
export function getPhpConversionDisplay(phpAmount: number): string {
  const usdAmount = convertPhpToUsd(phpAmount);
  return `₱${phpAmount.toFixed(2)} PHP (≈$${usdAmount.toFixed(2)} USD)`;
}

/**
 * Parse deposit amount and determine currency
 * USD is ALWAYS the deposit amount for all methods
 */
export function parseDepositAmount(
  amount: string | number,
  paymentMethod: string
): { usdAmount: number; phpAmount: number; originalCurrency: 'USD' | 'PHP' } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  // USD is ALWAYS the deposit amount for all methods
  // The user always enters USD, and we convert to PHP for payment instructions when needed
  return {
    usdAmount: numAmount, // User always enters USD amount
    phpAmount: convertUsdToPhp(numAmount), // Convert to PHP for payment instructions
    originalCurrency: 'USD' // Always USD as the original currency
  };
}

/**
 * Validate minimum deposit amounts with conversion
 * USD is ALWAYS the deposit amount for all methods
 */
export function validateDepositAmount(
  amount: number,
  paymentMethod: string
): { isValid: boolean; error?: string; minAmount?: number } {
  // USD is ALWAYS the deposit amount for all methods
  const usdAmount = amount; // User always enters USD

  // Standard limits: $10 - $10,000 USD
  const MIN_USD = 10;
  const MAX_USD = 10000;
  const MIN_PHP = convertUsdToPhp(MIN_USD);
  const MAX_PHP = convertUsdToPhp(MAX_USD);

  if (usdAmount < MIN_USD) {
    return {
      isValid: false,
      error: `Minimum deposit amount is $${MIN_USD} USD (₱${MIN_PHP.toFixed(0)} PHP)`,
      minAmount: MIN_USD
    };
  }

  if (usdAmount > MAX_USD) {
    return {
      isValid: false,
      error: `Maximum deposit amount is $${MAX_USD} USD (₱${MAX_PHP.toFixed(0)} PHP)`,
      minAmount: MAX_USD
    };
  }

  return { isValid: true };
}

/**
 * Get display limits for deposit methods
 * USD is ALWAYS the deposit amount for all methods
 */
export function getDepositLimits(paymentMethod: string): string {
  // USD is ALWAYS the deposit amount for all methods
  // Show USD limits as primary with PHP equivalent
  const minPhp = convertUsdToPhp(10);
  const maxPhp = convertUsdToPhp(10000);
  return `$10 - $10,000 USD\n(₱${minPhp.toFixed(0)} - ₱${maxPhp.toFixed(0)} PHP)`;
}

/**
 * Get compact deposit limits for card display
 * USD is ALWAYS the deposit amount for all methods
 */
export function getCompactDepositLimits(paymentMethod: string): { primary: string; secondary: string } {
  // USD is ALWAYS the deposit amount for all methods
  // Show USD limits as primary with PHP equivalent
  const minPhp = convertUsdToPhp(10);
  const maxPhp = convertUsdToPhp(10000);
  return {
    primary: `$10 - $10,000 USD`,
    secondary: `(₱${minPhp.toFixed(0)} - ₱${maxPhp.toFixed(0)} PHP)`
  };
}
