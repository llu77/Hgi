/**
 * Date Utility Functions for Gregorian Calendar
 * 
 * This module provides utilities for working with Gregorian (Miladi) calendar.
 * All dates are stored as JavaScript Date objects and formatted consistently.
 * 
 * Key Principles:
 * - Database stores UTC timestamps
 * - Display layer shows Gregorian dates in DD/MM/YYYY format
 * - All date operations use native JavaScript Date objects
 */

/**
 * Format a Date object as Gregorian date string (DD/MM/YYYY)
 * @param date - JavaScript Date object
 * @returns Formatted date string (e.g., "06/12/2024")
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a Date object as ISO 8601 string for API calls
 * Uses local date to avoid timezone shifts
 * @param date - JavaScript Date object
 * @returns ISO 8601 string in local timezone (e.g., "2024-12-06T00:00:00.000Z")
 */
export function toISOString(date: Date): string {
  // Create date at midnight in local timezone
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

/**
 * Parse an ISO 8601 string to Date object
 * @param isoString - ISO 8601 string
 * @returns JavaScript Date object
 */
export function fromISOString(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Get current date at midnight (00:00:00) in local timezone
 * @returns Date object set to midnight
 */
export function getTodayMidnight(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/**
 * Get current date and time
 * @returns Current Date object
 */
export function getNow(): Date {
  return new Date();
}

/**
 * Check if two dates are the same day (ignoring time)
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if same day, false otherwise
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future, false otherwise
 */
export function isFuture(date: Date): boolean {
  return date > new Date();
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns True if date is in the past, false otherwise
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Add days to a date
 * @param date - Starting date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get start of month for a given date
 * @param date - Date object
 * @returns Date object set to first day of month at midnight
 */
export function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Get end of month for a given date
 * @param date - Date object
 * @returns Date object set to last day of month at 23:59:59
 */
export function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Format a date range for display
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export function formatDateRange(startDate: Date, endDate: Date): string {
  return `من ${formatDate(startDate)} إلى ${formatDate(endDate)}`;
}

/**
 * Validate that a date is not in the future
 * @param date - Date to validate
 * @returns Error message if invalid, null if valid
 */
export function validateNotFuture(date: Date): string | null {
  if (isFuture(date)) {
    return 'لا يمكن اختيار تاريخ مستقبلي';
  }
  return null;
}

/**
 * Validate that a date is within allowed range (e.g., last 30 days)
 * @param date - Date to validate
 * @param maxDaysBack - Maximum days in the past (default: 30)
 * @returns Error message if invalid, null if valid
 */
export function validateDateRange(date: Date, maxDaysBack: number = 30): string | null {
  const oldestAllowed = addDays(new Date(), -maxDaysBack);
  if (date < oldestAllowed) {
    return `لا يمكن إدخال تاريخ أقدم من ${maxDaysBack} يوماً`;
  }
  return null;
}

/**
 * Validate that start date is before or equal to end date
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Error message if invalid, null if valid
 */
export function validateDateRangeOrder(startDate: Date, endDate: Date): string | null {
  if (startDate > endDate) {
    return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية';
  }
  return null;
}

/**
 * Convert Date to YYYY-MM-DD format for HTML date input
 * Uses local timezone to avoid date shifting issues
 * @param date - Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function toDateInputValue(date: Date): string {
  // Use local date components to avoid timezone shifts
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse YYYY-MM-DD string from HTML date input to Date object
 * @param value - Date string in YYYY-MM-DD format
 * @returns Date object
 */
export function fromDateInputValue(value: string): Date {
  // Parse components to avoid UTC interpretation
  const [year, month, day] = value.split('-').map(Number);
  // Create date at midnight in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}
