import { Resend } from "resend";

// Initialize Resend client with API key
const resend = new Resend("re_bjDNqVhz_LJtADHynKBY1rAEpqRt87Lx3");

/**
 * Send email using Resend API
 * @param to - Recipient email address(es)
 * @param subject - Email subject
 * @param html - HTML content
 * @param from - Sender email (default: info@symbolai.net)
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = "Symbol AI <info@symbolai.net>",
}: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Failed to send:", error);
      return { success: false, error: error.message };
    }

    console.log("[Email] Sent successfully:", data?.id);
    return { success: true };
  } catch (error) {
    console.error("[Email] Exception:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Send email to multiple recipients
 */
export async function sendBulkEmail({
  recipients,
  subject,
  html,
  from = "Symbol AI <info@symbolai.net>",
}: {
  recipients: string[];
  subject: string;
  html: string;
  from?: string;
}): Promise<{ success: boolean; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const to of recipients) {
    const result = await sendEmail({ to, subject, html, from });
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { success: failed === 0, sent, failed };
}
