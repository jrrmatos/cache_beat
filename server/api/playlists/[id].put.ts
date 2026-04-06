import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { playlists } from '../../database/schema'
import { db } from '../../database/index'

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  outputPath: z.string().nullable().optional(),
  syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).optional(),
  audioQuality: z.string().optional(),
  isActive: z.number().min(0).max(1).optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)
  const existing = db.select().from(playlists).where(eq(playlists.id, id)).get()
  if (! existing) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  db.update(playlists)
    .set({ ...body, updatedAt: Date.now() })
    .where(eq(playlists.id, id))
    .run()

  return db.select().from(playlists).where(eq(playlists.id, id)).get()
})
