import { eq } from 'drizzle-orm'
import { playlists, tracks } from '../../database/schema'
import { db } from '../../database/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (! id) {
    throw createError({ statusCode: 400, message: 'id is required' })
  }

  const playlist = db.select().from(playlists).where(eq(playlists.id, id)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }

  const playlistTracks = db.select().from(tracks)
    .where(eq(tracks.playlistId, id))
    .orderBy(tracks.position)
    .all()

  return { ...playlist, tracks: playlistTracks }
})
