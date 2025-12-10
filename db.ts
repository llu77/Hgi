import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  branches,
  users,
  employees,
  monthlyRecords,
  dailyRevenues,
  employeeRevenues,
  expenseCategories,
  expenses,
  systemLogs,
  InsertBranch,
  InsertUser,
  InsertEmployee,
  InsertMonthlyRecord,
  InsertDailyRevenue,
  InsertEmployeeRevenue,
  InsertExpenseCategory,
  InsertExpense,
  InsertSystemLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { notifyOwner } from './_core/notification';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// REVENUE MANAGEMENT
// ============================================================================

export async function getDailyRevenuesByDateRange(
  branchId: number,
  startDate: string,
  endDate: string
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get revenues: database not available");
    return [];
  }

  try {
    console.log("[DEBUG] getDailyRevenuesByDateRange called:", {
      branchId,
      startDate,
      endDate,
      startDateObj: new Date(startDate),
      endDateObj: new Date(endDate)
    });
    
    const { and, gte, lte, eq, sql } = await import("drizzle-orm");
    
    // Get daily revenues - use DATE() to compare dates only without time
    const revenues = await db
      .select()
      .from(dailyRevenues)
      .where(
        and(
          eq(dailyRevenues.branchId, branchId),
          sql`DATE(${dailyRevenues.date}) >= DATE(${startDate})`,
          sql`DATE(${dailyRevenues.date}) <= DATE(${endDate})`
        )
      )
      .orderBy(dailyRevenues.date);
    
    console.log("[DEBUG] Found revenues:", revenues.length, revenues);

    // Get employee revenues for each daily revenue
    const revenuesWithEmployees = await Promise.all(
      revenues.map(async (revenue) => {
        const empRevenues = await db
          .select({
            id: employeeRevenues.id,
            employeeId: employeeRevenues.employeeId,
            employeeName: employees.name,
            cash: employeeRevenues.cash,
            network: employeeRevenues.network,
            total: employeeRevenues.total,
          })
          .from(employeeRevenues)
          .leftJoin(employees, eq(employeeRevenues.employeeId, employees.id))
          .where(eq(employeeRevenues.dailyRevenueId, revenue.id));

        return {
          ...revenue,
          employeeRevenues: empRevenues,
        };
      })
    );

    return revenuesWithEmployees;
  } catch (error) {
    console.error("[Database] Failed to get daily revenues:", error);
    throw error;
  }
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      username: user.username || user.openId, // Use openId as fallback for username
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.branchId !== undefined) {
      values.branchId = user.branchId;
      updateSet.branchId = user.branchId;
    }

    // Check if this is a new user registration
    const existingUser = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);
    const isNewUser = existingUser.length === 0;

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });

    // Notify owner of new user registration
    if (isNewUser && user.openId !== ENV.ownerOpenId) {
      await notifyOwner({
        title: "New User Registration",
        content: `A new user has registered: ${user.name || user.email || user.openId}`,
      }).catch(err => console.error('Failed to send registration notification:', err));
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(users).values(user);
  return result;
}

export async function updateUserLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "admin" | "manager" | "employee") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUser(userId: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set(data).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(users).set({ isActive: false }).where(eq(users.id, userId));
}

// ============================================================================
// BRANCH MANAGEMENT
// ============================================================================

export async function createBranch(branch: InsertBranch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(branches).values(branch);
}

export async function getBranches() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
}

export async function getBranchById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
  return result[0];
}

export async function updateBranch(id: number, data: Partial<InsertBranch>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(branches).set(data).where(eq(branches.id, id));
}

// ============================================================================
// EMPLOYEE MANAGEMENT
// ============================================================================

export async function createEmployee(employee: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(employees).values(employee);
}

export async function getAllEmployees() {
  const database = await getDb();
  if (!database) return [];
  
  return await database.select().from(employees).where(eq(employees.isActive, true));
}

export async function getEmployeesByBranch(branchId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employees)
    .where(and(eq(employees.branchId, branchId), eq(employees.isActive, true)))
    .orderBy(employees.name);
}

export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
  return result[0];
}

export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(employees).set(data).where(eq(employees.id, id));
}

// ============================================================================
// REVENUE MANAGEMENT
// ============================================================================

export async function createMonthlyRecord(record: InsertMonthlyRecord) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(monthlyRecords).values(record);
}

export async function getMonthlyRecord(branchId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(monthlyRecords)
    .where(and(
      eq(monthlyRecords.branchId, branchId),
      eq(monthlyRecords.year, year),
      eq(monthlyRecords.month, month)
    ))
    .limit(1);
  return result[0];
}

export async function createDailyRevenue(revenue: InsertDailyRevenue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(dailyRevenues).values(revenue);
}

export async function getDailyRevenues(branchId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(dailyRevenues)
    .where(and(
      eq(dailyRevenues.branchId, branchId),
      gte(dailyRevenues.date, startDate),
      lte(dailyRevenues.date, endDate)
    ))
    .orderBy(desc(dailyRevenues.date));
}

export async function createEmployeeRevenue(revenue: InsertEmployeeRevenue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(employeeRevenues).values(revenue);
}

