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

describe("demo.create", () => {
  it("creates a demo record successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.demo.create({
      title: "Test Record",
      description: "Test description",
      category: "test",
    });

    expect(result).toEqual({ success: true });
  });

  it("requires authentication", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.demo.create({
        title: "Test Record",
        description: "Test description",
      })
    ).rejects.toThrow();
  });
});

describe("demo.list", () => {
  it("lists demo records for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.demo.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("demo.update", () => {
  it("updates a demo record successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a record
    await caller.demo.create({
      title: "Original Title",
      description: "Original description",
    });

    const records = await caller.demo.list();
    const recordId = records[0]?.id;

    if (recordId) {
      const result = await caller.demo.update({
        id: recordId,
        title: "Updated Title",
      });

      expect(result).toEqual({ success: true });
    }
  });
});
