import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employeeRequests, productOrders } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

// ============================================================================
// ANALYTICS ROUTER
// ============================================================================

export const analyticsRouter = router({
  /**
   * Get overall request statistics
   */
  getRequestStatistics: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Branch filtering
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      // Build date conditions
      const dateConditions = [];
      if (input.startDate) {
        dateConditions.push(gte(employeeRequests.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        dateConditions.push(lte(employeeRequests.createdAt, new Date(input.endDate)));
      }

      // Employee Requests Statistics
      const requestConditions = [];
      if (effectiveBranchId) {
        requestConditions.push(eq(employeeRequests.branchId, effectiveBranchId));
      }
      requestConditions.push(...dateConditions);

      const [requestStats] = await db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status = 'تحت الإجراء' then 1 else 0 end)`,
          approved: sql<number>`sum(case when status = 'مقبول' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when status = 'مرفوض' then 1 else 0 end)`,
        })
        .from(employeeRequests)
        .where(requestConditions.length > 0 ? and(...requestConditions) : undefined);

      // Product Orders Statistics
      const orderConditions = [];
      if (effectiveBranchId) {
        orderConditions.push(eq(productOrders.branchId, effectiveBranchId));
      }
      if (input.startDate) {
        orderConditions.push(gte(productOrders.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        orderConditions.push(lte(productOrders.createdAt, new Date(input.endDate)));
      }

      const [orderStats] = await db
        .select({
          total: sql<number>`count(*)`,
          pending: sql<number>`sum(case when status = 'pending' then 1 else 0 end)`,
          approved: sql<number>`sum(case when status = 'approved' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when status = 'rejected' then 1 else 0 end)`,
          delivered: sql<number>`sum(case when status = 'delivered' then 1 else 0 end)`,
          totalValue: sql<number>`sum(grand_total)`,
        })
        .from(productOrders)
        .where(orderConditions.length > 0 ? and(...orderConditions) : undefined);

      return {
        employeeRequests: {
          total: requestStats.total || 0,
          pending: requestStats.pending || 0,
          approved: requestStats.approved || 0,
          rejected: requestStats.rejected || 0,
          approvalRate: requestStats.total > 0 
            ? ((requestStats.approved || 0) / requestStats.total * 100).toFixed(1)
            : "0.0",
        },
        productOrders: {
          total: orderStats.total || 0,
          pending: orderStats.pending || 0,
          approved: orderStats.approved || 0,
          rejected: orderStats.rejected || 0,
          delivered: orderStats.delivered || 0,
          totalValue: orderStats.totalValue || 0,
          approvalRate: orderStats.total > 0 
            ? ((orderStats.approved || 0) / orderStats.total * 100).toFixed(1)
            : "0.0",
        },
      };
    }),

  /**
   * Get request trends over time (last 30 days)
   */
  getRequestTrends: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      days: z.number().default(30),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Branch filtering
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);

      // Employee Requests Trends
      const requestConditions = [gte(employeeRequests.createdAt, startDate)];
      if (effectiveBranchId) {
        requestConditions.push(eq(employeeRequests.branchId, effectiveBranchId));
      }

      const requestTrends = await db
        .select({
          date: sql<string>`DATE(created_at)`,
          total: sql<number>`count(*)`,
          approved: sql<number>`sum(case when status = 'مقبول' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when status = 'مرفوض' then 1 else 0 end)`,
        })
        .from(employeeRequests)
        .where(and(...requestConditions))
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at)`);

      // Product Orders Trends
      const orderConditions = [gte(productOrders.createdAt, startDate)];
      if (effectiveBranchId) {
        orderConditions.push(eq(productOrders.branchId, effectiveBranchId));
      }

      const orderTrends = await db
        .select({
          date: sql<string>`DATE(created_at)`,
          total: sql<number>`count(*)`,
          approved: sql<number>`sum(case when status = 'approved' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when status = 'rejected' then 1 else 0 end)`,
          delivered: sql<number>`sum(case when status = 'delivered' then 1 else 0 end)`,
          totalValue: sql<number>`sum(grand_total)`,
        })
        .from(productOrders)
        .where(and(...orderConditions))
        .groupBy(sql`DATE(created_at)`)
        .orderBy(sql`DATE(created_at)`);

      return {
        employeeRequests: requestTrends,
        productOrders: orderTrends,
      };
    }),

  /**
   * Get approval rates by request type
   */
  getApprovalRatesByType: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Branch filtering
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      const conditions = [];
      if (effectiveBranchId) {
        conditions.push(eq(employeeRequests.branchId, effectiveBranchId));
      }
      if (input.startDate) {
        conditions.push(gte(employeeRequests.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(employeeRequests.createdAt, new Date(input.endDate)));
      }

      const ratesByType = await db
        .select({
          requestType: employeeRequests.requestType,
          total: sql<number>`count(*)`,
          approved: sql<number>`sum(case when status = 'مقبول' then 1 else 0 end)`,
          rejected: sql<number>`sum(case when status = 'مرفوض' then 1 else 0 end)`,
          pending: sql<number>`sum(case when status = 'تحت الإجراء' then 1 else 0 end)`,
        })
        .from(employeeRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(employeeRequests.requestType);

      return ratesByType.map(item => ({
        ...item,
        approvalRate: item.total > 0 
          ? ((item.approved / item.total) * 100).toFixed(1)
          : "0.0",
      }));
    }),

  /**
   * Get top requested products
   */
  getTopProducts: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      limit: z.number().default(10),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Branch filtering
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      const conditions = [];
      if (effectiveBranchId) {
        conditions.push(eq(productOrders.branchId, effectiveBranchId));
      }

      // Get all orders
      const orders = await db
        .select()
        .from(productOrders)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Parse products and aggregate
      const productMap = new Map<string, { name: string; totalQuantity: number; totalOrders: number }>();

      for (const order of orders) {
        const products = JSON.parse(order.products);
        for (const product of products) {
          const existing = productMap.get(product.name);
          if (existing) {
            existing.totalQuantity += product.quantity;
            existing.totalOrders += 1;
          } else {
            productMap.set(product.name, {
              name: product.name,
              totalQuantity: product.quantity,
              totalOrders: 1,
            });
          }
        }
      }

      // Convert to array and sort
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, input.limit);

      return topProducts;
    }),

  /**
   * Get average processing time for requests
   */
  getAverageProcessingTime: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Branch filtering
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      const conditions = [];
      if (effectiveBranchId) {
        conditions.push(eq(employeeRequests.branchId, effectiveBranchId));
      }

      // Get requests with response time
      const requests = await db
        .select({
          id: employeeRequests.id,
          createdAt: employeeRequests.createdAt,
          respondedAt: employeeRequests.respondedAt,
          status: employeeRequests.status,
        })
        .from(employeeRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Calculate processing times
      const processedRequests = requests.filter(r => r.respondedAt);
      const totalProcessingTime = processedRequests.reduce((sum, r) => {
        const created = new Date(r.createdAt).getTime();
        const responded = new Date(r.respondedAt!).getTime();
        return sum + (responded - created);
      }, 0);

      const avgProcessingTimeMs = processedRequests.length > 0 
        ? totalProcessingTime / processedRequests.length 
        : 0;

      const avgProcessingDays = (avgProcessingTimeMs / (1000 * 60 * 60 * 24)).toFixed(1);

      return {
        totalRequests: requests.length,
        processedRequests: processedRequests.length,
        pendingRequests: requests.filter(r => r.status === "تحت الإجراء").length,
        averageProcessingDays: avgProcessingDays,
        averageProcessingHours: (parseFloat(avgProcessingDays) * 24).toFixed(1),
      };
    }),
});
