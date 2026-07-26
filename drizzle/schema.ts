import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * A workout session — one per day per user.
 * totalReps and totalVolume are denormalized for fast reads.
 */
export const workoutSessions = mysqlTable("workout_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** ISO date string YYYY-MM-DD, one session per user per day */
  date: varchar("date", { length: 10 }).notNull(),
  /** Human-readable label, e.g. "Sun, Jul 12" */
  label: varchar("label", { length: 32 }).notNull(),
  /** Rep goal for this session */
  goal: int("goal").notNull().default(100),
  /** Denormalized total reps across all sets */
  totalReps: int("totalReps").notNull().default(0),
  /** Denormalized total volume (lbs) across all sets */
  totalVolume: int("totalVolume").notNull().default(0),
  /** Whether the rep goal has been reached */
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = typeof workoutSessions.$inferInsert;

/**
 * Individual sets within a session.
 */
export const workoutSets = mysqlTable("workout_sets", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("sessionId").notNull(),
  userId: int("userId").notNull(),
  weight: int("weight").notNull(),
  reps: int("reps").notNull(),
  /** Denormalized volume = weight × reps */
  volume: int("volume").notNull(),
  /** Unix timestamp in ms */
  performedAt: bigint("performedAt", { mode: "number" }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorkoutSet = typeof workoutSets.$inferSelect;
export type InsertWorkoutSet = typeof workoutSets.$inferInsert;

/**
 * Named workout templates — a saved sequence of sets a user can replay.
 */
export const workoutTemplates = mysqlTable("workout_templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type InsertWorkoutTemplate = typeof workoutTemplates.$inferInsert;

/**
 * Individual sets within a template, ordered by position.
 */
export const workoutTemplateSets = mysqlTable("workout_template_sets", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull(),
  userId: int("userId").notNull(),
  weight: int("weight").notNull(),
  reps: int("reps").notNull(),
  position: int("position").notNull().default(0),
});

export type WorkoutTemplateSet = typeof workoutTemplateSets.$inferSelect;
export type InsertWorkoutTemplateSet = typeof workoutTemplateSets.$inferInsert;