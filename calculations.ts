import Decimal from 'decimal.js';

/**
 * Financial Calculation Utilities using Decimal.js
 * 
 * This module provides precise financial calculations to avoid floating-point errors.
 * All monetary values should use these functions instead of native JavaScript math.
 * 
 * Why Decimal.js?
 * JavaScript: 0.1 + 0.2 = 0.30000000000000004 ❌
 * Decimal.js: 0.1 + 0.2 = 0.3 ✅
 */

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20,        // Use 20 significant digits
  rounding: Decimal.ROUND_HALF_UP,  // Standard rounding (0.5 rounds up)
  toExpNeg: -7,         // Don't use exponential notation for small numbers
  toExpPos: 21,         // Don't use exponential notation for large numbers
});

/**
 * Add two monetary values
 * @param a - First value
 * @param b - Second value
 * @returns Sum rounded to 2 decimal places
 */
export function add(a: number | string, b: number | string): number {
  return new Decimal(a).plus(b).toDecimalPlaces(2).toNumber();
}

/**
 * Subtract two monetary values
 * @param a - First value (minuend)
 * @param b - Second value (subtrahend)
 * @returns Difference rounded to 2 decimal places
 */
export function subtract(a: number | string, b: number | string): number {
  return new Decimal(a).minus(b).toDecimalPlaces(2).toNumber();
}

/**
 * Multiply two values
 * @param a - First value
 * @param b - Second value
 * @returns Product rounded to 2 decimal places
 */
export function multiply(a: number | string, b: number | string): number {
  return new Decimal(a).times(b).toDecimalPlaces(2).toNumber();
}

/**
 * Divide two values
 * @param a - Dividend
 * @param b - Divisor
 * @returns Quotient rounded to 2 decimal places
 * @throws Error if divisor is zero
 */
export function divide(a: number | string, b: number | string): number {
  if (new Decimal(b).isZero()) {
    throw new Error('Cannot divide by zero');
  }
  return new Decimal(a).dividedBy(b).toDecimalPlaces(2).toNumber();
}

/**
 * Sum an array of monetary values
 * @param values - Array of values to sum
 * @returns Total sum rounded to 2 decimal places
 */
export function sum(values: (number | string)[]): number {
  let total = new Decimal(0);
  for (const value of values) {
    total = total.plus(value);
  }
  return total.toDecimalPlaces(2).toNumber();
}

/**
 * Calculate percentage of a value
 * @param value - Base value
 * @param percentage - Percentage (e.g., 15 for 15%)
 * @returns Percentage amount rounded to 2 decimal places
 */
export function percentage(value: number | string, percentage: number | string): number {
  return new Decimal(value).times(percentage).dividedBy(100).toDecimalPlaces(2).toNumber();
}

/**
 * Check if two monetary values are equal (within tolerance)
 * @param a - First value
 * @param b - Second value
 * @param tolerance - Tolerance for comparison (default: 0.01)
 * @returns True if values are equal within tolerance
 */
export function isEqual(a: number | string, b: number | string, tolerance: number = 0.01): boolean {
  const diff = new Decimal(a).minus(b).abs();
  return diff.lessThanOrEqualTo(tolerance);
}

/**
 * Round a value to specified decimal places
 * @param value - Value to round
 * @param decimalPlaces - Number of decimal places (default: 2)
 * @returns Rounded value
 */
export function round(value: number | string, decimalPlaces: number = 2): number {
  return new Decimal(value).toDecimalPlaces(decimalPlaces).toNumber();
}

/**
 * Format a monetary value as string with 2 decimal places
 * @param value - Value to format
 * @param locale - Locale for formatting (default: 'ar-SA')
 * @returns Formatted string (e.g., "1,234.56")
 */
export function formatMoney(value: number | string, locale: string = 'ar-SA'): string {
  const num = new Decimal(value).toDecimalPlaces(2).toNumber();
  return num.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a monetary value with currency symbol
 * @param value - Value to format
 * @param currency - Currency code (default: 'SAR')
 * @param locale - Locale for formatting (default: 'ar-SA')
 * @returns Formatted string with currency (e.g., "1,234.56 ر.س")
 */
export function formatCurrency(value: number | string, currency: string = 'SAR', locale: string = 'ar-SA'): string {
  const num = new Decimal(value).toDecimalPlaces(2).toNumber();
  
  if (currency === 'SAR') {
    return `${formatMoney(num, locale)} ر.س`;
  }
  
  return num.toLocaleString(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculate total revenue (Cash + Network)
 * @param cash - Cash amount
 * @param network - Network amount
 * @returns Total revenue
 */
export function calculateTotal(cash: number | string, network: number | string): number {
  return add(cash, network);
}

/**
 * Calculate balance (Employee Total - Cash)
 * @param employeeTotal - Total employee revenues
 * @param cash - Cash amount
 * @returns Balance
 */
export function calculateBalance(employeeTotal: number | string, cash: number | string): number {
  return subtract(employeeTotal, cash);
}

/**
 * Validate revenue matching
 * @param balance - Calculated balance
 * @param network - Network amount
 * @param total - Total revenue
 * @param cash - Cash amount
 * @param employeeTotal - Total employee revenues
 * @returns Object with matching status and reasons
 */
export function validateRevenueMatching(
  balance: number | string,
  network: number | string,
  total: number | string,
  cash: number | string,
  employeeTotal: number | string
): {
  isMatched: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  
  // Check 1: Balance should equal Network
  if (!isEqual(balance, network)) {
    reasons.push(`الموازنة (${formatMoney(balance)}) لا تساوي الشبكة (${formatMoney(network)})`);
  }
  
  // Check 2: Total should equal Cash + Network
  const expectedTotal = calculateTotal(cash, network);
  if (!isEqual(total, expectedTotal)) {
    reasons.push(`المجموع (${formatMoney(total)}) لا يساوي الكاش + الشبكة (${formatMoney(expectedTotal)})`);
  }
  
  // Check 3: Employee Total should equal Total
  if (!isEqual(employeeTotal, total)) {
    reasons.push(`إيرادات الموظفين (${formatMoney(employeeTotal)}) لا تساوي المجموع (${formatMoney(total)})`);
  }
  
  return {
    isMatched: reasons.length === 0,
    reasons,
  };
}

/**
 * Parse a string to number, handling Arabic numerals and commas
 * @param value - String value to parse
 * @returns Parsed number
 */
export function parseMoneyInput(value: string): number {
  // Remove Arabic/English commas and spaces
  const cleaned = value.replace(/[,\s]/g, '');
  
  // Convert Arabic numerals to English
  const englishNumerals = cleaned.replace(/[٠-٩]/g, (d) => 
    '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()
  );
  
  const num = parseFloat(englishNumerals);
  return isNaN(num) ? 0 : round(num, 2);
}
