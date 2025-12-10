import { format } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * Format date in Arabic locale (dd/MM/yyyy)
 * @param date - Date object to format
 * @returns Formatted date string in Arabic
 * @example formatDateAr(new Date()) => "٠٧/١٢/٢٠٢٤"
 */
export function formatDateAr(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy", { locale: ar });
}

/**
 * Format currency amount in Saudi Riyal with Arabic numerals
 * @param amount - Numeric amount to format
 * @returns Formatted currency string
 * @example formatCurrency(1000) => "١٬٠٠٠ ر.س"
 */
export function formatCurrency(amount: number): string {
  return `${formatNumberAr(amount)} ر.س`;
}

/**
 * Format number with Arabic locale (thousands separator)
 * @param num - Number to format
 * @returns Formatted number string in Arabic
 * @example formatNumberAr(1000000) => "١٬٠٠٠٬٠٠٠"
 */
export function formatNumberAr(num: number): string {
  return num.toLocaleString('ar-SA');
}

/**
 * Format date range display in Arabic
 * @param start - Start date
 * @param end - End date
 * @returns Formatted date range string
 * @example formatDateRange(date1, date2) => "من ٠١/١٢/٢٠٢٤ إلى ٣١/١٢/٢٠٢٤"
 */
export function formatDateRange(start: Date | string, end: Date | string): string {
  return `من ${formatDateAr(start)} إلى ${formatDateAr(end)}`;
}

/**
 * Format date and time in Arabic
 * @param date - Date object to format
 * @returns Formatted datetime string
 * @example formatDateTimeAr(new Date()) => "٠٧/١٢/٢٠٢٤ - ١٤:٣٠"
 */
export function formatDateTimeAr(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy - HH:mm", { locale: ar });
}

/**
 * Get Arabic month name
 * @param date - Date object
 * @returns Arabic month name
 * @example getArabicMonth(new Date()) => "ديسمبر"
 */
export function getArabicMonth(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "MMMM", { locale: ar });
}

/**
 * Get Arabic day name
 * @param date - Date object
 * @returns Arabic day name
 * @example getArabicDay(new Date()) => "السبت"
 */
export function getArabicDay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, "EEEE", { locale: ar });
}
