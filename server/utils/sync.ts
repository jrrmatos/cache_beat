import { renameSync, existsSync, readdirSync } from 'node:fs'
import { dirname, basename, resolve } from 'node:path'
import { eq, and } from 'drizzle-orm'
import { playlists, tracks, folders } from '../database/schema'
import { db } from '../database/index'
import { getAllPlaylistItems } from './youtube'
import { downloadTrack } from './downloader'
import { resolveFolderPath, getFolderPlaylist, getEffectiveAudioQuality } from './folders'

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

function stripNumberPrefix(filename: string): string {
  return filename.replace(/^\d+\s*-\s*/, '')
}

function findExistingFile(outputDir: string, sanitizedTitle: string): string | null {
  if (! existsSync(outputDir)) {
    return null
  }
  const target = `${sanitizedTitle}.mp3`.toLowerCase()
  const files = readdirSync(outputDir)
  for (const file of files) {
    if (! file.toLowerCase().endsWith('.mp3')) {
      continue
    }
    const stripped = stripNumberPrefix(file).toLowerCase()
    if (stripped === target) {
      return resolve(outputDir, file)
    }
  }
  return null
}

const FREQUENCY_MS: Record<string, number> = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
}

let metadataSyncRunning = false
let fileSyncRunning = false

export function isSyncRunning(): boolean {
  return metadataSyncRunning || fileSyncRunning
}

function findFolderForPlaylist(playlistId: string) {
  return db.select().from(folders).where(eq(folders.playlistId, playlistId)).get()
}

// --- Metadata Sync ---

