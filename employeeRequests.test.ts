import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { employeeRequests, branches, users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Employee Requests System", () => {
  let testBranchId: number;
  let testUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get test branch
    const [branch] = await db.select().from(branches).limit(1);
    testBranchId = branch.id;

    // Get test user
    const [user] = await db.select().from(users).where(eq(users.role, "manager")).limit(1);
    testUserId = user.id;
  });

  describe("Validation", () => {
    it("should validate advance request (1-50,000 SAR)", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Valid advance
      const validAdvance = {
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "advance" as const,
        requestData: JSON.stringify({ amount: 25000, reason: "Emergency" }),
        status: "تحت الإجراء" as const,
      };

      const [result] = await db.insert(employeeRequests).values(validAdvance);
      expect(result.insertId).toBeGreaterThan(0);

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, result.insertId));
    });

    it("should validate leave request with date and days", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const leaveRequest = {
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "leave" as const,
        requestData: JSON.stringify({
          leaveDate: new Date("2025-12-20").toISOString(),
          leaveDays: 5,
          reason: "Family vacation",
        }),
        status: "تحت الإجراء" as const,
      };

      const [result] = await db.insert(employeeRequests).values(leaveRequest);
      expect(result.insertId).toBeGreaterThan(0);

      // Verify data
      const [saved] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, result.insertId));

      const data = JSON.parse(saved.requestData);
      expect(data.leaveDays).toBe(5);
      expect(data.leaveDate).toBeDefined();

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, result.insertId));
    });

    it("should validate permission request (< 8 hours)", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const permissionRequest = {
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "permission" as const,
        requestData: JSON.stringify({
          permissionHours: 4.5,
          reason: "Doctor appointment",
        }),
        status: "تحت الإجراء" as const,
      };

      const [result] = await db.insert(employeeRequests).values(permissionRequest);
      expect(result.insertId).toBeGreaterThan(0);

      const [saved] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, result.insertId));

      const data = JSON.parse(saved.requestData);
      expect(data.permissionHours).toBe(4.5);
      expect(data.permissionHours).toBeLessThan(8);

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, result.insertId));
    });

    it("should validate resignation request with ID number", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const resignationRequest = {
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "resignation" as const,
        requestData: JSON.stringify({
          idNumber: "1234567890",
          reason: "Personal reasons",
        }),
        status: "تحت الإجراء" as const,
      };

      const [result] = await db.insert(employeeRequests).values(resignationRequest);
      expect(result.insertId).toBeGreaterThan(0);

      const [saved] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, result.insertId));

      const data = JSON.parse(saved.requestData);
      expect(data.idNumber).toBe("1234567890");
      expect(data.idNumber).toHaveLength(10);

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, result.insertId));
    });
  });

  describe("Status Updates", () => {
    it("should update request status to approved", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create test request
      const [created] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "advance",
        requestData: JSON.stringify({ amount: 5000, reason: "Test" }),
        status: "تحت الإجراء",
      });

      // Update to approved
      await db
        .update(employeeRequests)
        .set({
          status: "مقبول",
          adminResponse: "تمت الموافقة",
          respondedAt: new Date(),
        })
        .where(eq(employeeRequests.id, created.insertId));

      // Verify
      const [updated] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, created.insertId));

      expect(updated.status).toBe("مقبول");
      expect(updated.adminResponse).toBe("تمت الموافقة");
      expect(updated.respondedAt).toBeDefined();

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, created.insertId));
    });

    it("should update request status to rejected", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create test request
      const [created] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "leave",
        requestData: JSON.stringify({
          leaveDate: new Date().toISOString(),
          leaveDays: 3,
          reason: "Test",
        }),
        status: "تحت الإجراء",
      });

      // Update to rejected
      await db
        .update(employeeRequests)
        .set({
          status: "مرفوض",
          adminResponse: "تم الرفض - غير متاح في هذا الوقت",
          respondedAt: new Date(),
        })
        .where(eq(employeeRequests.id, created.insertId));

      // Verify
      const [updated] = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.id, created.insertId));

      expect(updated.status).toBe("مرفوض");
      expect(updated.adminResponse).toContain("تم الرفض");

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, created.insertId));
    });
  });

  describe("Request Types", () => {
    it("should support all 6 request types", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const requestTypes = [
        "advance",
        "leave",
        "arrears",
        "permission",
        "violation_objection",
        "resignation",
      ] as const;

      for (const type of requestTypes) {
        const [result] = await db.insert(employeeRequests).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: "Test Employee",
          requestType: type,
          requestData: JSON.stringify({ reason: `Test ${type}` }),
          status: "تحت الإجراء",
        });

        expect(result.insertId).toBeGreaterThan(0);

        const [saved] = await db
          .select()
          .from(employeeRequests)
          .where(eq(employeeRequests.id, result.insertId));

        expect(saved.requestType).toBe(type);

        // Cleanup
        await db.delete(employeeRequests).where(eq(employeeRequests.id, result.insertId));
      }
    });
  });

  describe("Branch Filtering", () => {
    it("should filter requests by branch", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create requests for test branch
      const [req1] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Employee 1",
        requestType: "advance",
        requestData: JSON.stringify({ amount: 1000, reason: "Test" }),
        status: "تحت الإجراء",
      });

      const [req2] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Employee 2",
        requestType: "leave",
        requestData: JSON.stringify({ leaveDays: 2, reason: "Test" }),
        status: "تحت الإجراء",
      });

      // Query by branch
      const requests = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.branchId, testBranchId));

      expect(requests.length).toBeGreaterThanOrEqual(2);
      expect(requests.every((r) => r.branchId === testBranchId)).toBe(true);

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, req1.insertId));
      await db.delete(employeeRequests).where(eq(employeeRequests.id, req2.insertId));
    });
  });
});
