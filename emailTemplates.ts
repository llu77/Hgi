/**
 * Email Templates for Employee Requests and Product Orders
 * All templates use Arabic RTL layout with Symbol AI branding
 */

const baseStyle = `
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  direction: rtl;
  text-align: right;
  background-color: #f5f5f0;
  padding: 20px;
`;

const cardStyle = `
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 600px;
  margin: 0 auto;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
`;

const headerStyle = `
  text-align: center;
  margin-bottom: 30px;
`;

const titleStyle = `
  color: #1a1a2e;
  font-size: 24px;
  font-weight: bold;
  margin: 10px 0;
`;

const contentStyle = `
  color: #4a4a4a;
  font-size: 16px;
  line-height: 1.6;
  margin: 20px 0;
`;

const buttonStyle = (color: string) => `
  display: inline-block;
  background-color: ${color};
  color: white;
  padding: 12px 30px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  margin: 20px 0;
`;

const footerStyle = `
  text-align: center;
  color: #888;
  font-size: 14px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
`;

const infoBoxStyle = `
  background-color: #f8f9fa;
  border-right: 4px solid #c9a961;
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
`;

// ============================================================================
// EMPLOYEE REQUEST TEMPLATES
// ============================================================================

export function employeeRequestCreatedTemplate(data: {
  employeeName: string;
  requestType: string;
  branchName: string;
  reason: string;
  requestId: number;
  dashboardUrl: string;
}): string {
  const requestTypeLabels: Record<string, string> = {
    advance: "سلفة",
    leave: "إجازة",
    arrears: "صرف متأخرات",
    permission: "استئذان",
    violation_objection: "اعتراض على مخالفة",
    resignation: "استقالة",
  };

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #c9a961 0%, #d4af37 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            📋
          </div>
          <h1 style="${titleStyle}">طلب موظف جديد</h1>
        </div>

        <div style="${contentStyle}">
          <p>تم استلام طلب جديد يحتاج إلى مراجعتك:</p>

          <div style="${infoBoxStyle}">
            <p style="margin: 8px 0;"><strong>نوع الطلب:</strong> ${requestTypeLabels[data.requestType] || data.requestType}</p>
            <p style="margin: 8px 0;"><strong>اسم الموظف:</strong> ${data.employeeName}</p>
            <p style="margin: 8px 0;"><strong>الفرع:</strong> ${data.branchName}</p>
            <p style="margin: 8px 0;"><strong>رقم الطلب:</strong> #${data.requestId}</p>
          </div>

          <p><strong>السبب:</strong></p>
          <p style="background: #f8f9fa; padding: 15px; border-radius: 8px;">${data.reason}</p>

          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" style="${buttonStyle("#c9a961")}">
              مراجعة الطلب الآن
            </a>
          </div>
        </div>

        <div style="${footerStyle}">
          <p>نظام إدارة الفروع المتكامل</p>
          <p>جميع الحقوق محفوظة لـ Symbol AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function employeeRequestApprovedTemplate(data: {
  employeeName: string;
  requestType: string;
  adminResponse?: string;
  requestId: number;
}): string {
  const requestTypeLabels: Record<string, string> = {
    advance: "السلفة",
    leave: "الإجازة",
    arrears: "صرف المتأخرات",
    permission: "الاستئذان",
    violation_objection: "الاعتراض على المخالفة",
    resignation: "الاستقالة",
  };

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            ✓
          </div>
          <h1 style="${titleStyle}">تمت الموافقة على طلبك</h1>
        </div>

        <div style="${contentStyle}">
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>يسرنا إبلاغك بأنه تمت الموافقة على ${requestTypeLabels[data.requestType] || "طلبك"} (رقم #${data.requestId}).</p>

          ${data.adminResponse ? `
            <div style="${infoBoxStyle}">
              <p style="margin: 0;"><strong>رد الإدارة:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.adminResponse}</p>
            </div>
          ` : ''}

          <p>يمكنك التواصل مع قسم الموارد البشرية لمزيد من التفاصيل.</p>
        </div>

        <div style="${footerStyle}">
          <p>نظام إدارة الفروع المتكامل</p>
          <p>جميع الحقوق محفوظة لـ Symbol AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function employeeRequestRejectedTemplate(data: {
  employeeName: string;
  requestType: string;
  adminResponse?: string;
  requestId: number;
}): string {
  const requestTypeLabels: Record<string, string> = {
    advance: "السلفة",
    leave: "الإجازة",
    arrears: "صرف المتأخرات",
    permission: "الاستئذان",
    violation_objection: "الاعتراض على المخالفة",
    resignation: "الاستقالة",
  };

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            ✗
          </div>
          <h1 style="${titleStyle}">تم رفض طلبك</h1>
        </div>

        <div style="${contentStyle}">
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>نأسف لإبلاغك بأنه تم رفض ${requestTypeLabels[data.requestType] || "طلبك"} (رقم #${data.requestId}).</p>

          ${data.adminResponse ? `
            <div style="${infoBoxStyle}">
              <p style="margin: 0;"><strong>سبب الرفض:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.adminResponse}</p>
            </div>
          ` : ''}

          <p>يمكنك التواصل مع قسم الموارد البشرية لمزيد من التوضيحات أو تقديم طلب جديد.</p>
        </div>

        <div style="${footerStyle}">
          <p>نظام إدارة الفروع المتكامل</p>
          <p>جميع الحقوق محفوظة لـ Symbol AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ============================================================================
// PRODUCT ORDER TEMPLATES
// ============================================================================

export function productOrderCreatedTemplate(data: {
  employeeName: string;
  branchName: string;
  productCount: number;
  grandTotal: number;
  orderId: number;
  dashboardUrl: string;
}): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            🛒
          </div>
          <h1 style="${titleStyle}">طلب منتجات جديد</h1>
        </div>

        <div style="${contentStyle}">
          <p>تم استلام طلب منتجات جديد يحتاج إلى مراجعتك:</p>

          <div style="${infoBoxStyle}">
            <p style="margin: 8px 0;"><strong>اسم الموظف:</strong> ${data.employeeName}</p>
            <p style="margin: 8px 0;"><strong>الفرع:</strong> ${data.branchName}</p>
            <p style="margin: 8px 0;"><strong>رقم الطلب:</strong> #${data.orderId}</p>
            <p style="margin: 8px 0;"><strong>عدد المنتجات:</strong> ${data.productCount}</p>
            <p style="margin: 8px 0;"><strong>الإجمالي:</strong> <span style="color: #c9a961; font-size: 18px; font-weight: bold;">${data.grandTotal.toFixed(2)} ريال</span></p>
          </div>

          <div style="text-align: center;">
            <a href="${data.dashboardUrl}" style="${buttonStyle("#3b82f6")}">
              مراجعة الطلب الآن
            </a>
          </div>
        </div>

        <div style="${footerStyle}">
          <p>نظام إدارة الفروع المتكامل</p>
          <p>جميع الحقوق محفوظة لـ Symbol AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function productOrderApprovedTemplate(data: {
  employeeName: string;
  productCount: number;
  grandTotal: number;
  adminResponse?: string;
  orderId: number;
}): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            ✓
          </div>
          <h1 style="${titleStyle}">تمت الموافقة على طلب المنتجات</h1>
        </div>

        <div style="${contentStyle}">
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>يسرنا إبلاغك بأنه تمت الموافقة على طلب المنتجات (رقم #${data.orderId}).</p>

          <div style="${infoBoxStyle}">
            <p style="margin: 8px 0;"><strong>عدد المنتجات:</strong> ${data.productCount}</p>
            <p style="margin: 8px 0;"><strong>الإجمالي:</strong> <span style="color: #c9a961; font-size: 18px; font-weight: bold;">${data.grandTotal.toFixed(2)} ريال</span></p>
          </div>

          ${data.adminResponse ? `
            <div style="${infoBoxStyle}">
              <p style="margin: 0;"><strong>رد الإدارة:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.adminResponse}</p>
            </div>
          ` : ''}

          <p>سيتم تجهيز المنتجات وإبلاغك عند جاهزيتها للاستلام.</p>
        </div>

        <div style="${footerStyle}">
          <p>نظام إدارة الفروع المتكامل</p>
          <p>جميع الحقوق محفوظة لـ Symbol AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function productOrderRejectedTemplate(data: {
  employeeName: string;
  productCount: number;
  grandTotal: number;
  adminResponse?: string;
  orderId: number;
}): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            ✗
          </div>
          <h1 style="${titleStyle}">تم رفض طلب المنتجات</h1>
        </div>

        <div style="${contentStyle}">
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>نأسف لإبلاغك بأنه تم رفض طلب المنتجات (رقم #${data.orderId}).</p>

          <div style="${infoBoxStyle}">
            <p style="margin: 8px 0;"><strong>عدد المنتجات:</strong> ${data.productCount}</p>
            <p style="margin: 8px 0;"><strong>الإجمالي:</strong> ${data.grandTotal.toFixed(2)} ريال</p>
          </div>

          ${data.adminResponse ? `
            <div style="${infoBoxStyle}">
              <p style="margin: 0;"><strong>سبب الرفض:</strong></p>
              <p style="margin: 10px 0 0 0;">${data.adminResponse}</p>
            </div>
          ` : ''}

          <p>يمكنك التواصل مع الإدارة لمزيد من التوضيحات أو تقديم طلب جديد.</p>
        </div>

        <div style="${footerStyle}">
          <p>نظام إدارة الفروع المتكامل</p>
          <p>جميع الحقوق محفوظة لـ Symbol AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function productOrderDeliveredTemplate(data: {
  employeeName: string;
  productCount: number;
  grandTotal: number;
  orderId: number;
}): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle}">
      <div style="${cardStyle}">
        <div style="${headerStyle}">
          <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center; font-size: 30px;">
            📦
          </div>
          <h1 style="${titleStyle}">تم تسليم طلبك</h1>
        </div>

        <div style="${contentStyle}">
          <p>عزيزي/عزيزتي <strong>${data.employeeName}</strong>،</p>
          
          <p>نود إبلاغك بأن طلب المنتجات (رقم #${data.orderId}) جاهز للاستلام.</p>

          <div style="${infoBoxStyle}">
            <p style="margin: 8px 0;"><strong>عدد المنتجات:</strong> ${data.productCount}</p>
            <p style="margin: 8px 0;"><strong>الإجمالي:</strong> <span style="color: #c9a961; font-size: 18px; font-weight: bold;">${data.grandTotal.toFixed(2)} ريال</span></p>
          </div>

          <p>يرجى التوجه إلى قسم المستودعات لاستلام طلبك.</p>
          
          <p style="color: #888; font-size: 14px; margin-top: 20px;">شكراً لاستخدامك نظام إدارة الفروع المتكامل.</p>
        </div>

        <div style="${footerStyle}">
          <p>نظام إدارة الفروع المتكامل</p>
          <p>جميع الحقوق محفوظة لـ Symbol AI</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
