import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { tracks } from '../../../database/schema'
import { db } from '../../../database/index'

const bodySchema = z.object({
  overrideUrl: z.union([z.url(), z.literal('')]).transform(value => value || null),
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

  const { overrideUrl } = await readValidatedBody(event, bodySchema.parse)

  db.update(tracks)
    .set({
      overrideUrl,
      status: overrideUrl ? 'pending' : existing.status,
      updatedAt: Date.now(),
    })
    .where(eq(tracks.id, id))
    .run()

  return db.select().from(tracks).where(eq(tracks.id, id)).get()
})
