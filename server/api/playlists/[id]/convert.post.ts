import { eq } from 'drizzle-orm'
import { playlists } from '../../../database/schema'
import { db } from '../../../database/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const playlist = db.select().from(playlists).where(eq(playlists.id, id)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }
  if (playlist.isCustom) {
    throw createError({ statusCode: 400, message: 'Playlist is already custom' })
  }

  db.update(playlists)
    .set({
      isCustom: 1,
      youtubeId: null,
      syncFrequency: 'manual',
      updatedAt: Date.now(),
    })
    .where(eq(playlists.id, id))
    .run()

  return db.select().from(playlists).where(eq(playlists.id, id)).get()
})
