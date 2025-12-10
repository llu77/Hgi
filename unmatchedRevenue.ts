/**
 * Trigger: Unmatched Revenue Alert
 * Sends email notification when a daily revenue entry doesn't match
 */

import { sendEmail } from "../email";
import { getRecipientsForBranch, getBranchName, logNotification } from "../notifications";
import { generateUnmatchedRevenueAlert } from "../emailTemplates/unmatchedRevenueAlert";

interface UnmatchedRevenueData {
  branchId: number;
  date: string;
  cash: string;
  network: string;
  balance: string;
  total: string;
  unmatchReason: string;
}

export async function sendUnmatchedRevenueAlert(data: UnmatchedRevenueData): Promise<void> {
  try {
    // Get recipients (branch manager + admins)
    const recipients = await getRecipientsForBranch(data.branchId);
    
    if (recipients.length === 0) {
      console.warn("[Trigger] No recipients found for unmatched revenue alert");
      return;
    }

    // Get branch name and manager name
    const branchName = await getBranchName(data.branchId);
    const { getBranchManagerName } = await import("../notifications");
    const managerName = await getBranchManagerName(data.branchId);

    // Generate email HTML
    const html = generateUnmatchedRevenueAlert({
      branchName,
      managerName,
      date: data.date,
      cash: parseFloat(data.cash),
      network: parseFloat(data.network),
      balance: parseFloat(data.balance),
      total: parseFloat(data.total),
      unmatchReason: data.unmatchReason,
    });

    // Send email
    const result = await sendEmail({
      to: recipients,
      subject: `⚠️ تنبيه: إيراد غير متطابق - ${branchName}`,
      html,
    });

    logNotification("Unmatched Revenue Alert", recipients, result.success);
  } catch (error) {
    console.error("[Trigger] Error sending unmatched revenue alert:", error);
  }
}
