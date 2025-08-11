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
 */
export function parseDepositAmount(
  amount: string | number, 
  paymentMethod: string
): { usdAmount: number; phpAmount: number; originalCurrency: 'USD' | 'PHP' } {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Determine if this is a PHP-based payment method
  const isPhpMethod = paymentMethod === 'gcash' || paymentMethod === 'paymaya';
  
  if (isPhpMethod) {
    // For PHP methods, user enters PHP amount
    return {
      usdAmount: convertPhpToUsd(numAmount),
      phpAmount: numAmount,
      originalCurrency: 'PHP'
    };
  } else {
    // For crypto methods, user enters USD amount
    return {
      usdAmount: numAmount,
      phpAmount: convertUsdToPhp(numAmount),
      originalCurrency: 'USD'
    };
  }
}

/**
 * Validate minimum deposit amounts with conversion
 */
export function validateDepositAmount(
  amount: number, 
  paymentMethod: string
): { isValid: boolean; error?: string; minAmount?: number } {
  const { usdAmount } = parseDepositAmount(amount, paymentMethod);
  
  // Standard minimum: $10 USD (≈₱630 PHP)
  const MIN_USD = 10;
  const MIN_PHP = convertUsdToPhp(MIN_USD);
  
  if (usdAmount < MIN_USD) {
    const isPhpMethod = paymentMethod === 'gcash' || paymentMethod === 'paymaya';
    
    if (isPhpMethod) {
      return {
        isValid: false,
        error: `Minimum deposit amount is ₱${MIN_PHP.toFixed(2)} PHP ($${MIN_USD} USD)`,
        minAmount: MIN_PHP
      };
    } else {
      return {
        isValid: false,
        error: `Minimum deposit amount is $${MIN_USD} USD (₱${MIN_PHP.toFixed(2)} PHP)`,
        minAmount: MIN_USD
      };
    }
  }
  
  return { isValid: true };
}

/**
 * Get display limits for deposit methods
 */
export function getDepositLimits(paymentMethod: string): string {
  const isPhpMethod = paymentMethod === 'gcash' || paymentMethod === 'paymaya';

  if (isPhpMethod) {
    // PHP methods: show PHP limits with USD equivalent
    const minPhp = convertUsdToPhp(10); // $10 minimum
    const maxPhp = convertUsdToPhp(10000); // $10,000 maximum
    return `₱${minPhp.toFixed(0)} - ₱${maxPhp.toFixed(0)} PHP\n($10 - $10,000 USD)`;
  } else {
    // Crypto methods: show USD limits with PHP equivalent
    const minPhp = convertUsdToPhp(10);
    const maxPhp = convertUsdToPhp(10000);
    return `$10 - $10,000 USD\n(₱${minPhp.toFixed(0)} - ₱${maxPhp.toFixed(0)} PHP)`;
  }
}

/**
 * Get compact deposit limits for card display
 */
export function getCompactDepositLimits(paymentMethod: string): { primary: string; secondary: string } {
  const isPhpMethod = paymentMethod === 'gcash' || paymentMethod === 'paymaya';

  if (isPhpMethod) {
    // PHP methods: show PHP limits with USD equivalent
    const minPhp = convertUsdToPhp(10); // $10 minimum
    const maxPhp = convertUsdToPhp(10000); // $10,000 maximum
    return {
      primary: `₱${minPhp.toFixed(0)} - ₱${maxPhp.toFixed(0)} PHP`,
      secondary: `($10 - $10,000 USD)`
    };
  } else {
    // Crypto methods: show USD limits with PHP equivalent
    const minPhp = convertUsdToPhp(10);
    const maxPhp = convertUsdToPhp(10000);
    return {
      primary: `$10 - $10,000 USD`,
      secondary: `(₱${minPhp.toFixed(0)} - ₱${maxPhp.toFixed(0)} PHP)`
    };
  }
}
