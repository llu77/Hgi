/**
 * Smart Recipient System for Email Notifications
 * Determines who should receive notifications based on branch and role
 */

import { getDb } from "./db";
import { users, branches } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get email of the branch manager
 * @param branchId - Branch ID
 * @returns Email address or null if not found
 */
export async function getBranchManagerEmail(branchId: number): Promise<string | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    
    const result = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(
        and(
          eq(users.branchId, branchId),
          eq(users.role, "manager")
        )
      )
      .limit(1);

    const email = result[0]?.email;
    if (!email) {
      console.warn(`[Notifications] No manager email found for branch ${branchId}`);
      return null;
    }

    return email;
  } catch (error) {
    console.error(`[Notifications] Error fetching branch manager email:`, error);
    return null;
  }
}

/**
 * Get branch manager's name
 * @param branchId - Branch ID
 * @returns Manager name or "المدير" as fallback
 */
export async function getBranchManagerName(branchId: number): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "المدير";
    
    const result = await db
      .select({
        name: users.name,
      })
      .from(users)
      .where(
        and(
          eq(users.branchId, branchId),
          eq(users.role, "manager")
        )
      )
      .limit(1);

    return result[0]?.name || "المدير";
  } catch (error) {
    console.error(`[Notifications] Error fetching branch manager name:`, error);
    return "المدير";
  }
}

/**
 * Get all admin emails
 * @returns Array of admin email addresses
 */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) return ["info@symbolai.net"];
    
    const admins = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "admin"));

    const emails = admins
      .map((admin) => admin.email)
      .filter((email): email is string => email !== null && email !== undefined);

    if (emails.length === 0) {
      console.warn("[Notifications] No admin emails found");
      // Fallback to the provided email
      return ["info@symbolai.net"];
    }

    return emails;
  } catch (error) {
    console.error("[Notifications] Error fetching admin emails:", error);
    return ["info@symbolai.net"]; // Fallback
  }
}

/**
 * Get recipients for a specific branch (manager + admins)
 * @param branchId - Branch ID
 * @returns Array of email addresses
 */
export async function getRecipientsForBranch(branchId: number): Promise<string[]> {
  const recipients: string[] = [];

  // Get branch manager email
  const managerEmail = await getBranchManagerEmail(branchId);
  if (managerEmail) {
    recipients.push(managerEmail);
  }

  // Get all admin emails
  const adminEmails = await getAdminEmails();
  recipients.push(...adminEmails);

  // Remove duplicates
  return Array.from(new Set(recipients));
}

/**
 * Get all recipients (all admins + all branch managers)
 * @returns Array of email addresses
 */
export async function getRecipientsForAll(): Promise<string[]> {
  const recipients: string[] = [];

  // Get all admin emails
  const adminEmails = await getAdminEmails();
  recipients.push(...adminEmails);

  // Get all branch managers
  try {
    const db = await getDb();
    if (!db) return recipients;
    
    const managers = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "manager"));

    const managerEmails = managers
      .map((m) => m.email)
      .filter((email): email is string => email !== null && email !== undefined);

    recipients.push(...managerEmails);
  } catch (error) {
    console.error("[Notifications] Error fetching all branch managers:", error);
  }

  // Remove duplicates
  return Array.from(new Set(recipients));
}

/**
 * Get branch name by ID
 * @param branchId - Branch ID
 * @returns Branch name or "الفرع" as fallback
 */
export async function getBranchName(branchId: number): Promise<string> {
  try {
    const db = await getDb();
    if (!db) return "الفرع";
    
    const result = await db
      .select({
        name: branches.name,
      })
      .from(branches)
      .where(eq(branches.id, branchId))
      .limit(1);

    return result[0]?.name || "الفرع";
  } catch (error) {
    console.error(`[Notifications] Error fetching branch name:`, error);
    return "الفرع";
  }
}

/**
 * Log notification sent
 * @param type - Notification type
 * @param recipients - Email addresses
 * @param success - Whether the notification was sent successfully
 */
export function logNotification(
  type: string,
  recipients: string[],
  success: boolean
): void {
  const status = success ? "✅ SENT" : "❌ FAILED";
  console.log(
    `[Notifications] ${status} | Type: ${type} | Recipients: ${recipients.join(", ")}`
  );
}
