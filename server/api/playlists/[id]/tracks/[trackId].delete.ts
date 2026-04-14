import { eq, and } from 'drizzle-orm'
import { playlists, tracks, folders } from '../../../../database/schema'
import { db } from '../../../../database/index'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const trackId = getRouterParam(event, 'trackId')
  if (! id || ! trackId) {
    throw createError({ statusCode: 400, message: 'id and trackId are required' })
  }

  const playlist = db.select().from(playlists).where(eq(playlists.id, id)).get()
  if (! playlist) {
    throw createError({ statusCode: 404, message: 'Playlist not found' })
  }
  if (! playlist.isCustom) {
    throw createError({ statusCode: 400, message: 'Can only delete tracks from custom playlists' })
  }

  const folder = db.select().from(folders).where(eq(folders.playlistId, id)).get()
  if (! folder) {
    throw createError({ statusCode: 404, message: 'No folder linked to playlist' })
  }

  const track = db.select().from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.folderId, folder.id)))
    .get()
  if (! track) {
    throw createError({ statusCode: 404, message: 'Track not found' })
  }

  db.delete(tracks).where(eq(tracks.id, trackId)).run()

  const remaining = db.select().from(tracks)
    .where(eq(tracks.folderId, folder.id))
    .orderBy(tracks.position)
    .all()
  const now = Date.now()
  for (let index = 0; index < remaining.length; index ++) {
    const remainingTrack = remaining[index]
    if (! remainingTrack) {
      continue
    }
    if (remainingTrack.position !== index) {
      db.update(tracks)
        .set({ position: index, updatedAt: now })
        .where(eq(tracks.id, remainingTrack.id))
        .run()
    }
  }

  return { success: true }
})
