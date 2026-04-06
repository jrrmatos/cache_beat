import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const playlists = sqliteTable('playlists', {
  id: text('id').primaryKey(),
  youtubeId: text('youtube_id').unique(),
  title: text('title').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  outputFolder: text('output_folder'),
  syncFrequency: text('sync_frequency', { enum: ['hourly', 'daily', 'weekly', 'manual'] }).notNull().default('daily'),
  audioQuality: text('audio_quality').notNull().default('0'),
  isActive: integer('is_active').notNull().default(1),
  isCustom: integer('is_custom').notNull().default(0),
  lastSyncedAt: integer('last_synced_at'),
  lastDownloadedAt: integer('last_downloaded_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  playlistId: text('playlist_id').notNull().references(() => playlists.id, { onDelete: 'cascade' }),
  youtubeId: text('youtube_id').notNull(),
  title: text('title').notNull(),
  artist: text('artist'),
  durationSeconds: integer('duration_seconds'),
  position: integer('position').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  filePath: text('file_path'),
  status: text('status', { enum: ['pending', 'downloading', 'completed', 'failed'] }).notNull().default('pending'),
  errorMessage: text('error_message'),
  overrideUrl: text('override_url'),
  removedFromSource: integer('removed_from_source').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  unique().on(table.playlistId, table.youtubeId),
  index('tracks_playlist_id_idx').on(table.playlistId),
  index('tracks_status_idx').on(table.status),
])
