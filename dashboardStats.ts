import { getDb } from "./db";
import { dailyRevenues, expenses } from "../drizzle/schema";
import { sql, and, eq, sum, desc } from "drizzle-orm";

/**
 * Get financial statistics for dashboard
 * Calculates real data from database
 */
export async function getDashboardStats(branchId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Calculate total revenues
  const revenueQuery = db
    .select({
      totalCash: sum(dailyRevenues.cash),
      totalNetwork: sum(dailyRevenues.network),
      totalRevenue: sum(dailyRevenues.total),
    })
    .from(dailyRevenues);

  if (branchId) {
    revenueQuery.where(eq(dailyRevenues.branchId, branchId));
  }

  const revenueResult = await revenueQuery;
  const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
  const totalCash = Number(revenueResult[0]?.totalCash || 0);
  const totalNetwork = Number(revenueResult[0]?.totalNetwork || 0);

  // Calculate total expenses
  const expenseQuery = db
    .select({
      totalExpenses: sum(expenses.amount),
    })
    .from(expenses);

  if (branchId) {
    expenseQuery.where(eq(expenses.branchId, branchId));
  }

  const expenseResult = await expenseQuery;
  const totalExpenses = Number(expenseResult[0]?.totalExpenses || 0);

  // Calculate net profit (revenue - expenses)
  const netProfit = totalRevenue - totalExpenses;

  // Get matched vs unmatched revenues count
  const matchedQuery = db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(dailyRevenues)
    .where(
      branchId
        ? and(eq(dailyRevenues.branchId, branchId), eq(dailyRevenues.isMatched, true))
        : eq(dailyRevenues.isMatched, true)
    );

  const unmatchedQuery = db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(dailyRevenues)
    .where(
      branchId
        ? and(eq(dailyRevenues.branchId, branchId), eq(dailyRevenues.isMatched, false))
        : eq(dailyRevenues.isMatched, false)
    );

  const matchedResult = await matchedQuery;
  const unmatchedResult = await unmatchedQuery;

  const matchedCount = Number(matchedResult[0]?.count || 0);
  const unmatchedCount = Number(unmatchedResult[0]?.count || 0);

  return {
    totalRevenue,
    totalCash,
    totalNetwork,
    totalExpenses,
    netProfit,
    cashBalance: totalCash, // Cash balance is total cash from revenues
    matchedCount,
    unmatchedCount,
  };
}

/**
 * Get recent daily revenues for activity log
 */
export async function getRecentRevenues(branchId?: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const query = db
    .select()
    .from(dailyRevenues)
    .orderBy(sql`${dailyRevenues.createdAt} DESC`)
    .limit(limit);

  if (branchId) {
    query.where(eq(dailyRevenues.branchId, branchId));
  }

  return await query;
}

/**
 * Get revenue trend for last N days
 */
export async function getRevenueTrend(branchId?: number, days: number = 7) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];

  const query = db
    .select({
      date: sql<string>`DATE(${dailyRevenues.date})`,
      totalRevenue: sum(dailyRevenues.total),
    })
    .from(dailyRevenues)
    .where(
      branchId
        ? and(eq(dailyRevenues.branchId, branchId), sql`${dailyRevenues.date} >= ${startDateStr}`)
        : sql`${dailyRevenues.date} >= ${startDateStr}`
    )
    .groupBy(sql`DATE(${dailyRevenues.date})`)
    .orderBy(sql`DATE(${dailyRevenues.date})`);

  return await query;
}

/**
 * Get top expense categories by total amount
 */
export async function getTopExpenseCategories(branchId?: number, limit: number = 5) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { expenseCategories } = await import("../drizzle/schema");

  const query = db
    .select({
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.nameAr,
      total: sum(expenses.amount),
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .groupBy(expenses.categoryId, expenseCategories.nameAr)
    .orderBy(desc(sum(expenses.amount)))
    .limit(limit);

  if (branchId) {
    query.where(eq(expenses.branchId, branchId));
  }

  return await query;
}

/**
 * Get recent expenses for activity log
 */
export async function getRecentExpenses(branchId?: number, limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const query = db
    .select()
    .from(expenses)
    .orderBy(sql`${expenses.createdAt} DESC`)
    .limit(limit);

  if (branchId) {
    query.where(eq(expenses.branchId, branchId));
  }

  return await query;
}
