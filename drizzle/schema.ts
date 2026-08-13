import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  varchar,
  bigint,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const sportEnum = pgEnum("sport", ["bench_press", "swimming"]);
export const strokeEnum = pgEnum("stroke", ["freestyle", "breaststroke", "backstroke", "butterfly", "mixed"]);
export const poolLengthEnum = pgEnum("pool_length", ["25yd", "25m", "50m"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  googleId: varchar("googleId", { length: 128 }).unique(),
  appleId: varchar("appleId", { length: 128 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  emailVerified: boolean("emailVerified").notNull().default(false),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Workout Sessions ─────────────────────────────────────────────────────────

export const workoutSessions = pgTable("workout_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  date: varchar("date", { length: 10 }).notNull(),
  label: varchar("label", { length: 64 }).notNull(),
  goal: integer("goal").notNull().default(100),
  totalReps: integer("totalReps").notNull().default(0),
  totalVolume: integer("totalVolume").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  // Swimming additions
  sport: sportEnum("sport").notNull().default("bench_press"),
  totalYards: integer("totalYards").default(0),
  swimYardsGoal: integer("swimYardsGoal").notNull().default(1500),
});

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = typeof workoutSessions.$inferInsert;

// ─── Workout Sets ─────────────────────────────────────────────────────────────

export const workoutSets = pgTable("workout_sets", {
  id: serial("id").primaryKey(),
  sessionId: integer("sessionId").notNull(),
  userId: integer("userId").notNull(),
  weight: real("weight"),
  reps: integer("reps"),
  volume: real("volume"),
  performedAt: bigint("performedAt", { mode: "number" }).default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  setNumber: integer("setNumber").default(0),
  // Swimming additions
  sport: sportEnum("sport").notNull().default("bench_press"),
  distanceYards: integer("distanceYards"),
  repCount: integer("repCount"),
  swimTimeSeconds: integer("swimTimeSeconds"),
  intervalSeconds: integer("intervalSeconds"),
  stroke: strokeEnum("stroke"),
  isWarmup: boolean("isWarmup").notNull().default(false),
  isCooldown: boolean("isCooldown").notNull().default(false),
});

export type WorkoutSet = typeof workoutSets.$inferSelect;
export type InsertWorkoutSet = typeof workoutSets.$inferInsert;

// ─── Workout Templates ────────────────────────────────────────────────────────

export const workoutTemplates = pgTable("workout_templates", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  name: varchar("name", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const workoutTemplateSets = pgTable("workout_template_sets", {
  id: serial("id").primaryKey(),
  templateId: integer("templateId").notNull(),
  userId: integer("userId").notNull(),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  position: integer("position").notNull().default(0),
});

export type WorkoutTemplate = typeof workoutTemplates.$inferSelect;
export type InsertWorkoutTemplate = typeof workoutTemplates.$inferInsert;
export type WorkoutTemplateSet = typeof workoutTemplateSets.$inferSelect;
export type InsertWorkoutTemplateSet = typeof workoutTemplateSets.$inferInsert;

// ─── User Profiles ────────────────────────────────────────────────────────────

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 32 }),
  leaderboardOptIn: boolean("leaderboardOptIn").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  // Swimming additions
  poolLength: poolLengthEnum("poolLength").notNull().default("25yd"),
  swimYardsGoal: integer("swimYardsGoal").notNull().default(1500),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// ─── Personal Records ─────────────────────────────────────────────────────────

export const personalRecords = pgTable("personal_records", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  recordType: varchar("recordType", { length: 32 }).notNull(),
  value: real("value").notNull(),
  atWeight: real("atWeight"),
  setOnDate: varchar("setOnDate", { length: 10 }).notNull(),
  setId: integer("setId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PersonalRecord = typeof personalRecords.$inferSelect;
export type InsertPersonalRecord = typeof personalRecords.$inferInsert;

// ─── Password Reset Tokens ────────────────────────────────────────────────────

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
