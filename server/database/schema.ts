import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
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
  syncFrequency: text('sync_frequency', { enum: ['hourly', 'daily', 'weekly', 'manual'] }).notNull().default('daily'),
  audioQuality: text('audio_quality').notNull().default('0'),
  isActive: integer('is_active').notNull().default(1),
  isCustom: integer('is_custom').notNull().default(0),
  lastSyncedAt: integer('last_synced_at'),
  lastDownloadedAt: integer('last_downloaded_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
})

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id').references((): AnySQLiteColumn => folders.id, { onDelete: 'cascade' }),
  playlistId: text('playlist_id').references(() => playlists.id, { onDelete: 'set null' }).unique(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  index('folders_parent_id_idx').on(table.parentId),
])

export const tracks = sqliteTable('tracks', {
  id: text('id').primaryKey(),
  folderId: text('folder_id').notNull().references(() => folders.id, { onDelete: 'cascade' }),
  youtubeId: text('youtube_id'),
  title: text('title').notNull(),
  artist: text('artist'),
  durationSeconds: integer('duration_seconds'),
  position: integer('position').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  filePath: text('file_path'),
  status: text('status', { enum: ['pending', 'downloading', 'completed', 'failed'] }).notNull().default('pending'),
  errorMessage: text('error_message'),
  overrideUrl: text('override_url'),
  syncFrequency: text('sync_frequency', { enum: ['hourly', 'daily', 'weekly', 'manual'] }),
  audioQuality: text('audio_quality'),
  removedFromSource: integer('removed_from_source').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
}, table => [
  unique().on(table.folderId, table.youtubeId),
  index('tracks_folder_id_idx').on(table.folderId),
  index('tracks_status_idx').on(table.status),
])
