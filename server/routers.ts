import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getUserSessions,
  getSessionByDate,
  getSessionSets,
  createSession,
  updateSessionTotals,
  updateSessionGoal,
  deleteSession,
  addSet,
  deleteSet,
  editSet,
} from "./db";

const REP_GOAL = 100;

function formatDateLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  workout: router({
    /** Get all sessions for the current user with their sets (newest first) */
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      const sessions = await getUserSessions(ctx.user.id);
      const withSets = await Promise.all(
        sessions.map(async (session) => {
          const sets = await getSessionSets(session.id);
          return { ...session, sets };
        })
      );
      return withSets;
    }),

    /** Get or create today's session */
    getTodaySession: protectedProcedure.query(async ({ ctx }) => {
      const today = new Date().toISOString().slice(0, 10);
      let session = await getSessionByDate(ctx.user.id, today);
      if (!session) {
        session = await createSession({
          userId: ctx.user.id,
          date: today,
          label: formatDateLabel(today),
          goal: REP_GOAL,
          totalReps: 0,
          totalVolume: 0,
          completed: false,
        });
      }
      const sets = await getSessionSets(session.id);
      return { ...session, sets };
    }),

    /** Add a set to today's session */
    addSet: protectedProcedure
      .input(z.object({ weight: z.number().positive(), reps: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const today = new Date().toISOString().slice(0, 10);
        let session = await getSessionByDate(ctx.user.id, today);
        if (!session) {
          session = await createSession({
            userId: ctx.user.id,
            date: today,
            label: formatDateLabel(today),
            goal: REP_GOAL,
            totalReps: 0,
            totalVolume: 0,
            completed: false,
          });
        }
        const volume = input.weight * input.reps;
        const newSet = await addSet({
          sessionId: session.id,
          userId: ctx.user.id,
          weight: input.weight,
          reps: input.reps,
          volume,
          performedAt: Date.now(),
        });
        const allSets = await getSessionSets(session.id);
        const totalReps = allSets.reduce((sum, s) => sum + s.reps, 0);
        const totalVolume = allSets.reduce((sum, s) => sum + s.volume, 0);
        await updateSessionTotals(session.id, totalReps, totalVolume, REP_GOAL);
        return { set: newSet, sessionId: session.id, totalReps, totalVolume, completed: totalReps >= REP_GOAL };
      }),

    /** Delete a set and recalculate totals */
    deleteSet: protectedProcedure
      .input(z.object({ setId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const today = new Date().toISOString().slice(0, 10);
        const session = await getSessionByDate(ctx.user.id, today);
        if (!session) throw new Error("No session found for today");
        await deleteSet(input.setId, ctx.user.id);
        const allSets = await getSessionSets(session.id);
        const totalReps = allSets.reduce((sum, s) => sum + s.reps, 0);
        const totalVolume = allSets.reduce((sum, s) => sum + s.volume, 0);
        await updateSessionTotals(session.id, totalReps, totalVolume, REP_GOAL);
        return { totalReps, totalVolume, completed: totalReps >= REP_GOAL };
      }),

    /** Edit a set's weight and reps, recalculate session totals */
    editSet: protectedProcedure
      .input(z.object({ setId: z.number().int().positive(), weight: z.number().positive(), reps: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        const today = new Date().toISOString().slice(0, 10);
        const session = await getSessionByDate(ctx.user.id, today);
        if (!session) throw new Error("No session found for today");
        await editSet(input.setId, ctx.user.id, input.weight, input.reps);
        const allSets = await getSessionSets(session.id);
        const totalReps = allSets.reduce((sum, s) => sum + s.reps, 0);
        const totalVolume = allSets.reduce((sum, s) => sum + s.volume, 0);
        await updateSessionTotals(session.id, totalReps, totalVolume, session.goal);
        return { totalReps, totalVolume, completed: totalReps >= session.goal };
      }),

    /** Update the rep goal for today's session */
    updateGoal: protectedProcedure
      .input(z.object({ goal: z.number().int().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        const today = new Date().toISOString().slice(0, 10);
        let session = await getSessionByDate(ctx.user.id, today);
        if (!session) {
          session = await createSession({
            userId: ctx.user.id,
            date: today,
            label: formatDateLabel(today),
            goal: input.goal,
            totalReps: 0,
            totalVolume: 0,
            completed: false,
          });
        } else {
          // Persist the goal column AND recompute completed flag
          await updateSessionGoal(session.id, input.goal, session.totalReps);
        }
        return { goal: input.goal };
      }),

    /** Reset (delete) today's session */
    resetToday: protectedProcedure.mutation(async ({ ctx }) => {
      const today = new Date().toISOString().slice(0, 10);
      const session = await getSessionByDate(ctx.user.id, today);
      if (session) await deleteSession(session.id, ctx.user.id);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
