import { formatDateAr, formatCurrency, formatDateTimeAr } from "./formatters";

export interface RevenueData {
  date: string;
  cash: number;
  network: number;
  total: number;
  balance: number;
}

export interface PDFOptions {
  branchName: string;
  managerName: string;
  startDate: string;
  endDate: string;
  revenues: RevenueData[];
}

/**
 * Generate HTML template for revenue report with proper Arabic support
 */
function generateRevenueHTML(options: PDFOptions): string {
  const { branchName, managerName, startDate, endDate, revenues } = options;
  
  // Calculate totals
  const totals = revenues.reduce(
    (acc, rev) => ({
      cash: acc.cash + rev.cash,
      network: acc.network + rev.network,
      total: acc.total + rev.total,
      balance: acc.balance + rev.balance,
    }),
    { cash: 0, network: 0, total: 0, balance: 0 }
  );

  // Generate table rows
  const tableRows = revenues.map((rev, index) => `
    <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td>${formatDateAr(rev.date)}</td>
      <td class="number">${formatCurrency(rev.cash)}</td>
      <td class="number">${formatCurrency(rev.network)}</td>
      <td class="number">${formatCurrency(rev.total)}</td>
      <td class="number">${formatCurrency(rev.balance)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تقرير الإيرادات - ${branchName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html {
      direction: rtl;
      text-align: right;
    }
    
    body {
      font-family: 'Tajawal', Arial, sans-serif;
      direction: rtl;
      text-align: right;
      background: white;
      color: #1f2937;
      font-size: 14px;
      line-height: 1.6;
      padding: 20mm;
    }
    
    /* Ensure all text elements respect RTL */
    p, h1, h2, h3, h4, h5, h6, span, div, td, th, li {
      direction: rtl;
      text-align: right;
    }
    
    /* Numbers stay LTR */
    .number {
      direction: ltr;
      display: inline-block;
      text-align: left;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #d97706;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    
    .logo {
      font-size: 22px;
      font-weight: 700;
      color: #d97706;
    }
    
    .document-info {
      text-align: left;
      direction: ltr;
      font-size: 11px;
      color: #6b7280;
    }
    
    /* Title */
    .title {
      text-align: center;
      margin-bottom: 25px;
    }
    
    .title h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 8px;
      text-align: center;
    }
    
    .title .subtitle {
      color: #6b7280;
      font-size: 14px;
      text-align: center;
    }
    
    /* Info Box */
    .info-box {
      background: #f9fafb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .info-row {
      display: flex;
      gap: 10px;
    }
    
    .info-label {
      color: #6b7280;
      font-weight: 500;
    }
    
    .info-value {
      font-weight: 600;
    }
    
    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      direction: rtl;
      margin: 20px 0;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      text-align: right;
    }
    
    th {
      background: #1f2937;
      color: white;
      font-weight: 600;
      font-size: 13px;
    }
    
    td {
      font-size: 13px;
    }
    
    tfoot td {
      background: #f3f4f6;
      font-weight: 700;
      font-size: 14px;
      color: #1f2937;
    }
    
    /* Summary Box */
    .summary-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-radius: 8px;
      padding: 20px;
      margin-top: 20px;
    }
    
    .summary-title {
      color: #065f46;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #a7f3d0;
    }
    
    .summary-row:last-child {
      border-bottom: none;
      border-top: 2px solid #059669;
      padding-top: 12px;
      margin-top: 8px;
    }
    
    .summary-label {
      color: #374151;
      font-size: 15px;
    }
    
    .summary-value {
      font-weight: 700;
      font-size: 16px;
      color: #059669;
      direction: ltr;
    }
    
    /* Footer */
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 11px;
      color: #9ca3af;
    }
    
    /* Print styles */
    @media print {
      body {
        padding: 15mm;
      }
      .no-print {
        display: none;
      }
    }
    
    @page {
      size: A4;
      margin: 15mm;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="logo">🏢 نظام إدارة الفروع</div>
      <div style="color: #6b7280; margin-top: 5px; font-size: 12px;">Symbol AI Financial System</div>
    </div>
    <div class="document-info">
      <div>Generated: ${new Date().toLocaleDateString('en-US')}</div>
      <div>Time: ${new Date().toLocaleTimeString('en-US')}</div>
    </div>
  </div>
  
  <!-- Title -->
  <div class="title">
    <h1>تقرير الإيرادات</h1>
    <div class="subtitle">فرع ${branchName}</div>
  </div>
  
  <!-- Report Info -->
  <div class="info-box">
    <div class="info-row">
      <span class="info-label">الفرع:</span>
      <span class="info-value">${branchName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">المشرف:</span>
      <span class="info-value">${managerName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">من تاريخ:</span>
      <span class="info-value">${formatDateAr(startDate)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">إلى تاريخ:</span>
      <span class="info-value">${formatDateAr(endDate)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">تاريخ الطباعة:</span>
      <span class="info-value">${formatDateTimeAr(new Date())}</span>
    </div>
    <div class="info-row">
      <span class="info-label">عدد السجلات:</span>
      <span class="info-value">${revenues.length}</span>
    </div>
  </div>
  
  <!-- Revenue Table -->
  <table>
    <thead>
      <tr>
        <th>التاريخ</th>
        <th>الكاش</th>
        <th>الشبكة</th>
        <th>الإجمالي</th>
        <th>الموازنة</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
    <tfoot>
      <tr>
        <td>الإجمالي</td>
        <td class="number">${formatCurrency(totals.cash)}</td>
        <td class="number">${formatCurrency(totals.network)}</td>
        <td class="number">${formatCurrency(totals.total)}</td>
        <td class="number">${formatCurrency(totals.balance)}</td>
      </tr>
    </tfoot>
  </table>
  
  <!-- Summary -->
  <div class="summary-box">
    <div class="summary-title">💰 ملخص الإيرادات</div>
    <div class="summary-row">
      <span class="summary-label">إجمالي الكاش:</span>
      <span class="summary-value">${formatCurrency(totals.cash)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">إجمالي الشبكة:</span>
      <span class="summary-value">${formatCurrency(totals.network)}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">الإجمالي الكلي:</span>
      <span class="summary-value" style="font-size: 20px;">${formatCurrency(totals.total)}</span>
    </div>
  </div>
  
  <!-- Footer -->
  <div class="footer">
    <div style="margin-bottom: 8px;">
      هذا المستند صادر إلكترونياً من نظام إدارة الفروع
    </div>
    <div style="display: flex; justify-content: center; gap: 20px; color: #6b7280;">
      <span>📧 Info@symbolai.net</span>
      <span>🌐 symbolai.net</span>
    </div>
    <div style="margin-top: 8px; font-size: 10px;">
      © ${new Date().getFullYear()} Symbol AI - جميع الحقوق محفوظة
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate revenue PDF report using browser's print functionality
 * This approach provides better Arabic support than jsPDF
 */
export async function generateRevenuePDF(options: PDFOptions): Promise<void> {
  // Generate HTML template
  const html = generateRevenueHTML(options);
  
  // Create a hidden iframe to render HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '210mm'; // A4 width
  iframe.style.height = '297mm'; // A4 height
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  document.body.appendChild(iframe);
  
  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      throw new Error('Cannot access iframe document');
    }
    
    // Write HTML to iframe
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    
    // Wait for fonts to load
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Trigger print dialog
    iframe.contentWindow?.print();
    
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw new Error('فشل في إنشاء ملف PDF');
  } finally {
    // Cleanup after a delay to allow print dialog to open
    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  }
}

/**
 * Generate and download revenue report PDF (wrapper for async)
 */
export async function generateAndDownloadRevenuePDF(options: PDFOptions): Promise<void> {
  try {
    await generateRevenuePDF(options);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    throw error;
  }
}
