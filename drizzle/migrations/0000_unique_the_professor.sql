CREATE TYPE "public"."pool_length" AS ENUM('25yd', '25m', '50m');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sport" AS ENUM('bench_press', 'swimming');--> statement-breakpoint
CREATE TYPE "public"."stroke" AS ENUM('freestyle', 'breaststroke', 'backstroke', 'butterfly', 'mixed');--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"token" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"usedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "personal_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"recordType" varchar(32) NOT NULL,
	"value" real NOT NULL,
	"atWeight" real,
	"setOnDate" varchar(10) NOT NULL,
	"setId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"displayName" varchar(32),
	"leaderboardOptIn" boolean DEFAULT false NOT NULL,
	"poolLength" "pool_length" DEFAULT '25yd' NOT NULL,
	"swimYardsGoal" integer DEFAULT 1500 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"googleId" varchar(128),
	"appleId" varchar(128),
	"loginMethod" varchar(32) DEFAULT 'email' NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_googleId_unique" UNIQUE("googleId"),
	CONSTRAINT "users_appleId_unique" UNIQUE("appleId")
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"date" varchar(10) NOT NULL,
	"label" varchar(64) NOT NULL,
	"sport" "sport" DEFAULT 'bench_press' NOT NULL,
	"goal" integer DEFAULT 100 NOT NULL,
	"totalReps" integer DEFAULT 0 NOT NULL,
	"totalVolume" integer DEFAULT 0 NOT NULL,
	"totalYards" integer DEFAULT 0,
	"completed" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"sessionId" integer NOT NULL,
	"userId" integer NOT NULL,
	"sport" "sport" DEFAULT 'bench_press' NOT NULL,
	"weight" real,
	"reps" integer,
	"volume" real,
	"distanceYards" integer,
	"repCount" integer,
	"swimTimeSeconds" integer,
	"intervalSeconds" integer,
	"stroke" "stroke",
	"isWarmup" boolean DEFAULT false NOT NULL,
	"isCooldown" boolean DEFAULT false NOT NULL,
	"setNumber" integer DEFAULT 0 NOT NULL,
	"performedAt" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_template_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"templateId" integer NOT NULL,
	"userId" integer NOT NULL,
	"weight" real NOT NULL,
	"reps" integer NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(64) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal_records" ADD CONSTRAINT "personal_records_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_sessionId_workout_sessions_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_sets" ADD CONSTRAINT "workout_template_sets_templateId_workout_templates_id_fk" FOREIGN KEY ("templateId") REFERENCES "public"."workout_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_template_sets" ADD CONSTRAINT "workout_template_sets_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_templates" ADD CONSTRAINT "workout_templates_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;