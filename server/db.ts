import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  users,
  workoutSessions,
  workoutSets,
  workoutTemplates,
  workoutTemplateSets,
  userProfiles,
  personalRecords,
  passwordResetTokens,
  type InsertUser,
  type InsertWorkoutSession,
  type InsertWorkoutSet,
  type WorkoutSession,
  type WorkoutSet,
  type WorkoutTemplate,
  type WorkoutTemplateSet,
  type UserProfile,
  type PersonalRecord,
  type InsertPasswordResetToken,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Auth / User helpers ──────────────────────────────────────────────────────

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export async function getUserByGoogleId(googleId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
  return result[0];
}

export async function getUserByAppleId(appleId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.appleId, appleId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

export async function createUser(data: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values({ ...data, lastSignedIn: new Date() }).returning();
  if (!result[0]) throw new Error("Failed to create user");
  return result[0];
}

export async function touchLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

// ─── Workout Session helpers ──────────────────────────────────────────────────

export async function getUserSessions(userId: number): Promise<WorkoutSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.date));
}

export async function getSessionByDate(
  userId: number,
  date: string
): Promise<WorkoutSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.date, date)))
    .limit(1);
  return result[0];
}

export async function createSession(data: InsertWorkoutSession): Promise<WorkoutSession> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workoutSessions).values(data).returning();
  if (!result[0]) throw new Error("Failed to create session");
  return result[0];
}

export async function updateSessionTotals(
  sessionId: number,
  totalReps: number,
  totalVolume: number,
  goal: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workoutSessions)
    .set({ totalReps, totalVolume, completed: totalReps >= goal, updatedAt: new Date() })
    .where(eq(workoutSessions.id, sessionId));
}

export async function updateSessionGoal(
  sessionId: number,
  goal: number,
  totalReps: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workoutSessions)
    .set({ goal, completed: totalReps >= goal, updatedAt: new Date() })
    .where(eq(workoutSessions.id, sessionId));
}

export async function deleteSession(sessionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workoutSets).where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.userId, userId)));
  await db.delete(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));
}

// ─── Workout Set helpers ──────────────────────────────────────────────────────

export async function getSessionSets(sessionId: number): Promise<WorkoutSet[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, sessionId))
    .orderBy(workoutSets.performedAt);
}

export async function addSet(data: InsertWorkoutSet): Promise<WorkoutSet> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workoutSets).values(data).returning();
  if (!result[0]) throw new Error("Failed to insert set");
  return result[0];
}

export async function deleteSet(setId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workoutSets).where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)));
}

export async function editSet(
  setId: number,
  userId: number,
  weight: number,
  reps: number
): Promise<WorkoutSet | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const volume = weight * reps;
  const result = await db
    .update(workoutSets)
    .set({ weight, reps, volume })
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)))
    .returning();
  return result[0];
}

export async function getSetById(setId: number, userId: number): Promise<WorkoutSet | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)))
    .limit(1);
  return result[0];
}

// ─── Template helpers ─────────────────────────────────────────────────────────

export async function getUserTemplates(userId: number): Promise<(WorkoutTemplate & { sets: WorkoutTemplateSet[] })[]> {
  const db = await getDb();
  if (!db) return [];
  const templates = await db.select().from(workoutTemplates).where(eq(workoutTemplates.userId, userId)).orderBy(workoutTemplates.createdAt);
  return Promise.all(templates.map(async (t) => {
    const sets = await db!.select().from(workoutTemplateSets)
      .where(eq(workoutTemplateSets.templateId, t.id))
      .orderBy(workoutTemplateSets.position);
    return { ...t, sets };
  }));
}

export async function createTemplate(
  userId: number,
  name: string,
  sets: { weight: number; reps: number }[]
): Promise<WorkoutTemplate & { sets: WorkoutTemplateSet[] }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const templateResult = await db.insert(workoutTemplates).values({ userId, name }).returning();
  const template = templateResult[0];
  if (!template) throw new Error("Failed to create template");
  if (sets.length > 0) {
    await db.insert(workoutTemplateSets).values(
      sets.map((s, i) => ({ templateId: template.id, userId, weight: s.weight, reps: s.reps, position: i }))
    );
  }
  const savedSets = await db.select().from(workoutTemplateSets)
    .where(eq(workoutTemplateSets.templateId, template.id))
    .orderBy(workoutTemplateSets.position);
  return { ...template, sets: savedSets };
}

export async function deleteTemplate(templateId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workoutTemplateSets).where(and(eq(workoutTemplateSets.templateId, templateId), eq(workoutTemplateSets.userId, userId)));
  await db.delete(workoutTemplates).where(and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, userId)));
}

