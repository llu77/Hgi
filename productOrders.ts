import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { productOrders, requestAuditLog } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendEmail } from "../email";
import {
  productOrderApprovedTemplate,
  productOrderRejectedTemplate,
  productOrderDeliveredTemplate,
} from "../emailTemplates";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const productSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  quantity: z.number().min(1, "الكمية يجب أن تكون أكبر من صفر"),
  price: z.number().min(0.01, "السعر يجب أن يكون أكبر من صفر"),
  total: z.number(),
});

const productOrderSchema = z.object({
  products: z.array(productSchema).min(1, "يجب إضافة منتج واحد على الأقل"),
  grandTotal: z.number().min(0.01),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateProductOrder(data: any): { valid: boolean; error?: string } {
  try {
    productOrderSchema.parse(data);
    
    // Validate each product total
    for (const product of data.products) {
      const expectedTotal = product.quantity * product.price;
      if (Math.abs(product.total - expectedTotal) > 0.01) {
        return { 
          valid: false, 
          error: `إجمالي المنتج "${product.name}" غير صحيح. المتوقع: ${expectedTotal.toFixed(2)}` 
        };
      }
    }
    
    // Validate grand total
    const calculatedGrandTotal = data.products.reduce((sum: number, p: any) => sum + p.total, 0);
    if (Math.abs(data.grandTotal - calculatedGrandTotal) > 0.01) {
      return { 
        valid: false, 
        error: `الإجمالي الكلي غير صحيح. المتوقع: ${calculatedGrandTotal.toFixed(2)}` 
      };
    }
    
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || "بيانات غير صحيحة" };
  }
}

// ============================================================================
// ROUTER
// ============================================================================

export const productOrdersRouter = router({
  /**
   * Create new product order
   */
  create: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      branchName: z.string(),
      employeeName: z.string(),
      products: z.array(productSchema),
      grandTotal: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate order
      const validation = validateProductOrder({
        products: input.products,
        grandTotal: input.grandTotal,
      });
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Branch filtering for managers
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      // Create order
      const [order] = await db.insert(productOrders).values({
        branchId: effectiveBranchId!,
        branchName: input.branchName,
        employeeName: input.employeeName,
        products: JSON.stringify(input.products),
        grandTotal: input.grandTotal.toString(),
        status: "pending",
      });

      // Log audit
      await db.insert(requestAuditLog).values({
        requestType: "product_order",
        requestId: order.insertId,
        action: "created",
        newStatus: "pending",
        performedBy: ctx.user.name || ctx.user.username,
        details: `طلب منتجات تم إنشاؤه - الإجمالي: ${input.grandTotal} ريال`,
      });

      return { success: true, id: order.insertId };
    }),

  /**
   * List product orders with pagination
   */
  list: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      status: z.enum(["pending", "approved", "rejected", "delivered"]).optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Branch filtering
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      // Build where conditions
      const conditions = [];
      if (effectiveBranchId) {
        conditions.push(eq(productOrders.branchId, effectiveBranchId));
      }
      if (input.status) {
        conditions.push(eq(productOrders.status, input.status));
      }

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(productOrders)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get orders
      const orders = await db
        .select()
        .from(productOrders)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(productOrders.createdAt))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);

      // Parse JSON data
      const parsedOrders = orders.map(order => ({
        ...order,
        products: JSON.parse(order.products),
        grandTotal: parseFloat(order.grandTotal),
      }));

      return {
        orders: parsedOrders,
        total: count,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(count / input.limit),
      };
    }),

  /**
   * Get single product order by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [order] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, input.id));

      if (!order) {
        throw new Error("الطلب غير موجود");
      }

      // Branch access check
      if (ctx.user.role === "manager" && order.branchId !== ctx.user.branchId) {
        throw new Error("غير مصرح لك بعرض هذا الطلب");
      }

      return {
        ...order,
        products: JSON.parse(order.products),
        grandTotal: parseFloat(order.grandTotal),
      };
    }),

  /**
   * Update order status (Admin only)
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["approved", "rejected", "delivered"]),
      adminResponse: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Admin only
      if (ctx.user.role !== "admin") {
        throw new Error("غير مصرح لك بتحديث حالة الطلبات");
      }

      // Get current order
      const [order] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, input.id));

      if (!order) {
        throw new Error("الطلب غير موجود");
      }

      // Prepare update data
      const updateData: any = {
        status: input.status,
        adminResponse: input.adminResponse,
      };

      // Set timestamp based on status
      if (input.status === "approved") {
        updateData.approvedAt = new Date();
      } else if (input.status === "rejected") {
        updateData.rejectedAt = new Date();
      } else if (input.status === "delivered") {
        updateData.deliveredAt = new Date();
      }

      // Update status
      await db
        .update(productOrders)
        .set(updateData)
        .where(eq(productOrders.id, input.id));

      // Log audit
      await db.insert(requestAuditLog).values({
        requestType: "product_order",
        requestId: input.id,
        action: "status_changed",
        oldStatus: order.status,
        newStatus: input.status,
        performedBy: ctx.user.name || ctx.user.username,
        details: input.adminResponse || `تم تغيير الحالة إلى ${input.status}`,
      });

      // Send email notification
      try {
        const products = JSON.parse(order.products);
        const emailData = {
          employeeName: order.employeeName,
          productCount: products.length,
          grandTotal: parseFloat(order.grandTotal),
          adminResponse: input.adminResponse,
          orderId: order.id,
        };

        let template: string;
        let subject: string;

        if (input.status === "approved") {
          template = productOrderApprovedTemplate(emailData);
          subject = "تمت الموافقة على طلب المنتجات";
        } else if (input.status === "rejected") {
          template = productOrderRejectedTemplate(emailData);
          subject = "تم رفض طلب المنتجات";
        } else {
          template = productOrderDeliveredTemplate(emailData);
          subject = "تم تسليم طلبك";
        }

        // Send to info@symbolai.net (placeholder for employee email)
        await sendEmail({
          to: "info@symbolai.net",
          subject: `${subject} - ${order.employeeName}`,
          html: template,
        });
      } catch (emailError) {
        console.error("[Email] Failed to send notification:", emailError);
        // Don't fail the request if email fails
      }

      return { success: true };
    }),

  /**
   * Bulk approve product orders (Admin only)
   */
  bulkApprove: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1, "يجب اختيار طلب واحد على الأقل"),
      adminResponse: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Admin only
      if (ctx.user.role !== "admin") {
        throw new Error("غير مصرح لك بتحديث حالة الطلبات");
      }

      let successCount = 0;
      let failedCount = 0;

      for (const id of input.ids) {
        try {
          const [order] = await db
            .select()
            .from(productOrders)
            .where(eq(productOrders.id, id));

          if (!order) {
            failedCount++;
            continue;
          }

          await db
            .update(productOrders)
            .set({
              status: "approved",
              adminResponse: input.adminResponse,
              approvedAt: new Date(),
            })
            .where(eq(productOrders.id, id));

          await db.insert(requestAuditLog).values({
            requestType: "product_order",
            requestId: id,
            action: "bulk_approved",
            oldStatus: order.status,
            newStatus: "approved",
            performedBy: ctx.user.name || ctx.user.username,
            details: input.adminResponse || "تمت الموافقة الجماعية",
          });

          // Send email
          try {
            const products = JSON.parse(order.products);
            const emailData = {
              employeeName: order.employeeName,
              productCount: products.length,
              grandTotal: parseFloat(order.grandTotal),
              adminResponse: input.adminResponse,
              orderId: order.id,
            };
            const template = productOrderApprovedTemplate(emailData);
            await sendEmail({
              to: "info@symbolai.net",
              subject: `تمت الموافقة على طلب المنتجات - ${order.employeeName}`,
              html: template,
            });
          } catch (emailError) {
            console.error("[Email] Failed:", emailError);
          }

          successCount++;
        } catch (error) {
          console.error(`[Bulk Approve] Failed for ID ${id}:`, error);
          failedCount++;
        }
      }

      return { 
        success: failedCount === 0, 
        successCount, 
        failedCount,
        total: input.ids.length,
      };
    }),

  /**
   * Bulk reject product orders (Admin only)
   */
  bulkReject: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1, "يجب اختيار طلب واحد على الأقل"),
      adminResponse: z.string().min(1, "يجب إدخال سبب الرفض"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (ctx.user.role !== "admin") {
        throw new Error("غير مصرح لك بتحديث حالة الطلبات");
      }

      let successCount = 0;
      let failedCount = 0;

      for (const id of input.ids) {
        try {
          const [order] = await db
            .select()
            .from(productOrders)
            .where(eq(productOrders.id, id));

          if (!order) {
            failedCount++;
            continue;
          }

          await db
            .update(productOrders)
            .set({
              status: "rejected",
              adminResponse: input.adminResponse,
              rejectedAt: new Date(),
            })
            .where(eq(productOrders.id, id));

          await db.insert(requestAuditLog).values({
            requestType: "product_order",
            requestId: id,
            action: "bulk_rejected",
            oldStatus: order.status,
            newStatus: "rejected",
            performedBy: ctx.user.name || ctx.user.username,
            details: input.adminResponse,
          });

          // Send email
          try {
            const products = JSON.parse(order.products);
            const emailData = {
              employeeName: order.employeeName,
              productCount: products.length,
              grandTotal: parseFloat(order.grandTotal),
              adminResponse: input.adminResponse,
              orderId: order.id,
            };
            const template = productOrderRejectedTemplate(emailData);
            await sendEmail({
              to: "info@symbolai.net",
              subject: `تم رفض طلب المنتجات - ${order.employeeName}`,
              html: template,
            });
          } catch (emailError) {
            console.error("[Email] Failed:", emailError);
          }

          successCount++;
        } catch (error) {
          console.error(`[Bulk Reject] Failed for ID ${id}:`, error);
          failedCount++;
        }
      }

      return { 
        success: failedCount === 0, 
        successCount, 
        failedCount,
        total: input.ids.length,
      };
    }),
});
