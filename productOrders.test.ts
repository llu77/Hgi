import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { productOrders, branches } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import Decimal from "decimal.js";

describe("Product Orders System", () => {
  let testBranchId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Get test branch
    const [branch] = await db.select().from(branches).limit(1);
    testBranchId = branch.id;
  });

  describe("Order Creation", () => {
    it("should create product order with single product", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const products = [{ name: "Product A", quantity: 2, price: 50, total: 100 }];

      const [result] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify(products),
        grandTotal: "100.00",
        status: "pending",
      });

      expect(result.insertId).toBeGreaterThan(0);

      // Verify
      const [saved] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, result.insertId));

      expect(JSON.parse(saved.products)).toHaveLength(1);
      expect(parseFloat(saved.grandTotal)).toBe(100);

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, result.insertId));
    });

    it("should create product order with multiple products", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const products = [
        { name: "Product A", quantity: 2, price: 50, total: 100 },
        { name: "Product B", quantity: 3, price: 30, total: 90 },
        { name: "Product C", quantity: 1, price: 75, total: 75 },
      ];

      const grandTotal = products.reduce((sum, p) => sum + p.total, 0);

      const [result] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify(products),
        grandTotal: grandTotal.toString(),
        status: "pending",
      });

      expect(result.insertId).toBeGreaterThan(0);

      // Verify
      const [saved] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, result.insertId));

      const savedProducts = JSON.parse(saved.products);
      expect(savedProducts).toHaveLength(3);
      expect(parseFloat(saved.grandTotal)).toBe(265);

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, result.insertId));
    });

    it("should calculate grand total correctly with Decimal.js", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const products = [
        { name: "Product A", quantity: 3, price: 10.5, total: 31.5 },
        { name: "Product B", quantity: 2, price: 15.75, total: 31.5 },
      ];

      // Calculate with Decimal.js
      const grandTotal = products.reduce((sum, p) => {
        return new Decimal(sum).add(p.total).toNumber();
      }, 0);

      expect(grandTotal).toBe(63);

      const [result] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify(products),
        grandTotal: grandTotal.toString(),
        status: "pending",
      });

      // Verify
      const [saved] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, result.insertId));

      expect(parseFloat(saved.grandTotal)).toBe(63);

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, result.insertId));
    });
  });

  describe("Status Workflow", () => {
    it("should update status from pending to approved", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create order
      const [created] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 100, total: 100 }]),
        grandTotal: "100.00",
        status: "pending",
      });

      // Update to approved
      await db
        .update(productOrders)
        .set({
          status: "approved",
          adminResponse: "تمت الموافقة",
          approvedAt: new Date(),
        })
        .where(eq(productOrders.id, created.insertId));

      // Verify
      const [updated] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, created.insertId));

      expect(updated.status).toBe("approved");
      expect(updated.approvedAt).toBeDefined();

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, created.insertId));
    });

    it("should update status from approved to delivered", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create approved order
      const [created] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 100, total: 100 }]),
        grandTotal: "100.00",
        status: "approved",
        approvedAt: new Date(),
      });

      // Update to delivered
      await db
        .update(productOrders)
        .set({
          status: "delivered",
          deliveredAt: new Date(),
        })
        .where(eq(productOrders.id, created.insertId));

      // Verify
      const [updated] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, created.insertId));

      expect(updated.status).toBe("delivered");
      expect(updated.deliveredAt).toBeDefined();

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, created.insertId));
    });

    it("should reject order with reason", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create order
      const [created] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify([{ name: "Test Product", quantity: 1, price: 100, total: 100 }]),
        grandTotal: "100.00",
        status: "pending",
      });

      // Reject
      await db
        .update(productOrders)
        .set({
          status: "rejected",
          adminResponse: "المنتج غير متوفر حالياً",
          rejectedAt: new Date(),
        })
        .where(eq(productOrders.id, created.insertId));

      // Verify
      const [updated] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, created.insertId));

      expect(updated.status).toBe("rejected");
      expect(updated.adminResponse).toContain("غير متوفر");
      expect(updated.rejectedAt).toBeDefined();

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, created.insertId));
    });
  });

  describe("Product Validation", () => {
    it("should validate product total calculation", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const product = {
        name: "Test Product",
        quantity: 5,
        price: 12.5,
        total: 5 * 12.5, // 62.5
      };

      expect(product.total).toBe(62.5);

      const [result] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify([product]),
        grandTotal: product.total.toString(),
        status: "pending",
      });

      // Verify
      const [saved] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, result.insertId));

      const savedProduct = JSON.parse(saved.products)[0];
      expect(savedProduct.quantity * savedProduct.price).toBe(savedProduct.total);

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, result.insertId));
    });

    it("should validate grand total matches sum of products", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const products = [
        { name: "Product A", quantity: 2, price: 25, total: 50 },
        { name: "Product B", quantity: 3, price: 20, total: 60 },
      ];

      const calculatedTotal = products.reduce((sum, p) => sum + p.total, 0);
      expect(calculatedTotal).toBe(110);

      const [result] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Test Employee",
        products: JSON.stringify(products),
        grandTotal: calculatedTotal.toString(),
        status: "pending",
      });

      // Verify
      const [saved] = await db
        .select()
        .from(productOrders)
        .where(eq(productOrders.id, result.insertId));

      const savedProducts = JSON.parse(saved.products);
      const savedTotal = savedProducts.reduce((sum: number, p: any) => sum + p.total, 0);
      expect(savedTotal).toBe(parseFloat(saved.grandTotal));

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, result.insertId));
    });
  });

  describe("Branch Filtering", () => {
    it("should filter orders by branch", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create orders for test branch
      const [order1] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Employee 1",
        products: JSON.stringify([{ name: "Product A", quantity: 1, price: 50, total: 50 }]),
        grandTotal: "50.00",
        status: "pending",
      });

      const [order2] = await db.insert(productOrders).values({
        branchId: testBranchId,
        branchName: "Test Branch",
        employeeName: "Employee 2",
        products: JSON.stringify([{ name: "Product B", quantity: 2, price: 30, total: 60 }]),
        grandTotal: "60.00",
        status: "pending",
      });

      // Query by branch
      const orders = await db.select().from(productOrders).where(eq(productOrders.branchId, testBranchId));

      expect(orders.length).toBeGreaterThanOrEqual(2);
      expect(orders.every((o) => o.branchId === testBranchId)).toBe(true);

      // Cleanup
      await db.delete(productOrders).where(eq(productOrders.id, order1.insertId));
      await db.delete(productOrders).where(eq(productOrders.id, order2.insertId));
    });
  });
});
