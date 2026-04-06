import { eq } from 'drizzle-orm'
import { playlists } from '../../database/schema'
import { db } from '../../database/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const existing = db.select().from(playlists).where(eq(playlists.id, id)).get()
  if (! existing) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  db.delete(playlists).where(eq(playlists.id, id)).run()
  return { ok: true }
})
