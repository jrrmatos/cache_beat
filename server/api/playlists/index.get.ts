import { playlists, tracks } from '../../database/schema'
import { db } from '../../database/index'
import { eq, count } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const allPlaylists = db.select().from(playlists).all()

  const result = await Promise.all(allPlaylists.map(async (playlist) => {
    const [trackCount] = db.select({ count: count() }).from(tracks)
      .where(eq(tracks.playlistId, playlist.id))
      .all()

    return {
      ...playlist,
      trackCount: trackCount?.count ?? 0,
    }
  }))

  return result
})
