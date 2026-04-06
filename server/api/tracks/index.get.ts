import { z } from 'zod/v4'
import { eq } from 'drizzle-orm'
import { tracks } from '../../database/schema'
import { db } from '../../database/index'

const querySchema = z.object({
  playlistId: z.string().optional(),
  status: z.enum(['pending', 'downloading', 'completed', 'failed']).optional(),
})

export default defineEventHandler(async (event) => {
  const { playlistId, status } = await getValidatedQuery(event, querySchema.parse)

  let query = db.select().from(tracks)

  if (playlistId) {
    query = query.where(eq(tracks.playlistId, playlistId)) as typeof query
  }
  if (status) {
    query = query.where(eq(tracks.status, status)) as typeof query
  }

  return query.orderBy(tracks.position).all()
})
