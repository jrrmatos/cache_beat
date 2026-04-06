import { renameSync, existsSync } from 'node:fs'
import { dirname, basename } from 'node:path'
import { eq, and } from 'drizzle-orm'
import { playlists, tracks } from '../database/schema'
import { db } from '../database/index'
import { getAllPlaylistItems } from './youtube'
import { downloadTrack } from './downloader'
import { getSetting } from './settings'

function sanitizePathSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
}

interface SyncResult {
  added: number
  removed: number
  downloaded: number
  failed: number
}

const FREQUENCY_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

let syncRunning = false

export function isSyncRunning(): boolean {
  return syncRunning
}

export async function syncPlaylist(playlistId: string): Promise<SyncResult> {
  const playlist = db.select().from(playlists).where(eq(playlists.id, playlistId)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  const youtubeItems = await getAllPlaylistItems(playlist.youtubeId)
  const existingTracks = db.select().from(tracks).where(eq(tracks.playlistId, playlistId)).all()
  const existingByYoutubeId = new Map(existingTracks.map(track => [track.youtubeId, track]))
  const now = Date.now()

  let added = 0
  let removed = 0

  const youtubeVideoIds = new Set<string>()

  for (let index = 0; index < youtubeItems.length; index ++) {
    const item = youtubeItems[index]
    const videoId = item.contentDetails?.videoId
    if (! videoId) {
      continue
    }
    youtubeVideoIds.add(videoId)
    const existing = existingByYoutubeId.get(videoId)

    if (existing) {
      if (existing.position !== index) {
        db.update(tracks)
          .set({ position: index, updatedAt: now })
          .where(eq(tracks.id, existing.id))
          .run()

        if (existing.filePath && existsSync(existing.filePath)) {
          const dir = dirname(existing.filePath)
          const oldName = basename(existing.filePath)
          const paddedPosition = String(index + 1).padStart(2, '0')
          const nameWithoutNumber = oldName.replace(/^\d+\s*-\s*/, '')
          const newName = `${paddedPosition} - ${nameWithoutNumber}`
          if (oldName !== newName) {
            renameSync(existing.filePath, `${dir}/${newName}`)
            db.update(tracks)
              .set({ filePath: `${dir}/${newName}`, updatedAt: now })
              .where(eq(tracks.id, existing.id))
              .run()
          }
        }
      }
      if (existing.removedFromSource) {
        db.update(tracks)
          .set({ removedFromSource: 0, updatedAt: now })
          .where(eq(tracks.id, existing.id))
          .run()
      }
    }
    else {
      db.insert(tracks).values({
        id: crypto.randomUUID(),
        playlistId,
        youtubeId: videoId,
        title: item.snippet?.title ?? 'Unknown',
        artist: item.snippet?.videoOwnerChannelTitle ?? null,
        position: index,
        thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? null,
        status: 'pending',
        removedFromSource: 0,
        createdAt: now,
        updatedAt: now,
      }).run()
      added ++
    }
  }

  for (const existing of existingTracks) {
    if (! youtubeVideoIds.has(existing.youtubeId) && ! existing.removedFromSource) {
      db.update(tracks)
        .set({ removedFromSource: 1, updatedAt: now })
        .where(eq(tracks.id, existing.id))
        .run()
      removed ++
    }
  }

  db.update(playlists)
    .set({ lastSyncedAt: now, updatedAt: now })
    .where(eq(playlists.id, playlistId))
    .run()

  return { added, removed, downloaded: 0, failed: 0 }
}

export async function downloadPendingTracks(playlistId: string): Promise<{ downloaded: number, failed: number }> {
  const playlist = db.select().from(playlists).where(eq(playlists.id, playlistId)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  const defaultOutputPath = await getSetting('default_output_path') || './downloads'
  const outputDir = playlist.outputPath || `${defaultOutputPath}/${sanitizePathSegment(playlist.title)}`

  const pendingTracks = db.select().from(tracks)
    .where(and(eq(tracks.playlistId, playlistId), eq(tracks.status, 'pending')))
    .all()

  let downloaded = 0
  let failed = 0
  const now = Date.now()

  for (const track of pendingTracks) {
    db.update(tracks)
      .set({ status: 'downloading', updatedAt: now })
      .where(eq(tracks.id, track.id))
      .run()

    try {
      const filePath = await downloadTrack(
        track.youtubeId,
        outputDir,
        track.position,
        track.title,
        track.id,
        playlist.audioQuality,
      )
      db.update(tracks)
        .set({ status: 'completed', filePath, errorMessage: null, updatedAt: Date.now() })
        .where(eq(tracks.id, track.id))
        .run()
      downloaded ++
    }
    catch (error) {
      console.error(`[download] failed track "${track.title}" (${track.youtubeId}):`, error)
      const message = error instanceof Error ? error.message : String(error)
      db.update(tracks)
        .set({ status: 'failed', errorMessage: message, updatedAt: Date.now() })
        .where(eq(tracks.id, track.id))
        .run()
      failed ++
    }
  }

  return { downloaded, failed }
}

export async function runFullSync(): Promise<void> {
  if (syncRunning) {
    return
  }
  syncRunning = true

  try {
    const now = Date.now()
    const activePlaylists = db.select().from(playlists)
      .where(eq(playlists.isActive, 1))
      .all()

    for (const playlist of activePlaylists) {
      if (playlist.syncFrequency === 'manual') {
        continue
      }

      const interval = FREQUENCY_MS[playlist.syncFrequency]
      if (playlist.lastSyncedAt && (now - playlist.lastSyncedAt) < interval) {
        continue
      }

      try {
        await syncPlaylist(playlist.id)
        await downloadPendingTracks(playlist.id)
      }
      catch (error) {
        console.error(`[sync] failed for playlist ${playlist.title}:`, error)
      }
    }
  }
  finally {
    syncRunning = false
  }
}
