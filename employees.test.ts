import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createManagerContext(branchId: number, branchName: string): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: branchId === 1 ? 2 : 3,
    openId: branchId === 1 ? "aa123-openid" : "mm123-openid",
    username: branchId === 1 ? "Aa123" : "Mm123",
    passwordHash: "hashed",
    email: `manager${branchId}@example.com`,
    name: `Manager ${branchName}`,
    loginMethod: "local",
    role: "manager",
    branchId: branchId,
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-openid",
    username: "Admin",
    passwordHash: "hashed",
    email: "admin@example.com",
    name: "Admin",
    loginMethod: "local",
    role: "admin",
    branchId: null,
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
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("Employee Management", () => {
  it("should list all employees for admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const employees = await caller.employees.list();

    expect(employees).toBeDefined();
    expect(employees.length).toBeGreaterThanOrEqual(8); // At least 8 employees seeded
  });

  it("should filter employees by branch for Labn manager", async () => {
    const { ctx } = createManagerContext(1, "Labn");
    const caller = appRouter.createCaller(ctx);

    const employees = await caller.employees.list({ branchId: 1 });

    expect(employees).toBeDefined();
    expect(employees.length).toBeGreaterThanOrEqual(5); // At least 5 employees in Labn branch
    
    const names = employees.map(e => e.name);
    expect(names).toContain("عبدالحي جلال");
    expect(names).toContain("علاء ناصر");
    expect(names).toContain("محمود عمارة");
    expect(names).toContain("السيد محمد");
    expect(names).toContain("عمرو");
  });

  it("should filter employees by branch for Tuwaiq manager", async () => {
    const { ctx } = createManagerContext(2, "Tuwaiq");
    const caller = appRouter.createCaller(ctx);

    const employees = await caller.employees.list({ branchId: 2 });

    expect(employees).toBeDefined();
    expect(employees.length).toBe(3); // 3 employees in Tuwaiq branch
    
    const names = employees.map(e => e.name);
    expect(names).toContain("محمد إسماعيل");
    expect(names).toContain("محمد ناصر");
    expect(names).toContain("فارس");
  });

  it("should create new employee in branch", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Use timestamp to ensure unique code
    const uniqueCode = `TEST-EMP-${Date.now()}`;
    
    const result = await caller.employees.create({
      code: uniqueCode,
      name: "موظف تجريبي",
      branchId: 1,
      phone: "0500000000",
      position: "محاسب",
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });
});
