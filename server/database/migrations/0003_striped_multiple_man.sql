PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_playlists` (
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
INSERT INTO `__new_playlists`("id", "youtube_id", "title", "thumbnail_url", "output_folder", "sync_frequency", "audio_quality", "is_active", "is_custom", "last_synced_at", "last_downloaded_at", "created_at", "updated_at") SELECT "id", "youtube_id", "title", "thumbnail_url", "output_folder", "sync_frequency", "audio_quality", "is_active", "is_custom", "last_synced_at", "last_downloaded_at", "created_at", "updated_at" FROM `playlists`;--> statement-breakpoint
DROP TABLE `playlists`;--> statement-breakpoint
ALTER TABLE `__new_playlists` RENAME TO `playlists`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_youtube_id_unique` ON `playlists` (`youtube_id`);