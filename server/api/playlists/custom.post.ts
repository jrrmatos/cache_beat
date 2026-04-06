import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { playlists, folders } from '../../database/schema'
import { db } from '../../database/index'

const bodySchema = z.object({
  title: z.string().min(1),
  folderName: z.string().min(1).optional(),
  folderId: z.string().optional(),
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
    youtubeId: null,
    title: body.title,
    thumbnailUrl: null,
    syncFrequency: 'manual',
    audioQuality: body.audioQuality,
    isActive: 1,
    isCustom: 1,
    createdAt: now,
    updatedAt: now,
  }).run()

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

  const playlist = db.select().from(playlists).where(eq(playlists.id, playlistId)).get()
  const folder = db.select().from(folders).where(eq(folders.playlistId, playlistId)).get()
  return { ...playlist, folderId: folder?.id ?? null }
})
