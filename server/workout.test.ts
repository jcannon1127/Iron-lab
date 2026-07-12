import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests don't need a real database
vi.mock("./db", () => ({
  getUserSessions: vi.fn().mockResolvedValue([]),
  getSessionByDate: vi.fn().mockResolvedValue(undefined),
  getSessionSets: vi.fn().mockResolvedValue([]),
  createSession: vi.fn().mockResolvedValue({
    id: 1,
    userId: 1,
    date: "2026-07-12",
    label: "Sun, Jul 12",
    goal: 100,
    totalReps: 0,
    totalVolume: 0,
    completed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateSessionTotals: vi.fn().mockResolvedValue(undefined),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  addSet: vi.fn().mockResolvedValue({
    id: 1,
    sessionId: 1,
    userId: 1,
    weight: 135,
    reps: 10,
    volume: 1350,
    performedAt: Date.now(),
    createdAt: new Date(),
  }),
  deleteSet: vi.fn().mockResolvedValue(undefined),
}));

import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "jeff@yogademocracy.com",
    name: "Jeff Cannon",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("workout.getSessions", () => {
  it("returns empty array when user has no sessions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.workout.getSessions();
    expect(result).toEqual([]);
  });
});

describe("workout.getTodaySession", () => {
  it("creates a new session when none exists for today", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.workout.getTodaySession();
    expect(result.goal).toBe(100);
    expect(result.totalReps).toBe(0);
    expect(db.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1, goal: 100 })
    );
  });
});

describe("workout.addSet", () => {
  beforeEach(() => {
    vi.mocked(db.getSessionSets).mockResolvedValue([
      {
        id: 1,
        sessionId: 1,
        userId: 1,
        weight: 135,
        reps: 10,
        volume: 1350,
        performedAt: Date.now(),
        createdAt: new Date(),
      },
    ]);
  });

  it("adds a set and returns updated totals", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.workout.addSet({ weight: 135, reps: 10 });
    expect(result.set.weight).toBe(135);
    expect(result.set.reps).toBe(10);
    expect(result.totalReps).toBe(10);
    expect(result.totalVolume).toBe(1350);
    expect(result.completed).toBe(false);
  });

  it("marks session completed when totalReps >= 100", async () => {
    // Simulate 100 reps across sets
    vi.mocked(db.getSessionSets).mockResolvedValue(
      Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        sessionId: 1,
        userId: 1,
        weight: 45,
        reps: 10,
        volume: 450,
        performedAt: Date.now(),
        createdAt: new Date(),
      }))
    );
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.workout.addSet({ weight: 45, reps: 10 });
    expect(result.totalReps).toBe(100);
    expect(result.completed).toBe(true);
  });
});

describe("workout.resetToday", () => {
  it("deletes today's session when one exists", async () => {
    vi.mocked(db.getSessionByDate).mockResolvedValue({
      id: 1,
      userId: 1,
      date: "2026-07-12",
      label: "Sun, Jul 12",
      goal: 100,
      totalReps: 35,
      totalVolume: 2325,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.workout.resetToday();
    expect(result.success).toBe(true);
    expect(db.deleteSession).toHaveBeenCalledWith(1, 1);
  });
});
