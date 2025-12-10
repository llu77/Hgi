import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface RevenueData {
  date: string;
  cash: number;
  network: number;
  total: number;
  balance: number;
}

interface RevenueReportProps {
  branchName: string;
  managerName: string;
  startDate: string;
  endDate: string;
  revenues: RevenueData[];
}

export function RevenueReport({
  branchName,
  managerName,
  startDate,
  endDate,
  revenues,
}: RevenueReportProps) {
  const printDate = format(new Date(), "dd/MM/yyyy", { locale: ar });
  
  const totals = revenues.reduce(
    (acc, rev) => ({
      cash: acc.cash + rev.cash,
      network: acc.network + rev.network,
      total: acc.total + rev.total,
      balance: acc.balance + rev.balance,
    }),
    { cash: 0, network: 0, total: 0, balance: 0 }
  );

  return (
    <div className="print-container" dir="rtl">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
        
        .print-container {
          font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
          background: white;
          padding: 40px;
          max-width: 210mm;
          margin: 0 auto;
        }
        
        .report-header {
          text-align: center;
          border-bottom: 3px solid #C9A961;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .report-title {
          font-size: 28px;
          font-weight: bold;
          color: #1a2332;
          margin-bottom: 10px;
        }
        
        .report-subtitle {
          font-size: 18px;
          color: #C9A961;
          margin-bottom: 20px;
        }
        
        .report-info {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 30px;
          font-size: 14px;
        }
        
        .info-item {
          background: #f8f9fa;
          padding: 12px;
          border-radius: 8px;
          border-right: 4px solid #C9A961;
        }
        
        .info-label {
          font-weight: bold;
          color: #1a2332;
          margin-bottom: 4px;
        }
        
        .info-value {
          color: #666;
        }
        
        .report-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 14px;
        }
        
        .report-table th {
          background: #1a2332;
          color: white;
          padding: 14px;
          text-align: center;
          font-weight: bold;
          font-size: 15px;
        }
        
        .report-table td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: center;
        }
        
        .report-table tr:nth-child(even) {
          background: #f8f9fa;
        }
        
        .report-table tr:hover {
          background: #f0f0f0;
        }
        
        .totals-row {
          background: #C9A961 !important;
          color: white !important;
          font-weight: bold;
        }
        
        .totals-row td {
          border-color: #C9A961 !important;
        }
        
        .report-footer {
          text-align: center;
          padding-top: 20px;
          border-top: 2px solid #C9A961;
          color: #666;
          font-size: 12px;
        }
        
        .footer-logo {
          font-weight: bold;
          color: #1a2332;
          margin-bottom: 5px;
        }
      `}</style>

      <div className="report-header">
        <div className="report-title">Branches Management</div>
        <div className="report-subtitle">تقرير الإيرادات</div>
      </div>

      <div className="report-info">
        <div className="info-item">
          <div className="info-label">الفرع</div>
          <div className="info-value">{branchName}</div>
        </div>
        <div className="info-item">
          <div className="info-label">المشرف</div>
          <div className="info-value">{managerName}</div>
        </div>
        <div className="info-item">
          <div className="info-label">تاريخ الطباعة</div>
          <div className="info-value">{printDate}</div>
        </div>
      </div>

      <div className="report-info">
        <div className="info-item">
          <div className="info-label">من تاريخ</div>
          <div className="info-value">
            {format(new Date(startDate), "dd/MM/yyyy", { locale: ar })}
          </div>
        </div>
        <div className="info-item">
          <div className="info-label">إلى تاريخ</div>
          <div className="info-value">
            {format(new Date(endDate), "dd/MM/yyyy", { locale: ar })}
          </div>
        </div>
        <div className="info-item">
          <div className="info-label">عدد السجلات</div>
          <div className="info-value">{revenues.length}</div>
        </div>
      </div>

      <table className="report-table">
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
          {revenues.map((rev, index) => (
            <tr key={index}>
              <td>{format(new Date(rev.date), "dd/MM/yyyy", { locale: ar })}</td>
              <td>{rev.cash.toLocaleString("ar-SA")} ر.س</td>
              <td>{rev.network.toLocaleString("ar-SA")} ر.س</td>
              <td>{rev.total.toLocaleString("ar-SA")} ر.س</td>
              <td>{rev.balance.toLocaleString("ar-SA")} ر.س</td>
            </tr>
          ))}
          <tr className="totals-row">
            <td>الإجمالي</td>
            <td>{totals.cash.toLocaleString("ar-SA")} ر.س</td>
            <td>{totals.network.toLocaleString("ar-SA")} ر.س</td>
            <td>{totals.total.toLocaleString("ar-SA")} ر.س</td>
            <td>{totals.balance.toLocaleString("ar-SA")} ر.س</td>
          </tr>
        </tbody>
      </table>

      <div className="report-footer">
        <div className="footer-logo">Branches Management System</div>
        <div>All Rights Reserved to Symbol AI</div>
      </div>
    </div>
  );
}
