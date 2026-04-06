import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { folders, playlists } from '../../../database/schema'
import { db } from '../../../database/index'
import { syncPlaylistMetadata } from '../../../utils/sync'

const bodySchema = z.union([
  z.object({
    type: z.literal('youtube'),
    youtubeId: z.string().min(1),
    title: z.string().min(1),
    thumbnailUrl: z.string().nullable().optional(),
    syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).default('daily'),
    audioQuality: z.string().default('0'),
  }),
  z.object({
    type: z.literal('custom'),
    title: z.string().min(1),
    audioQuality: z.string().default('0'),
  }),
])

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }
  if (folder.playlistId) {
    throw createError({ statusCode: 400, message: 'Folder already has a playlist attached' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const now = Date.now()
  const playlistId = crypto.randomUUID()

  if (body.type === 'youtube') {
    db.insert(playlists).values({
      id: playlistId,
      youtubeId: body.youtubeId,
      title: body.title,
      thumbnailUrl: body.thumbnailUrl ?? null,
      syncFrequency: body.syncFrequency,
      audioQuality: body.audioQuality,
      isActive: 1,
      isCustom: 0,
      createdAt: now,
      updatedAt: now,
    }).run()

    db.update(folders)
      .set({ playlistId, updatedAt: now })
      .where(eq(folders.id, id))
      .run()

    syncPlaylistMetadata(playlistId).catch((error) => {
      console.error(`[sync] initial metadata sync failed for ${body.title}:`, error)
    })
  }
  else {
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

    db.update(folders)
      .set({ playlistId, updatedAt: now })
      .where(eq(folders.id, id))
      .run()
  }

  return db.select().from(folders).where(eq(folders.id, id)).get()
})
