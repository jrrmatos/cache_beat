import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { tracks } from '../../../database/schema'
import { db } from '../../../database/index'

const bodySchema = z.object({
  overrideUrl: z.union([z.url(), z.literal('')]).transform(value => value || null).optional(),
  syncFrequency: z.enum(['hourly', 'daily', 'weekly', 'manual']).nullable().optional(),
  audioQuality: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const existing = db.select().from(tracks).where(eq(tracks.id, id)).get()
  if (! existing) {
    throw createError({ statusCode: 404, message: 'Track not found' })
  }

  const body = await readValidatedBody(event, bodySchema.parse)

  const updates: Record<string, unknown> = { updatedAt: Date.now() }

  if (body.overrideUrl !== undefined) {
    updates.overrideUrl = body.overrideUrl
    if (body.overrideUrl) {
      updates.status = 'pending'
    }
  }
  if (body.syncFrequency !== undefined) {
    updates.syncFrequency = body.syncFrequency
  }
  if (body.audioQuality !== undefined) {
    updates.audioQuality = body.audioQuality
  }

  db.update(tracks)
    .set(updates)
    .where(eq(tracks.id, id))
    .run()

  return db.select().from(tracks).where(eq(tracks.id, id)).get()
})
