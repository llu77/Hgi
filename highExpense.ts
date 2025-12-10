/**
 * Trigger: High Expense Alert
 * Sends email notification when an expense exceeds 1000 SAR
 */

import { sendEmail } from "../email";
import { getRecipientsForBranch, getBranchName, getBranchManagerName, logNotification } from "../notifications";
import { generateHighExpenseAlert } from "../emailTemplates/highExpenseAlert";

interface HighExpenseData {
  branchId: number;
  amount: string;
  category: string;
  date: string;
  description?: string;
}

const HIGH_EXPENSE_THRESHOLD = 1000;

export async function sendHighExpenseAlert(data: HighExpenseData): Promise<void> {
  try {
    const amount = parseFloat(data.amount);
    
    // Only send alert if amount exceeds threshold
    if (amount < HIGH_EXPENSE_THRESHOLD) {
      return;
    }

    // Get recipients (branch manager + admins)
    const recipients = await getRecipientsForBranch(data.branchId);
    
    if (recipients.length === 0) {
      console.warn("[Trigger] No recipients found for high expense alert");
      return;
    }

    // Get branch name and manager name
    const branchName = await getBranchName(data.branchId);
    const managerName = await getBranchManagerName(data.branchId);

    // Generate email HTML
    const html = generateHighExpenseAlert({
      branchName,
      managerName,
      amount,
      category: data.category,
      date: data.date,
      description: data.description || "لا يوجد وصف",
    });

    // Send email
    const result = await sendEmail({
      to: recipients,
      subject: `💸 تنبيه: مصروف عالي - ${branchName}`,
      html,
    });

    logNotification("High Expense Alert", recipients, result.success);
  } catch (error) {
    console.error("[Trigger] Error sending high expense alert:", error);
  }
}
