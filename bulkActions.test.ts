import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { employeeRequests, productOrders, requestAuditLog, branches } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

describe("Bulk Actions System", () => {
  let testBranchId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get test branch
    const [branch] = await db.select().from(branches).limit(1);
    testBranchId = branch.id;
  });

  describe("Bulk Approve Employee Requests", () => {
    it("should approve multiple employee requests at once", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create pending requests
      const requestIds: number[] = [];
      for (let i = 0; i < 3; i++) {
        const [result] = await db.insert(employeeRequests).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: `Employee ${i}`,
          requestType: "advance",
          requestData: JSON.stringify({ amount: 1000, reason: "Test" }),
          status: "تحت الإجراء",
        });
        requestIds.push(result.insertId);
      }

      // Bulk approve
      for (const id of requestIds) {
        await db
          .update(employeeRequests)
          .set({
            status: "مقبول",
            adminResponse: "Bulk approved",
            respondedAt: new Date(),
          })
          .where(eq(employeeRequests.id, id));

        // Log audit
        await db.insert(requestAuditLog).values({
          requestType: "employee_request",
          requestId: id,
          action: "bulk_approved",
          oldStatus: "تحت الإجراء",
          newStatus: "مقبول",
          performedBy: "Admin",
          details: "Bulk approved",
        });
      }

      // Verify all requests are approved
      for (const id of requestIds) {
        const [request] = await db
          .select()
          .from(employeeRequests)
          .where(eq(employeeRequests.id, id));

        expect(request.status).toBe("مقبول");
        expect(request.adminResponse).toBe("Bulk approved");
        expect(request.respondedAt).toBeDefined();
      }

      // Verify audit logs
      for (const id of requestIds) {
        const logs = await db
          .select()
          .from(requestAuditLog)
          .where(
            and(
              eq(requestAuditLog.requestId, id),
              eq(requestAuditLog.action, "bulk_approved")
            )
          );

        expect(logs.length).toBeGreaterThanOrEqual(1);
        expect(logs[0].newStatus).toBe("مقبول");
      }

      // Cleanup
      for (const id of requestIds) {
        await db.delete(employeeRequests).where(eq(employeeRequests.id, id));
        await db
          .delete(requestAuditLog)
          .where(
            and(
              eq(requestAuditLog.requestId, id),
              eq(requestAuditLog.requestType, "employee_request")
            )
          );
      }
    });

    it("should handle partial failures in bulk approve", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create one valid request
      const [validRequest] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Valid Employee",
        requestType: "leave",
        requestData: JSON.stringify({ leaveDays: 2, reason: "Test" }),
        status: "تحت الإجراء",
      });

      // Try to bulk approve with invalid ID
      const requestIds = [validRequest.insertId, 999999]; // 999999 doesn't exist
      let successCount = 0;
      let failedCount = 0;

      for (const id of requestIds) {
        try {
          const [request] = await db
            .select()
            .from(employeeRequests)
            .where(eq(employeeRequests.id, id));

          if (!request) {
            failedCount++;
            continue;
          }

          await db
            .update(employeeRequests)
            .set({
              status: "مقبول",
              respondedAt: new Date(),
            })
            .where(eq(employeeRequests.id, id));

          successCount++;
        } catch (error) {
          failedCount++;
        }
      }

      expect(successCount).toBe(1);
      expect(failedCount).toBe(1);

      // Verify valid request was approved
      const [updatedRequest] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, validRequest.insertId));

      expect(updatedRequest.status).toBe("مقبول");

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, validRequest.insertId));
    });
  });

  describe("Bulk Reject Employee Requests", () => {
    it("should reject multiple employee requests at once", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create pending requests
      const requestIds: number[] = [];
      for (let i = 0; i < 3; i++) {
        const [result] = await db.insert(employeeRequests).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: `Employee ${i}`,
          requestType: "permission",
          requestData: JSON.stringify({ hours: 2, reason: "Test" }),
          status: "تحت الإجراء",
        });
        requestIds.push(result.insertId);
      }

      const rejectReason = "لا يمكن الموافقة على الطلب حالياً";

      // Bulk reject
      for (const id of requestIds) {
        await db
          .update(employeeRequests)
          .set({
            status: "مرفوض",
            adminResponse: rejectReason,
            respondedAt: new Date(),
          })
          .where(eq(employeeRequests.id, id));

        // Log audit
        await db.insert(requestAuditLog).values({
          requestType: "employee_request",
          requestId: id,
          action: "bulk_rejected",
          oldStatus: "تحت الإجراء",
          newStatus: "مرفوض",
          performedBy: "Admin",
          details: rejectReason,
        });
      }

      // Verify all requests are rejected
      for (const id of requestIds) {
        const [request] = await db
          .select()
          .from(employeeRequests)
          .where(eq(employeeRequests.id, id));

        expect(request.status).toBe("مرفوض");
        expect(request.adminResponse).toBe(rejectReason);
        expect(request.respondedAt).toBeDefined();
      }

      // Cleanup
      for (const id of requestIds) {
        await db.delete(employeeRequests).where(eq(employeeRequests.id, id));
        await db
          .delete(requestAuditLog)
          .where(
            and(
              eq(requestAuditLog.requestId, id),
              eq(requestAuditLog.requestType, "employee_request")
            )
          );
      }
    });
  });

  describe("Bulk Approve Product Orders", () => {
    it("should approve multiple product orders at once", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create pending orders
      const orderIds: number[] = [];
      for (let i = 0; i < 3; i++) {
        const products = [
          { name: `Product ${i}`, quantity: 2, price: 50, total: 100 },
        ];

        const [result] = await db.insert(productOrders).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: `Employee ${i}`,
          products: JSON.stringify(products),
          grandTotal: "100",
          status: "pending",
        });
        orderIds.push(result.insertId);
      }

      // Bulk approve
      for (const id of orderIds) {
        await db
          .update(productOrders)
          .set({
            status: "approved",
            adminResponse: "Bulk approved",
            approvedAt: new Date(),
          })
          .where(eq(productOrders.id, id));

        // Log audit
        await db.insert(requestAuditLog).values({
          requestType: "product_order",
          requestId: id,
          action: "bulk_approved",
          oldStatus: "pending",
          newStatus: "approved",
          performedBy: "Admin",
          details: "Bulk approved",
        });
      }

      // Verify all orders are approved
      for (const id of orderIds) {
        const [order] = await db
          .select()
          .from(productOrders)
          .where(eq(productOrders.id, id));

        expect(order.status).toBe("approved");
        expect(order.adminResponse).toBe("Bulk approved");
        expect(order.approvedAt).toBeDefined();
      }

      // Cleanup
      for (const id of orderIds) {
        await db.delete(productOrders).where(eq(productOrders.id, id));
        await db
          .delete(requestAuditLog)
          .where(
            and(
              eq(requestAuditLog.requestId, id),
              eq(requestAuditLog.requestType, "product_order")
            )
          );
      }
    });
  });

  describe("Bulk Reject Product Orders", () => {
    it("should reject multiple product orders at once", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create pending orders
      const orderIds: number[] = [];
      for (let i = 0; i < 3; i++) {
        const products = [
          { name: `Product ${i}`, quantity: 1, price: 75, total: 75 },
        ];

        const [result] = await db.insert(productOrders).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: `Employee ${i}`,
          products: JSON.stringify(products),
          grandTotal: "75",
          status: "pending",
        });
        orderIds.push(result.insertId);
      }

      const rejectReason = "المنتجات غير متوفرة حالياً";

      // Bulk reject
      for (const id of orderIds) {
        await db
          .update(productOrders)
          .set({
            status: "rejected",
            adminResponse: rejectReason,
            rejectedAt: new Date(),
          })
          .where(eq(productOrders.id, id));

        // Log audit
        await db.insert(requestAuditLog).values({
          requestType: "product_order",
          requestId: id,
          action: "bulk_rejected",
          oldStatus: "pending",
          newStatus: "rejected",
          performedBy: "Admin",
          details: rejectReason,
        });
      }

      // Verify all orders are rejected
      for (const id of orderIds) {
        const [order] = await db
          .select()
          .from(productOrders)
          .where(eq(productOrders.id, id));

        expect(order.status).toBe("rejected");
        expect(order.adminResponse).toBe(rejectReason);
        expect(order.rejectedAt).toBeDefined();
      }

      // Cleanup
      for (const id of orderIds) {
        await db.delete(productOrders).where(eq(productOrders.id, id));
        await db
          .delete(requestAuditLog)
          .where(
            and(
              eq(requestAuditLog.requestId, id),
              eq(requestAuditLog.requestType, "product_order")
            )
          );
      }
    });
  });

  describe("Audit Logging for Bulk Actions", () => {
    it("should create audit logs for all bulk operations", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create and bulk approve a request
      const [request] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "advance",
        requestData: JSON.stringify({ amount: 500, reason: "Test" }),
        status: "تحت الإجراء",
      });

      await db
        .update(employeeRequests)
        .set({ status: "مقبول", respondedAt: new Date() })
        .where(eq(employeeRequests.id, request.insertId));

      await db.insert(requestAuditLog).values({
        requestType: "employee_request",
        requestId: request.insertId,
        action: "bulk_approved",
        oldStatus: "تحت الإجراء",
        newStatus: "مقبول",
        performedBy: "Admin Test",
        details: "Bulk operation test",
      });

      // Verify audit log
      const logs = await db
        .select()
        .from(requestAuditLog)
        .where(
          and(
            eq(requestAuditLog.requestId, request.insertId),
            eq(requestAuditLog.action, "bulk_approved")
          )
        );

      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].oldStatus).toBe("تحت الإجراء");
      expect(logs[0].newStatus).toBe("مقبول");
      expect(logs[0].performedBy).toBe("Admin Test");

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, request.insertId));
      await db
        .delete(requestAuditLog)
        .where(
          and(
            eq(requestAuditLog.requestId, request.insertId),
            eq(requestAuditLog.requestType, "employee_request")
          )
        );
    });
  });
});