// ─── User Profile helpers ─────────────────────────────────────────────────────

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function upsertUserProfile(
  userId: number,
  data: { displayName?: string; leaderboardOptIn?: boolean }
): Promise<UserProfile> {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db
    .insert(userProfiles)
    .values({ userId, ...data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { ...data, updatedAt: new Date() },
    })
    .returning();
  return result[0]!;
}

// ─── Personal Records helpers ─────────────────────────────────────────────────

export async function getUserPRs(userId: number): Promise<PersonalRecord[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(personalRecords).where(eq(personalRecords.userId, userId));
}

export async function checkAndUpdatePR(
  userId: number,
  recordType: string,
  value: number,
  setOnDate: string,
  setId: number,
  atWeight?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const conditions = [
    eq(personalRecords.userId, userId),
    eq(personalRecords.recordType, recordType),
  ];
  if (atWeight != null) conditions.push(eq(personalRecords.atWeight, atWeight));

  const existing = await db
    .select()
    .from(personalRecords)
    .where(and(...conditions))
    .limit(1);

  if (existing.length === 0 || value > existing[0]!.value) {
    if (existing.length === 0) {
      await db.insert(personalRecords).values({
        userId,
        recordType,
        value,
        setOnDate,
        setId,
        atWeight: atWeight ?? null,
      });
    } else {
      await db.update(personalRecords)
        .set({ value, setOnDate, setId, atWeight: atWeight ?? null, updatedAt: new Date() })
        .where(eq(personalRecords.id, existing[0]!.id));
    }
    return true;
  }
  return false;
}

export async function recomputePRsForUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(personalRecords).where(eq(personalRecords.userId, userId));

  const sessions = await db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId));

  for (const session of sessions) {
    const sets = await db
      .select()
      .from(workoutSets)
      .where(eq(workoutSets.sessionId, session.id));

    for (const s of sets) {
      await checkAndUpdatePR(userId, "maxWeight", s.weight, session.date, s.id);
      await checkAndUpdatePR(userId, "bestRepsAtWeight", s.reps, session.date, s.id, s.weight);
    }

    if (session.totalVolume > 0) {
      const anchor = sets[0];
      if (anchor) {
        await checkAndUpdatePR(userId, "bestSession", session.totalVolume, session.date, anchor.id);
      }
    }
  }
}

// ─── Leaderboard helpers ──────────────────────────────────────────────────────

export async function getDailyLeaderboard(date: string): Promise<
  { userId: number; displayName: string | null; totalVolume: number; totalReps: number }[]
> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      userId: workoutSessions.userId,
      displayName: userProfiles.displayName,
      totalVolume: workoutSessions.totalVolume,
      totalReps: workoutSessions.totalReps,
    })
    .from(workoutSessions)
    .innerJoin(
      userProfiles,
      and(eq(userProfiles.userId, workoutSessions.userId), eq(userProfiles.leaderboardOptIn, true))
    )
    .where(eq(workoutSessions.date, date))
    .orderBy(desc(workoutSessions.totalVolume));
}

export async function getAllTimeLeaderboard(): Promise<
  { userId: number; displayName: string | null; bestVolume: number; maxWeight: number }[]
> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      userId: personalRecords.userId,
      displayName: userProfiles.displayName,
      recordType: personalRecords.recordType,
      value: personalRecords.value,
    })
    .from(personalRecords)
    .innerJoin(
      userProfiles,
      and(eq(userProfiles.userId, personalRecords.userId), eq(userProfiles.leaderboardOptIn, true))
    );

  const map = new Map<number, { displayName: string | null; bestVolume: number; maxWeight: number }>();
  for (const r of rows) {
    const entry = map.get(r.userId) ?? { displayName: r.displayName, bestVolume: 0, maxWeight: 0 };
    if (r.recordType === "bestSession") entry.bestVolume = Math.max(entry.bestVolume, r.value);
    if (r.recordType === "maxWeight") entry.maxWeight = Math.max(entry.maxWeight, r.value);
    map.set(r.userId, entry);
  }
  return Array.from(map.entries()).map(([userId, v]) => ({ userId, ...v }));
}

// ─── Password Reset Token helpers ─────────────────────────────────────────────

export async function createPasswordResetToken(data: InsertPasswordResetToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Invalidate any existing tokens for this user first
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, data.userId));
  const result = await db.insert(passwordResetTokens).values(data).returning();
  if (!result[0]) throw new Error("Failed to create reset token");
  return result[0];
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);
  return result[0];
}

export async function markPasswordResetTokenUsed(tokenId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

// ─── Account Deletion ─────────────────────────────────────────────────────────

export async function deleteUser(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // All related rows cascade-delete via FK constraints (sessions, sets, templates, profile, PRs, tokens)
  await db.delete(users).where(eq(users.id, userId));
}
