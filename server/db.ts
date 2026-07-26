import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  workoutSessions,
  workoutSets,
  workoutTemplates,
  workoutTemplateSets,
  type InsertWorkoutSession,
  type InsertWorkoutSet,
  type WorkoutSession,
  type WorkoutSet,
  type WorkoutTemplate,
  type WorkoutTemplateSet,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── Workout Session helpers ──────────────────────────────────────────────────

/** Get all sessions for a user, newest first */
export async function getUserSessions(userId: number): Promise<WorkoutSession[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workoutSessions)
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.date));
}

/** Get a single session by date for a user */
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

/** Create a new session */
export async function createSession(data: InsertWorkoutSession): Promise<WorkoutSession> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workoutSessions).values(data);
  const result = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, data.userId), eq(workoutSessions.date, data.date)))
    .limit(1);
  if (!result[0]) throw new Error("Failed to create session");
  return result[0];
}

/** Update session totals after adding/removing a set */
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
    .set({ totalReps, totalVolume, completed: totalReps >= goal })
    .where(eq(workoutSessions.id, sessionId));
}

/** Update just the goal for a session */
export async function updateSessionGoal(
  sessionId: number,
  goal: number,
  totalReps: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(workoutSessions)
    .set({ goal, completed: totalReps >= goal })
    .where(eq(workoutSessions.id, sessionId));
}

/** Delete a session and all its sets */
export async function deleteSession(sessionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workoutSets).where(and(eq(workoutSets.sessionId, sessionId), eq(workoutSets.userId, userId)));
  await db.delete(workoutSessions).where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)));
}

// ─── Workout Set helpers ──────────────────────────────────────────────────────

/** Get all sets for a session ordered by time */
export async function getSessionSets(sessionId: number): Promise<WorkoutSet[]> {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workoutSets)
    .where(eq(workoutSets.sessionId, sessionId))
    .orderBy(workoutSets.performedAt);
}

/** Add a set to a session */
export async function addSet(data: InsertWorkoutSet): Promise<WorkoutSet> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(workoutSets).values(data);
  const result = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.sessionId, data.sessionId), eq(workoutSets.userId, data.userId), eq(workoutSets.performedAt, data.performedAt)))
    .orderBy(desc(workoutSets.createdAt))
    .limit(1);
  if (!result[0]) throw new Error("Failed to retrieve inserted set");
  return result[0];
}

/** Delete a set by id */
export async function deleteSet(setId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(workoutSets).where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)));
}

/** Edit a set's weight and reps */
export async function editSet(
  setId: number,
  userId: number,
  weight: number,
  reps: number
): Promise<WorkoutSet | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const volume = weight * reps;
  await db
    .update(workoutSets)
    .set({ weight, reps, volume })
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)));
  const result = await db
    .select()
    .from(workoutSets)
    .where(and(eq(workoutSets.id, setId), eq(workoutSets.userId, userId)))
    .limit(1);
  return result[0];
}

/** Get a set by id */
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
  await db.insert(workoutTemplates).values({ userId, name });
  const result = await db.select().from(workoutTemplates)
    .where(and(eq(workoutTemplates.userId, userId), eq(workoutTemplates.name, name)))
    .orderBy(desc(workoutTemplates.createdAt)).limit(1);
  const template = result[0];
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
