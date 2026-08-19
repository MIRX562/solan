CREATE TABLE `document` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `document_version` (
	`id` text PRIMARY KEY NOT NULL,
	`document_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_type` text NOT NULL,
	`storage_key` text,
	`text_content` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`document_id`) REFERENCES `document`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `document_version_unique` ON `document_version` (`document_id`,`version`);--> statement-breakpoint
CREATE TABLE `handoff` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`delivery_notes` text,
	`client_signoff` text,
	`delivered_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `handoff_item` (
	`id` text PRIMARY KEY NOT NULL,
	`handoff_id` text NOT NULL,
	`deliverable_id` text,
	`document_id` text,
	`label` text,
	FOREIGN KEY (`handoff_id`) REFERENCES `handoff`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`deliverable_id`) REFERENCES `deliverable`(`id`) ON UPDATE no action ON DELETE restrict
);
