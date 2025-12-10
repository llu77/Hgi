import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type MockResponse = {
  cookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
};

function createMockContext(): { ctx: TrpcContext; cookies: Map<string, string> } {
  const cookies = new Map<string, string>();

  const mockRes: MockResponse = {
    cookie: (name: string, value: string) => {
      cookies.set(name, value);
    },
    clearCookie: (name: string) => {
      cookies.delete(name);
    },
  };

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: mockRes as TrpcContext["res"],
  };

  return { ctx, cookies };
}

describe("auth.login", () => {
  it("should successfully login with Admin credentials", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      username: "Admin",
      password: "Omar101010",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.username).toBe("Admin");
    expect(result.user?.role).toBe("admin");
    expect(result.user?.branchId).toBeNull();
    expect(cookies.has("app_session_id")).toBe(true);
  });

  it("should successfully login with Manager Labn credentials", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      username: "Aa123",
      password: "Aa1234",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.username).toBe("Aa123");
    expect(result.user?.role).toBe("manager");
    expect(result.user?.branchId).toBe(1); // Branch 1 (الفرع الرئيسي)
    expect(cookies.has("app_session_id")).toBe(true);
  });

  it("should successfully login with Manager Tuwaiq credentials", async () => {
    const { ctx, cookies } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.login({
      username: "Mm123",
      password: "Mm1234",
    });

    expect(result.success).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user?.username).toBe("Mm123");
    expect(result.user?.role).toBe("manager");
    expect(result.user?.branchId).toBe(2); // Branch 2 (الفرع الشمالي)
    expect(cookies.has("app_session_id")).toBe(true);
  });

  it("should fail login with incorrect password", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        username: "Admin",
        password: "WrongPassword",
      })
    ).rejects.toThrow();
  });

  it("should fail login with non-existent username", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        username: "NonExistentUser",
        password: "SomePassword",
      })
    ).rejects.toThrow();
  });

  it("should fail login with empty credentials", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auth.login({
        username: "",
        password: "",
      })
    ).rejects.toThrow();
  });
});
