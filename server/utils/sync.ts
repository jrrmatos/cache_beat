import { renameSync, existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, basename, resolve } from 'node:path'
import { eq, and, isNull } from 'drizzle-orm'
import { playlists, tracks, folders } from '../database/schema'
import { db } from '../database/index'
import { getAllPlaylistItems } from './youtube'
import { downloadTrack } from './downloader'
import { resolveFolderPath, getFolderPlaylist, getEffectiveAudioQuality } from './folders'
import { getSetting } from './settings'

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
  // Build title map for scanned tracks (youtubeId is null) to match against YouTube items
  const scannedByTitle = new Map(
    existingTracks
      .filter(track => ! track.youtubeId)
      .map(track => [sanitizeFilename(track.title).toLowerCase(), track]),
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
      const ytTitle = item.snippet?.title ?? 'Unknown'
      const scannedMatch = scannedByTitle.get(sanitizeFilename(ytTitle).toLowerCase())

      if (scannedMatch) {
        // Upgrade scanned track with YouTube metadata
        db.update(tracks)
          .set({
            youtubeId: videoId,
            title: ytTitle,
            artist: item.snippet?.videoOwnerChannelTitle ?? scannedMatch.artist,
            thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? null,
            position: index,
            status: scannedMatch.filePath && existsSync(scannedMatch.filePath) ? 'completed' : 'pending',
            updatedAt: now,
          })
          .where(eq(tracks.id, scannedMatch.id))
          .run()
        scannedByTitle.delete(sanitizeFilename(ytTitle).toLowerCase())
      }
      else {
        db.insert(tracks).values({
          id: crypto.randomUUID(),
          folderId: folder.id,
          youtubeId: videoId,
          title: ytTitle,
          artist: item.snippet?.videoOwnerChannelTitle ?? null,
          position: index,
          thumbnailUrl: item.snippet?.thumbnails?.medium?.url ?? null,
          status: 'pending',
          removedFromSource: 0,
          createdAt: now,
          updatedAt: now,
        }).run()
      }
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

// --- Recursive Folder Sync from Disk ---

function scanFolderForTracks(folderId: string, fsPath: string): number {
  const files = readdirSync(fsPath).filter(file => file.toLowerCase().endsWith('.mp3'))
  const existingTracks = db.select().from(tracks).where(eq(tracks.folderId, folderId)).all()
  const existingFilePaths = new Set(existingTracks.map(track => track.filePath))
  let maxPosition = existingTracks.reduce((max, track) => Math.max(max, track.position), - 1)
  const now = Date.now()
  let added = 0

  for (const file of files) {
    const fullPath = resolve(fsPath, file)
    if (existingFilePaths.has(fullPath)) {
      continue
    }

    const title = stripNumberPrefix(file.replace(/\.mp3$/i, ''))
    maxPosition ++

    const trackId = crypto.randomUUID()
    db.insert(tracks).values({
      id: trackId,
      folderId,
      youtubeId: null,
      title,
      artist: null,
      durationSeconds: null,
      position: maxPosition,
      thumbnailUrl: `/api/tracks/${trackId}/thumbnail`,
      filePath: fullPath,
      status: 'completed',
      removedFromSource: 0,
      createdAt: now,
      updatedAt: now,
    }).run()
    added ++
  }

  return added
}

function syncRecursive(
  fsPath: string,
  parentId: string | null,
  visited: Set<string>,
  stats: { foldersAdded: number, tracksAdded: number },
) {
  let entries: string[]
  try {
    entries = readdirSync(fsPath)
  }
  catch {
    return
  }

  const subdirs = entries.filter((entry) => {
    try {
      return statSync(resolve(fsPath, entry)).isDirectory()
    }
    catch {
      return false
    }
  })

  for (const dirName of subdirs) {
    const condition = parentId
      ? and(eq(folders.name, dirName), eq(folders.parentId, parentId))
      : and(eq(folders.name, dirName), isNull(folders.parentId))

    let folder = db.select().from(folders).where(condition).get()
    const now = Date.now()

    if (! folder) {
      const id = crypto.randomUUID()
      db.insert(folders).values({
        id,
        name: dirName,
        parentId,
        createdAt: now,
        updatedAt: now,
      }).run()
      folder = { id, name: dirName, parentId, playlistId: null, createdAt: now, updatedAt: now }
      stats.foldersAdded ++
    }

    visited.add(folder.id)
    stats.tracksAdded += scanFolderForTracks(folder.id, resolve(fsPath, dirName))
    syncRecursive(resolve(fsPath, dirName), folder.id, visited, stats)
  }
}

export async function syncFoldersFromDisk(): Promise<{ foldersAdded: number, tracksAdded: number, foldersRemoved: number }> {
  const defaultPath = await getSetting('default_output_path')
  if (! defaultPath || ! existsSync(defaultPath)) {
    return { foldersAdded: 0, tracksAdded: 0, foldersRemoved: 0 }
  }

  const visited = new Set<string>()
  const stats = { foldersAdded: 0, tracksAdded: 0 }

  // Scan root-level .mp3 files into a folder named after the root dir
  const rootMp3s = readdirSync(defaultPath).filter(file => file.toLowerCase().endsWith('.mp3'))
  if (rootMp3s.length > 0) {
    const rootName = basename(defaultPath)
    const rootCondition = and(eq(folders.name, rootName), isNull(folders.parentId))
    let rootFolder = db.select().from(folders).where(rootCondition).get()
    const now = Date.now()

    if (! rootFolder) {
      const id = crypto.randomUUID()
      db.insert(folders).values({
        id,
        name: rootName,
        parentId: null,
        createdAt: now,
        updatedAt: now,
      }).run()
      rootFolder = { id, name: rootName, parentId: null, playlistId: null, createdAt: now, updatedAt: now }
      stats.foldersAdded ++
    }

    visited.add(rootFolder.id)
    stats.tracksAdded += scanFolderForTracks(rootFolder.id, defaultPath)
  }

  // Recursively sync subdirectories
  syncRecursive(defaultPath, null, visited, stats)

  // Cleanup: remove DB folders not found on disk, unless they have a playlist
  const allFolders = db.select({ id: folders.id, playlistId: folders.playlistId }).from(folders).all()
  let foldersRemoved = 0

  for (const folder of allFolders) {
    if (! visited.has(folder.id) && ! folder.playlistId) {
      db.delete(folders).where(eq(folders.id, folder.id)).run()
      foldersRemoved ++
    }
  }

  return { foldersAdded: stats.foldersAdded, tracksAdded: stats.tracksAdded, foldersRemoved }
}

export async function forceSyncFoldersFromDisk(): Promise<{ foldersAdded: number, tracksAdded: number, foldersRemoved: number }> {
  // Delete all tracks first (but preserve folder+playlist structure)
  db.delete(tracks).run()

  // Then run normal sync to re-discover everything from disk
  return await syncFoldersFromDisk()
}
