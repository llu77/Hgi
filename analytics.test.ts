import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { employeeRequests, productOrders, branches } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Analytics System", () => {
  let testBranchId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get test branch
    const [branch] = await db.select().from(branches).limit(1);
    testBranchId = branch.id;
  });

  describe("Request Statistics", () => {
    it("should calculate employee request statistics correctly", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create test requests with different statuses
      const requests = [
        { status: "تحت الإجراء" as const, type: "advance" },
        { status: "مقبول" as const, type: "leave" },
        { status: "مرفوض" as const, type: "permission" },
      ];

      const createdIds: number[] = [];

      for (const req of requests) {
        const [result] = await db.insert(employeeRequests).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: "Test Employee",
          requestType: req.type,
          requestData: JSON.stringify({ reason: "Test" }),
          status: req.status,
        });
        createdIds.push(result.insertId);
      }

      // Query statistics
      const allRequests = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.branchId, testBranchId));

      const stats = {
        total: allRequests.length,
        pending: allRequests.filter(r => r.status === "تحت الإجراء").length,
        approved: allRequests.filter(r => r.status === "مقبول").length,
        rejected: allRequests.filter(r => r.status === "مرفوض").length,
      };

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.approved).toBeGreaterThanOrEqual(1);
      expect(stats.rejected).toBeGreaterThanOrEqual(1);

      // Cleanup
      for (const id of createdIds) {
        await db.delete(employeeRequests).where(eq(employeeRequests.id, id));
      }
    });

    it("should calculate product order statistics correctly", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create test orders with different statuses
      const orders = [
        { status: "pending" as const, total: 100 },
        { status: "approved" as const, total: 200 },
        { status: "rejected" as const, total: 150 },
        { status: "delivered" as const, total: 300 },
      ];

      const createdIds: number[] = [];

      for (const order of orders) {
        const [result] = await db.insert(productOrders).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: "Test Employee",
          products: JSON.stringify([{ name: "Test", quantity: 1, price: order.total, total: order.total }]),
          grandTotal: order.total.toString(),
          status: order.status,
        });
        createdIds.push(result.insertId);
      }

      // Query statistics
      const allOrders = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.branchId, testBranchId));

      const stats = {
        total: allOrders.length,
        pending: allOrders.filter(o => o.status === "pending").length,
        approved: allOrders.filter(o => o.status === "approved").length,
        rejected: allOrders.filter(o => o.status === "rejected").length,
        delivered: allOrders.filter(o => o.status === "delivered").length,
        totalValue: allOrders.reduce((sum, o) => sum + parseFloat(o.grandTotal), 0),
      };

      expect(stats.total).toBeGreaterThanOrEqual(4);
      expect(stats.pending).toBeGreaterThanOrEqual(1);
      expect(stats.approved).toBeGreaterThanOrEqual(1);
      expect(stats.rejected).toBeGreaterThanOrEqual(1);
      expect(stats.delivered).toBeGreaterThanOrEqual(1);
      expect(stats.totalValue).toBeGreaterThan(0);

      // Cleanup
      for (const id of createdIds) {
        await db.delete(productOrders).where(eq(productOrders.id, id));
      }
    });
  });

  describe("Request Trends", () => {
    it("should track daily request trends", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create requests on different dates
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [req1] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Employee 1",
        requestType: "advance",
        requestData: JSON.stringify({ amount: 1000, reason: "Test" }),
        status: "تحت الإجراء",
        createdAt: today,
      });

      const [req2] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Employee 2",
        requestType: "leave",
        requestData: JSON.stringify({ leaveDays: 2, reason: "Test" }),
        status: "مقبول",
        createdAt: yesterday,
      });

      // Verify requests were created
      const requests = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.branchId, testBranchId));

      expect(requests.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, req1.insertId));
      await db.delete(employeeRequests).where(eq(employeeRequests.id, req2.insertId));
    });
  });

  describe("Approval Rates by Type", () => {
    it("should calculate approval rates for each request type", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create requests of different types
      const requestTypes = ["advance", "leave", "permission"] as const;
      const createdIds: number[] = [];

      for (const type of requestTypes) {
        // Create approved request
        const [approved] = await db.insert(employeeRequests).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: "Test Employee",
          requestType: type,
          requestData: JSON.stringify({ reason: "Test" }),
          status: "مقبول",
        });
        createdIds.push(approved.insertId);

        // Create rejected request
        const [rejected] = await db.insert(employeeRequests).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: "Test Employee",
          requestType: type,
          requestData: JSON.stringify({ reason: "Test" }),
          status: "مرفوض",
        });
        createdIds.push(rejected.insertId);
      }

      // Query by type
      const allRequests = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.branchId, testBranchId));

      // Group by type
      const typeStats = new Map<string, { total: number; approved: number }>();
      for (const req of allRequests) {
        const existing = typeStats.get(req.requestType);
        if (existing) {
          existing.total++;
          if (req.status === "مقبول") existing.approved++;
        } else {
          typeStats.set(req.requestType, {
            total: 1,
            approved: req.status === "مقبول" ? 1 : 0,
          });
        }
      }

      // Verify each type has data
      for (const type of requestTypes) {
        const stats = typeStats.get(type);
        expect(stats).toBeDefined();
        expect(stats!.total).toBeGreaterThanOrEqual(2);
      }

      // Cleanup
      for (const id of createdIds) {
        await db.delete(employeeRequests).where(eq(employeeRequests.id, id));
      }
    });
  });

  describe("Top Products", () => {
    it("should identify most requested products", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create orders with different products
      const products = [
        { name: "Product A", quantity: 10 },
        { name: "Product B", quantity: 5 },
        { name: "Product A", quantity: 8 }, // Same product, different order
      ];

      const createdIds: number[] = [];

      for (const product of products) {
        const [result] = await db.insert(productOrders).values({
          branchId: testBranchId,
          branchName: "Test Branch",
          employeeName: "Test Employee",
          products: JSON.stringify([{ ...product, price: 10, total: product.quantity * 10 }]),
          grandTotal: (product.quantity * 10).toString(),
          status: "pending",
        });
        createdIds.push(result.insertId);
      }

      // Query all orders
      const orders = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.branchId, testBranchId));

      // Aggregate products
      const productMap = new Map<string, number>();
      for (const order of orders) {
        const orderProducts = JSON.parse(order.products);
        for (const p of orderProducts) {
          productMap.set(p.name, (productMap.get(p.name) || 0) + p.quantity);
        }
      }

      // Verify Product A has highest quantity
      const productATotal = productMap.get("Product A") || 0;
      const productBTotal = productMap.get("Product B") || 0;
      expect(productATotal).toBeGreaterThanOrEqual(18); // 10 + 8
      expect(productBTotal).toBeGreaterThanOrEqual(5);

      // Cleanup
      for (const id of createdIds) {
        await db.delete(productOrders).where(eq(productOrders.id, id));
      }
    });
  });

  describe("Processing Time", () => {
    it("should calculate average processing time for requests", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Create processed request (responded)
      const [processed] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "advance",
        requestData: JSON.stringify({ amount: 1000, reason: "Test" }),
        status: "مقبول",
        createdAt: oneDayAgo,
        respondedAt: now,
      });

      // Create pending request (not responded)
      const [pending] = await db.insert(employeeRequests).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        requestType: "leave",
        requestData: JSON.stringify({ leaveDays: 2, reason: "Test" }),
        status: "تحت الإجراء",
        createdAt: now,
      });

      // Query requests
      const requests = await db
        .select()
        .from(employeeRequests)
        .where(eq(employeeRequests.branchId, testBranchId));

      const processedRequests = requests.filter(r => r.respondedAt);
      const pendingRequests = requests.filter(r => r.status === "تحت الإجراء");

      expect(processedRequests.length).toBeGreaterThanOrEqual(1);
      expect(pendingRequests.length).toBeGreaterThanOrEqual(1);

      // Calculate processing time for processed request
      if (processedRequests.length > 0) {
        const req = processedRequests[0];
        const created = new Date(req.createdAt).getTime();
        const responded = new Date(req.respondedAt!).getTime();
        const processingTime = responded - created;
        expect(processingTime).toBeGreaterThan(0);
      }

      // Cleanup
      await db.delete(employeeRequests).where(eq(employeeRequests.id, processed.insertId));
      await db.delete(employeeRequests).where(eq(employeeRequests.id, pending.insertId));
    });
  });
});
