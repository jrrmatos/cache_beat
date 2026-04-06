CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`youtube_id` text,
	`title` text NOT NULL,
	`thumbnail_url` text,
	`output_folder` text,
	`sync_frequency` text DEFAULT 'daily' NOT NULL,
	`audio_quality` text DEFAULT '0' NOT NULL,
	`is_active` integer DEFAULT 1 NOT NULL,
	`is_custom` integer DEFAULT 0 NOT NULL,
	`last_synced_at` integer,
	`last_downloaded_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_youtube_id_unique` ON `playlists` (`youtube_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`playlist_id` text NOT NULL,
	`youtube_id` text NOT NULL,
	`title` text NOT NULL,
	`artist` text,
	`duration_seconds` integer,
	`position` integer NOT NULL,
	`thumbnail_url` text,
	`file_path` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_message` text,
	`override_url` text,
	`removed_from_source` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tracks_playlist_id_idx` ON `tracks` (`playlist_id`);--> statement-breakpoint
CREATE INDEX `tracks_status_idx` ON `tracks` (`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_playlist_id_youtube_id_unique` ON `tracks` (`playlist_id`,`youtube_id`);