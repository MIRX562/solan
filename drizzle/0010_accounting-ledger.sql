CREATE TABLE `chart_of_account` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_code_unique` ON `chart_of_account` (`code`);--> statement-breakpoint
CREATE TABLE `journal_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`source_event_id` text,
	`description` text NOT NULL,
	`project_id` text,
	`occurred_at` integer NOT NULL,
	FOREIGN KEY (`source_event_id`) REFERENCES `accounting_source_event`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_source_event_unique` ON `journal_entry` (`source_event_id`);--> statement-breakpoint
CREATE TABLE `journal_line` (
	`id` text PRIMARY KEY NOT NULL,
	`journal_entry_id` text NOT NULL,
	`account_id` text NOT NULL,
	`debit` integer DEFAULT 0 NOT NULL,
	`credit` integer DEFAULT 0 NOT NULL,
	`currency` text NOT NULL,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entry`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `chart_of_account`(`id`) ON UPDATE no action ON DELETE restrict
);
