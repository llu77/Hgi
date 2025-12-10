import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as github from "./github";
import * as cloudflare from "./cloudflare";
import { employeeRequestsRouter } from "./routers/employeeRequests";
import { productOrdersRouter } from "./routers/productOrders";
import { analyticsRouter } from "./routers/analytics";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Manager or Admin procedure
const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'manager') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Manager or admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { authenticateUser, generateToken } = await import("./auth");
        
        const user = await authenticateUser(input.username, input.password);
        
        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'اسم المستخدم أو كلمة المرور غير صحيحة',
          });
        }
        
        if (!user.isActive) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'هذا الحساب غير نشط',
          });
        }
        
        // Generate JWT token
        const token = await generateToken({
          id: user.id,
          username: user.username!,
          role: user.role,
          branchId: user.branchId,
        });
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
        
        return {
          success: true,
          user: {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            branchId: user.branchId,
          },
        };
      }),
    
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Branch Management
  branches: router({
    list: protectedProcedure.query(async () => {
      return await db.getBranches();
    }),
    
    create: managerProcedure
      .input(z.object({
        code: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        nameAr: z.string().min(1).max(255),
        address: z.string().optional(),
        phone: z.string().max(50).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createBranch(input);
        
        await db.createSystemLog({
          level: "info",
          category: "branches",
          message: `Branch created: ${input.name}`,
          userId: ctx.user.id,
        });
        
        return { success: true };
      }),
  }),

  // Employee Management
  employees: router({
    list: protectedProcedure
      .input(z.object({ branchId: z.number().optional() }).optional())
      .query(async ({ input, ctx }) => {
        // If branchId provided, use it; otherwise if manager, use their branch
        const branchId = input?.branchId || (ctx.user.role === 'manager' ? ctx.user.branchId : undefined);
        
        if (branchId) {
          return await db.getEmployeesByBranch(branchId);
        }
        
        // Admin without branchId filter - return all employees
        return await db.getAllEmployees();
      }),
    
    listByBranch: protectedProcedure
      .input(z.object({ branchId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEmployeesByBranch(input.branchId);
      }),
    
    create: managerProcedure
      .input(z.object({
        code: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        branchId: z.number(),
        phone: z.string().max(50).optional(),
        position: z.string().max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createEmployee(input);
        
        await db.createSystemLog({
          level: "info",
          category: "employees",
          message: `Employee created: ${input.name}`,
          userId: ctx.user.id,
        });
        
        return { success: true };
      }),
  }),

  // Revenue Management
  revenues: router({
    // List all daily revenues with optional filters
    list: protectedProcedure
      .input(z.object({
        branchId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getDailyRevenuesList } = await import('./revenue/db');
        
        // For managers, force their branch ID
        const effectiveBranchId = ctx.user.role === 'manager' 
          ? ctx.user.branchId! 
          : input.branchId;
        
        return await getDailyRevenuesList({
          branchId: effectiveBranchId,
          startDate: input.startDate,
          endDate: input.endDate,
        });
      }),

    // Get revenues by date range
    getByDateRange: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input, ctx }) => {
        // For managers, force their branch ID
        const effectiveBranchId = ctx.user.role === 'manager' 
          ? ctx.user.branchId! 
          : input.branchId;
        
        const revenues = await db.getDailyRevenuesByDateRange(
          effectiveBranchId,
          input.startDate,
          input.endDate
        );
        
        return revenues;
      }),

    // Create daily revenue entry
    createDaily: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        date: z.string().datetime(),
        cash: z.string(), // decimal as string
        network: z.string(),
        balance: z.string(),
        total: z.string(),
        isMatched: z.boolean(),
        unmatchReason: z.string().optional(),
        employeeRevenues: z.array(z.object({
          employeeId: z.number(),
          cash: z.string(),
          network: z.string(),
          total: z.string(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get or create monthly record
        const date = new Date(input.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        
        let monthlyRecord = await db.getMonthlyRecord(input.branchId, year, month);
        
        if (!monthlyRecord) {
          const startDate = new Date(year, month - 1, 1);
          const endDate = new Date(year, month, 0);
          
          await db.createMonthlyRecord({
            branchId: input.branchId,
            year,
            month,
            startDate,
            endDate,
            status: "active",
          });
          
          monthlyRecord = await db.getMonthlyRecord(input.branchId, year, month);
        }
        
        if (!monthlyRecord) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create monthly record' });
        }
        
        // Create daily revenue
        const result = await db.createDailyRevenue({
          monthlyRecordId: monthlyRecord.id,
          branchId: input.branchId,
          date: new Date(input.date),
          cash: input.cash,
          network: input.network,
          balance: input.balance,
          total: input.total,
          isMatched: input.isMatched,
          unmatchReason: input.unmatchReason,
          createdBy: ctx.user.id,
        });
        
        // Create employee revenues
        // Note: Drizzle insert returns array with insertId in first element for MySQL
        const dailyRevenueId = Number((result as any)[0]?.insertId || result);
        for (const empRev of input.employeeRevenues) {
          await db.createEmployeeRevenue({
            dailyRevenueId,
            employeeId: empRev.employeeId,
            cash: empRev.cash,
            network: empRev.network,
            total: empRev.total,
          });
          
          // Sync bonus calculation for this employee
          try {
            const { syncBonusOnRevenueChange } = await import('./bonus/sync');
            await syncBonusOnRevenueChange(
              empRev.employeeId,
              input.branchId,
              new Date(input.date)
            );
          } catch (error: any) {
            // Log error but don't fail the revenue creation
            console.error('Bonus sync error:', error.message);
            await db.createSystemLog({
              level: 'warning',
              category: 'bonus',
              message: `Bonus sync failed for employee ${empRev.employeeId}: ${error.message}`,
              userId: ctx.user.id,
            });
          }
        }
        
        await db.createSystemLog({
          level: "info",
          category: "revenues",
          message: `Daily revenue created for ${input.date}`,
          userId: ctx.user.id,
        });
        
        // Trigger notification if revenue is unmatched
        if (!input.isMatched) {
          const { sendUnmatchedRevenueAlert } = await import("./triggers/unmatchedRevenue");
          await sendUnmatchedRevenueAlert({
            branchId: input.branchId,
            date: input.date,
            cash: input.cash,
            network: input.network,
            balance: input.balance,
            total: input.total,
            unmatchReason: input.unmatchReason || "لم يتم تحديد السبب",
          });
        }
        
        return { success: true };
      }),
    
    // List daily revenues for a period
    listDaily: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }))
      .query(async ({ input }) => {
        return await db.getDailyRevenues(
          input.branchId,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
    
    // Get recent revenues for activity log
    getRecent: protectedProcedure
      .input(z.object({
        branchId: z.number().optional(),
        limit: z.number().default(10),
      }))
      .query(async ({ input, ctx }) => {
        const { getRecentRevenues } = await import("./dashboardStats");
        
        // For managers, force their branch ID
        const effectiveBranchId = ctx.user.role === 'manager' 
          ? ctx.user.branchId 
          : input.branchId;
        
        return await getRecentRevenues(effectiveBranchId || undefined, input.limit);
      }),
  }),
  
  // Dashboard Statistics
  dashboard: router({
    // Get financial statistics
    getStats: protectedProcedure
      .input(z.object({
        branchId: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getDashboardStats } = await import("./dashboardStats");
        
        // For managers, force their branch ID
        const effectiveBranchId = ctx.user.role === 'manager' 
          ? ctx.user.branchId 
          : input.branchId;
        
        return await getDashboardStats(effectiveBranchId || undefined);
      }),
    
    // Get revenue trend
    getRevenueTrend: protectedProcedure
      .input(z.object({
        branchId: z.number().optional(),
        days: z.number().default(7),
      }))
      .query(async ({ input, ctx }) => {
        const { getRevenueTrend } = await import("./dashboardStats");
        
        // For managers, force their branch ID
        const effectiveBranchId = ctx.user.role === 'manager' 
          ? ctx.user.branchId 
          : input.branchId;
        
        return await getRevenueTrend(effectiveBranchId || undefined, input.days);
      }),
    
    // Get top expense categories
    getTopExpenseCategories: protectedProcedure
      .input(z.object({
        branchId: z.number().optional(),
        limit: z.number().default(5),
      }))
      .query(async ({ input, ctx }) => {
        const { getTopExpenseCategories } = await import("./dashboardStats");
        
        // For managers, force their branch ID
        const effectiveBranchId = ctx.user.role === 'manager' 
          ? ctx.user.branchId 
          : input.branchId;
        
        return await getTopExpenseCategories(effectiveBranchId || undefined, input.limit);
      }),
  }),

  // Expense Management
  expenses: router({
    // List expense categories
    categories: protectedProcedure.query(async () => {
      return await db.getExpenseCategories();
    }),
    
    // Create expense
    create: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        categoryId: z.number(),
        date: z.string().datetime(),
        amount: z.string(), // decimal as string
        paymentType: z.enum(["cash", "network"]),
        description: z.string().optional(),
        employeeId: z.number().optional(),
        receiptNumber: z.string().max(100).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validate: if category requires employee, employeeId must be provided
        const category = (await db.getExpenseCategories()).find(c => c.id === input.categoryId);
        if (category?.requiresEmployee && !input.employeeId) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Employee selection is required for this expense category' 
          });
        }
        
        await db.createExpense({
          ...input,
          date: new Date(input.date),
          createdBy: ctx.user.id,
        });
        
        await db.createSystemLog({
          level: "info",
          category: "expenses",
          message: `Expense created: ${input.amount} (${input.paymentType})`,
          userId: ctx.user.id,
        });
        
        // Trigger notification if expense is high (> 1000 SAR)
        const { sendHighExpenseAlert } = await import("./triggers/highExpense");
        await sendHighExpenseAlert({
          branchId: input.branchId,
          amount: input.amount,
          category: category?.name || "غير محدد",
          date: input.date,
          description: input.description,
        });
        
        return { success: true };
      }),
    
    // List expenses for a period
    list: protectedProcedure
      .input(z.object({
        branchId: z.number(),
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
      }))
      .query(async ({ input }) => {
        return await db.getExpenses(
          input.branchId,
          new Date(input.startDate),
          new Date(input.endDate)
        );
      }),
    
    // Update expense
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        amount: z.string().optional(),
        paymentType: z.enum(["cash", "network"]).optional(),
        description: z.string().optional(),
        employeeId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateExpense(id, data);
        
        await db.createSystemLog({
          level: "info",
          category: "expenses",
          message: `Expense updated: ID ${id}`,
          userId: ctx.user.id,
        });
        
        return { success: true };
      }),
    
    // Soft delete expense
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.softDeleteExpense(input.id);
        
        await db.createSystemLog({
          level: "info",
          category: "expenses",
          message: `Expense deleted: ID ${input.id}`,
          userId: ctx.user.id,
        });
        
        return { success: true };
      }),
  }),

  // System monitoring and logs
  monitoring: router({
    logs: adminProcedure
      .input(z.object({
        limit: z.number().optional(),
        level: z.enum(["info", "warning", "error", "critical"]).optional(),
      }))
      .query(async ({ input }) => {
        if (input.level) {
          return await db.getSystemLogsByLevel(input.level, input.limit);
        }
        return await db.getSystemLogs(input.limit);
      }),
    
    stats: adminProcedure.query(async () => {
      const allUsers = await db.getAllUsers();
      const recentLogs = await db.getSystemLogs(10);
      
      return {
        totalUsers: allUsers.length,
        recentLogs,
      };
    }),
  }),

  // GitHub Integration
  github: router({    
    initialize: adminProcedure.mutation(async ({ ctx }) => {
      const result = await github.initializeGitHubRepo();
      
      if (result.success) {
        await db.createSystemLog({
          level: "info",
          category: "github",
          message: `GitHub repository initialized: ${result.repoUrl}`,
          userId: ctx.user.id,
        });
      }
      
      return result;
    }),
    
    backup: protectedProcedure
      .input(z.object({
        date: z.string(),
        revenues: z.array(z.any()),
        expenses: z.array(z.any()),
        summary: z.any(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await github.backupToGitHub(input);
        
        if (result.success) {
          await db.createSystemLog({
            level: "info",
            category: "github",
            message: `Backup created: ${input.date} (commit: ${result.commitSha})`,
            userId: ctx.user.id,
          });
        }
        
        return result;
      }),
    
    monthlyReport: managerProcedure
      .input(z.object({
        year: z.number(),
        month: z.number(),
        totalRevenue: z.number(),
        totalExpenses: z.number(),
        netProfit: z.number(),
        revenueBreakdown: z.any(),
        expenseBreakdown: z.any(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await github.createMonthlyReport(input);
        
        if (result.success) {
          await db.createSystemLog({
            level: "info",
            category: "github",
            message: `Monthly report created: ${input.year}-${input.month}`,
            userId: ctx.user.id,
          });
        }
        
        return result;
      }),
    
    listBackups: protectedProcedure.query(async () => {
      return await github.listBackups();
    }),
  }),

  // Cloudflare Integration
  cloudflare: router({
    // D1 Database operations
    d1: router({
      listDatabases: protectedProcedure.query(async () => {
        return await cloudflare.listD1Databases();
      }),
      
      createDatabase: adminProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const result = await cloudflare.createD1Database(input.name);
          
          await db.createSystemLog({
            level: "info",
            category: "cloudflare",
            message: `D1 database created: ${input.name}`,
            userId: ctx.user.id,
          });
          
          return result;
        }),
    }),
    
    // R2 Storage operations
    r2: router({
      listBuckets: protectedProcedure.query(async () => {
        return await cloudflare.listR2Buckets();
      }),
      
      createBucket: adminProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const result = await cloudflare.createR2Bucket(input.name);
          
          await db.createSystemLog({
            level: "info",
            category: "cloudflare",
            message: `R2 bucket created: ${input.name}`,
            userId: ctx.user.id,
          });
          
          return result;
        }),
    }),
    
    // KV Store operations
    kv: router({
      listNamespaces: protectedProcedure.query(async () => {
        return await cloudflare.listKvNamespaces();
      }),
      
      createNamespace: adminProcedure
        .input(z.object({ title: z.string() }))
        .mutation(async ({ input, ctx }) => {
          const result = await cloudflare.createKvNamespace(input.title);
          
          await db.createSystemLog({
            level: "info",
            category: "cloudflare",
            message: `KV namespace created: ${input.title}`,
            userId: ctx.user.id,
          });
          
          return result;
        }),
    }),
  }),

  // Admin user management
  admin: router({
    listUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    updateUserRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "manager", "employee"]),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.updateUserRole(input.userId, input.role);
        
        await db.createSystemLog({
          level: "info",
          category: "admin",
          message: `User role updated: User ID ${input.userId} -> ${input.role}`,
          userId: ctx.user.id,
        });
        
        return { success: true };
      }),
  }),

  // Weekly Bonus System
  bonuses: router({
    // Get current week bonus for manager's branch
    current: managerProcedure.query(async ({ ctx }) => {
      const { getCurrentWeekBonus } = await import('./bonus/db');
      
      if (!ctx.user.branchId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'User not assigned to a branch' });
      }
      
      return await getCurrentWeekBonus(ctx.user.branchId);
    }),

    // Get specific week bonus
    getWeek: managerProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        weekNumber: z.number().min(1).max(5),
      }))
      .query(async ({ input, ctx }) => {
        const { getWeeklyBonusWithDetails } = await import('./bonus/db');
        
        if (!ctx.user.branchId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'User not assigned to a branch' });
        }
        
        return await getWeeklyBonusWithDetails(
          ctx.user.branchId,
          input.year,
          input.month,
          input.weekNumber
        );
      }),

    // Calculate weekly bonus from daily revenues (Manager)
    calculate: managerProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
        weekNumber: z.number().min(1).max(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const { calculateWeeklyBonus } = await import('./bonus/db');
        
        if (!ctx.user.branchId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'User not assigned to a branch' });
        }
        
        try {
          const result = await calculateWeeklyBonus(
            ctx.user.branchId,
            input.year,
            input.month,
            input.weekNumber
          );
          
          await db.createSystemLog({
            level: 'info',
            category: 'bonus',
            message: `Weekly bonus calculated: Week ${input.weekNumber}, Month ${input.month}/${input.year}, Total: ${result.totalAmount} SAR`,
            userId: ctx.user.id,
          });
          
          return result;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'Failed to calculate bonus',
          });
        }
      }),

    // Request bonus payout (Manager)
    request: managerProcedure
      .input(z.object({
        weeklyBonusId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { requestBonusPayout } = await import('./bonus/db');
        
        try {
          const result = await requestBonusPayout(input.weeklyBonusId, ctx.user.id);
          
          await db.createSystemLog({
            level: 'info',
            category: 'bonus',
            message: `Bonus request submitted: Weekly Bonus ID ${input.weeklyBonusId}`,
            userId: ctx.user.id,
          });
          
          return result;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'Failed to request bonus',
          });
        }
      }),

    // Get bonus history with filters and statistics
    history: protectedProcedure
      .input(z.object({
        year: z.number(),
        month: z.number().min(1).max(12).optional(),
        status: z.enum(['pending', 'requested', 'approved', 'rejected']).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const { getBonusHistoryWithStats } = await import('./bonus/db');
        
        const effectiveBranchId = ctx.user.role === 'admin' ? undefined : (ctx.user.branchId || undefined);
        
        return await getBonusHistoryWithStats({
          branchId: effectiveBranchId,
          year: input.year,
          month: input.month,
          status: input.status,
        });
      }),

    // Get pending requests (Admin only)
    pending: adminProcedure.query(async () => {
      const { getPendingBonusRequests } = await import('./bonus/db');
      return await getPendingBonusRequests();
    }),

    // Approve bonus (Admin only)
    approve: adminProcedure
      .input(z.object({
        weeklyBonusId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { approveBonus } = await import('./bonus/db');
        
        try {
          const result = await approveBonus(input.weeklyBonusId, ctx.user.id);
          
          // Log to system log
          await db.createSystemLog({
            level: 'info',
            category: 'bonus',
            message: `Bonus approved: Weekly Bonus ID ${input.weeklyBonusId}`,
            userId: ctx.user.id,
          });
          
          // Log to audit trail
          const { logBonusApproval } = await import('./utils/bonusAudit');
          await logBonusApproval(input.weeklyBonusId, ctx.user.id, {
            approvedAt: new Date().toISOString(),
            approvedBy: ctx.user.username,
          });
          
          return result;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'Failed to approve bonus',
          });
        }
      }),

    // Reject bonus (Admin only)
    reject: adminProcedure
      .input(z.object({
        weeklyBonusId: z.number(),
        reason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { rejectBonus } = await import('./bonus/db');
        
        try {
          const result = await rejectBonus(
            input.weeklyBonusId,
            ctx.user.id,
            input.reason
          );
          
          // Log to system log
          await db.createSystemLog({
            level: 'info',
            category: 'bonus',
            message: `Bonus rejected: Weekly Bonus ID ${input.weeklyBonusId} - Reason: ${input.reason}`,
            userId: ctx.user.id,
          });
          
          // Log to audit trail
          const { logBonusRejection } = await import('./utils/bonusAudit');
          await logBonusRejection(input.weeklyBonusId, ctx.user.id, input.reason, {
            rejectedAt: new Date().toISOString(),
            rejectedBy: ctx.user.username,
          });
          
          return result;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message || 'Failed to reject bonus',
          });
        }
      }),

    // Manual sync trigger (Admin only)
    triggerSync: adminProcedure.mutation(async ({ ctx }) => {
      const { triggerManualSync } = await import('./jobs/syncRevenueCron');
      const { logBonusAction } = await import('./utils/bonusAudit');
      
      try {
        const result = await triggerManualSync();
        
        // Log the manual sync action
        await db.createSystemLog({
          level: 'info',
          category: 'bonus',
          message: `Manual sync triggered by admin: ${result.message}`,
          userId: ctx.user.id,
        });
        
        return result;
      } catch (error: any) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Failed to trigger sync',
        });
      }
    }),

    // Get audit history for a bonus record (Manager/Admin)
    getAuditHistory: managerProcedure
      .input(z.object({
        weeklyBonusId: z.number(),
      }))
      .query(async ({ input }) => {
        const { getBonusAuditHistory } = await import('./utils/bonusAudit');
        
        const result = await getBonusAuditHistory(input.weeklyBonusId);
        
        if (!result.success) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: result.message,
          });
        }
        
        return result.data;
      }),

    // Get weekly summary (for current user's branch)
    getWeeklySummary: protectedProcedure
      .input(z.object({
        weekNumber: z.number().min(1).max(5),
        month: z.number().min(1).max(12),
        year: z.number().min(2020),
      }))
      .query(async ({ input, ctx }) => {
        const { getWeeklyBonusWithDetails } = await import('./bonus/db');
        
        if (!ctx.user.branchId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'User not assigned to a branch',
          });
        }
        
        return await getWeeklyBonusWithDetails(
          ctx.user.branchId,
          input.weekNumber,
          input.month,
          input.year
        );
      }),
  }),
  // Employee Requests and Product Orders
  employeeRequests: employeeRequestsRouter,
  productOrders: productOrdersRouter,
  
  // Analytics
  analytics: analyticsRouter,});

export type AppRouter = typeof appRouter;
