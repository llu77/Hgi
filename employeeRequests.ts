import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employeeRequests, requestAuditLog } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { sendEmail } from "../email";
import {
  employeeRequestApprovedTemplate,
  employeeRequestRejectedTemplate,
} from "../emailTemplates";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const advanceSchema = z.object({
  amount: z.number().min(1).max(50000),
  reason: z.string().optional(),
});

const leaveSchema = z.object({
  date: z.string(), // ISO date
  days: z.number().min(1),
  reason: z.string().optional(),
});

const arrearsSchema = z.object({
  amount: z.number().min(1),
  reason: z.string().optional(),
});

const permissionSchema = z.object({
  date: z.string(), // ISO date
  startTime: z.string(), // HH:mm
  endTime: z.string(), // HH:mm
  reason: z.string().optional(),
});

const violationObjectionSchema = z.object({
  reason: z.string().min(1),
  details: z.string().min(1),
});

const resignationSchema = z.object({
  text: z.string().min(1),
  nationalId: z.string().length(14),
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateRequestData(type: string, data: any): { valid: boolean; error?: string } {
  try {
    switch (type) {
      case "advance":
        advanceSchema.parse(data);
        break;
      case "leave": {
        leaveSchema.parse(data);
        const leaveDate = new Date(data.date);
        if (leaveDate < new Date()) {
          return { valid: false, error: "تاريخ الإجازة يجب أن يكون في المستقبل" };
        }
        break;
      }
      case "arrears":
        arrearsSchema.parse(data);
        break;
      case "permission": {
        permissionSchema.parse(data);
        const start = data.startTime.split(":").map(Number);
        const end = data.endTime.split(":").map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        const duration = (endMinutes - startMinutes) / 60;
        
        if (startMinutes >= endMinutes) {
          return { valid: false, error: "وقت البداية يجب أن يكون قبل وقت النهاية" };
        }
        if (duration > 8) {
          return { valid: false, error: "مدة الاستئذان يجب أن تكون أقل من 8 ساعات" };
        }
        break;
      }
      case "violation_objection":
        violationObjectionSchema.parse(data);
        break;
      case "resignation":
        resignationSchema.parse(data);
        break;
      default:
        return { valid: false, error: "نوع الطلب غير صحيح" };
    }
    return { valid: true };
  } catch (error: any) {
    return { valid: false, error: error.message || "بيانات غير صحيحة" };
  }
}

// ============================================================================
// ROUTER
// ============================================================================

export const employeeRequestsRouter = router({
  /**
   * Create new employee request
   */
  create: protectedProcedure
    .input(z.object({
      branchId: z.number(),
      branchName: z.string(),
      employeeName: z.string(),
      requestType: z.enum(["advance", "leave", "arrears", "permission", "violation_objection", "resignation"]),
      requestData: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate request data
      const validation = validateRequestData(input.requestType, input.requestData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Branch filtering for managers
      const effectiveBranchId = ctx.user.role === "manager" 
        ? ctx.user.branchId 
        : input.branchId;

      // Create request
      const [request] = await db.insert(employeeRequests).values({
        branchId: effectiveBranchId!,
        branchName: input.branchName,
        employeeName: input.employeeName,
        requestType: input.requestType,
        requestData: JSON.stringify(input.requestData),
        status: "تحت الإجراء",
      });

      // Log audit
      await db.insert(requestAuditLog).values({
        requestType: "employee_request",
        requestId: request.insertId,
        action: "created",
        newStatus: "تحت الإجراء",
        performedBy: ctx.user.name || ctx.user.username,
        details: `طلب ${input.requestType} تم إنشاؤه`,
      });

      return { success: true, id: request.insertId };
    }),

  /**
   * List employee requests with pagination
   */
  list: protectedProcedure
    .input(z.object({
      branchId: z.number().optional(),
      status: z.enum(["تحت الإجراء", "مقبول", "مرفوض"]).optional(),
      requestType: z.enum(["advance", "leave", "arrears", "permission", "violation_objection", "resignation"]).optional(),
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
        conditions.push(eq(employeeRequests.branchId, effectiveBranchId));
      }
      if (input.status) {
        conditions.push(eq(employeeRequests.status, input.status));
      }
      if (input.requestType) {
        conditions.push(eq(employeeRequests.requestType, input.requestType));
      }

      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(employeeRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get requests
      const requests = await db
        .select()
        .from(employeeRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(employeeRequests.createdAt))
        .limit(input.limit)
        .offset((input.page - 1) * input.limit);

      // Parse JSON data
      const parsedRequests = requests.map(req => ({
        ...req,
        requestData: JSON.parse(req.requestData),
      }));

      return {
        requests: parsedRequests,
        total: count,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil(count / input.limit),
      };
    }),

  /**
   * Get single employee request by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [request] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, input.id));

      if (!request) {
        throw new Error("الطلب غير موجود");
      }

      // Branch access check
      if (ctx.user.role === "manager" && request.branchId !== ctx.user.branchId) {
        throw new Error("غير مصرح لك بعرض هذا الطلب");
      }

      return {
        ...request,
        requestData: JSON.parse(request.requestData),
      };
    }),

  /**
   * Update request status (Admin only)
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["مقبول", "مرفوض"]),
      adminResponse: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Admin only
      if (ctx.user.role !== "admin") {
        throw new Error("غير مصرح لك بتحديث حالة الطلبات");
      }

      // Get current request
      const [request] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, input.id));

      if (!request) {
        throw new Error("الطلب غير موجود");
      }

      // Update status
      await db
        .update(employeeRequests)
        .set({
          status: input.status,
          adminResponse: input.adminResponse,
          respondedAt: new Date(),
        })
        .where(eq(employeeRequests.id, input.id));

      // Log audit
      await db.insert(requestAuditLog).values({
        requestType: "employee_request",
        requestId: input.id,
        action: "status_changed",
        oldStatus: request.status,
        newStatus: input.status,
        performedBy: ctx.user.name || ctx.user.username,
        details: input.adminResponse || `تم تغيير الحالة إلى ${input.status}`,
      });

      // Send email notification
      try {
        const emailData = {
          employeeName: request.employeeName,
          requestType: request.requestType,
          adminResponse: input.adminResponse,
          requestId: request.id,
        };

        const template = input.status === "مقبول"
          ? employeeRequestApprovedTemplate(emailData)
          : employeeRequestRejectedTemplate(emailData);

        const subject = input.status === "مقبول"
          ? "تمت الموافقة على طلبك"
          : "تم رفض طلبك";

        // Send to info@symbolai.net (placeholder for employee email)
        await sendEmail({
          to: "info@symbolai.net",
          subject: `${subject} - ${request.employeeName}`,
          html: template,
        });
      } catch (emailError) {
        console.error("[Email] Failed to send notification:", emailError);
        // Don't fail the request if email fails
      }

      return { success: true };
    }),

  /**
   * Bulk approve employee requests (Admin only)
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
          // Get current request
          const [request] = await db
            .select()
            .from(employeeRequests)
            .where(eq(employeeRequests.id, id));

          if (!request) {
            failedCount++;
            continue;
          }

          // Update status
          await db
            .update(employeeRequests)
            .set({
              status: "مقبول",
              adminResponse: input.adminResponse,
              respondedAt: new Date(),
            })
            .where(eq(employeeRequests.id, id));

          // Log audit
          await db.insert(requestAuditLog).values({
            requestType: "employee_request",
            requestId: id,
            action: "bulk_approved",
            oldStatus: request.status,
            newStatus: "مقبول",
            performedBy: ctx.user.name || ctx.user.username,
            details: input.adminResponse || "تمت الموافقة الجماعية",
          });

          // Send email notification
          try {
            const emailData = {
              employeeName: request.employeeName,
              requestType: request.requestType,
              adminResponse: input.adminResponse,
              requestId: request.id,
            };

            const template = employeeRequestApprovedTemplate(emailData);
            await sendEmail({
              to: "info@symbolai.net",
              subject: `تمت الموافقة على طلبك - ${request.employeeName}`,
              html: template,
            });
          } catch (emailError) {
            console.error("[Email] Failed to send notification:", emailError);
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
   * Bulk reject employee requests (Admin only)
   */
  bulkReject: protectedProcedure
    .input(z.object({
      ids: z.array(z.number()).min(1, "يجب اختيار طلب واحد على الأقل"),
      adminResponse: z.string().min(1, "يجب إدخال سبب الرفض"),
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
          // Get current request
          const [request] = await db
            .select()
            .from(employeeRequests)
            .where(eq(employeeRequests.id, id));

          if (!request) {
            failedCount++;
            continue;
          }

          // Update status
          await db
            .update(employeeRequests)
            .set({
              status: "مرفوض",
              adminResponse: input.adminResponse,
              respondedAt: new Date(),
            })
            .where(eq(employeeRequests.id, id));

          // Log audit
          await db.insert(requestAuditLog).values({
            requestType: "employee_request",
            requestId: id,
            action: "bulk_rejected",
            oldStatus: request.status,
            newStatus: "مرفوض",
            performedBy: ctx.user.name || ctx.user.username,
            details: input.adminResponse,
          });

          // Send email notification
          try {
            const emailData = {
              employeeName: request.employeeName,
              requestType: request.requestType,
              adminResponse: input.adminResponse,
              requestId: request.id,
            };

            const template = employeeRequestRejectedTemplate(emailData);
            await sendEmail({
              to: "info@symbolai.net",
              subject: `تم رفض طلبك - ${request.employeeName}`,
              html: template,
            });
          } catch (emailError) {
            console.error("[Email] Failed to send notification:", emailError);
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
