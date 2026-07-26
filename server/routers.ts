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
  getUserTemplates,
  createTemplate,
  deleteTemplate,
  getUserProfile,
  upsertUserProfile,
  getUserPRs,
  checkAndUpdatePR,
  recomputePRsForUser,
  getDailyLeaderboard,
  getAllTimeLeaderboard,
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
        await recomputePRsForUser(ctx.user.id);
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
        await recomputePRsForUser(ctx.user.id);
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

    /** Templates: list, create, delete */
    getTemplates: protectedProcedure.query(async ({ ctx }) => {
      return getUserTemplates(ctx.user.id);
    }),

    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(64),
        sets: z.array(z.object({ weight: z.number().positive(), reps: z.number().int().positive() })).min(1).max(20),
      }))
      .mutation(async ({ ctx, input }) => {
        return createTemplate(ctx.user.id, input.name, input.sets);
      }),

    deleteTemplate: protectedProcedure
      .input(z.object({ templateId: z.number().int().positive() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTemplate(input.templateId, ctx.user.id);
        return { success: true };
      }),

    /** Reset (delete) today's session */
    resetToday: protectedProcedure.mutation(async ({ ctx }) => {
      const today = new Date().toISOString().slice(0, 10);
      const session = await getSessionByDate(ctx.user.id, today);
      if (session) await deleteSession(session.id, ctx.user.id);
      await recomputePRsForUser(ctx.user.id);
      return { success: true };
    }),

    /** Get user's personal records */
    getPRs: protectedProcedure.query(async ({ ctx }) => {
      return getUserPRs(ctx.user.id);
    }),

    /** Check PRs after adding a set — called client-side after addSet */
    checkPRs: protectedProcedure
      .input(z.object({
        setId: z.number().int().positive(),
        weight: z.number().positive(),
        reps: z.number().int().positive(),
        sessionVolume: z.number().int().nonnegative(),
        sessionDate: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const newPRs: string[] = [];
        // Max weight PR
        const isMaxWeight = await checkAndUpdatePR(ctx.user.id, "maxWeight", input.weight, input.sessionDate, input.setId);
        if (isMaxWeight) newPRs.push(`New max weight: ${input.weight} lbs!`);
        // Best session volume PR
        const isBestSession = await checkAndUpdatePR(ctx.user.id, "bestSession", input.sessionVolume, input.sessionDate, input.setId);
        if (isBestSession) newPRs.push(`New best session volume: ${input.sessionVolume.toLocaleString()} lbs!`);
        // Best reps at this weight PR
        const isBestReps = await checkAndUpdatePR(ctx.user.id, "bestRepsAtWeight", input.reps, input.sessionDate, input.setId, input.weight);
        if (isBestReps) newPRs.push(`New best reps at ${input.weight} lbs: ${input.reps} reps!`);
        return { newPRs };
      }),
  }),

  profile: router({
    /** Get current user's profile */
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserProfile(ctx.user.id);
    }),

    /** Update display name and/or leaderboard opt-in */
    update: protectedProcedure
      .input(z.object({
        displayName: z.string().min(1).max(32).optional(),
        leaderboardOptIn: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return upsertUserProfile(ctx.user.id, input);
      }),
  }),

  leaderboard: router({
    /** Daily leaderboard for a given date (defaults to today) */
    daily: protectedProcedure
      .input(z.object({ date: z.string().optional() }))
      .query(async ({ input }) => {
        const date = input.date ?? new Date().toISOString().slice(0, 10);
        return getDailyLeaderboard(date);
      }),

    /** All-time leaderboard */
    allTime: protectedProcedure.query(async () => {
      return getAllTimeLeaderboard();
    }),
  }),
});

export type AppRouter = typeof appRouter;
