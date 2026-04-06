import { eq } from 'drizzle-orm'
import { playlists, tracks, folders } from '../../database/schema'
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

  const folder = db.select().from(folders).where(eq(folders.playlistId, id)).get()
  const folderId = folder?.id ?? null

  const playlistTracks = folderId
    ? db.select().from(tracks).where(eq(tracks.folderId, folderId)).orderBy(tracks.position).all()
    : []

  return { ...playlist, folderId, tracks: playlistTracks }
})
