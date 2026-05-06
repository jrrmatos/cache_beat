import { existsSync, unlinkSync } from 'node:fs'
import { eq } from 'drizzle-orm'
import { tracks } from '../../../database/schema'
import { db } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const track = db.select().from(tracks).where(eq(tracks.id, id)).get()
  if (! track) {
    throw createError({ statusCode: 404, message: 'Track not found' })
  }

  if (track.filePath && existsSync(track.filePath)) {
    unlinkSync(track.filePath)
  }

  db.update(tracks)
    .set({
      banned: 1,
      status: 'pending',
      filePath: null,
      errorMessage: null,
      updatedAt: Date.now(),
    })
    .where(eq(tracks.id, id))
    .run()

  return { ok: true }
})
