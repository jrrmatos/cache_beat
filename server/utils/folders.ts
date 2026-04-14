import { and, eq, isNull } from 'drizzle-orm'
import { folders, playlists } from '../database/schema'
import { db } from '../database/index'
import { getSetting } from './settings'

export function normalizeFolderName(raw: string): string {
  const name = raw.trim()
  if (! name) {
    throw createError({ statusCode: 400, message: 'Folder name cannot be empty' })
  }
  if (/[<>:"\\|?*/]/.test(name) || name.includes('..')) {
    throw createError({ statusCode: 400, message: 'Invalid folder name' })
  }
  return name
}

export function assertUniqueSibling(name: string, parentId: string | null, excludeId?: string) {
  const condition = parentId
    ? and(eq(folders.parentId, parentId), eq(folders.name, name))
    : and(isNull(folders.parentId), eq(folders.name, name))
  const clash = db.select().from(folders).where(condition).all()
  if (clash.some(folder => folder.id !== excludeId)) {
    throw createError({ statusCode: 409, message: 'A folder with this name already exists here' })
  }
}

export async function resolveFolderPath(folderId: string): Promise<string> {
  const defaultOutputPath = await getSetting('default_output_path') || './downloads'
  const segments: string[] = []
  let currentId: string | null = folderId

  while (currentId) {
    const folder = db.select().from(folders).where(eq(folders.id, currentId)).get()
    if (! folder) {
      break
    }
    segments.unshift(folder.name)
    currentId = folder.parentId
  }

  return `${defaultOutputPath}/${segments.join('/')}`
}

export function getFolderPlaylist(folderId: string) {
  const folder = db.select().from(folders).where(eq(folders.id, folderId)).get()
  if (! folder?.playlistId) {
    return null
  }
  return db.select().from(playlists).where(eq(playlists.id, folder.playlistId)).get() ?? null
}

export function getEffectiveAudioQuality(
  track: { audioQuality: string | null },
  playlist: { audioQuality: string } | null,
): string {
  return track.audioQuality ?? playlist?.audioQuality ?? '0'
}

export function getEffectiveSyncFrequency(
  track: { syncFrequency: string | null },
  playlist: { syncFrequency: string } | null,
): string {
  return track.syncFrequency ?? playlist?.syncFrequency ?? 'manual'
}
