CREATE TABLE `workout_template_sets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`templateId` int NOT NULL,
	`userId` int NOT NULL,
	`weight` int NOT NULL,
	`reps` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `workout_template_sets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workout_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workout_templates_id` PRIMARY KEY(`id`)
);
