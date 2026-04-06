import { playlists, tracks, folders } from '../../database/schema'
import { db } from '../../database/index'
import { eq, count } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const allFolders = db.select().from(folders).all()
  const folderByPlaylistId = new Map(
    allFolders.filter(folder => folder.playlistId).map(folder => [folder.playlistId, folder]),
  )

  const allPlaylists = db.select().from(playlists).all()

  const result = await Promise.all(allPlaylists.map(async (playlist) => {
    const folder = folderByPlaylistId.get(playlist.id)
    const folderId = folder?.id ?? null

    let trackCount = 0
    if (folderId) {
      const [row] = db.select({ count: count() }).from(tracks)
        .where(eq(tracks.folderId, folderId))
        .all()
      trackCount = row?.count ?? 0
    }

    return {
      ...playlist,
      folderId,
      trackCount,
    }
  }))

  return result
})