export async function syncPlaylistMetadata(playlistId: string): Promise<{ added: number, removed: number }> {
  const playlist = db.select().from(playlists).where(eq(playlists.id, playlistId)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }
  if (playlist.isCustom || ! playlist.youtubeId) {
    return { added: 0, removed: 0 }
  }

  const folder = findFolderForPlaylist(playlistId)
  if (! folder) {
    throw createError({ statusCode: 404, message: 'No folder linked to playlist' })
  }

  const youtubeItems = await getAllPlaylistItems(playlist.youtubeId)
  const existingTracks = db.select().from(tracks).where(eq(tracks.folderId, folder.id)).all()
  const existingByYoutubeId = new Map(
    existingTracks.filter(track => track.youtubeId).map(track => [track.youtubeId, track]),
  )
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
          const nameWithoutNumber = stripNumberPrefix(oldName)
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
        folderId: folder.id,
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

  // Only mark youtube-sourced tracks as removed (skip file-scanned tracks with null youtubeId)
  for (const existing of existingTracks) {
    if (existing.youtubeId && ! youtubeVideoIds.has(existing.youtubeId) && ! existing.removedFromSource) {
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

  return { added, removed }
}

// --- File Sync ---

export async function syncPlaylistFiles(
  playlistId: string,
  force = false,
): Promise<{ downloaded: number, failed: number, matched: number }> {
  const playlist = db.select().from(playlists).where(eq(playlists.id, playlistId)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  const folder = findFolderForPlaylist(playlistId)
  if (! folder) {
    throw createError({ statusCode: 404, message: 'No folder linked to playlist' })
  }

  const outputDir = await resolveFolderPath(folder.id)

  const playlistTracks = db.select().from(tracks)
    .where(and(
      eq(tracks.folderId, folder.id),
      eq(tracks.removedFromSource, 0),
    ))
    .orderBy(tracks.position)
    .all()

  let downloaded = 0
  let failed = 0
  let matched = 0
  const now = Date.now()

  for (const track of playlistTracks) {
    if (! track.youtubeId && ! track.overrideUrl) {
      if (track.status === 'completed') {
        matched ++
      }
      continue
    }

    const sanitizedTitle = sanitizeFilename(track.title)

    if (! force) {
      const existingFile = findExistingFile(outputDir, sanitizedTitle)
      if (existingFile) {
        if (track.status !== 'completed' || track.filePath !== existingFile) {
          db.update(tracks)
            .set({ status: 'completed', filePath: existingFile, errorMessage: null, updatedAt: now })
            .where(eq(tracks.id, track.id))
            .run()
        }
        matched ++
        continue
      }
    }

    if (! force && track.status === 'completed' && track.filePath && existsSync(track.filePath)) {
      matched ++
      continue
    }

    db.update(tracks)
      .set({ status: 'downloading', updatedAt: now })
      .where(eq(tracks.id, track.id))
      .run()

    const quality = getEffectiveAudioQuality(track, playlist)

    try {
      const filePath = await downloadTrack(
        track.youtubeId ?? '',
        outputDir,
        track.position,
        track.title,
        track.id,
        quality,
        track.overrideUrl,
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

  db.update(playlists)
    .set({ lastDownloadedAt: Date.now(), updatedAt: Date.now() })
    .where(eq(playlists.id, playlistId))
    .run()

  return { downloaded, failed, matched }
}

export async function syncFolderFiles(
  folderId: string,
  force = false,
): Promise<{ downloaded: number, failed: number, matched: number }> {
  const folder = db.select().from(folders).where(eq(folders.id, folderId)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const playlist = folder.playlistId
    ? db.select().from(playlists).where(eq(playlists.id, folder.playlistId)).get() ?? null
    : null

  const outputDir = await resolveFolderPath(folderId)

  const folderTracks = db.select().from(tracks)
    .where(and(
      eq(tracks.folderId, folderId),
      eq(tracks.removedFromSource, 0),
    ))
    .orderBy(tracks.position)
    .all()

  let downloaded = 0
  let failed = 0
  let matched = 0
  const now = Date.now()

  for (const track of folderTracks) {
    if (! track.youtubeId && ! track.overrideUrl) {
      if (track.status === 'completed') {
        matched ++
      }
      continue
    }

    const sanitizedTitle = sanitizeFilename(track.title)

    if (! force) {
      const existingFile = findExistingFile(outputDir, sanitizedTitle)
      if (existingFile) {
        if (track.status !== 'completed' || track.filePath !== existingFile) {
          db.update(tracks)
            .set({ status: 'completed', filePath: existingFile, errorMessage: null, updatedAt: now })
            .where(eq(tracks.id, track.id))
            .run()
        }
        matched ++
        continue
      }
    }

    if (! force && track.status === 'completed' && track.filePath && existsSync(track.filePath)) {
      matched ++
      continue
    }

    db.update(tracks)
      .set({ status: 'downloading', updatedAt: now })
      .where(eq(tracks.id, track.id))
      .run()

    const quality = getEffectiveAudioQuality(track, playlist)

    try {
      const filePath = await downloadTrack(
        track.youtubeId ?? '',
        outputDir,
        track.position,
        track.title,
        track.id,
        quality,
        track.overrideUrl,
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

  return { downloaded, failed, matched }
}

export async function downloadSingleTrack(trackId: string, force = false): Promise<void> {
  const track = db.select().from(tracks).where(eq(tracks.id, trackId)).get()
  if (! track) {
    throw createError({ statusCode: 404, message: 'Track not found' })
  }

  const outputDir = await resolveFolderPath(track.folderId)
  const playlist = getFolderPlaylist(track.folderId)

  if (! force) {
    const sanitizedTitle = sanitizeFilename(track.title)
    const existingFile = findExistingFile(outputDir, sanitizedTitle)
    if (existingFile) {
      db.update(tracks)
        .set({ status: 'completed', filePath: existingFile, errorMessage: null, updatedAt: Date.now() })
        .where(eq(tracks.id, trackId))
        .run()
      return
    }
  }

  const now = Date.now()
  db.update(tracks)
    .set({ status: 'downloading', updatedAt: now })
    .where(eq(tracks.id, trackId))
    .run()

  const quality = getEffectiveAudioQuality(track, playlist)

  try {
    const filePath = await downloadTrack(
      track.youtubeId ?? '',
      outputDir,
      track.position,
      track.title,
      track.id,
      quality,
      track.overrideUrl,
    )
    db.update(tracks)
      .set({ status: 'completed', filePath, errorMessage: null, updatedAt: Date.now() })
      .where(eq(tracks.id, trackId))
      .run()
  }
  catch (error) {
    console.error(`[download] failed track "${track.title}" (${track.youtubeId}):`, error)
    const message = error instanceof Error ? error.message : String(error)
    db.update(tracks)
      .set({ status: 'failed', errorMessage: message, updatedAt: Date.now() })
      .where(eq(tracks.id, trackId))
      .run()
    throw error
  }
}

// --- Full Sync (scheduled) ---

export async function runMetadataSync(): Promise<void> {
  if (metadataSyncRunning) {
    return
  }
  metadataSyncRunning = true

  try {
    const now = Date.now()
    const activePlaylists = db.select().from(playlists)
      .where(eq(playlists.isActive, 1))
      .all()

    for (const playlist of activePlaylists) {
      if (playlist.isCustom || playlist.syncFrequency === 'manual') {
        continue
      }
      const interval = FREQUENCY_MS[playlist.syncFrequency]
      if (playlist.lastSyncedAt && (now - playlist.lastSyncedAt) < interval) {
        continue
      }
      try {
        await syncPlaylistMetadata(playlist.id)
      }
      catch (error) {
        console.error(`[metadata-sync] failed for playlist ${playlist.title}:`, error)
      }
    }
  }
  finally {
    metadataSyncRunning = false
  }
}

export async function runFileSync(): Promise<void> {
  if (fileSyncRunning) {
    return
  }
  fileSyncRunning = true

  try {
    const now = Date.now()
    const activePlaylists = db.select().from(playlists)
      .where(eq(playlists.isActive, 1))
      .all()

    for (const playlist of activePlaylists) {
      if (playlist.isCustom || playlist.syncFrequency === 'manual') {
        continue
      }
      const interval = FREQUENCY_MS[playlist.syncFrequency]
      if (playlist.lastDownloadedAt && (now - playlist.lastDownloadedAt) < interval) {
        continue
      }
      try {
        await syncPlaylistFiles(playlist.id)
      }
      catch (error) {
        console.error(`[file-sync] failed for playlist ${playlist.title}:`, error)
      }
    }
  }
  finally {
    fileSyncRunning = false
  }
}
