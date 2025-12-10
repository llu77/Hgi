import * as XLSX from 'xlsx';
import { formatDateAr, formatCurrency } from './formatters';

interface ExpenseData {
  date: Date | string;
  categoryName: string;
  amount: number | string;
  paymentType: string;
  description?: string | null;
  branchName?: string;
}

/**
 * Export expenses to Excel file
 */
export function exportExpensesToExcel(
  expenses: ExpenseData[],
  filters: {
    startDate?: string;
    endDate?: string;
    branchName?: string;
  }
) {
  // Prepare data for Excel
  const data = expenses.map(expense => ({
    'التاريخ': formatDateAr(new Date(expense.date)),
    'الفئة': expense.categoryName,
    'المبلغ (ر.س)': typeof expense.amount === 'string' ? parseFloat(expense.amount) : expense.amount,
    'نوع الدفع': expense.paymentType === 'cash' ? 'كاش' : 'شبكة',
    'الوصف': expense.description || '-',
    ...(expense.branchName && { 'الفرع': expense.branchName }),
  }));

  // Calculate total
  const total = expenses.reduce((sum, e) => {
    const amount = typeof e.amount === 'string' ? parseFloat(e.amount) : e.amount;
    return sum + amount;
  }, 0);

  // Add total row
  data.push({
    'التاريخ': '',
    'الفئة': '',
    'المبلغ (ر.س)': total,
    'نوع الدفع': 'الإجمالي',
    'الوصف': '',
    ...(expenses[0]?.branchName && { 'الفرع': '' }),
  } as any);

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data, {
    header: expenses[0]?.branchName 
      ? ['التاريخ', 'الفئة', 'المبلغ (ر.س)', 'نوع الدفع', 'الوصف', 'الفرع']
      : ['التاريخ', 'الفئة', 'المبلغ (ر.س)', 'نوع الدفع', 'الوصف']
  });

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // التاريخ
    { wch: 20 }, // الفئة
    { wch: 12 }, // المبلغ
    { wch: 12 }, // نوع الدفع
    { wch: 30 }, // الوصف
    ...(expenses[0]?.branchName ? [{ wch: 15 }] : []), // الفرع
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المصروفات');

  // Generate filename
  const dateRange = filters.startDate && filters.endDate
    ? `_${formatDateAr(new Date(filters.startDate))}_${formatDateAr(new Date(filters.endDate))}`
    : '';
  const branchName = filters.branchName ? `_${filters.branchName}` : '';
  const filename = `expenses${branchName}${dateRange}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}

interface RevenueData {
  date: Date | string;
  cash: number | string;
  network: number | string;
  total: number | string;
  balance: number | string;
  isMatched: boolean;
  branchName?: string;
}

/**
 * Export revenues to Excel file
 */
export function exportRevenuesToExcel(
  revenues: RevenueData[],
  filters: {
    startDate?: string;
    endDate?: string;
    branchName?: string;
  }
) {
  // Prepare data for Excel
  const data = revenues.map(revenue => ({
    'التاريخ': formatDateAr(new Date(revenue.date)),
    'الكاش (ر.س)': typeof revenue.cash === 'string' ? parseFloat(revenue.cash) : revenue.cash,
    'الشبكة (ر.س)': typeof revenue.network === 'string' ? parseFloat(revenue.network) : revenue.network,
    'المجموع (ر.س)': typeof revenue.total === 'string' ? parseFloat(revenue.total) : revenue.total,
    'الموازنة (ر.س)': typeof revenue.balance === 'string' ? parseFloat(revenue.balance) : revenue.balance,
    'الحالة': revenue.isMatched ? 'متطابق' : 'غير متطابق',
    ...(revenue.branchName && { 'الفرع': revenue.branchName }),
  }));

  // Calculate totals
  const totalCash = revenues.reduce((sum, r) => {
    const cash = typeof r.cash === 'string' ? parseFloat(r.cash) : r.cash;
    return sum + cash;
  }, 0);

  const totalNetwork = revenues.reduce((sum, r) => {
    const network = typeof r.network === 'string' ? parseFloat(r.network) : r.network;
    return sum + network;
  }, 0);

  const totalAmount = revenues.reduce((sum, r) => {
    const total = typeof r.total === 'string' ? parseFloat(r.total) : r.total;
    return sum + total;
  }, 0);

  // Add total row
  data.push({
    'التاريخ': '',
    'الكاش (ر.س)': totalCash,
    'الشبكة (ر.س)': totalNetwork,
    'المجموع (ر.س)': totalAmount,
    'الموازنة (ر.س)': '',
    'الحالة': 'الإجمالي',
    ...(revenues[0]?.branchName && { 'الفرع': '' }),
  } as any);

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data, {
    header: revenues[0]?.branchName 
      ? ['التاريخ', 'الكاش (ر.س)', 'الشبكة (ر.س)', 'المجموع (ر.س)', 'الموازنة (ر.س)', 'الحالة', 'الفرع']
      : ['التاريخ', 'الكاش (ر.س)', 'الشبكة (ر.س)', 'المجموع (ر.س)', 'الموازنة (ر.س)', 'الحالة']
  });

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // التاريخ
    { wch: 12 }, // الكاش
    { wch: 12 }, // الشبكة
    { wch: 12 }, // المجموع
    { wch: 12 }, // الموازنة
    { wch: 12 }, // الحالة
    ...(revenues[0]?.branchName ? [{ wch: 15 }] : []), // الفرع
  ];

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الإيرادات');

  // Generate filename
  const dateRange = filters.startDate && filters.endDate
    ? `_${formatDateAr(new Date(filters.startDate))}_${formatDateAr(new Date(filters.endDate))}`
    : '';
  const branchName = filters.branchName ? `_${filters.branchName}` : '';
  const filename = `revenues${branchName}${dateRange}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
}
