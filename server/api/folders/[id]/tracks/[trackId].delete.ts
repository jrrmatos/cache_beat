import { existsSync, unlinkSync } from 'node:fs'
import { eq, and } from 'drizzle-orm'
import { folders, tracks } from '../../../../database/schema'
import { db } from '../../../../database/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const trackId = getRouterParam(event, 'trackId')
  if (! id || ! trackId) {
    throw createError({ statusCode: 400, message: 'id and trackId are required' })
  }

  const folder = db.select().from(folders).where(eq(folders.id, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'Folder not found' })
  }

  const track = db.select().from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.folderId, id)))
    .get()
  if (! track) {
    throw createError({ statusCode: 404, message: 'Track not found' })
  }

  if (track.filePath && existsSync(track.filePath)) {
    unlinkSync(track.filePath)
  }

  db.delete(tracks).where(eq(tracks.id, trackId)).run()

  // Reindex remaining positions
  const remaining = db.select().from(tracks)
    .where(eq(tracks.folderId, id))
    .orderBy(tracks.position)
    .all()
  const now = Date.now()
  for (let index = 0; index < remaining.length; index ++) {
    if (remaining[index].position !== index) {
      db.update(tracks)
        .set({ position: index, updatedAt: now })
        .where(eq(tracks.id, remaining[index].id))
        .run()
    }
  }

  return { success: true }
})
