import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { playlists, folders } from '../../database/schema'
import { db } from '../../database/index'
import { syncPlaylistMetadata } from '../../utils/sync'

const bodySchema = z.object({
  youtubeId: z.string().min(1),
  title: z.string().min(1),
  thumbnailUrl: z.string().nullable().optional(),
  folderName: z.string().min(1).optional(),
  folderId: z.string().optional(),
  syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).default('daily'),
  audioQuality: z.string().default('0'),
})

function sanitizePathSegment(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim()
}

export default defineEventHandler(async (event) => {
  const body = await readValidatedBody(event, bodySchema.parse)
  const now = Date.now()

  const playlistId = crypto.randomUUID()
  db.insert(playlists).values({
    id: playlistId,
    youtubeId: body.youtubeId,
    title: body.title,
    thumbnailUrl: body.thumbnailUrl ?? null,
    syncFrequency: body.syncFrequency,
    audioQuality: body.audioQuality,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  }).run()

  // Link to existing folder or create new one
  if (body.folderId) {
    const folder = db.select().from(folders).where(eq(folders.id, body.folderId)).get()
    if (! folder) {
      throw createError({ statusCode: 404, message: 'Folder not found' })
    }
    if (folder.playlistId) {
      throw createError({ statusCode: 400, message: 'Folder already has a playlist' })
    }
    db.update(folders)
      .set({ playlistId, updatedAt: now })
      .where(eq(folders.id, body.folderId))
      .run()
  }
  else {
    const folderId = crypto.randomUUID()
    db.insert(folders).values({
      id: folderId,
      name: body.folderName || sanitizePathSegment(body.title),
      parentId: null,
      playlistId,
      createdAt: now,
      updatedAt: now,
    }).run()
  }

  syncPlaylistMetadata(playlistId).catch((error) => {
    console.error(`[sync] initial metadata sync failed for ${body.title}:`, error)
  })

  const playlist = db.select().from(playlists).where(eq(playlists.id, playlistId)).get()
  const folder = db.select().from(folders).where(eq(folders.playlistId, playlistId)).get()
  return { ...playlist, folderId: folder?.id ?? null }
})
