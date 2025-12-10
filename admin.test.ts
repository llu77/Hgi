import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(role: "user" | "admin" = "user"): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
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

describe("admin.listUsers", () => {
  it("allows admin to list users", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.listUsers();

    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin access", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.listUsers()).rejects.toThrow("Admin access required");
  });
});

describe("monitoring.stats", () => {
  it("allows admin to view stats", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.monitoring.stats();

    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("totalStorage");
    expect(result).toHaveProperty("totalFiles");
    expect(result).toHaveProperty("recentLogs");
  });

  it("denies non-admin access to stats", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.monitoring.stats()).rejects.toThrow("Admin access required");
  });
});

describe("monitoring.logs", () => {
  it("allows admin to view logs", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.monitoring.logs({ limit: 10 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("allows admin to filter logs by level", async () => {
    const { ctx } = createAuthContext("admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.monitoring.logs({ level: "error", limit: 10 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("denies non-admin access to logs", async () => {
    const { ctx } = createAuthContext("user");
    const caller = appRouter.createCaller(ctx);

    await expect(caller.monitoring.logs({ limit: 10 })).rejects.toThrow("Admin access required");
  });
});