export async function getEmployeeRevenuesByDaily(dailyRevenueId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(employeeRevenues)
    .where(eq(employeeRevenues.dailyRevenueId, dailyRevenueId));
}

// ============================================================================
// EXPENSE MANAGEMENT
// ============================================================================

export async function createExpenseCategory(category: InsertExpenseCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(expenseCategories).values(category);
}

export async function getExpenseCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenseCategories)
    .where(eq(expenseCategories.isActive, true))
    .orderBy(expenseCategories.sortOrder);
}

export async function createExpense(expense: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(expenses).values(expense);
}

export async function getExpenses(branchId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenses)
    .where(and(
      eq(expenses.branchId, branchId),
      gte(expenses.date, startDate),
      lte(expenses.date, endDate),
      sql`${expenses.deletedAt} IS NULL`
    ))
    .orderBy(desc(expenses.date));
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function softDeleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, id));
}

/**
 * Get recent expenses with category and branch details
 */
export async function getRecentExpenses(branchId: number | null, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [sql`${expenses.deletedAt} IS NULL`];
  if (branchId !== null) {
    conditions.push(eq(expenses.branchId, branchId));
  }
  
  return await db.select({
    id: expenses.id,
    date: expenses.date,
    amount: expenses.amount,
    paymentType: expenses.paymentType,
    description: expenses.description,
    receiptNumber: expenses.receiptNumber,
    branchId: expenses.branchId,
    branchName: branches.nameAr,
    categoryId: expenses.categoryId,
    categoryName: expenseCategories.nameAr,
    categoryIcon: expenseCategories.icon,
    categoryColor: expenseCategories.color,
    createdAt: expenses.createdAt,
  })
  .from(expenses)
  .leftJoin(branches, eq(expenses.branchId, branches.id))
  .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
  .where(and(...conditions))
  .orderBy(desc(expenses.date), desc(expenses.createdAt))
  .limit(limit);
}

/**
 * Get expenses by date range with category details
 */
export async function getExpensesByDateRange(
  branchId: number | null,
  startDate: string,
  endDate: string
) {
  const db = await getDb();
  if (!db) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const conditions = [
    gte(expenses.date, start),
    lte(expenses.date, end),
    sql`${expenses.deletedAt} IS NULL`
  ];
  
  if (branchId !== null) {
    conditions.push(eq(expenses.branchId, branchId));
  }
  
  return await db.select({
    id: expenses.id,
    date: expenses.date,
    amount: expenses.amount,
    paymentType: expenses.paymentType,
    description: expenses.description,
    receiptNumber: expenses.receiptNumber,
    branchId: expenses.branchId,
    branchName: branches.nameAr,
    categoryId: expenses.categoryId,
    categoryName: expenseCategories.nameAr,
    categoryIcon: expenseCategories.icon,
    categoryColor: expenseCategories.color,
  })
  .from(expenses)
  .leftJoin(branches, eq(expenses.branchId, branches.id))
  .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
  .where(and(...conditions))
  .orderBy(desc(expenses.date));
}

/**
 * Get expenses grouped by category
 */
export async function getExpensesByCategory(
  branchId: number | null,
  startDate: string,
  endDate: string
) {
  const db = await getDb();
  if (!db) return [];
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const conditions = [
    gte(expenses.date, start),
    lte(expenses.date, end),
    sql`${expenses.deletedAt} IS NULL`
  ];
  
  if (branchId !== null) {
    conditions.push(eq(expenses.branchId, branchId));
  }
  
  return await db.select({
    categoryId: expenses.categoryId,
    categoryName: expenseCategories.nameAr,
    categoryIcon: expenseCategories.icon,
    categoryColor: expenseCategories.color,
    totalAmount: sql<string>`SUM(${expenses.amount})`.as('total_amount'),
    count: sql<number>`COUNT(*)`.as('count'),
  })
  .from(expenses)
  .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
  .where(and(...conditions))
  .groupBy(expenses.categoryId, expenseCategories.nameAr, expenseCategories.icon, expenseCategories.color)
  .orderBy(desc(sql`SUM(${expenses.amount})`));
}

/**
 * Get total expenses for a period
 */
export async function getTotalExpenses(
  branchId: number | null,
  startDate: string,
  endDate: string
) {
  const db = await getDb();
  if (!db) return "0.00";
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const conditions = [
    gte(expenses.date, start),
    lte(expenses.date, end),
    sql`${expenses.deletedAt} IS NULL`
  ];
  
  if (branchId !== null) {
    conditions.push(eq(expenses.branchId, branchId));
  }
  
  const result = await db.select({
    total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`.as('total'),
  })
  .from(expenses)
  .where(and(...conditions));
  
  return result[0]?.total || "0.00";
}

// ============================================================================
// SYSTEM LOGS
// ============================================================================

export async function createSystemLog(log: InsertSystemLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(systemLogs).values(log);
}

export async function getSystemLogs(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(systemLogs).orderBy(desc(systemLogs.createdAt)).limit(limit);
}

export async function getSystemLogsByLevel(level: "info" | "warning" | "error" | "critical", limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(systemLogs).where(eq(systemLogs.level, level)).orderBy(desc(systemLogs.createdAt)).limit(limit);
}
