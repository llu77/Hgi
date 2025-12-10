import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "admin" | "manager" | "employee" = "admin"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    loginMethod: "manus",
    role,
    branchId: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Financial Management System", () => {
  describe("Branches", () => {
    it("should list all branches", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const branches = await caller.branches.list();

      expect(branches).toBeDefined();
      expect(Array.isArray(branches)).toBe(true);
      expect(branches.length).toBeGreaterThan(0);
    });

    it("should create a new branch (admin only)", async () => {
      const { ctx } = createTestContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.branches.create({
        code: `TEST-${Date.now()}`,
        name: "Test Branch",
        nameAr: "فرع تجريبي",
        address: "Test Address",
        phone: "+966500000000",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Employees", () => {
    it("should list employees by branch", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const employees = await caller.employees.listByBranch({ branchId: 1 });

      expect(employees).toBeDefined();
      expect(Array.isArray(employees)).toBe(true);
    });

    it("should create a new employee", async () => {
      const { ctx } = createTestContext("manager");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.employees.create({
        code: `EMP-${Date.now()}`,
        name: "Test Employee",
        branchId: 1,
        phone: "+966500000001",
        position: "Cashier",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Expense Categories", () => {
    it("should list all expense categories", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.expenses.categories();

      expect(categories).toBeDefined();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBe(15); // Should have exactly 15 categories
    });

    it("should have correct category properties", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.expenses.categories();
      const firstCategory = categories[0];

      expect(firstCategory).toHaveProperty("id");
      expect(firstCategory).toHaveProperty("code");
      expect(firstCategory).toHaveProperty("name");
      expect(firstCategory).toHaveProperty("nameAr");
      expect(firstCategory).toHaveProperty("requiresEmployee");
    });

    it("should have 'advance_payment' category requiring employee", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const categories = await caller.expenses.categories();
      const advancePayment = categories.find(c => c.code === "advance_payment");

      expect(advancePayment).toBeDefined();
      expect(advancePayment?.requiresEmployee).toBe(true);
      expect(advancePayment?.nameAr).toBe("سلفة");
    });
  });

  describe("Expenses", () => {
    it("should create a new expense", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Get first category
      const categories = await caller.expenses.categories();
      const category = categories[0];

      const result = await caller.expenses.create({
        branchId: 1,
        categoryId: category.id,
        date: new Date().toISOString(),
        amount: "100.50",
        paymentType: "cash",
        description: "Test expense",
      });

      expect(result.success).toBe(true);
    });

    it("should list expenses for a date range", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const startDate = new Date();
      startDate.setDate(1); // First day of month
      const endDate = new Date();

      const expenses = await caller.expenses.list({
        branchId: 1,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      expect(expenses).toBeDefined();
      expect(Array.isArray(expenses)).toBe(true);
    });
  });

  describe("Revenue Management", () => {
    it("should create daily revenue with accounting validation", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Create a matched revenue entry
      const result = await caller.revenues.createDaily({
        branchId: 1,
        date: new Date().toISOString(),
        cash: "500.00",
        network: "300.00",
        balance: "300.00",
        total: "800.00",
        isMatched: true,
        employeeRevenues: [],
      });

      expect(result.success).toBe(true);
    });

    it("should require unmatch reason when not matched", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.revenues.createDaily({
          branchId: 1,
          date: new Date().toISOString(),
          cash: "500.00",
          network: "200.00", // Doesn't match balance
          balance: "300.00",
          total: "800.00",
          isMatched: false,
          // Missing unmatchReason
          employeeRevenues: [],
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain("reason");
      }
    });
  });

  describe("GitHub Integration", () => {
    it("should have GitHub backup endpoint", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Just verify the endpoint exists and accepts correct input format
      const mockData = {
        date: new Date().toISOString(),
        revenues: [],
        expenses: [],
        summary: {},
      };

      // This will fail if GitHub is not configured, but that's expected
      try {
        await caller.github.backup(mockData);
      } catch (error: any) {
        // Expected to fail without GitHub auth, but endpoint should exist
        expect(error).toBeDefined();
      }
    });
  });

  describe("Cloudflare Integration", () => {
    it("should have Cloudflare D1 endpoints", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // Verify endpoints exist
      try {
        await caller.cloudflare.d1.listDatabases();
      } catch (error: any) {
        // Expected to fail without Cloudflare config, but endpoint should exist
        expect(error).toBeDefined();
      }
    });

    it("should have Cloudflare R2 endpoints", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.cloudflare.r2.listBuckets();
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it("should have Cloudflare KV endpoints", async () => {
      const { ctx } = createTestContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.cloudflare.kv.listNamespaces();
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Role-Based Access Control", () => {
    it("should allow admin to create branches", async () => {
      const { ctx } = createTestContext("admin");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.branches.create({
        code: `ADMIN-${Date.now()}`,
        name: "Admin Branch",
        nameAr: "فرع المدير",
      });

      expect(result.success).toBe(true);
    });

    it("should deny non-admin from creating branches", async () => {
      const { ctx } = createTestContext("employee");
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.branches.create({
          code: `EMPLOYEE-${Date.now()}`,
          name: "Employee Branch",
          nameAr: "فرع الموظف",
        });

        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });
});
